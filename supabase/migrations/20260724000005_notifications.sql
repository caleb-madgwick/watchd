-- Phase 0 notifications: the delivery + inbox layer the app has been missing
-- (profiles.notification_prefs stored choices with nowhere to apply them).
--
-- Security model matches the schema: RLS deny-by-default, rows created ONLY by
-- SECURITY DEFINER functions/triggers (no client insert path, like activities),
-- and generation respects notification_prefs + is_blocked_either().
--
-- Generation is wired via SEPARATE notify_* triggers so the existing counter /
-- activity trigger functions (handle_follow_insert, handle_review_like_change,
-- friend RPCs) are left untouched.

-- ── Enums ─────────────────────────────────────────────────────────────────────

create type public.notification_type as enum (
  'new_follower', 'review_like', 'list_like', 'diary_like',
  'comment', 'comment_reply', 'friend_request', 'friend_accepted'
);

-- ── notifications ──────────────────────────────────────────────────────────────

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  type public.notification_type not null,
  actor_id uuid references public.profiles (id) on delete cascade,
  -- Loose (FK-less) polymorphic pointer to the thing the notification is about.
  target_type text check (target_type is null or target_type in
    ('review', 'list', 'diary_entry', 'comment', 'profile')),
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb check (pg_column_size(metadata) < 2048),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_recipient_idx on public.notifications (recipient_id, created_at desc);
create index notifications_unread_idx on public.notifications (recipient_id)
  where read_at is null;

-- ── push_tokens ────────────────────────────────────────────────────────────────
-- One row per Expo push token. A token maps to one user at a time; on login the
-- register RPC reassigns it (handles shared-device logout/login).

create table public.push_tokens (
  token text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  platform text not null check (platform in ('ios', 'android', 'web')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index push_tokens_user_idx on public.push_tokens (user_id);

create trigger push_tokens_updated_at before update on public.push_tokens
  for each row execute function public.set_updated_at();

-- Add a 'comments' preference key for new signups (existing rows fall back to
-- enabled via coalesce in create_notification). Size check stays under 512 bytes.
alter table public.profiles
  alter column notification_prefs set default
  '{"new_followers": true, "review_likes": true, "friend_activity": true, "comments": true}'::jsonb;

-- ── create_notification: the single insert path ────────────────────────────────
-- Honours notification_prefs, skips self-notifications and blocked pairs, and
-- de-dupes non-comment events so unlike/relike or unfollow/refollow keeps one
-- unread entry. Not client-callable (definer triggers invoke it).

create or replace function public.create_notification(
  p_recipient uuid,
  p_type public.notification_type,
  p_actor uuid,
  p_target_type text default null,
  p_target_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_pref_key text;
begin
  if p_recipient is null or p_recipient = p_actor then
    return; -- never notify yourself
  end if;
  if public.is_blocked_either(p_recipient, p_actor) then
    return;
  end if;

  v_pref_key := case p_type
    when 'new_follower' then 'new_followers'
    when 'review_like' then 'review_likes'
    when 'list_like' then 'review_likes'
    when 'diary_like' then 'review_likes'
    when 'comment' then 'comments'
    when 'comment_reply' then 'comments'
    when 'friend_request' then 'friend_activity'
    when 'friend_accepted' then 'friend_activity'
    else null
  end;
  if v_pref_key is not null and not coalesce(
    (select (notification_prefs ->> v_pref_key)::boolean from public.profiles where id = p_recipient),
    true
  ) then
    return; -- recipient disabled this category
  end if;

  if p_type not in ('comment', 'comment_reply') then
    delete from public.notifications
    where recipient_id = p_recipient
      and type = p_type
      and actor_id is not distinct from p_actor
      and target_type is not distinct from p_target_type
      and target_id is not distinct from p_target_id
      and read_at is null;
  end if;

  insert into public.notifications (recipient_id, type, actor_id, target_type, target_id, metadata)
  values (p_recipient, p_type, p_actor, p_target_type, p_target_id, coalesce(p_metadata, '{}'::jsonb));
end;
$$;

-- ── Generation triggers ─────────────────────────────────────────────────────

-- New follower.
create or replace function public.notify_on_follow()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.create_notification(
    new.following_id, 'new_follower', new.follower_id, 'profile', new.follower_id
  );
  return new;
end;
$$;

create trigger follows_notify after insert on public.follows
  for each row execute function public.notify_on_follow();

-- Review like added / removed.
create or replace function public.notify_on_review_like()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_author uuid;
begin
  if tg_op = 'INSERT' then
    select user_id into v_author from public.reviews where id = new.review_id;
    perform public.create_notification(
      v_author, 'review_like', new.user_id, 'review', new.review_id
    );
    return new;
  else
    select user_id into v_author from public.reviews where id = old.review_id;
    delete from public.notifications
    where recipient_id = v_author and type = 'review_like'
      and actor_id = old.user_id and target_type = 'review' and target_id = old.review_id
      and read_at is null;
    return old;
  end if;
end;
$$;

create trigger review_likes_notify_insert after insert on public.review_likes
  for each row execute function public.notify_on_review_like();
create trigger review_likes_notify_delete after delete on public.review_likes
  for each row execute function public.notify_on_review_like();

-- Content like (list / diary entry) added. Comment likes are intentionally
-- not notified (low signal); the like counter still updates.
create or replace function public.notify_on_content_like()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_owner uuid;
  v_type public.notification_type;
begin
  if new.target_type = 'list' then
    select user_id into v_owner from public.lists where id = new.target_id;
    v_type := 'list_like';
  elsif new.target_type = 'diary_entry' then
    select user_id into v_owner from public.diary_entries where id = new.target_id;
    v_type := 'diary_like';
  else
    return new; -- comment likes: no notification
  end if;
  perform public.create_notification(
    v_owner, v_type, new.user_id, new.target_type::text, new.target_id
  );
  return new;
end;
$$;

create trigger content_likes_notify after insert on public.content_likes
  for each row execute function public.notify_on_content_like();

-- Comment posted: notify content owner, and the parent-comment author on replies.
create or replace function public.notify_on_comment()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_owner uuid;
  v_parent_author uuid;
begin
  v_owner := case new.target_type
    when 'review'      then (select user_id from public.reviews where id = new.target_id)
    when 'list'        then (select user_id from public.lists where id = new.target_id)
    when 'diary_entry' then (select user_id from public.diary_entries where id = new.target_id)
  end;
  perform public.create_notification(
    v_owner, 'comment', new.user_id, new.target_type::text, new.target_id,
    jsonb_build_object('comment_id', new.id)
  );

  if new.parent_id is not null then
    select user_id into v_parent_author from public.comments where id = new.parent_id;
    -- Skip if the parent author is the content owner (already notified above).
    if v_parent_author is distinct from v_owner then
      perform public.create_notification(
        v_parent_author, 'comment_reply', new.user_id, new.target_type::text, new.target_id,
        jsonb_build_object('comment_id', new.id, 'parent_id', new.parent_id)
      );
    end if;
  end if;
  return new;
end;
$$;

create trigger comments_notify after insert on public.comments
  for each row execute function public.notify_on_comment();

-- Friend request received / accepted. Captures both explicit accept
-- (respond_friend_request) and reciprocal auto-accept (send_friend_request),
-- since both land as an UPDATE to status = 'accepted'.
create or replace function public.notify_on_friendship()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'pending' then
      perform public.create_notification(
        new.addressee_id, 'friend_request', new.requester_id, 'profile', new.requester_id
      );
    end if;
    return new;
  else -- UPDATE
    if old.status <> 'accepted' and new.status = 'accepted' then
      -- The requester learns their request was accepted; the accepter is the addressee.
      perform public.create_notification(
        new.requester_id, 'friend_accepted', new.addressee_id, 'profile', new.addressee_id
      );
    end if;
    return new;
  end if;
end;
$$;

create trigger friendships_notify after insert or update on public.friendships
  for each row execute function public.notify_on_friendship();

-- ── Reader / writer RPCs ─────────────────────────────────────────────────────

-- Paginated inbox with the actor profile joined in (mirrors get_activity_feed).
create or replace function public.get_notifications(
  p_before timestamptz default null,
  p_limit integer default 30
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_limit integer := least(greatest(coalesce(p_limit, 30), 1), 50);
  v_result jsonb;
begin
  if v_user is null then
    raise exception 'Not authenticated.';
  end if;

  with rows as (
    select n.*
    from public.notifications n
    where n.recipient_id = v_user
      and (p_before is null or n.created_at < p_before)
    order by n.created_at desc
    limit v_limit
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', r.id,
      'type', r.type,
      'target_type', r.target_type,
      'target_id', r.target_id,
      'metadata', r.metadata,
      'read_at', r.read_at,
      'created_at', r.created_at,
      'actor', case when p.id is null then null else jsonb_build_object(
        'id', p.id, 'username', p.username,
        'display_name', p.display_name, 'avatar_path', p.avatar_path
      ) end
    )
    order by r.created_at desc
  ), '[]'::jsonb)
  into v_result
  from rows r
  left join public.profiles p on p.id = r.actor_id;

  return v_result;
end;
$$;

create or replace function public.get_unread_notification_count()
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select count(*)::integer
  from public.notifications
  where recipient_id = auth.uid() and read_at is null;
$$;

-- Mark specific notifications read, or all when p_ids is null.
create or replace function public.mark_notifications_read(p_ids uuid[] default null)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Not authenticated.';
  end if;
  update public.notifications
  set read_at = now()
  where recipient_id = v_user
    and read_at is null
    and (p_ids is null or id = any(p_ids));
end;
$$;

-- Register / reassign an Expo push token for the current user.
create or replace function public.register_push_token(p_token text, p_platform text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Not authenticated.';
  end if;
  if p_token is null or char_length(p_token) not between 1 and 512 then
    raise exception 'Invalid push token.';
  end if;
  if p_platform not in ('ios', 'android', 'web') then
    raise exception 'Invalid platform.';
  end if;
  insert into public.push_tokens (token, user_id, platform)
  values (p_token, v_user, p_platform)
  on conflict (token) do update set
    user_id = excluded.user_id, platform = excluded.platform, updated_at = now();
end;
$$;

create or replace function public.unregister_push_token(p_token text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  delete from public.push_tokens where token = p_token and user_id = auth.uid();
end;
$$;

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- Notifications: recipient reads and deletes own; NO insert/update policy (rows
-- come only from create_notification; read state via mark_notifications_read).
alter table public.notifications enable row level security;

create policy "users read own notifications"
  on public.notifications for select
  using (auth.uid() = recipient_id);

create policy "users delete own notifications"
  on public.notifications for delete
  using (auth.uid() = recipient_id);

-- Push tokens: fully private to the owner. Writes go through the RPCs above, but
-- a select/delete policy lets the client read/clear its own device rows.
alter table public.push_tokens enable row level security;

create policy "users read own push tokens"
  on public.push_tokens for select
  using (auth.uid() = user_id);

create policy "users delete own push tokens"
  on public.push_tokens for delete
  using (auth.uid() = user_id);

-- ── Grants ───────────────────────────────────────────────────────────────────

-- create_notification is internal: only the definer notify_* triggers call it.
revoke all on function public.create_notification(uuid, public.notification_type, uuid, text, uuid, jsonb) from public, anon, authenticated;

revoke all on function public.get_notifications(timestamptz, integer) from public, anon;
grant execute on function public.get_notifications(timestamptz, integer) to authenticated;

revoke all on function public.get_unread_notification_count() from public, anon;
grant execute on function public.get_unread_notification_count() to authenticated;

revoke all on function public.mark_notifications_read(uuid[]) from public, anon;
grant execute on function public.mark_notifications_read(uuid[]) to authenticated;

revoke all on function public.register_push_token(text, text) from public, anon;
grant execute on function public.register_push_token(text, text) to authenticated;

revoke all on function public.unregister_push_token(text) from public, anon;
grant execute on function public.unregister_push_token(text) to authenticated;

revoke all on function public.notify_on_follow() from public, anon, authenticated;
revoke all on function public.notify_on_review_like() from public, anon, authenticated;
revoke all on function public.notify_on_content_like() from public, anon, authenticated;
revoke all on function public.notify_on_comment() from public, anon, authenticated;
revoke all on function public.notify_on_friendship() from public, anon, authenticated;

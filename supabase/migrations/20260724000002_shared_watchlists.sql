-- Watchd shared watchlists: a dedicated couple/group "our watchlist" space,
-- distinct from the personal watchlist (user_title_status) and personal lists.
-- Membership is invite-only; invites can only be sent to friends.
--
-- Security model matches the rest of the schema: RLS deny-by-default, all writes
-- via SECURITY DEFINER RPCs (no client write policies), counters trigger-
-- maintained. SELECT policies consult membership through the SECURITY DEFINER
-- is_swl_member() helper so a policy never queries a table that re-triggers its
-- own policy (no RLS recursion).

-- ── Tables ───────────────────────────────────────────────────────────────────

create table public.shared_watchlists (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  created_by uuid not null references public.profiles (id) on delete cascade,
  -- Trigger-maintained counters; no column grants issued (see RLS below: the
  -- table has no client UPDATE policy at all, so these are unreachable anyway).
  member_count integer not null default 0 check (member_count >= 0),
  item_count integer not null default 0 check (item_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index shared_watchlists_creator_idx on public.shared_watchlists (created_by);

create table public.shared_watchlist_members (
  watchlist_id uuid not null references public.shared_watchlists (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (watchlist_id, user_id)
);

create index shared_watchlist_members_user_idx on public.shared_watchlist_members (user_id);

create table public.shared_watchlist_items (
  id uuid primary key default gen_random_uuid(),
  watchlist_id uuid not null references public.shared_watchlists (id) on delete cascade,
  title_id uuid not null references public.titles (id) on delete cascade,
  -- Nullable + set null: an item survives the member who added it leaving.
  added_by uuid references public.profiles (id) on delete set null,
  note text check (note is null or char_length(note) <= 280),
  watched boolean not null default false,
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  constraint shared_watchlist_items_unique unique (watchlist_id, title_id)
);

create index shared_watchlist_items_list_idx on public.shared_watchlist_items (watchlist_id, created_at desc);

create table public.shared_watchlist_invites (
  id uuid primary key default gen_random_uuid(),
  watchlist_id uuid not null references public.shared_watchlists (id) on delete cascade,
  inviter_id uuid not null references public.profiles (id) on delete cascade,
  invitee_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint shared_watchlist_invites_unique unique (watchlist_id, invitee_id),
  constraint shared_watchlist_invites_no_self check (inviter_id <> invitee_id)
);

create index shared_watchlist_invites_invitee_pending_idx
  on public.shared_watchlist_invites (invitee_id) where status = 'pending';

-- ── Membership helpers (SECURITY DEFINER → no RLS recursion) ─────────────────

create or replace function public.is_swl_member(p_list uuid, p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p_list is not null and p_user is not null and exists (
    select 1 from public.shared_watchlist_members
    where watchlist_id = p_list and user_id = p_user
  );
$$;

create or replace function public.is_swl_owner(p_list uuid, p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p_list is not null and p_user is not null and exists (
    select 1 from public.shared_watchlist_members
    where watchlist_id = p_list and user_id = p_user and role = 'owner'
  );
$$;

-- ── updated_at + counter maintenance ─────────────────────────────────────────

create trigger shared_watchlists_updated_at before update on public.shared_watchlists
  for each row execute function public.set_updated_at();

create or replace function public.handle_swl_member_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    update public.shared_watchlists
      set member_count = member_count + 1, updated_at = now()
      where id = new.watchlist_id;
    return new;
  else
    update public.shared_watchlists
      set member_count = greatest(0, member_count - 1), updated_at = now()
      where id = old.watchlist_id;
    return old;
  end if;
end;
$$;

create trigger shared_watchlist_members_after_insert
  after insert on public.shared_watchlist_members
  for each row execute function public.handle_swl_member_change();
create trigger shared_watchlist_members_after_delete
  after delete on public.shared_watchlist_members
  for each row execute function public.handle_swl_member_change();

create or replace function public.enforce_swl_item_cap()
returns trigger
language plpgsql
as $$
begin
  if (select item_count from public.shared_watchlists where id = new.watchlist_id) >= 500 then
    raise exception 'Shared watchlists can hold at most 500 titles.';
  end if;
  return new;
end;
$$;

create trigger shared_watchlist_items_enforce_cap
  before insert on public.shared_watchlist_items
  for each row execute function public.enforce_swl_item_cap();

create or replace function public.handle_swl_item_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    update public.shared_watchlists
      set item_count = item_count + 1, updated_at = now()
      where id = new.watchlist_id;
    return new;
  else
    update public.shared_watchlists
      set item_count = greatest(0, item_count - 1), updated_at = now()
      where id = old.watchlist_id;
    return old;
  end if;
end;
$$;

create trigger shared_watchlist_items_after_insert
  after insert on public.shared_watchlist_items
  for each row execute function public.handle_swl_item_change();
create trigger shared_watchlist_items_after_delete
  after delete on public.shared_watchlist_items
  for each row execute function public.handle_swl_item_change();

-- ── RPCs: the only write path into the shared_watchlist_* tables ─────────────

create or replace function public.create_shared_watchlist(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_id uuid;
begin
  if v_user is null then
    raise exception 'Not authenticated.';
  end if;
  if p_name is null or char_length(trim(p_name)) not between 1 and 100 then
    raise exception 'Name must be between 1 and 100 characters.';
  end if;

  insert into public.shared_watchlists (name, created_by)
  values (trim(p_name), v_user)
  returning id into v_id;

  insert into public.shared_watchlist_members (watchlist_id, user_id, role)
  values (v_id, v_user, 'owner');

  return v_id;
end;
$$;

create or replace function public.invite_to_shared_watchlist(p_list uuid, p_invitee uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_id uuid;
begin
  if v_user is null then
    raise exception 'Not authenticated.';
  end if;
  if not public.is_swl_member(p_list, v_user) then
    raise exception 'Only members can invite to this watchlist.';
  end if;
  if p_invitee = v_user then
    raise exception 'You are already a member.';
  end if;
  if not public.are_friends(v_user, p_invitee) then
    raise exception 'You can only invite friends.';
  end if;
  if public.is_blocked_either(v_user, p_invitee) then
    raise exception 'You cannot invite this user.';
  end if;
  if public.is_swl_member(p_list, p_invitee) then
    raise exception 'This user is already a member.';
  end if;

  insert into public.shared_watchlist_invites (watchlist_id, inviter_id, invitee_id, status)
  values (p_list, v_user, p_invitee, 'pending')
  on conflict (watchlist_id, invitee_id) do update set
    inviter_id = excluded.inviter_id,
    status = 'pending',
    created_at = now(),
    responded_at = null
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.respond_shared_watchlist_invite(p_invite uuid, p_accept boolean)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_row public.shared_watchlist_invites%rowtype;
begin
  if v_user is null then
    raise exception 'Not authenticated.';
  end if;

  select * into v_row from public.shared_watchlist_invites where id = p_invite;
  if v_row.id is null then
    raise exception 'Invite not found.';
  end if;
  if v_row.invitee_id <> v_user then
    raise exception 'You cannot respond to this invite.';
  end if;
  if v_row.status <> 'pending' then
    raise exception 'This invite is no longer pending.';
  end if;

  if coalesce(p_accept, false) then
    insert into public.shared_watchlist_members (watchlist_id, user_id, role)
    values (v_row.watchlist_id, v_user, 'member')
    on conflict (watchlist_id, user_id) do nothing;
    update public.shared_watchlist_invites
      set status = 'accepted', responded_at = now() where id = p_invite;
    return jsonb_build_object('watchlist_id', v_row.watchlist_id, 'status', 'accepted');
  else
    update public.shared_watchlist_invites
      set status = 'declined', responded_at = now() where id = p_invite;
    return jsonb_build_object('watchlist_id', v_row.watchlist_id, 'status', 'declined');
  end if;
end;
$$;

create or replace function public.add_shared_watchlist_item(
  p_list uuid,
  p_title_id uuid,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_id uuid;
begin
  if v_user is null then
    raise exception 'Not authenticated.';
  end if;
  if not public.is_swl_member(p_list, v_user) then
    raise exception 'Only members can add to this watchlist.';
  end if;
  if not exists (select 1 from public.titles where id = p_title_id) then
    raise exception 'Unknown title.';
  end if;
  if p_note is not null and char_length(p_note) > 280 then
    raise exception 'Notes must be 280 characters or fewer.';
  end if;

  insert into public.shared_watchlist_items (watchlist_id, title_id, added_by, note)
  values (p_list, p_title_id, v_user, p_note)
  on conflict (watchlist_id, title_id) do nothing
  returning id into v_id;

  if v_id is null then
    select id into v_id from public.shared_watchlist_items
    where watchlist_id = p_list and title_id = p_title_id;
  end if;

  return v_id;
end;
$$;

create or replace function public.remove_shared_watchlist_item(p_item uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_list uuid;
begin
  if v_user is null then
    raise exception 'Not authenticated.';
  end if;
  select watchlist_id into v_list from public.shared_watchlist_items where id = p_item;
  if v_list is null then
    return;
  end if;
  if not public.is_swl_member(v_list, v_user) then
    raise exception 'Only members can edit this watchlist.';
  end if;
  delete from public.shared_watchlist_items where id = p_item;
end;
$$;

create or replace function public.set_shared_watchlist_item_watched(p_item uuid, p_watched boolean)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_list uuid;
begin
  if v_user is null then
    raise exception 'Not authenticated.';
  end if;
  select watchlist_id into v_list from public.shared_watchlist_items where id = p_item;
  if v_list is null then
    raise exception 'Item not found.';
  end if;
  if not public.is_swl_member(v_list, v_user) then
    raise exception 'Only members can edit this watchlist.';
  end if;
  update public.shared_watchlist_items
    set watched = coalesce(p_watched, false) where id = p_item;
end;
$$;

-- Leave a watchlist. Last member out deletes it; an owner leaving with others
-- present hands ownership to the earliest-joined remaining member.
create or replace function public.leave_shared_watchlist(p_list uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_was_owner boolean;
  v_remaining integer;
  v_next uuid;
begin
  if v_user is null then
    raise exception 'Not authenticated.';
  end if;

  select role = 'owner' into v_was_owner
  from public.shared_watchlist_members
  where watchlist_id = p_list and user_id = v_user;
  if v_was_owner is null then
    return; -- not a member
  end if;

  delete from public.shared_watchlist_members
  where watchlist_id = p_list and user_id = v_user;

  select count(*) into v_remaining
  from public.shared_watchlist_members where watchlist_id = p_list;

  if v_remaining = 0 then
    delete from public.shared_watchlists where id = p_list;
  elsif v_was_owner then
    select user_id into v_next from public.shared_watchlist_members
    where watchlist_id = p_list order by joined_at asc limit 1;
    update public.shared_watchlist_members
      set role = 'owner' where watchlist_id = p_list and user_id = v_next;
  end if;
end;
$$;

create or replace function public.remove_shared_watchlist_member(p_list uuid, p_user uuid)
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
  if not public.is_swl_owner(p_list, v_user) then
    raise exception 'Only the owner can remove members.';
  end if;
  if p_user = v_user then
    raise exception 'Use leave_shared_watchlist to remove yourself.';
  end if;
  delete from public.shared_watchlist_members
  where watchlist_id = p_list and user_id = p_user;
end;
$$;

-- ── Read RPCs (joined jsonb payloads, mirroring get_activity_feed) ───────────

create or replace function public.get_shared_watchlists()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_result jsonb;
begin
  if v_user is null then
    raise exception 'Not authenticated.';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', w.id,
      'name', w.name,
      'member_count', w.member_count,
      'item_count', w.item_count,
      'role', m.role,
      'updated_at', w.updated_at
    ) order by w.updated_at desc
  ), '[]'::jsonb)
  into v_result
  from public.shared_watchlist_members m
  join public.shared_watchlists w on w.id = m.watchlist_id
  where m.user_id = v_user;

  return jsonb_build_object(
    'watchlists', v_result,
    'pending_invite_count', (
      select count(*) from public.shared_watchlist_invites
      where invitee_id = v_user and status = 'pending'
    )
  );
end;
$$;

create or replace function public.get_pending_shared_watchlist_invites()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_result jsonb;
begin
  if v_user is null then
    raise exception 'Not authenticated.';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', i.id,
      'watchlist', jsonb_build_object('id', w.id, 'name', w.name, 'item_count', w.item_count),
      'inviter', jsonb_build_object(
        'id', p.id, 'username', p.username,
        'display_name', p.display_name, 'avatar_path', p.avatar_path
      ),
      'created_at', i.created_at
    ) order by i.created_at desc
  ), '[]'::jsonb)
  into v_result
  from public.shared_watchlist_invites i
  join public.shared_watchlists w on w.id = i.watchlist_id
  join public.profiles p on p.id = i.inviter_id
  where i.invitee_id = v_user and i.status = 'pending';

  return v_result;
end;
$$;

create or replace function public.get_shared_watchlist(p_list uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_result jsonb;
begin
  if v_user is null then
    raise exception 'Not authenticated.';
  end if;
  if not public.is_swl_member(p_list, v_user) then
    raise exception 'You are not a member of this watchlist.';
  end if;

  select jsonb_build_object(
    'id', w.id,
    'name', w.name,
    'member_count', w.member_count,
    'item_count', w.item_count,
    'created_by', w.created_by,
    'my_role', (select role from public.shared_watchlist_members
                where watchlist_id = w.id and user_id = v_user),
    'members', (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'id', p.id, 'username', p.username, 'display_name', p.display_name,
          'avatar_path', p.avatar_path, 'role', m.role, 'joined_at', m.joined_at
        ) order by m.joined_at asc
      ), '[]'::jsonb)
      from public.shared_watchlist_members m
      join public.profiles p on p.id = m.user_id
      where m.watchlist_id = w.id
    ),
    'items', (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'id', it.id,
          'note', it.note,
          'watched', it.watched,
          'created_at', it.created_at,
          'added_by', case when ap.id is null then null else jsonb_build_object(
            'id', ap.id, 'username', ap.username, 'display_name', ap.display_name
          ) end,
          'title', jsonb_build_object(
            'id', t.id, 'tmdb_id', t.tmdb_id, 'media_type', t.media_type,
            'title', t.title, 'poster_path', t.poster_path, 'release_date', t.release_date
          )
        ) order by it.created_at desc
      ), '[]'::jsonb)
      from public.shared_watchlist_items it
      join public.titles t on t.id = it.title_id
      left join public.profiles ap on ap.id = it.added_by
      where it.watchlist_id = w.id
    )
  )
  into v_result
  from public.shared_watchlists w
  where w.id = p_list;

  return v_result;
end;
$$;

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- SELECT via is_swl_member (invites also visible to the invitee). No client
-- write policies anywhere: every mutation routes through the RPCs above.

alter table public.shared_watchlists enable row level security;
alter table public.shared_watchlist_members enable row level security;
alter table public.shared_watchlist_items enable row level security;
alter table public.shared_watchlist_invites enable row level security;

create policy "members read their shared watchlists"
  on public.shared_watchlists for select
  using (public.is_swl_member(id, auth.uid()));

create policy "members read the member list"
  on public.shared_watchlist_members for select
  using (public.is_swl_member(watchlist_id, auth.uid()));

create policy "members read shared watchlist items"
  on public.shared_watchlist_items for select
  using (public.is_swl_member(watchlist_id, auth.uid()));

create policy "invites visible to invitee and members"
  on public.shared_watchlist_invites for select
  using (auth.uid() = invitee_id or public.is_swl_member(watchlist_id, auth.uid()));

-- ── Grants ───────────────────────────────────────────────────────────────────

revoke all on function public.is_swl_member(uuid, uuid) from public;
grant execute on function public.is_swl_member(uuid, uuid) to authenticated, anon;
revoke all on function public.is_swl_owner(uuid, uuid) from public;
grant execute on function public.is_swl_owner(uuid, uuid) to authenticated, anon;

revoke all on function public.create_shared_watchlist(text) from public, anon;
grant execute on function public.create_shared_watchlist(text) to authenticated;
revoke all on function public.invite_to_shared_watchlist(uuid, uuid) from public, anon;
grant execute on function public.invite_to_shared_watchlist(uuid, uuid) to authenticated;
revoke all on function public.respond_shared_watchlist_invite(uuid, boolean) from public, anon;
grant execute on function public.respond_shared_watchlist_invite(uuid, boolean) to authenticated;
revoke all on function public.add_shared_watchlist_item(uuid, uuid, text) from public, anon;
grant execute on function public.add_shared_watchlist_item(uuid, uuid, text) to authenticated;
revoke all on function public.remove_shared_watchlist_item(uuid) from public, anon;
grant execute on function public.remove_shared_watchlist_item(uuid) to authenticated;
revoke all on function public.set_shared_watchlist_item_watched(uuid, boolean) from public, anon;
grant execute on function public.set_shared_watchlist_item_watched(uuid, boolean) to authenticated;
revoke all on function public.leave_shared_watchlist(uuid) from public, anon;
grant execute on function public.leave_shared_watchlist(uuid) to authenticated;
revoke all on function public.remove_shared_watchlist_member(uuid, uuid) from public, anon;
grant execute on function public.remove_shared_watchlist_member(uuid, uuid) to authenticated;
revoke all on function public.get_shared_watchlists() from public, anon;
grant execute on function public.get_shared_watchlists() to authenticated;
revoke all on function public.get_pending_shared_watchlist_invites() from public, anon;
grant execute on function public.get_pending_shared_watchlist_invites() to authenticated;
revoke all on function public.get_shared_watchlist(uuid) from public, anon;
grant execute on function public.get_shared_watchlist(uuid) to authenticated;

revoke all on function public.handle_swl_member_change() from public, anon, authenticated;
revoke all on function public.handle_swl_item_change() from public, anon, authenticated;
revoke all on function public.enforce_swl_item_cap() from public, anon, authenticated;

-- Watchd functions and triggers.
-- All SECURITY DEFINER functions pin search_path and validate auth.uid().
-- Activities are generated ONLY here — clients have no insert path.

-- ── updated_at maintenance ───────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger user_title_status_updated_at before update on public.user_title_status
  for each row execute function public.set_updated_at();
create trigger diary_entries_updated_at before update on public.diary_entries
  for each row execute function public.set_updated_at();
create trigger tv_progress_updated_at before update on public.tv_progress
  for each row execute function public.set_updated_at();
create trigger reviews_updated_at before update on public.reviews
  for each row execute function public.set_updated_at();
create trigger lists_updated_at before update on public.lists
  for each row execute function public.set_updated_at();

-- ── Profile bootstrap on signup ──────────────────────────────────────────────
-- Every auth user gets a placeholder username immediately; onboarding replaces it.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_base text := 'user_' || substr(replace(new.id::text, '-', ''), 1, 8);
  v_suffix integer := 0;
begin
  loop
    begin
      insert into public.profiles (id, username)
      values (new.id, case when v_suffix = 0 then v_base else v_base || v_suffix end);
      exit;
    exception when unique_violation then
      v_suffix := v_suffix + 1;
      if v_suffix > 5 then
        raise;
      end if;
    end;
  end loop;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Username availability (used during onboarding) ──────────────────────────

create or replace function public.is_username_available(p_username text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select char_length(trim(p_username)) between 3 and 20
     and trim(p_username) ~ '^[A-Za-z0-9_]+$'
     and not exists (
       select 1 from public.profiles
       where lower(username) = lower(trim(p_username)) and id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000')
     );
$$;

-- ── Block helper for RLS policies ────────────────────────────────────────────
-- SECURITY DEFINER so policies can consult blocks regardless of blocks' own RLS.

create or replace function public.is_blocked_either(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select a is not null and b is not null and exists (
    select 1 from public.blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  );
$$;

-- ── Follows: block enforcement, counters, activity ───────────────────────────

create or replace function public.enforce_follow_allowed()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if public.is_blocked_either(new.follower_id, new.following_id) then
    raise exception 'You cannot follow this user.';
  end if;
  return new;
end;
$$;

create trigger follows_enforce_allowed
  before insert on public.follows
  for each row execute function public.enforce_follow_allowed();

create or replace function public.handle_follow_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.profiles set follower_count = follower_count + 1 where id = new.following_id;
  update public.profiles set following_count = following_count + 1 where id = new.follower_id;
  insert into public.activities (actor_id, activity_type, subject_user_id)
  values (new.follower_id, 'followed', new.following_id);
  return new;
end;
$$;

create trigger follows_after_insert
  after insert on public.follows
  for each row execute function public.handle_follow_insert();

create or replace function public.handle_follow_delete()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.profiles set follower_count = greatest(0, follower_count - 1) where id = old.following_id;
  update public.profiles set following_count = greatest(0, following_count - 1) where id = old.follower_id;
  delete from public.activities
  where actor_id = old.follower_id
    and activity_type = 'followed'
    and subject_user_id = old.following_id;
  return old;
end;
$$;

create trigger follows_after_delete
  after delete on public.follows
  for each row execute function public.handle_follow_delete();

-- ── Review likes: counter maintenance ────────────────────────────────────────

create or replace function public.handle_review_like_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    update public.reviews set like_count = like_count + 1 where id = new.review_id;
    return new;
  else
    update public.reviews set like_count = greatest(0, like_count - 1) where id = old.review_id;
    return old;
  end if;
end;
$$;

create trigger review_likes_after_insert
  after insert on public.review_likes
  for each row execute function public.handle_review_like_change();
create trigger review_likes_after_delete
  after delete on public.review_likes
  for each row execute function public.handle_review_like_change();

-- ── Lists: item counter, size cap, public-list activity ─────────────────────

create or replace function public.enforce_list_item_cap()
returns trigger
language plpgsql
as $$
begin
  if (select item_count from public.lists where id = new.list_id) >= 500 then
    raise exception 'Lists can hold at most 500 titles.';
  end if;
  return new;
end;
$$;

create trigger list_items_enforce_cap
  before insert on public.list_items
  for each row execute function public.enforce_list_item_cap();

create or replace function public.handle_list_item_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    update public.lists set item_count = item_count + 1, updated_at = now() where id = new.list_id;
    return new;
  else
    update public.lists set item_count = greatest(0, item_count - 1), updated_at = now() where id = old.list_id;
    return old;
  end if;
end;
$$;

create trigger list_items_after_insert
  after insert on public.list_items
  for each row execute function public.handle_list_item_change();
create trigger list_items_after_delete
  after delete on public.list_items
  for each row execute function public.handle_list_item_change();

create or replace function public.handle_list_created()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.visibility = 'public' then
    insert into public.activities (actor_id, activity_type, list_id)
    values (new.user_id, 'list_created', new.id);
  end if;
  return new;
end;
$$;

create trigger lists_after_insert
  after insert on public.lists
  for each row execute function public.handle_list_created();

-- ── Title reference upsert ───────────────────────────────────────────────────
-- The only write path into titles. Validates the TMDB reference data a client
-- supplies before caching it.

create or replace function public.upsert_title_reference(
  p_tmdb_id integer,
  p_media_type public.media_type,
  p_title text,
  p_original_title text default null,
  p_poster_path text default null,
  p_backdrop_path text default null,
  p_release_date date default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_poster text;
  v_backdrop text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated.';
  end if;
  if p_tmdb_id is null or p_tmdb_id <= 0 or p_tmdb_id > 100000000 then
    raise exception 'Invalid TMDB id.';
  end if;
  if p_title is null or char_length(trim(p_title)) not between 1 and 500 then
    raise exception 'Invalid title.';
  end if;

  -- Drop malformed image paths rather than failing the whole operation.
  v_poster := case when p_poster_path ~ '^/[A-Za-z0-9._-]{1,120}$' then p_poster_path end;
  v_backdrop := case when p_backdrop_path ~ '^/[A-Za-z0-9._-]{1,120}$' then p_backdrop_path end;

  insert into public.titles (tmdb_id, media_type, title, original_title, poster_path, backdrop_path, release_date)
  values (
    p_tmdb_id,
    p_media_type,
    left(trim(p_title), 500),
    left(p_original_title, 500),
    v_poster,
    v_backdrop,
    p_release_date
  )
  on conflict (tmdb_id, media_type) do update set
    title = excluded.title,
    original_title = coalesce(excluded.original_title, titles.original_title),
    poster_path = coalesce(excluded.poster_path, titles.poster_path),
    backdrop_path = coalesce(excluded.backdrop_path, titles.backdrop_path),
    release_date = coalesce(excluded.release_date, titles.release_date),
    metadata_updated_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

-- ── log_title: the atomic "log" action ──────────────────────────────────────
-- Marks watched / rates / reviews / creates a diary entry in one transaction
-- and emits ONE combined feed activity (deduped within a 6-hour window).

create or replace function public.log_title(
  p_title_id uuid,
  p_status public.watch_status default null,
  p_rating numeric default null,
  p_watched_at date default null,
  p_review_body text default null,
  p_contains_spoilers boolean default false,
  p_is_rewatch boolean default false,
  p_create_diary_entry boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_media public.media_type;
  v_status_id uuid;
  v_review_id uuid;
  v_diary_id uuid;
  v_activity_id uuid;
  v_effective_status public.watch_status;
  v_recent integer;
begin
  if v_user is null then
    raise exception 'Not authenticated.';
  end if;

  select media_type into v_media from public.titles where id = p_title_id;
  if v_media is null then
    raise exception 'Unknown title.';
  end if;
  if p_rating is not null and (p_rating < 0.5 or p_rating > 5 or p_rating * 2 <> floor(p_rating * 2)) then
    raise exception 'Rating must be between 0.5 and 5 in half-star steps.';
  end if;
  if p_review_body is not null and char_length(p_review_body) not between 1 and 10000 then
    raise exception 'Reviews must be between 1 and 10,000 characters.';
  end if;
  if p_watched_at is not null and p_watched_at > current_date + 1 then
    raise exception 'Watched date cannot be in the future.';
  end if;

  -- Abuse guard: cap log actions per actor per minute.
  select count(*) into v_recent
  from public.activities
  where actor_id = v_user and created_at > now() - interval '1 minute';
  if v_recent >= 30 then
    raise exception 'Too many actions. Please slow down.';
  end if;

  v_effective_status := coalesce(p_status, 'watched');

  insert into public.user_title_status as uts (user_id, title_id, status, rating, watched_at)
  values (v_user, p_title_id, v_effective_status, p_rating, coalesce(p_watched_at, current_date))
  on conflict (user_id, title_id) do update set
    status = v_effective_status,
    rating = coalesce(excluded.rating, uts.rating),
    watched_at = coalesce(excluded.watched_at, uts.watched_at)
  returning id into v_status_id;

  if p_review_body is not null then
    insert into public.reviews as r (user_id, title_id, rating, body, contains_spoilers)
    values (v_user, p_title_id, p_rating, p_review_body, coalesce(p_contains_spoilers, false))
    on conflict (user_id, title_id) do update set
      rating = coalesce(excluded.rating, r.rating),
      body = excluded.body,
      contains_spoilers = excluded.contains_spoilers,
      published = true
    returning id into v_review_id;
  end if;

  if p_create_diary_entry and v_media = 'movie' and v_effective_status = 'watched' then
    insert into public.diary_entries (user_id, title_id, watched_at, rating, is_rewatch)
    values (v_user, p_title_id, coalesce(p_watched_at, current_date), p_rating, coalesce(p_is_rewatch, false))
    returning id into v_diary_id;
  end if;

  -- One combined feed entry per actor+title within a 6 hour window.
  select id into v_activity_id
  from public.activities
  where actor_id = v_user
    and title_id = p_title_id
    and activity_type = 'logged'
    and created_at > now() - interval '6 hours'
  order by created_at desc
  limit 1;

  if v_activity_id is not null then
    update public.activities set
      review_id = coalesce(v_review_id, review_id),
      created_at = now(),
      metadata = metadata
        || jsonb_strip_nulls(jsonb_build_object(
             'status', v_effective_status,
             'rating', p_rating,
             'is_rewatch', case when coalesce(p_is_rewatch, false) then true else null end
           ))
        || jsonb_build_object('has_review',
             (v_review_id is not null) or coalesce((metadata ->> 'has_review')::boolean, false))
    where id = v_activity_id;
  else
    insert into public.activities (actor_id, activity_type, title_id, review_id, metadata)
    values (
      v_user,
      'logged',
      p_title_id,
      v_review_id,
      jsonb_strip_nulls(jsonb_build_object(
        'status', v_effective_status,
        'rating', p_rating,
        'has_review', (v_review_id is not null),
        'is_rewatch', case when coalesce(p_is_rewatch, false) then true else null end,
        'media_type', v_media
      ))
    )
    returning id into v_activity_id;
  end if;

  return jsonb_build_object(
    'status_id', v_status_id,
    'review_id', v_review_id,
    'diary_entry_id', v_diary_id,
    'activity_id', v_activity_id
  );
end;
$$;

-- ── TV progress ──────────────────────────────────────────────────────────────

create or replace function public.set_tv_progress(
  p_title_id uuid,
  p_season_number integer,
  p_episode_number integer,
  p_completed boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_media public.media_type;
  v_progress_id uuid;
  v_was_completed boolean;
begin
  if v_user is null then
    raise exception 'Not authenticated.';
  end if;
  select media_type into v_media from public.titles where id = p_title_id;
  if v_media is distinct from 'tv' then
    raise exception 'TV progress can only be tracked for TV shows.';
  end if;
  if p_season_number not between 0 and 200 or p_episode_number not between 0 and 2000 then
    raise exception 'Invalid season or episode number.';
  end if;

  select completed into v_was_completed
  from public.tv_progress
  where user_id = v_user and title_id = p_title_id;

  insert into public.tv_progress as tp (user_id, title_id, season_number, episode_number, completed, last_watched_at)
  values (v_user, p_title_id, p_season_number, p_episode_number, coalesce(p_completed, false), now())
  on conflict (user_id, title_id) do update set
    season_number = excluded.season_number,
    episode_number = excluded.episode_number,
    completed = excluded.completed,
    last_watched_at = now()
  returning id into v_progress_id;

  insert into public.user_title_status as uts (user_id, title_id, status, watched_at)
  values (
    v_user,
    p_title_id,
    case when coalesce(p_completed, false) then 'watched'::public.watch_status else 'watching'::public.watch_status end,
    case when coalesce(p_completed, false) then current_date end
  )
  on conflict (user_id, title_id) do update set
    status = excluded.status,
    watched_at = coalesce(excluded.watched_at, uts.watched_at);

  if coalesce(p_completed, false) and not coalesce(v_was_completed, false) then
    if not exists (
      select 1 from public.activities
      where actor_id = v_user and title_id = p_title_id and activity_type = 'tv_completed'
        and created_at > now() - interval '30 days'
    ) then
      insert into public.activities (actor_id, activity_type, title_id, metadata)
      values (v_user, 'tv_completed', p_title_id, jsonb_build_object('media_type', 'tv'));
    end if;
  end if;

  return v_progress_id;
end;
$$;

-- ── Community summary for a title page ───────────────────────────────────────

create or replace function public.get_title_community_summary(
  p_tmdb_id integer,
  p_media_type public.media_type
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_title_id uuid;
  v_result jsonb;
begin
  select id into v_title_id from public.titles
  where tmdb_id = p_tmdb_id and media_type = p_media_type;

  if v_title_id is null then
    return jsonb_build_object(
      'avg_rating', null, 'rating_count', 0, 'watched_count', 0,
      'watchlist_count', 0, 'review_count', 0
    );
  end if;

  select jsonb_build_object(
    'avg_rating', round(avg(rating)::numeric, 2),
    'rating_count', count(rating),
    'watched_count', count(*) filter (where status = 'watched'),
    'watchlist_count', count(*) filter (where status = 'watchlist'),
    'review_count', (select count(*) from public.reviews where title_id = v_title_id and published)
  )
  into v_result
  from public.user_title_status
  where title_id = v_title_id;

  return v_result;
end;
$$;

-- ── Activity feed ────────────────────────────────────────────────────────────
-- Single round trip: follows ∪ self, blocks respected, joined payload,
-- keyset-paginated by created_at.

create or replace function public.get_activity_feed(
  p_before timestamptz default null,
  p_limit integer default 20
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_limit integer := least(greatest(coalesce(p_limit, 20), 1), 50);
  v_result jsonb;
begin
  if v_user is null then
    raise exception 'Not authenticated.';
  end if;

  with feed as (
    select a.*
    from public.activities a
    where (
        a.actor_id = v_user
        or a.actor_id in (select following_id from public.follows where follower_id = v_user)
      )
      and not public.is_blocked_either(v_user, a.actor_id)
      and (p_before is null or a.created_at < p_before)
    order by a.created_at desc, a.id desc
    limit v_limit
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', f.id,
      'activity_type', f.activity_type,
      'created_at', f.created_at,
      'metadata', f.metadata,
      'actor', jsonb_build_object(
        'id', p.id, 'username', p.username,
        'display_name', p.display_name, 'avatar_path', p.avatar_path
      ),
      'title', case when t.id is null then null else jsonb_build_object(
        'id', t.id, 'tmdb_id', t.tmdb_id, 'media_type', t.media_type,
        'title', t.title, 'poster_path', t.poster_path, 'release_date', t.release_date
      ) end,
      'review', case when r.id is null or not r.published then null else jsonb_build_object(
        'id', r.id, 'rating', r.rating, 'body', left(r.body, 600),
        'contains_spoilers', r.contains_spoilers, 'like_count', r.like_count
      ) end,
      'list', case when l.id is null or (l.visibility <> 'public' and l.user_id <> v_user) then null
        else jsonb_build_object('id', l.id, 'name', l.name, 'visibility', l.visibility) end,
      'subject_user', case when su.id is null then null else jsonb_build_object(
        'id', su.id, 'username', su.username,
        'display_name', su.display_name, 'avatar_path', su.avatar_path
      ) end
    )
    order by f.created_at desc, f.id desc
  ), '[]'::jsonb)
  into v_result
  from feed f
  join public.profiles p on p.id = f.actor_id
  left join public.titles t on t.id = f.title_id
  left join public.reviews r on r.id = f.review_id
  left join public.lists l on l.id = f.list_id
  left join public.profiles su on su.id = f.subject_user_id;

  return v_result;
end;
$$;

-- ── Account deletion ─────────────────────────────────────────────────────────
-- Deleting the auth user cascades through profiles to all user data.

create or replace function public.delete_account()
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
  delete from auth.users where id = v_user;
end;
$$;

-- ── Function grants ──────────────────────────────────────────────────────────
-- Postgres grants EXECUTE to public by default; restrict to what each needs.

revoke all on function public.is_username_available(text) from public, anon;
grant execute on function public.is_username_available(text) to authenticated;

revoke all on function public.is_blocked_either(uuid, uuid) from public;
grant execute on function public.is_blocked_either(uuid, uuid) to authenticated, anon;

revoke all on function public.upsert_title_reference(integer, public.media_type, text, text, text, text, date) from public, anon;
grant execute on function public.upsert_title_reference(integer, public.media_type, text, text, text, text, date) to authenticated;

revoke all on function public.log_title(uuid, public.watch_status, numeric, date, text, boolean, boolean, boolean) from public, anon;
grant execute on function public.log_title(uuid, public.watch_status, numeric, date, text, boolean, boolean, boolean) to authenticated;

revoke all on function public.set_tv_progress(uuid, integer, integer, boolean) from public, anon;
grant execute on function public.set_tv_progress(uuid, integer, integer, boolean) to authenticated;

revoke all on function public.get_title_community_summary(integer, public.media_type) from public;
grant execute on function public.get_title_community_summary(integer, public.media_type) to authenticated, anon;

revoke all on function public.get_activity_feed(timestamptz, integer) from public, anon;
grant execute on function public.get_activity_feed(timestamptz, integer) to authenticated;

revoke all on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;

-- Trigger functions should not be callable directly.
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.handle_follow_insert() from public, anon, authenticated;
revoke all on function public.handle_follow_delete() from public, anon, authenticated;
revoke all on function public.enforce_follow_allowed() from public, anon, authenticated;
revoke all on function public.handle_review_like_change() from public, anon, authenticated;
revoke all on function public.handle_list_item_change() from public, anon, authenticated;
revoke all on function public.handle_list_created() from public, anon, authenticated;
revoke all on function public.enforce_list_item_cap() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;

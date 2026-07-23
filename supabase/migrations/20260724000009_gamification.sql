-- Phase 2: gamification — annual watch challenge, badges, streaks.
--
-- Builds on stats (watched counts) + notifications (achievement pings). Progress
-- is derived from user_title_status, so it can't drift; challenge completion and
-- badges are awarded by milestone triggers on the watched write path.

-- ── user_challenges: one yearly goal per user ────────────────────────────────

create table public.user_challenges (
  user_id uuid not null references public.profiles (id) on delete cascade,
  year integer not null check (year between 1900 and 3000),
  goal integer not null check (goal between 1 and 10000),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, year)
);

create trigger user_challenges_updated_at before update on public.user_challenges
  for each row execute function public.set_updated_at();

-- ── badges: catalogue + awards ───────────────────────────────────────────────

create table public.badges (
  code text primary key,
  name text not null,
  description text not null,
  icon text not null,
  sort integer not null default 0
);

create table public.user_badges (
  user_id uuid not null references public.profiles (id) on delete cascade,
  badge_code text not null references public.badges (code) on delete cascade,
  awarded_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  primary key (user_id, badge_code)
);

create index user_badges_user_idx on public.user_badges (user_id, awarded_at desc);

insert into public.badges (code, name, description, icon, sort) values
  ('first_review',  'Critic',        'Wrote your first review',              'create-outline', 10),
  ('films_10',      'Matinee',       'Watched 10 films',                     'film-outline',   20),
  ('films_50',      'Cinephile',     'Watched 50 films',                     'film',           30),
  ('films_100',     'Century Club',  'Watched 100 films',                    'trophy-outline', 40),
  ('shows_10',      'Binger',        'Watched 10 shows',                     'tv-outline',     50),
  ('shows_25',      'Showrunner',    'Watched 25 shows',                     'tv',             60),
  ('challenge_done','Goal Getter',   'Completed a yearly watch challenge',   'flag',           70)
on conflict (code) do nothing;

-- ── create_notification: allow self-notifications for achievements ───────────
-- Redefine (was 20260724000005) so a user CAN be pinged about their own badge /
-- challenge — every other type still skips self.

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
  if p_recipient is null then
    return;
  end if;
  -- Self-notifications are allowed only for achievement types.
  if p_recipient = p_actor and p_type not in ('badge_earned', 'challenge_completed') then
    return;
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
    return;
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

-- ── award_badge: idempotent grant + achievement feed/notification ────────────

create or replace function public.award_badge(p_user uuid, p_code text, p_metadata jsonb default '{}'::jsonb)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer;
begin
  insert into public.user_badges (user_id, badge_code, metadata)
  values (p_user, p_code, coalesce(p_metadata, '{}'::jsonb))
  on conflict (user_id, badge_code) do nothing;
  get diagnostics v_count = row_count;
  if v_count = 1 then
    insert into public.activities (actor_id, activity_type, metadata)
    values (p_user, 'badge_earned', jsonb_build_object('badge_code', p_code));
    perform public.create_notification(
      p_user, 'badge_earned', p_user, 'profile', p_user, jsonb_build_object('badge_code', p_code)
    );
    return true;
  end if;
  return false;
end;
$$;

-- ── Milestone triggers ───────────────────────────────────────────────────────

create or replace function public.handle_watch_milestones()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := new.user_id;
  v_films integer;
  v_shows integer;
  v_year integer;
  v_goal integer;
  v_completed timestamptz;
  v_watched integer;
begin
  if new.status is distinct from 'watched' then
    return new;
  end if;

  select count(*) into v_films
  from public.user_title_status uts join public.titles t on t.id = uts.title_id
  where uts.user_id = v_user and uts.status = 'watched' and t.media_type = 'movie';
  select count(*) into v_shows
  from public.user_title_status uts join public.titles t on t.id = uts.title_id
  where uts.user_id = v_user and uts.status = 'watched' and t.media_type = 'tv';

  if v_films >= 100 then perform public.award_badge(v_user, 'films_100'); end if;
  if v_films >= 50 then perform public.award_badge(v_user, 'films_50'); end if;
  if v_films >= 10 then perform public.award_badge(v_user, 'films_10'); end if;
  if v_shows >= 25 then perform public.award_badge(v_user, 'shows_25'); end if;
  if v_shows >= 10 then perform public.award_badge(v_user, 'shows_10'); end if;

  -- Yearly challenge completion for the watched date's year.
  if new.watched_at is not null then
    v_year := extract(year from new.watched_at)::int;
    select goal, completed_at into v_goal, v_completed
    from public.user_challenges where user_id = v_user and year = v_year;
    if v_goal is not null and v_completed is null then
      select count(*) into v_watched
      from public.user_title_status
      where user_id = v_user and status = 'watched' and watched_at is not null
        and extract(year from watched_at) = v_year;
      if v_watched >= v_goal then
        update public.user_challenges set completed_at = now()
        where user_id = v_user and year = v_year and completed_at is null;
        insert into public.activities (actor_id, activity_type, metadata)
        values (v_user, 'challenge_completed', jsonb_build_object('year', v_year, 'goal', v_goal));
        perform public.create_notification(
          v_user, 'challenge_completed', v_user, 'profile', v_user,
          jsonb_build_object('year', v_year, 'goal', v_goal)
        );
        perform public.award_badge(v_user, 'challenge_done', jsonb_build_object('year', v_year));
      end if;
    end if;
  end if;

  return new;
end;
$$;

create trigger user_title_status_milestones
  after insert or update on public.user_title_status
  for each row execute function public.handle_watch_milestones();

create or replace function public.handle_review_milestone()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.award_badge(new.user_id, 'first_review');
  return new;
end;
$$;

create trigger reviews_milestone
  after insert on public.reviews
  for each row execute function public.handle_review_milestone();

-- ── RPCs ─────────────────────────────────────────────────────────────────────

create or replace function public.set_watch_goal(p_year integer, p_goal integer)
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
  if p_year not between 1900 and 3000 then
    raise exception 'Invalid year.';
  end if;
  if p_goal not between 1 and 10000 then
    raise exception 'Goal must be between 1 and 10,000.';
  end if;
  insert into public.user_challenges (user_id, year, goal)
  values (v_user, p_year, p_goal)
  on conflict (user_id, year) do update set goal = excluded.goal, updated_at = now();
end;
$$;

create or replace function public.get_watch_challenge(p_user_id uuid, p_year integer)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_goal integer;
  v_completed timestamptz;
  v_watched integer;
begin
  if public.is_blocked_either(auth.uid(), p_user_id) then
    return jsonb_build_object('year', p_year, 'goal', null, 'watched', 0, 'completed', false);
  end if;
  select goal, completed_at into v_goal, v_completed
  from public.user_challenges where user_id = p_user_id and year = p_year;

  select count(*) into v_watched
  from public.user_title_status
  where user_id = p_user_id and status = 'watched' and watched_at is not null
    and extract(year from watched_at) = p_year;

  return jsonb_build_object(
    'year', p_year,
    'goal', v_goal,
    'watched', v_watched,
    'completed', v_completed is not null or (v_goal is not null and v_watched >= v_goal)
  );
end;
$$;

create or replace function public.get_user_badges(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_result jsonb;
begin
  if public.is_blocked_either(auth.uid(), p_user_id) then
    return '[]'::jsonb;
  end if;
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'code', b.code, 'name', b.name, 'description', b.description,
      'icon', b.icon, 'awarded_at', ub.awarded_at
    ) order by ub.awarded_at desc
  ), '[]'::jsonb)
  into v_result
  from public.user_badges ub join public.badges b on b.code = ub.badge_code
  where ub.user_id = p_user_id;
  return v_result;
end;
$$;

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- Public read (profiles are public pages); writes only via SECURITY DEFINER.

alter table public.user_challenges enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;

create policy "challenges are publicly readable"
  on public.user_challenges for select using (true);
create policy "badges are publicly readable"
  on public.badges for select using (true);
create policy "user badges are publicly readable"
  on public.user_badges for select using (true);

-- ── Grants ───────────────────────────────────────────────────────────────────

revoke all on function public.award_badge(uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.handle_watch_milestones() from public, anon, authenticated;
revoke all on function public.handle_review_milestone() from public, anon, authenticated;

revoke all on function public.set_watch_goal(integer, integer) from public, anon;
grant execute on function public.set_watch_goal(integer, integer) to authenticated;

revoke all on function public.get_watch_challenge(uuid, integer) from public;
grant execute on function public.get_watch_challenge(uuid, integer) to authenticated, anon;

revoke all on function public.get_user_badges(uuid) from public;
grant execute on function public.get_user_badges(uuid) to authenticated, anon;

-- ── Streak: add longest_streak to get_user_stats ─────────────────────────────
-- Gaps-and-islands over distinct watched dates. Redefines the 20260724000006
-- function, adding one field; everything else is unchanged.

create or replace function public.get_user_stats(p_user_id uuid, p_year integer default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_viewer uuid := auth.uid();
  v_result jsonb;
begin
  if p_user_id is null then
    raise exception 'User required.';
  end if;
  if public.is_blocked_either(v_viewer, p_user_id) then
    return jsonb_build_object('blocked', true);
  end if;

  with watched as (
    select uts.title_id, uts.rating, uts.watched_at, t.media_type, t.release_date,
           t.genre_ids, t.runtime_minutes, t.original_language
    from public.user_title_status uts
    join public.titles t on t.id = uts.title_id
    where uts.user_id = p_user_id
      and uts.status = 'watched'
      and (p_year is null or (uts.watched_at is not null and extract(year from uts.watched_at) = p_year))
  )
  select jsonb_build_object(
    'films_watched', (select count(*) from watched where media_type = 'movie'),
    'shows_watched', (select count(*) from watched where media_type = 'tv'),
    'rewatches', (
      select count(*) from public.diary_entries
      where user_id = p_user_id and is_rewatch
        and (p_year is null or extract(year from watched_at) = p_year)
    ),
    'hours_watched', round(
      coalesce((select sum(runtime_minutes) from watched where media_type = 'movie'), 0) / 60.0, 1
    ),
    'ratings_count', (select count(*) from watched where rating is not null),
    'average_rating', (select round(avg(rating)::numeric, 2) from watched where rating is not null),
    'rating_distribution', (
      select coalesce(jsonb_object_agg(rating::text, cnt), '{}'::jsonb)
      from (select rating, count(*) cnt from watched where rating is not null group by rating) r
    ),
    'top_decades', (
      select coalesce(jsonb_agg(jsonb_build_object('decade', decade, 'count', cnt) order by cnt desc, decade desc), '[]'::jsonb)
      from (
        select (floor(extract(year from release_date) / 10) * 10)::int decade, count(*) cnt
        from watched where release_date is not null group by 1
      ) d
    ),
    'top_genres', (
      select coalesce(jsonb_agg(jsonb_build_object('genre_id', gid, 'count', cnt) order by cnt desc), '[]'::jsonb)
      from (
        select g gid, count(*) cnt
        from watched w, unnest(coalesce(w.genre_ids, '{}'::integer[])) g
        group by g order by cnt desc limit 12
      ) gg
    ),
    'top_directors', (
      select coalesce(jsonb_agg(jsonb_build_object('tmdb_id', person_tmdb_id, 'name', name, 'count', cnt) order by cnt desc), '[]'::jsonb)
      from (
        select tp.person_tmdb_id, tp.name, count(*) cnt
        from watched w join public.title_people tp on tp.title_id = w.title_id and tp.department = 'director'
        group by tp.person_tmdb_id, tp.name order by cnt desc limit 5
      ) x
    ),
    'top_actors', (
      select coalesce(jsonb_agg(jsonb_build_object('tmdb_id', person_tmdb_id, 'name', name, 'count', cnt) order by cnt desc), '[]'::jsonb)
      from (
        select tp.person_tmdb_id, tp.name, count(*) cnt
        from watched w join public.title_people tp on tp.title_id = w.title_id and tp.department = 'cast'
        group by tp.person_tmdb_id, tp.name order by cnt desc limit 8
      ) x
    ),
    'languages', (
      select coalesce(jsonb_agg(jsonb_build_object('language', original_language, 'count', cnt) order by cnt desc), '[]'::jsonb)
      from (
        select original_language, count(*) cnt from watched
        where original_language is not null group by original_language order by cnt desc limit 8
      ) l
    ),
    'busiest_month', (
      select jsonb_build_object('month', mth, 'count', cnt)
      from (
        select to_char(watched_at, 'YYYY-MM') mth, count(*) cnt
        from watched where watched_at is not null group by 1 order by cnt desc, mth desc limit 1
      ) b
    ),
    'longest_streak', (
      select coalesce(max(len), 0) from (
        select count(*) len from (
          select wd - (row_number() over (order by wd))::int as grp
          from (select distinct watched_at wd from watched where watched_at is not null) dd
        ) g group by grp
      ) s
    ),
    'available_years', (
      select coalesce(jsonb_agg(yr order by yr desc), '[]'::jsonb)
      from (
        select distinct extract(year from watched_at)::int yr
        from public.user_title_status
        where user_id = p_user_id and status = 'watched' and watched_at is not null
      ) y
    )
  )
  into v_result;

  return v_result;
end;
$$;

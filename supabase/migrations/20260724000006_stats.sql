-- Phase 1: title metadata enrichment + personal stats.
--
-- The titles cache stored no genres/runtime/people, so Letterboxd-style stats
-- (hours watched, genre + decade breakdowns, most-watched actors/directors) were
-- impossible. This enriches titles lazily from the metadata the client already
-- fetches from TMDB, and adds get_user_stats() to aggregate it.

-- ── titles: enrichment columns ───────────────────────────────────────────────

alter table public.titles
  add column genre_ids integer[] not null default '{}',
  add column runtime_minutes integer check (runtime_minutes is null or runtime_minutes between 0 and 2000),
  add column original_language text check (original_language is null or char_length(original_language) between 2 and 12);

-- ── title_people: cast & key crew per title ──────────────────────────────────
-- Written wholesale by set_title_people() (delete-all-then-insert), so no
-- per-row uniqueness is needed. department: 'cast' | 'director' | 'creator' | 'crew'.

create table public.title_people (
  id uuid primary key default gen_random_uuid(),
  title_id uuid not null references public.titles (id) on delete cascade,
  person_tmdb_id integer not null check (person_tmdb_id > 0),
  name text not null check (char_length(name) between 1 and 200),
  department text not null check (department in ('cast', 'director', 'creator', 'crew')),
  job text check (job is null or char_length(job) <= 120),
  ord integer not null default 0,
  created_at timestamptz not null default now()
);

create index title_people_title_idx on public.title_people (title_id);
create index title_people_person_idx on public.title_people (person_tmdb_id, department);

-- ── upsert_title_reference: extended to persist enrichment ───────────────────
-- Drop the 7-arg version and recreate with enrichment params (defaulted, so a
-- PostgREST call that omits them still resolves here).

drop function if exists public.upsert_title_reference(integer, public.media_type, text, text, text, text, date);

create or replace function public.upsert_title_reference(
  p_tmdb_id integer,
  p_media_type public.media_type,
  p_title text,
  p_original_title text default null,
  p_poster_path text default null,
  p_backdrop_path text default null,
  p_release_date date default null,
  p_genre_ids integer[] default null,
  p_runtime_minutes integer default null,
  p_original_language text default null
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
  v_genres integer[];
  v_runtime integer;
  v_language text;
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

  v_poster := case when p_poster_path ~ '^/[A-Za-z0-9._-]{1,120}$' then p_poster_path end;
  v_backdrop := case when p_backdrop_path ~ '^/[A-Za-z0-9._-]{1,120}$' then p_backdrop_path end;
  -- Sanitise enrichment: bound array size and value ranges, drop otherwise.
  v_genres := case
    when p_genre_ids is not null and array_length(p_genre_ids, 1) between 1 and 30
    then (select array_agg(g) from unnest(p_genre_ids) g where g between 1 and 100000)
  end;
  v_runtime := case when p_runtime_minutes between 0 and 2000 then p_runtime_minutes end;
  v_language := case when p_original_language ~ '^[A-Za-z-]{2,12}$' then lower(p_original_language) end;

  insert into public.titles (
    tmdb_id, media_type, title, original_title, poster_path, backdrop_path, release_date,
    genre_ids, runtime_minutes, original_language
  )
  values (
    p_tmdb_id, p_media_type, left(trim(p_title), 500), left(p_original_title, 500),
    v_poster, v_backdrop, p_release_date,
    coalesce(v_genres, '{}'), v_runtime, v_language
  )
  on conflict (tmdb_id, media_type) do update set
    title = excluded.title,
    original_title = coalesce(excluded.original_title, titles.original_title),
    poster_path = coalesce(excluded.poster_path, titles.poster_path),
    backdrop_path = coalesce(excluded.backdrop_path, titles.backdrop_path),
    release_date = coalesce(excluded.release_date, titles.release_date),
    genre_ids = case when array_length(excluded.genre_ids, 1) is not null then excluded.genre_ids else titles.genre_ids end,
    runtime_minutes = coalesce(excluded.runtime_minutes, titles.runtime_minutes),
    original_language = coalesce(excluded.original_language, titles.original_language),
    metadata_updated_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

-- ── set_title_people: replace a title's people list ──────────────────────────

create or replace function public.set_title_people(p_title_id uuid, p_people jsonb)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated.';
  end if;
  if not exists (select 1 from public.titles where id = p_title_id) then
    raise exception 'Unknown title.';
  end if;

  delete from public.title_people where title_id = p_title_id;

  insert into public.title_people (title_id, person_tmdb_id, name, department, job, ord)
  select p_title_id, x.person_tmdb_id, left(x.name, 200), x.department, left(x.job, 120), coalesce(x.ord, 0)
  from jsonb_to_recordset(coalesce(p_people, '[]'::jsonb))
    as x(person_tmdb_id integer, name text, department text, job text, ord integer)
  where x.person_tmdb_id is not null
    and x.name is not null
    and x.department in ('cast', 'director', 'creator', 'crew')
  limit 50;
end;
$$;

-- ── get_user_stats: the aggregation behind the stats page ────────────────────
-- All-time when p_year is null, otherwise scoped to titles watched that year.
-- available_years is always the full set (for the year picker).

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

-- ── RLS ──────────────────────────────────────────────────────────────────────

alter table public.title_people enable row level security;

create policy "title people are publicly readable"
  on public.title_people for select
  using (true);

-- ── Grants ───────────────────────────────────────────────────────────────────

revoke all on function public.upsert_title_reference(integer, public.media_type, text, text, text, text, date, integer[], integer, text) from public, anon;
grant execute on function public.upsert_title_reference(integer, public.media_type, text, text, text, text, date, integer[], integer, text) to authenticated;

revoke all on function public.set_title_people(uuid, jsonb) from public, anon;
grant execute on function public.set_title_people(uuid, jsonb) to authenticated;

revoke all on function public.get_user_stats(uuid, integer) from public;
grant execute on function public.get_user_stats(uuid, integer) to authenticated, anon;

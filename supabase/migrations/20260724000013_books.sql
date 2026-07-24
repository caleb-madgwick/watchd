-- Phase 5: Books. Extends the titles reference cache to hold non-TMDB (Google
-- Books) identities, adds book reading-progress, and generalises the handful of
-- movie/tv-hardcoded functions. Everything keyed by title_id (reviews, lists,
-- diary, tags, comments, favourites, activities) works for books unchanged.

-- ── titles: accept a Google Books identity ───────────────────────────────────

alter table public.titles alter column tmdb_id drop not null;

alter table public.titles
  add column source text not null default 'tmdb' check (source in ('tmdb', 'google_books')),
  add column external_id text,
  add column cover_url text check (cover_url is null or cover_url ~ '^https://[^ ]{1,600}$'),
  add column authors text[] not null default '{}',
  add column categories text[] not null default '{}',
  add column page_count integer check (page_count is null or page_count between 1 and 100000),
  add column isbn13 text check (isbn13 is null or isbn13 ~ '^[0-9]{13}$');

-- Replace the full unique constraint with source-scoped partial unique indexes:
-- TMDB rows are unique by (tmdb_id, media_type); book rows by external_id.
alter table public.titles drop constraint titles_tmdb_unique;
create unique index titles_tmdb_unique on public.titles (tmdb_id, media_type) where source = 'tmdb';
create unique index titles_book_unique on public.titles (external_id) where source = 'google_books';

-- ── upsert_title_reference: point ON CONFLICT at the partial index ───────────
-- Only change vs 20260724000006 is the conflict predicate `where source='tmdb'`.

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
  on conflict (tmdb_id, media_type) where source = 'tmdb' do update set
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

-- ── upsert_book_reference: the only write path for book titles ───────────────

create or replace function public.upsert_book_reference(
  p_volume_id text,
  p_title text,
  p_authors text[] default '{}',
  p_cover_url text default null,
  p_categories text[] default '{}',
  p_page_count integer default null,
  p_published_date date default null,
  p_isbn13 text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_cover text;
  v_pages integer;
  v_isbn text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated.';
  end if;
  if p_volume_id is null or char_length(trim(p_volume_id)) not between 1 and 128 then
    raise exception 'Invalid volume id.';
  end if;
  if p_title is null or char_length(trim(p_title)) not between 1 and 500 then
    raise exception 'Invalid title.';
  end if;

  v_cover := case when p_cover_url ~ '^https://[^ ]{1,600}$' then p_cover_url end;
  v_pages := case when p_page_count between 1 and 100000 then p_page_count end;
  v_isbn := case when p_isbn13 ~ '^[0-9]{13}$' then p_isbn13 end;

  insert into public.titles (
    source, external_id, media_type, title, cover_url, authors, categories,
    page_count, release_date, isbn13
  )
  values (
    'google_books', trim(p_volume_id), 'book', left(trim(p_title), 500), v_cover,
    coalesce(p_authors, '{}'), coalesce(p_categories, '{}'), v_pages, p_published_date, v_isbn
  )
  on conflict (external_id) where source = 'google_books' do update set
    title = excluded.title,
    cover_url = coalesce(excluded.cover_url, titles.cover_url),
    authors = case when array_length(excluded.authors, 1) is not null then excluded.authors else titles.authors end,
    categories = case when array_length(excluded.categories, 1) is not null then excluded.categories else titles.categories end,
    page_count = coalesce(excluded.page_count, titles.page_count),
    release_date = coalesce(excluded.release_date, titles.release_date),
    isbn13 = coalesce(excluded.isbn13, titles.isbn13),
    metadata_updated_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

-- ── book_progress: reading pointer (mirrors tv_progress) ─────────────────────

create table public.book_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title_id uuid not null references public.titles (id) on delete cascade,
  current_page integer not null default 0 check (current_page between 0 and 100000),
  total_pages integer check (total_pages is null or total_pages between 1 and 100000),
  percent integer not null default 0 check (percent between 0 and 100),
  completed boolean not null default false,
  last_read_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint book_progress_unique unique (user_id, title_id)
);

create index book_progress_user_idx on public.book_progress (user_id, last_read_at desc);

create trigger book_progress_updated_at before update on public.book_progress
  for each row execute function public.set_updated_at();

alter table public.book_progress enable row level security;

create policy "users read own book progress"
  on public.book_progress for select using (auth.uid() = user_id);
create policy "users insert own book progress"
  on public.book_progress for insert with check (auth.uid() = user_id);
create policy "users update own book progress"
  on public.book_progress for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users delete own book progress"
  on public.book_progress for delete using (auth.uid() = user_id);

create or replace function public.set_book_progress(
  p_title_id uuid,
  p_current_page integer,
  p_total_pages integer default null,
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
  v_id uuid;
  v_was_completed boolean;
  v_percent integer;
begin
  if v_user is null then
    raise exception 'Not authenticated.';
  end if;
  select media_type into v_media from public.titles where id = p_title_id;
  if v_media is distinct from 'book' then
    raise exception 'Book progress can only be tracked for books.';
  end if;
  if p_current_page < 0 or p_current_page > 100000 then
    raise exception 'Invalid page number.';
  end if;

  v_percent := case
    when p_total_pages is not null and p_total_pages > 0
    then least(100, greatest(0, round(p_current_page::numeric * 100 / p_total_pages)::int))
    else 0
  end;

  select completed into v_was_completed
  from public.book_progress where user_id = v_user and title_id = p_title_id;

  insert into public.book_progress as bp (user_id, title_id, current_page, total_pages, percent, completed, last_read_at)
  values (v_user, p_title_id, p_current_page, p_total_pages, v_percent, coalesce(p_completed, false), now())
  on conflict (user_id, title_id) do update set
    current_page = excluded.current_page,
    total_pages = coalesce(excluded.total_pages, bp.total_pages),
    percent = excluded.percent,
    completed = excluded.completed,
    last_read_at = now()
  returning id into v_id;

  insert into public.user_title_status as uts (user_id, title_id, status, watched_at)
  values (
    v_user, p_title_id,
    case when coalesce(p_completed, false) then 'watched'::public.watch_status else 'watching'::public.watch_status end,
    case when coalesce(p_completed, false) then current_date end
  )
  on conflict (user_id, title_id) do update set
    status = excluded.status,
    watched_at = coalesce(excluded.watched_at, uts.watched_at);

  if coalesce(p_completed, false) and not coalesce(v_was_completed, false) then
    if not exists (
      select 1 from public.activities
      where actor_id = v_user and title_id = p_title_id and activity_type = 'book_completed'
        and created_at > now() - interval '30 days'
    ) then
      insert into public.activities (actor_id, activity_type, title_id, metadata)
      values (v_user, 'book_completed', p_title_id, jsonb_build_object('media_type', 'book'));
    end if;
  end if;

  return v_id;
end;
$$;

-- ── get_book_community_summary (mirrors get_title_community_summary) ──────────

create or replace function public.get_book_community_summary(p_volume_id text)
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
  where external_id = p_volume_id and media_type = 'book' and source = 'google_books';

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

-- ── log_title: allow diary entries for books (one-completion medium) ─────────
-- Only change vs 20260723000002 is the diary gate: movie → (movie, book).

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

  if p_create_diary_entry and v_media in ('movie', 'book') and v_effective_status = 'watched' then
    insert into public.diary_entries (user_id, title_id, watched_at, rating, is_rewatch)
    values (v_user, p_title_id, coalesce(p_watched_at, current_date), p_rating, coalesce(p_is_rewatch, false))
    returning id into v_diary_id;
  end if;

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

-- ── Reading challenge: give user_challenges a kind (watch | read) ────────────

alter table public.user_challenges
  add column kind text not null default 'watch' check (kind in ('watch', 'read'));
alter table public.user_challenges drop constraint user_challenges_pkey;
alter table public.user_challenges add primary key (user_id, year, kind);

drop function if exists public.set_watch_goal(integer, integer);
drop function if exists public.get_watch_challenge(uuid, integer);

create or replace function public.set_watch_goal(p_year integer, p_goal integer, p_kind text default 'watch')
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
  if p_kind not in ('watch', 'read') then
    raise exception 'Invalid challenge kind.';
  end if;
  insert into public.user_challenges (user_id, year, kind, goal)
  values (v_user, p_year, p_kind, p_goal)
  on conflict (user_id, year, kind) do update set goal = excluded.goal, updated_at = now();
end;
$$;

create or replace function public.get_watch_challenge(p_user_id uuid, p_year integer, p_kind text default 'watch')
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_goal integer;
  v_completed timestamptz;
  v_count integer;
begin
  if public.is_blocked_either(auth.uid(), p_user_id) then
    return jsonb_build_object('year', p_year, 'kind', p_kind, 'goal', null, 'watched', 0, 'completed', false);
  end if;
  select goal, completed_at into v_goal, v_completed
  from public.user_challenges where user_id = p_user_id and year = p_year and kind = p_kind;

  select count(*) into v_count
  from public.user_title_status uts join public.titles t on t.id = uts.title_id
  where uts.user_id = p_user_id and uts.status = 'watched' and uts.watched_at is not null
    and extract(year from uts.watched_at) = p_year
    and (case when p_kind = 'read' then t.media_type = 'book' else t.media_type in ('movie', 'tv') end);

  return jsonb_build_object(
    'year', p_year,
    'kind', p_kind,
    'goal', v_goal,
    'watched', v_count,
    'completed', v_completed is not null or (v_goal is not null and v_count >= v_goal)
  );
end;
$$;

revoke all on function public.set_watch_goal(integer, integer, text) from public, anon;
grant execute on function public.set_watch_goal(integer, integer, text) to authenticated;
revoke all on function public.get_watch_challenge(uuid, integer, text) from public;
grant execute on function public.get_watch_challenge(uuid, integer, text) to authenticated, anon;

-- ── Book badges ──────────────────────────────────────────────────────────────

insert into public.badges (code, name, description, icon, sort) values
  ('books_10',  'Bookworm',    'Read 10 books',  'book-outline', 80),
  ('books_50',  'Bibliophile', 'Read 50 books',  'book',         90),
  ('books_100', 'Librarian',   'Read 100 books', 'library',      100)
on conflict (code) do nothing;

-- ── handle_watch_milestones: book counts/badges + kind-aware challenge ───────

create or replace function public.handle_watch_milestones()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := new.user_id;
  v_media public.media_type;
  v_films integer;
  v_shows integer;
  v_books integer;
  v_year integer;
  v_kind text;
  v_goal integer;
  v_completed timestamptz;
  v_count integer;
begin
  if new.status is distinct from 'watched' then
    return new;
  end if;
  select media_type into v_media from public.titles where id = new.title_id;

  select count(*) into v_films
  from public.user_title_status uts join public.titles t on t.id = uts.title_id
  where uts.user_id = v_user and uts.status = 'watched' and t.media_type = 'movie';
  select count(*) into v_shows
  from public.user_title_status uts join public.titles t on t.id = uts.title_id
  where uts.user_id = v_user and uts.status = 'watched' and t.media_type = 'tv';
  select count(*) into v_books
  from public.user_title_status uts join public.titles t on t.id = uts.title_id
  where uts.user_id = v_user and uts.status = 'watched' and t.media_type = 'book';

  if v_films >= 100 then perform public.award_badge(v_user, 'films_100'); end if;
  if v_films >= 50 then perform public.award_badge(v_user, 'films_50'); end if;
  if v_films >= 10 then perform public.award_badge(v_user, 'films_10'); end if;
  if v_shows >= 25 then perform public.award_badge(v_user, 'shows_25'); end if;
  if v_shows >= 10 then perform public.award_badge(v_user, 'shows_10'); end if;
  if v_books >= 100 then perform public.award_badge(v_user, 'books_100'); end if;
  if v_books >= 50 then perform public.award_badge(v_user, 'books_50'); end if;
  if v_books >= 10 then perform public.award_badge(v_user, 'books_10'); end if;

  if new.watched_at is not null then
    v_year := extract(year from new.watched_at)::int;
    v_kind := case when v_media = 'book' then 'read' else 'watch' end;
    select goal, completed_at into v_goal, v_completed
    from public.user_challenges where user_id = v_user and year = v_year and kind = v_kind;
    if v_goal is not null and v_completed is null then
      select count(*) into v_count
      from public.user_title_status uts join public.titles t on t.id = uts.title_id
      where uts.user_id = v_user and uts.status = 'watched' and uts.watched_at is not null
        and extract(year from uts.watched_at) = v_year
        and (case when v_kind = 'read' then t.media_type = 'book' else t.media_type in ('movie', 'tv') end);
      if v_count >= v_goal then
        update public.user_challenges set completed_at = now()
        where user_id = v_user and year = v_year and kind = v_kind and completed_at is null;
        insert into public.activities (actor_id, activity_type, metadata)
        values (v_user, 'challenge_completed', jsonb_build_object('year', v_year, 'goal', v_goal, 'kind', v_kind));
        perform public.create_notification(
          v_user, 'challenge_completed', v_user, 'profile', v_user,
          jsonb_build_object('year', v_year, 'goal', v_goal, 'kind', v_kind)
        );
        perform public.award_badge(v_user, 'challenge_done', jsonb_build_object('year', v_year, 'kind', v_kind));
      end if;
    end if;
  end if;

  return new;
end;
$$;

-- ── get_user_stats: add book aggregates (books_read, pages_read, authors, categories) ──

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
           t.genre_ids, t.runtime_minutes, t.original_language, t.page_count, t.authors, t.categories
    from public.user_title_status uts
    join public.titles t on t.id = uts.title_id
    where uts.user_id = p_user_id
      and uts.status = 'watched'
      and (p_year is null or (uts.watched_at is not null and extract(year from uts.watched_at) = p_year))
  )
  select jsonb_build_object(
    'films_watched', (select count(*) from watched where media_type = 'movie'),
    'shows_watched', (select count(*) from watched where media_type = 'tv'),
    'books_read', (select count(*) from watched where media_type = 'book'),
    'pages_read', coalesce((select sum(page_count) from watched where media_type = 'book'), 0),
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
    'top_authors', (
      select coalesce(jsonb_agg(jsonb_build_object('name', a, 'count', cnt) order by cnt desc), '[]'::jsonb)
      from (
        select a, count(*) cnt
        from watched w, unnest(coalesce(w.authors, '{}'::text[])) a
        where w.media_type = 'book'
        group by a order by cnt desc limit 8
      ) au
    ),
    'top_categories', (
      select coalesce(jsonb_agg(jsonb_build_object('name', c, 'count', cnt) order by cnt desc), '[]'::jsonb)
      from (
        select c, count(*) cnt
        from watched w, unnest(coalesce(w.categories, '{}'::text[])) c
        where w.media_type = 'book'
        group by c order by cnt desc limit 12
      ) ct
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

-- ── Grants ───────────────────────────────────────────────────────────────────

revoke all on function public.upsert_book_reference(text, text, text[], text, text[], integer, date, text) from public, anon;
grant execute on function public.upsert_book_reference(text, text, text[], text, text[], integer, date, text) to authenticated;

revoke all on function public.set_book_progress(uuid, integer, integer, boolean) from public, anon;
grant execute on function public.set_book_progress(uuid, integer, integer, boolean) to authenticated;

revoke all on function public.get_book_community_summary(text) from public;
grant execute on function public.get_book_community_summary(text) to authenticated, anon;

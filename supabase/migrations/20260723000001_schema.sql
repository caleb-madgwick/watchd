-- Watchd schema: tables, constraints, indexes.
-- Security model: RLS on every table (20260723000003_rls.sql); privileged
-- writes via SECURITY DEFINER functions (20260723000002_functions.sql).

create extension if not exists pgcrypto;

-- ── Enums ────────────────────────────────────────────────────────────────────

create type public.media_type as enum ('movie', 'tv');
create type public.watch_status as enum ('watchlist', 'watching', 'watched', 'paused', 'dropped');
create type public.list_visibility as enum ('public', 'private');
create type public.activity_type as enum ('logged', 'tv_completed', 'list_created', 'followed');

-- ── profiles ─────────────────────────────────────────────────────────────────
-- One row per auth user, created by the on_auth_user_created trigger.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  display_name text,
  bio text,
  avatar_path text,
  favourite_genres integer[] not null default '{}',
  onboarding_completed boolean not null default false,
  -- Denormalised counters, maintained by triggers only (column grants block
  -- direct client updates).
  follower_count integer not null default 0 check (follower_count >= 0),
  following_count integer not null default 0 check (following_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_length check (char_length(username) between 3 and 20),
  constraint profiles_username_format check (username ~ '^[A-Za-z0-9_]+$'),
  constraint profiles_display_name_length check (display_name is null or char_length(display_name) <= 50),
  constraint profiles_bio_length check (bio is null or char_length(bio) <= 160),
  constraint profiles_genres_max check (coalesce(array_length(favourite_genres, 1), 0) <= 10)
);

create unique index profiles_username_lower_idx on public.profiles (lower(username));

-- ── titles ───────────────────────────────────────────────────────────────────
-- Lightweight TMDB reference cache; rows created only via upsert_title_reference().

create table public.titles (
  id uuid primary key default gen_random_uuid(),
  tmdb_id integer not null check (tmdb_id > 0),
  media_type public.media_type not null,
  title text not null check (char_length(title) between 1 and 500),
  original_title text check (original_title is null or char_length(original_title) <= 500),
  poster_path text check (poster_path is null or poster_path ~ '^/[A-Za-z0-9._-]{1,120}$'),
  backdrop_path text check (backdrop_path is null or backdrop_path ~ '^/[A-Za-z0-9._-]{1,120}$'),
  release_date date,
  metadata_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint titles_tmdb_unique unique (tmdb_id, media_type)
);

-- ── user_title_status ────────────────────────────────────────────────────────
-- Persistent per-user state for a title: status, rating, favourite.

create table public.user_title_status (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title_id uuid not null references public.titles (id) on delete cascade,
  status public.watch_status,
  rating numeric(2, 1) check (
    rating is null or (rating between 0.5 and 5.0 and rating * 2 = floor(rating * 2))
  ),
  watched_at date check (watched_at is null or watched_at <= current_date + 1),
  is_favourite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_title_status_unique unique (user_id, title_id)
);

create index user_title_status_user_status_idx on public.user_title_status (user_id, status, updated_at desc);
create index user_title_status_title_idx on public.user_title_status (title_id, status);
create index user_title_status_favourites_idx on public.user_title_status (user_id) where is_favourite;

-- ── diary_entries ────────────────────────────────────────────────────────────
-- Dated viewing events (movie diary; rewatches create additional rows).

create table public.diary_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title_id uuid not null references public.titles (id) on delete cascade,
  watched_at date not null check (watched_at <= current_date + 1),
  rating numeric(2, 1) check (
    rating is null or (rating between 0.5 and 5.0 and rating * 2 = floor(rating * 2))
  ),
  is_rewatch boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index diary_entries_user_idx on public.diary_entries (user_id, watched_at desc);
create index diary_entries_title_idx on public.diary_entries (title_id);

-- ── tv_progress ──────────────────────────────────────────────────────────────
-- Pointer model: one row per user+show holding the last-watched episode.

create table public.tv_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title_id uuid not null references public.titles (id) on delete cascade,
  season_number integer not null check (season_number between 0 and 200),
  episode_number integer not null check (episode_number between 0 and 2000),
  completed boolean not null default false,
  last_watched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tv_progress_unique unique (user_id, title_id)
);

create index tv_progress_user_idx on public.tv_progress (user_id, last_watched_at desc);

-- ── reviews ──────────────────────────────────────────────────────────────────
-- One current review per user per title.

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title_id uuid not null references public.titles (id) on delete cascade,
  rating numeric(2, 1) check (
    rating is null or (rating between 0.5 and 5.0 and rating * 2 = floor(rating * 2))
  ),
  body text not null check (char_length(body) between 1 and 10000),
  contains_spoilers boolean not null default false,
  published boolean not null default true,
  like_count integer not null default 0 check (like_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reviews_one_per_title unique (user_id, title_id)
);

create index reviews_title_idx on public.reviews (title_id, created_at desc) where published;
create index reviews_user_idx on public.reviews (user_id, created_at desc);

-- ── review_likes ─────────────────────────────────────────────────────────────

create table public.review_likes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  review_id uuid not null references public.reviews (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, review_id)
);

create index review_likes_review_idx on public.review_likes (review_id);

-- ── follows ──────────────────────────────────────────────────────────────────

create table public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint follows_no_self check (follower_id <> following_id)
);

create index follows_following_idx on public.follows (following_id);

-- ── blocks ───────────────────────────────────────────────────────────────────
-- Data model only for the MVP; feed and follow logic respect it from day one.

create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint blocks_no_self check (blocker_id <> blocked_id)
);

create index blocks_blocked_idx on public.blocks (blocked_id);

-- ── lists ────────────────────────────────────────────────────────────────────

create table public.lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  description text check (description is null or char_length(description) <= 500),
  visibility public.list_visibility not null default 'private',
  -- Maintained by trigger; column grants block direct client updates.
  item_count integer not null default 0 check (item_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index lists_user_idx on public.lists (user_id, updated_at desc);
create index lists_public_idx on public.lists (visibility, updated_at desc) where visibility = 'public';

-- ── list_items ───────────────────────────────────────────────────────────────

create table public.list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists (id) on delete cascade,
  title_id uuid not null references public.titles (id) on delete cascade,
  position integer not null default 0 check (position >= 0),
  note text check (note is null or char_length(note) <= 280),
  created_at timestamptz not null default now(),
  constraint list_items_unique unique (list_id, title_id)
);

create index list_items_list_idx on public.list_items (list_id, position);

-- ── activities ───────────────────────────────────────────────────────────────
-- Feed source of truth. No client insert policy exists: rows are created only
-- by triggers and SECURITY DEFINER functions, so activity cannot be forged.

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles (id) on delete cascade,
  activity_type public.activity_type not null,
  title_id uuid references public.titles (id) on delete cascade,
  review_id uuid references public.reviews (id) on delete set null,
  list_id uuid references public.lists (id) on delete cascade,
  subject_user_id uuid references public.profiles (id) on delete cascade,
  metadata jsonb not null default '{}'::jsonb check (pg_column_size(metadata) < 2048),
  created_at timestamptz not null default now()
);

create index activities_created_idx on public.activities (created_at desc, id desc);
create index activities_actor_idx on public.activities (actor_id, created_at desc);
create index activities_dedupe_idx on public.activities (actor_id, title_id, activity_type, created_at desc)
  where title_id is not null;

-- ── reports ──────────────────────────────────────────────────────────────────
-- Review reporting placeholder (no moderation dashboard in the MVP).

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  review_id uuid not null references public.reviews (id) on delete cascade,
  reason text not null check (reason in ('spam', 'abuse', 'spoilers', 'other')),
  details text check (details is null or char_length(details) <= 500),
  created_at timestamptz not null default now(),
  constraint reports_once_per_review unique (reporter_id, review_id)
);

-- Phase 3 remainder: free-text tags + following people (actors/directors).
-- Both are direct-write tables (RLS-guarded); no RPCs needed.

-- ── title_tags: per-user free-text tags on a title ───────────────────────────

create table public.title_tags (
  user_id uuid not null references public.profiles (id) on delete cascade,
  title_id uuid not null references public.titles (id) on delete cascade,
  tag text not null check (char_length(tag) between 1 and 30 and tag ~ '^[a-z0-9][a-z0-9 _-]*$'),
  created_at timestamptz not null default now(),
  primary key (user_id, title_id, tag)
);

create index title_tags_user_tag_idx on public.title_tags (user_id, tag);
create index title_tags_title_idx on public.title_tags (title_id);

alter table public.title_tags enable row level security;

-- Tags are public (they show on your profile/titles); writes are owner-only.
create policy "title tags are publicly readable"
  on public.title_tags for select using (true);
create policy "users add own tags"
  on public.title_tags for insert with check (auth.uid() = user_id);
create policy "users remove own tags"
  on public.title_tags for delete using (auth.uid() = user_id);

-- ── person_follows: follow a TMDB person ─────────────────────────────────────

create table public.person_follows (
  user_id uuid not null references public.profiles (id) on delete cascade,
  person_tmdb_id integer not null check (person_tmdb_id > 0),
  name text not null check (char_length(name) between 1 and 200),
  profile_path text check (profile_path is null or profile_path ~ '^/[A-Za-z0-9._-]{1,120}$'),
  known_for_department text,
  created_at timestamptz not null default now(),
  primary key (user_id, person_tmdb_id)
);

create index person_follows_user_idx on public.person_follows (user_id, created_at desc);
create index person_follows_person_idx on public.person_follows (person_tmdb_id);

alter table public.person_follows enable row level security;

-- Private to the follower (used for their own alerts + "following" state).
create policy "users read own person follows"
  on public.person_follows for select using (auth.uid() = user_id);
create policy "users follow people as themselves"
  on public.person_follows for insert with check (auth.uid() = user_id);
create policy "users unfollow people as themselves"
  on public.person_follows for delete using (auth.uid() = user_id);

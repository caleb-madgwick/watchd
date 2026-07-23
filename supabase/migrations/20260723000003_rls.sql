-- Watchd Row Level Security.
-- Deny-by-default: RLS is enabled on every table; only the policies below
-- grant access. Counter columns are additionally protected with column grants
-- so clients cannot tamper with them even on rows they own.

alter table public.profiles enable row level security;
alter table public.titles enable row level security;
alter table public.user_title_status enable row level security;
alter table public.diary_entries enable row level security;
alter table public.tv_progress enable row level security;
alter table public.reviews enable row level security;
alter table public.review_likes enable row level security;
alter table public.follows enable row level security;
alter table public.blocks enable row level security;
alter table public.lists enable row level security;
alter table public.list_items enable row level security;
alter table public.activities enable row level security;
alter table public.reports enable row level security;

-- ── profiles ─────────────────────────────────────────────────────────────────
-- Public read (profiles are public pages, including on web); update own only.
-- Inserts happen exclusively via the auth trigger; deletes via auth cascade.

create policy "profiles are publicly readable"
  on public.profiles for select
  using (true);

create policy "users update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Counter columns are trigger-maintained: replace blanket update with column grants.
revoke update on public.profiles from anon, authenticated;
grant update (username, display_name, bio, avatar_path, favourite_genres, onboarding_completed)
  on public.profiles to authenticated;

-- ── titles ───────────────────────────────────────────────────────────────────
-- Read-only reference data; writes only via upsert_title_reference().

create policy "titles are publicly readable"
  on public.titles for select
  using (true);

-- ── user_title_status ────────────────────────────────────────────────────────
-- Public read (watched/ratings/watchlists appear on public profiles);
-- writes restricted to the owner.

create policy "title statuses are publicly readable"
  on public.user_title_status for select
  using (true);

create policy "users insert own title status"
  on public.user_title_status for insert
  with check (auth.uid() = user_id);

create policy "users update own title status"
  on public.user_title_status for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users delete own title status"
  on public.user_title_status for delete
  using (auth.uid() = user_id);

-- ── diary_entries ────────────────────────────────────────────────────────────

create policy "diary entries are publicly readable"
  on public.diary_entries for select
  using (true);

create policy "users insert own diary entries"
  on public.diary_entries for insert
  with check (auth.uid() = user_id);

create policy "users update own diary entries"
  on public.diary_entries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users delete own diary entries"
  on public.diary_entries for delete
  using (auth.uid() = user_id);

-- ── tv_progress ──────────────────────────────────────────────────────────────
-- Progress pointers are personal; social visibility happens via activities.

create policy "users read own tv progress"
  on public.tv_progress for select
  using (auth.uid() = user_id);

create policy "users insert own tv progress"
  on public.tv_progress for insert
  with check (auth.uid() = user_id);

create policy "users update own tv progress"
  on public.tv_progress for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users delete own tv progress"
  on public.tv_progress for delete
  using (auth.uid() = user_id);

-- ── reviews ──────────────────────────────────────────────────────────────────

create policy "published reviews are publicly readable"
  on public.reviews for select
  using (published or auth.uid() = user_id);

create policy "users insert own reviews"
  on public.reviews for insert
  with check (auth.uid() = user_id);

create policy "users update own reviews"
  on public.reviews for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users delete own reviews"
  on public.reviews for delete
  using (auth.uid() = user_id);

-- like_count is trigger-maintained.
revoke update on public.reviews from anon, authenticated;
grant update (rating, body, contains_spoilers, published)
  on public.reviews to authenticated;

-- ── review_likes ─────────────────────────────────────────────────────────────

create policy "review likes are publicly readable"
  on public.review_likes for select
  using (true);

create policy "users like as themselves"
  on public.review_likes for insert
  with check (auth.uid() = user_id);

create policy "users remove own likes"
  on public.review_likes for delete
  using (auth.uid() = user_id);

-- ── follows ──────────────────────────────────────────────────────────────────

create policy "follows are publicly readable"
  on public.follows for select
  using (true);

create policy "users follow as themselves"
  on public.follows for insert
  with check (auth.uid() = follower_id);

create policy "users unfollow as themselves"
  on public.follows for delete
  using (auth.uid() = follower_id);

-- ── blocks ───────────────────────────────────────────────────────────────────
-- Private to the blocker.

create policy "users read own blocks"
  on public.blocks for select
  using (auth.uid() = blocker_id);

create policy "users block as themselves"
  on public.blocks for insert
  with check (auth.uid() = blocker_id);

create policy "users unblock as themselves"
  on public.blocks for delete
  using (auth.uid() = blocker_id);

-- ── lists ────────────────────────────────────────────────────────────────────

create policy "public lists readable, private lists owner-only"
  on public.lists for select
  using (visibility = 'public' or auth.uid() = user_id);

create policy "users create own lists"
  on public.lists for insert
  with check (auth.uid() = user_id);

create policy "users update own lists"
  on public.lists for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users delete own lists"
  on public.lists for delete
  using (auth.uid() = user_id);

-- item_count is trigger-maintained.
revoke update on public.lists from anon, authenticated;
grant update (name, description, visibility) on public.lists to authenticated;

-- ── list_items ───────────────────────────────────────────────────────────────
-- Visibility and write access follow the parent list.

create policy "list items follow list visibility"
  on public.list_items for select
  using (
    exists (
      select 1 from public.lists l
      where l.id = list_id and (l.visibility = 'public' or l.user_id = auth.uid())
    )
  );

create policy "owners add list items"
  on public.list_items for insert
  with check (
    exists (select 1 from public.lists l where l.id = list_id and l.user_id = auth.uid())
  );

create policy "owners update list items"
  on public.list_items for update
  using (exists (select 1 from public.lists l where l.id = list_id and l.user_id = auth.uid()))
  with check (exists (select 1 from public.lists l where l.id = list_id and l.user_id = auth.uid()));

create policy "owners delete list items"
  on public.list_items for delete
  using (exists (select 1 from public.lists l where l.id = list_id and l.user_id = auth.uid()));

-- ── activities ───────────────────────────────────────────────────────────────
-- Readable for public profile pages (block-aware); NO insert/update policies —
-- rows are created only by SECURITY DEFINER functions and triggers.

create policy "activities readable unless blocked"
  on public.activities for select
  using (not public.is_blocked_either(auth.uid(), actor_id));

create policy "actors delete own activities"
  on public.activities for delete
  using (auth.uid() = actor_id);

-- ── reports ──────────────────────────────────────────────────────────────────

create policy "users read own reports"
  on public.reports for select
  using (auth.uid() = reporter_id);

create policy "users report as themselves"
  on public.reports for insert
  with check (auth.uid() = reporter_id);

-- ── Storage: avatars bucket ──────────────────────────────────────────────────
-- Public read; each user writes only inside their own folder ("<uid>/...").

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "avatar images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "users upload own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users update own avatar"
  on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users delete own avatar"
  on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

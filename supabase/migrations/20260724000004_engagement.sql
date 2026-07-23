-- Phase 0 engagement primitives: polymorphic comments + content likes.
--
-- Built once here so Phase 3 (review comments, list likes, diary likes) reuses
-- them without new plumbing. Security model matches the rest of the schema:
-- RLS deny-by-default, trigger-maintained counters protected with column grants,
-- and block-awareness via is_blocked_either().
--
-- Reviews keep their existing dedicated `review_likes` table + counter (already
-- wired, tested, and folded into get_activity_feed); content_likes covers the
-- new surfaces (lists, diary entries, comments). This intentional split avoids a
-- risky refactor of the working review-like path.

-- ── Polymorphic target enums ─────────────────────────────────────────────────

create type public.comment_target as enum ('review', 'list', 'diary_entry');
create type public.like_target as enum ('list', 'diary_entry', 'comment');

-- ── comments ─────────────────────────────────────────────────────────────────
-- target_type/target_id are a loose (FK-less) polymorphic reference to the
-- commented content; parent_id threads replies. A reply still carries the root
-- content's target_type/target_id, so comment_count counts replies too.

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  target_type public.comment_target not null,
  target_id uuid not null,
  parent_id uuid references public.comments (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  like_count integer not null default 0 check (like_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index comments_target_idx on public.comments (target_type, target_id, created_at);
create index comments_parent_idx on public.comments (parent_id);
create index comments_user_idx on public.comments (user_id, created_at desc);

create trigger comments_updated_at before update on public.comments
  for each row execute function public.set_updated_at();

-- ── content_likes ────────────────────────────────────────────────────────────

create table public.content_likes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  target_type public.like_target not null,
  target_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, target_type, target_id)
);

create index content_likes_target_idx on public.content_likes (target_type, target_id);

-- ── Counter columns (trigger-maintained; locked via column grants below) ──────

alter table public.reviews       add column comment_count integer not null default 0 check (comment_count >= 0);
alter table public.lists         add column like_count    integer not null default 0 check (like_count >= 0);
alter table public.lists         add column comment_count integer not null default 0 check (comment_count >= 0);
alter table public.diary_entries add column like_count    integer not null default 0 check (like_count >= 0);
alter table public.diary_entries add column comment_count integer not null default 0 check (comment_count >= 0);

-- ── Block/target enforcement for comments ────────────────────────────────────
-- Validates the target exists and that the commenter is not blocked by (or
-- blocking) the content owner. Runs as definer so it can resolve owners across
-- RLS.

create or replace function public.enforce_comment_allowed()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_owner uuid;
begin
  v_owner := case new.target_type
    when 'review'      then (select user_id from public.reviews where id = new.target_id)
    when 'list'        then (select user_id from public.lists where id = new.target_id)
    when 'diary_entry' then (select user_id from public.diary_entries where id = new.target_id)
  end;
  if v_owner is null then
    raise exception 'Comment target not found.';
  end if;
  if public.is_blocked_either(new.user_id, v_owner) then
    raise exception 'You cannot comment on this content.';
  end if;
  if new.parent_id is not null and not exists (
    select 1 from public.comments c
    where c.id = new.parent_id
      and c.target_type = new.target_type
      and c.target_id = new.target_id
  ) then
    raise exception 'Parent comment does not belong to this content.';
  end if;
  return new;
end;
$$;

create trigger comments_enforce_allowed
  before insert on public.comments
  for each row execute function public.enforce_comment_allowed();

-- ── comment_count maintenance ────────────────────────────────────────────────

create or replace function public.handle_comment_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_delta integer := case tg_op when 'INSERT' then 1 else -1 end;
  v_type public.comment_target := case tg_op when 'INSERT' then new.target_type else old.target_type end;
  v_id uuid := case tg_op when 'INSERT' then new.target_id else old.target_id end;
begin
  if v_type = 'review' then
    update public.reviews set comment_count = greatest(0, comment_count + v_delta) where id = v_id;
  elsif v_type = 'list' then
    update public.lists set comment_count = greatest(0, comment_count + v_delta) where id = v_id;
  elsif v_type = 'diary_entry' then
    update public.diary_entries set comment_count = greatest(0, comment_count + v_delta) where id = v_id;
  end if;
  return case tg_op when 'INSERT' then new else old end;
end;
$$;

create trigger comments_after_insert
  after insert on public.comments
  for each row execute function public.handle_comment_change();
create trigger comments_after_delete
  after delete on public.comments
  for each row execute function public.handle_comment_change();

-- ── like_count maintenance (content_likes) ───────────────────────────────────

create or replace function public.handle_content_like_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_delta integer := case tg_op when 'INSERT' then 1 else -1 end;
  v_type public.like_target := case tg_op when 'INSERT' then new.target_type else old.target_type end;
  v_id uuid := case tg_op when 'INSERT' then new.target_id else old.target_id end;
begin
  if v_type = 'list' then
    update public.lists set like_count = greatest(0, like_count + v_delta) where id = v_id;
  elsif v_type = 'diary_entry' then
    update public.diary_entries set like_count = greatest(0, like_count + v_delta) where id = v_id;
  elsif v_type = 'comment' then
    update public.comments set like_count = greatest(0, like_count + v_delta) where id = v_id;
  end if;
  return case tg_op when 'INSERT' then new else old end;
end;
$$;

create trigger content_likes_after_insert
  after insert on public.content_likes
  for each row execute function public.handle_content_like_change();
create trigger content_likes_after_delete
  after delete on public.content_likes
  for each row execute function public.handle_content_like_change();

-- ── toggle_review_like: implement the RPC declared in the TS Database type ────
-- Was declared in src/types/database.ts with no SQL definition; likes worked via
-- direct review_likes writes. Provide a real atomic, block-aware toggle so the
-- contract is honoured and callers have a single round trip.

create or replace function public.toggle_review_like(p_review_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_author uuid;
  v_liked boolean;
  v_count integer;
begin
  if v_user is null then
    raise exception 'Not authenticated.';
  end if;
  select user_id into v_author from public.reviews where id = p_review_id and published;
  if v_author is null then
    raise exception 'Review not found.';
  end if;
  if public.is_blocked_either(v_user, v_author) then
    raise exception 'You cannot like this review.';
  end if;

  if exists (select 1 from public.review_likes where user_id = v_user and review_id = p_review_id) then
    delete from public.review_likes where user_id = v_user and review_id = p_review_id;
    v_liked := false;
  else
    insert into public.review_likes (user_id, review_id) values (v_user, p_review_id);
    v_liked := true;
  end if;

  select like_count into v_count from public.reviews where id = p_review_id;
  return jsonb_build_object('liked', v_liked, 'like_count', v_count);
end;
$$;

-- ── RLS ──────────────────────────────────────────────────────────────────────

alter table public.comments enable row level security;
alter table public.content_likes enable row level security;

-- Comments are public (they attach to public content), block-aware on the author.
create policy "comments readable unless blocked"
  on public.comments for select
  using (not public.is_blocked_either(auth.uid(), user_id));

create policy "users comment as themselves"
  on public.comments for insert
  with check (auth.uid() = user_id);

create policy "users update own comments"
  on public.comments for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users delete own comments"
  on public.comments for delete
  using (auth.uid() = user_id);

-- like_count is trigger-maintained; only the body is client-editable.
revoke update on public.comments from anon, authenticated;
grant update (body) on public.comments to authenticated;

-- Content likes: publicly readable (like review_likes), owner writes only.
create policy "content likes are publicly readable"
  on public.content_likes for select
  using (true);

create policy "users like content as themselves"
  on public.content_likes for insert
  with check (auth.uid() = user_id);

create policy "users remove own content likes"
  on public.content_likes for delete
  using (auth.uid() = user_id);

-- diary_entries previously allowed blanket owner UPDATE; the new like_count /
-- comment_count columns must not be client-writable. Switch to column grants
-- (mirrors reviews/lists). Only the user-editable fields stay grantable.
revoke update on public.diary_entries from anon, authenticated;
grant update (watched_at, rating, is_rewatch) on public.diary_entries to authenticated;

-- ── Grants ───────────────────────────────────────────────────────────────────

revoke all on function public.toggle_review_like(uuid) from public, anon;
grant execute on function public.toggle_review_like(uuid) to authenticated;

revoke all on function public.enforce_comment_allowed() from public, anon, authenticated;
revoke all on function public.handle_comment_change() from public, anon, authenticated;
revoke all on function public.handle_content_like_change() from public, anon, authenticated;

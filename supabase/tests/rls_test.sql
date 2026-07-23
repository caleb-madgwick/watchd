-- RLS verification for Watchd. Run with a local stack:
--   supabase start && supabase db reset && supabase test db
-- Everything runs inside a rolled-back transaction.

begin;

create extension if not exists pgtap with schema extensions;

select plan(22);

-- ── RLS must be enabled everywhere ───────────────────────────────────────────

select ok(relrowsecurity, format('RLS enabled on %I', relname))
from pg_class
where relnamespace = 'public'::regnamespace
  and relname in (
    'profiles', 'titles', 'user_title_status', 'diary_entries', 'tv_progress',
    'reviews', 'review_likes', 'follows', 'blocks', 'lists', 'list_items',
    'activities', 'reports'
  );

-- ── Fixtures: two users created through the real signup trigger ─────────────

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change, email_change_token_new)
values
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'rls_a@test.local', 'x', now(), '{}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'b0000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'rls_b@test.local', 'x', now(), '{}', '{}', now(), now(), '', '', '', '');

select is(
  (select count(*)::int from public.profiles where id in ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002')),
  2,
  'signup trigger creates profiles automatically'
);

insert into public.titles (id, tmdb_id, media_type, title)
values ('t0000000-0000-4000-8000-000000000001', 999901, 'movie', 'RLS Test Movie');

insert into public.lists (id, user_id, name, visibility)
values ('l0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'B private list', 'private');

-- ── Act as user A ────────────────────────────────────────────────────────────

set local role authenticated;
set local request.jwt.claims to '{"sub": "a0000000-0000-4000-8000-000000000001", "role": "authenticated"}';

select results_eq(
  $$ update public.profiles set bio = 'hacked' where id = 'b0000000-0000-4000-8000-000000000002' returning 1 $$,
  $$ values (1) offset 1 $$,
  'cannot update another user''s profile (0 rows affected)'
);

select lives_ok(
  $$ update public.profiles set bio = 'my own bio' where id = 'a0000000-0000-4000-8000-000000000001' $$,
  'can update own profile'
);

select throws_like(
  $$ update public.profiles set follower_count = 9999 where id = 'a0000000-0000-4000-8000-000000000001' $$,
  '%permission denied%',
  'counter columns are not client-writable even on own row'
);

select throws_like(
  $$ insert into public.activities (actor_id, activity_type) values ('a0000000-0000-4000-8000-000000000001', 'logged') $$,
  '%row-level security%',
  'clients cannot forge activities'
);

select throws_like(
  $$ insert into public.titles (tmdb_id, media_type, title) values (999902, 'movie', 'Direct insert') $$,
  '%row-level security%',
  'clients cannot insert titles directly'
);

select throws_like(
  $$ insert into public.user_title_status (user_id, title_id, status) values ('b0000000-0000-4000-8000-000000000002', 't0000000-0000-4000-8000-000000000001', 'watched') $$,
  '%row-level security%',
  'cannot create title status for another user'
);

select lives_ok(
  $$ insert into public.user_title_status (user_id, title_id, status, rating) values ('a0000000-0000-4000-8000-000000000001', 't0000000-0000-4000-8000-000000000001', 'watched', 4.5) $$,
  'can create own title status'
);

select throws_like(
  $$ insert into public.follows (follower_id, following_id) values ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001') $$,
  '%row-level security%',
  'cannot create follows on behalf of another user'
);

select lives_ok(
  $$ insert into public.follows (follower_id, following_id) values ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002') $$,
  'can follow as self'
);

select is(
  (select count(*)::int from public.lists where id = 'l0000000-0000-4000-8000-000000000001'),
  0,
  'private lists of other users are invisible'
);

select is(
  (select count(*)::int from public.activities where activity_type = 'followed' and actor_id = 'a0000000-0000-4000-8000-000000000001'),
  1,
  'follow trigger generated exactly one activity'
);

select is(
  (select follower_count from public.profiles where id = 'b0000000-0000-4000-8000-000000000002'),
  1,
  'follower counter maintained by trigger'
);

-- log_title end-to-end as user A

select lives_ok(
  $$ select public.log_title(
       p_title_id => 't0000000-0000-4000-8000-000000000001',
       p_rating => 4.0,
       p_review_body => 'Solid test movie.',
       p_create_diary_entry => true) $$,
  'log_title runs for an authenticated user'
);

select is(
  (select count(*)::int from public.activities
    where actor_id = 'a0000000-0000-4000-8000-000000000001'
      and activity_type = 'logged'
      and title_id = 't0000000-0000-4000-8000-000000000001'),
  1,
  'log_title emitted one combined activity'
);

select lives_ok(
  $$ select public.log_title(
       p_title_id => 't0000000-0000-4000-8000-000000000001',
       p_rating => 4.5) $$,
  'second log within window updates rather than duplicates'
);

select is(
  (select count(*)::int from public.activities
    where actor_id = 'a0000000-0000-4000-8000-000000000001'
      and activity_type = 'logged'
      and title_id = 't0000000-0000-4000-8000-000000000001'),
  1,
  'combined activity deduplicated within the 6h window'
);

select throws_like(
  $$ select public.log_title(p_title_id => 't0000000-0000-4000-8000-000000000001', p_rating => 3.3) $$,
  '%half-star%',
  'log_title rejects non-half-star ratings'
);

-- ── Act as user B: blocks stay private ───────────────────────────────────────

set local request.jwt.claims to '{"sub": "b0000000-0000-4000-8000-000000000002", "role": "authenticated"}';

insert into public.blocks (blocker_id, blocked_id)
values ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001');

set local request.jwt.claims to '{"sub": "a0000000-0000-4000-8000-000000000001", "role": "authenticated"}';

select is(
  (select count(*)::int from public.blocks),
  0,
  'blocks are invisible to the blocked user'
);

select throws_like(
  $$ insert into public.follows (follower_id, following_id) values ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002') $$,
  '%cannot follow%',
  'blocked users cannot follow the blocker'
);

-- ── Anonymous role ───────────────────────────────────────────────────────────

set local role anon;
set local request.jwt.claims to '{}';

select is(
  (select count(*)::int > 0 from public.profiles),
  true,
  'anon can read public profiles'
);

select throws_like(
  $$ insert into public.reviews (user_id, title_id, body) values ('a0000000-0000-4000-8000-000000000001', 't0000000-0000-4000-8000-000000000001', 'anon spam') $$,
  '%row-level security%',
  'anon cannot write reviews'
);

select * from finish();

rollback;

-- Watchd development seed. LOCAL DEVELOPMENT ONLY.
-- Runs automatically on `supabase db reset` (local stack). Never run against
-- production: it inserts auth.users rows with the shared password below.
--
-- Sample accounts (password for all: watchd-demo-1):
--   ava@example.com    · @avafilm     — chatty cinephile
--   marcus@example.com · @marcusk     — TV completionist
--   noor@example.com   · @noorwatches — horror fan
--   theo@example.com   · @theoscreens — quiet lurker
--   demo@example.com   · @demo        — empty account for onboarding testing

-- ── auth users ───────────────────────────────────────────────────────────────

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
)
select
  '00000000-0000-0000-0000-000000000000',
  u.id, 'authenticated', 'authenticated', u.email,
  extensions.crypt('watchd-demo-1', extensions.gen_salt('bf')),
  now(), '{"provider":"email","providers":["email"]}', '{}',
  now() - u.age, now() - u.age, '', '', '', ''
from (values
  ('11111111-1111-4111-8111-111111111111'::uuid, 'ava@example.com',    interval '90 days'),
  ('22222222-2222-4222-8222-222222222222'::uuid, 'marcus@example.com', interval '75 days'),
  ('33333333-3333-4333-8333-333333333333'::uuid, 'noor@example.com',   interval '60 days'),
  ('44444444-4444-4444-8444-444444444444'::uuid, 'theo@example.com',   interval '45 days'),
  ('55555555-5555-4555-8555-555555555555'::uuid, 'demo@example.com',   interval '1 day')
) as u(id, email, age);

insert into auth.identities (
  id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
)
select
  gen_random_uuid(), u.id,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  'email', u.id::text, now(), now(), now()
from auth.users u
where u.email like '%@example.com';

-- The on_auth_user_created trigger has made placeholder profiles; polish them.

update public.profiles set
  username = v.username,
  display_name = v.display_name,
  bio = v.bio,
  favourite_genres = v.genres,
  onboarding_completed = v.done
from (values
  ('11111111-1111-4111-8111-111111111111'::uuid, 'avafilm', 'Ava Lin',
   'Cinema four nights a week. Letter grades are for school — stars are forever.',
   array[18, 878, 53], true),
  ('22222222-2222-4222-8222-222222222222'::uuid, 'marcusk', 'Marcus Kane',
   'If it has seven seasons, I have seen all of them twice.',
   array[18, 80, 9648], true),
  ('33333333-3333-4333-8333-333333333333'::uuid, 'noorwatches', 'Noor Haddad',
   'Horror before bed, comfort sitcoms after.', array[27, 35, 9648], true),
  ('44444444-4444-4444-8444-444444444444'::uuid, 'theoscreens', 'Theo Brandt',
   '', array[28, 12], true),
  ('55555555-5555-4555-8555-555555555555'::uuid, 'demo', 'Demo User', '', '{}'::integer[], false)
) as v(id, username, display_name, bio, genres, done)
where profiles.id = v.id;

-- ── titles (TMDB reference cache) ────────────────────────────────────────────
-- Image paths may drift over time; the app refreshes them on interaction.

insert into public.titles (id, tmdb_id, media_type, title, poster_path, release_date) values
  ('aaaaaaa1-0000-4000-8000-000000000001', 27205,  'movie', 'Inception',                '/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg', '2010-07-16'),
  ('aaaaaaa1-0000-4000-8000-000000000002', 155,    'movie', 'The Dark Knight',          '/qJ2tW6WMUDux911r6m7haRef0WH.jpg', '2008-07-16'),
  ('aaaaaaa1-0000-4000-8000-000000000003', 157336, 'movie', 'Interstellar',             '/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg', '2014-11-05'),
  ('aaaaaaa1-0000-4000-8000-000000000004', 496243, 'movie', 'Parasite',                 '/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg', '2019-05-30'),
  ('aaaaaaa1-0000-4000-8000-000000000005', 550,    'movie', 'Fight Club',               '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg', '1999-10-15'),
  ('aaaaaaa1-0000-4000-8000-000000000006', 680,    'movie', 'Pulp Fiction',             '/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg', '1994-09-10'),
  ('aaaaaaa1-0000-4000-8000-000000000007', 603,    'movie', 'The Matrix',               '/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg', '1999-03-31'),
  ('aaaaaaa1-0000-4000-8000-000000000008', 278,    'movie', 'The Shawshank Redemption', '/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg', '1994-09-23'),
  ('aaaaaaa1-0000-4000-8000-000000000009', 244786, 'movie', 'Whiplash',                 '/7fn624j5lj3xTme2SgiLCeuedmO.jpg', '2014-10-10'),
  ('aaaaaaa1-0000-4000-8000-000000000010', 129,    'movie', 'Spirited Away',            '/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg', '2001-07-20'),
  ('bbbbbbb1-0000-4000-8000-000000000001', 1396,   'tv',    'Breaking Bad',             '/ggFHVNu6YYI5L9pCfOacjizRGt.jpg',  '2008-01-20'),
  ('bbbbbbb1-0000-4000-8000-000000000002', 1399,   'tv',    'Game of Thrones',          '/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg', '2011-04-17'),
  ('bbbbbbb1-0000-4000-8000-000000000003', 66732,  'tv',    'Stranger Things',          '/49WJfeN0moxb9IPfGn8AIqMGskD.jpg', '2016-07-15'),
  ('bbbbbbb1-0000-4000-8000-000000000004', 95396,  'tv',    'Severance',                '/lFf6LLrQjYldcZItzOkGmMMigP7.jpg', '2022-02-17'),
  ('bbbbbbb1-0000-4000-8000-000000000005', 76331,  'tv',    'Succession',               '/7HW47XbkNQ5fiwQFYGWdw9gs144.jpg', '2018-06-03'),
  ('bbbbbbb1-0000-4000-8000-000000000006', 136315, 'tv',    'The Bear',                 '/sHFlbKS3WLqMnp9t2ghADIJFnuQ.jpg', '2022-06-23');

-- ── statuses, ratings, favourites ────────────────────────────────────────────

insert into public.user_title_status (user_id, title_id, status, rating, watched_at, is_favourite) values
  -- Ava: film person
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaa1-0000-4000-8000-000000000001', 'watched', 4.5, current_date - 40, true),
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaa1-0000-4000-8000-000000000004', 'watched', 5.0, current_date - 21, true),
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaa1-0000-4000-8000-000000000009', 'watched', 4.5, current_date - 9, false),
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaa1-0000-4000-8000-000000000003', 'watched', 4.0, current_date - 5, false),
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaa1-0000-4000-8000-000000000010', 'watchlist', null, null, false),
  ('11111111-1111-4111-8111-111111111111', 'bbbbbbb1-0000-4000-8000-000000000004', 'watching', null, null, false),
  -- Marcus: TV head
  ('22222222-2222-4222-8222-222222222222', 'bbbbbbb1-0000-4000-8000-000000000001', 'watched', 5.0, current_date - 30, true),
  ('22222222-2222-4222-8222-222222222222', 'bbbbbbb1-0000-4000-8000-000000000005', 'watched', 4.5, current_date - 12, false),
  ('22222222-2222-4222-8222-222222222222', 'bbbbbbb1-0000-4000-8000-000000000003', 'watching', null, null, false),
  ('22222222-2222-4222-8222-222222222222', 'aaaaaaa1-0000-4000-8000-000000000002', 'watched', 4.5, current_date - 60, false),
  ('22222222-2222-4222-8222-222222222222', 'bbbbbbb1-0000-4000-8000-000000000006', 'watchlist', null, null, false),
  -- Noor
  ('33333333-3333-4333-8333-333333333333', 'aaaaaaa1-0000-4000-8000-000000000005', 'watched', 4.0, current_date - 15, false),
  ('33333333-3333-4333-8333-333333333333', 'aaaaaaa1-0000-4000-8000-000000000007', 'watched', 4.5, current_date - 7, true),
  ('33333333-3333-4333-8333-333333333333', 'bbbbbbb1-0000-4000-8000-000000000003', 'watched', 4.0, current_date - 3, false),
  ('33333333-3333-4333-8333-333333333333', 'aaaaaaa1-0000-4000-8000-000000000006', 'watchlist', null, null, false),
  -- Theo: mostly quiet
  ('44444444-4444-4444-8444-444444444444', 'aaaaaaa1-0000-4000-8000-000000000008', 'watched', 5.0, current_date - 2, true),
  ('44444444-4444-4444-8444-444444444444', 'aaaaaaa1-0000-4000-8000-000000000001', 'watchlist', null, null, false);

-- ── tv progress ──────────────────────────────────────────────────────────────

insert into public.tv_progress (user_id, title_id, season_number, episode_number, completed, last_watched_at) values
  ('11111111-1111-4111-8111-111111111111', 'bbbbbbb1-0000-4000-8000-000000000004', 1, 6, false, now() - interval '2 days'),
  ('22222222-2222-4222-8222-222222222222', 'bbbbbbb1-0000-4000-8000-000000000001', 5, 16, true, now() - interval '30 days'),
  ('22222222-2222-4222-8222-222222222222', 'bbbbbbb1-0000-4000-8000-000000000003', 3, 2, false, now() - interval '1 day'),
  ('33333333-3333-4333-8333-333333333333', 'bbbbbbb1-0000-4000-8000-000000000003', 4, 9, true, now() - interval '3 days');

-- ── diary entries ────────────────────────────────────────────────────────────

insert into public.diary_entries (user_id, title_id, watched_at, rating, is_rewatch) values
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaa1-0000-4000-8000-000000000004', current_date - 21, 5.0, false),
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaa1-0000-4000-8000-000000000009', current_date - 9, 4.5, false),
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaa1-0000-4000-8000-000000000003', current_date - 5, 4.0, true),
  ('33333333-3333-4333-8333-333333333333', 'aaaaaaa1-0000-4000-8000-000000000007', current_date - 7, 4.5, true),
  ('44444444-4444-4444-8444-444444444444', 'aaaaaaa1-0000-4000-8000-000000000008', current_date - 2, 5.0, false);

-- ── reviews ──────────────────────────────────────────────────────────────────

insert into public.reviews (id, user_id, title_id, rating, body, contains_spoilers, created_at) values
  ('ccccccc1-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111',
   'aaaaaaa1-0000-4000-8000-000000000004', 5.0,
   'A machine built from tension. Every frame of the house is architecture as class warfare, and the tonal pivots should not work but absolutely do. Best final act of the decade.',
   false, now() - interval '21 days'),
  ('ccccccc1-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111',
   'aaaaaaa1-0000-4000-8000-000000000009', 4.5,
   'Not quite my tempo — it is faster. The last ten minutes are a drum solo shot like a heist.',
   false, now() - interval '9 days'),
  ('ccccccc1-0000-4000-8000-000000000003', '22222222-2222-4222-8222-222222222222',
   'bbbbbbb1-0000-4000-8000-000000000001', 5.0,
   'Rewatched the whole run. The pilot already contains the ending — Walt was never becoming someone else, just admitting who he was. Ozymandias remains the single best hour of television ever aired.',
   true, now() - interval '30 days'),
  ('ccccccc1-0000-4000-8000-000000000004', '33333333-3333-4333-8333-333333333333',
   'bbbbbbb1-0000-4000-8000-000000000003', 4.0,
   'The kids carry it, the synths do the rest. Season four gets genuinely scary in a way the show only flirted with before.',
   false, now() - interval '3 days'),
  ('ccccccc1-0000-4000-8000-000000000005', '44444444-4444-4444-8444-444444444444',
   'aaaaaaa1-0000-4000-8000-000000000008', 5.0,
   'Hope is a good thing. Maybe the best of things.', false, now() - interval '2 days');

-- ── follows (triggers create counters + 'followed' activities) ───────────────

insert into public.follows (follower_id, following_id) values
  ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222'),
  ('11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333333'),
  ('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111'),
  ('33333333-3333-4333-8333-333333333333', '11111111-1111-4111-8111-111111111111'),
  ('33333333-3333-4333-8333-333333333333', '22222222-2222-4222-8222-222222222222'),
  ('44444444-4444-4444-8444-444444444444', '11111111-1111-4111-8111-111111111111'),
  ('44444444-4444-4444-8444-444444444444', '33333333-3333-4333-8333-333333333333');

-- ── lists (public list trigger creates 'list_created' activities) ────────────

insert into public.lists (id, user_id, name, description, visibility) values
  ('ddddddd1-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111',
   'Perfect final acts', 'Movies whose last 20 minutes justify everything before them.', 'public'),
  ('ddddddd1-0000-4000-8000-000000000002', '22222222-2222-4222-8222-222222222222',
   'Complete-series comfort rewatches', 'Finished shows worth starting again immediately.', 'public'),
  ('ddddddd1-0000-4000-8000-000000000003', '33333333-3333-4333-8333-333333333333',
   'Do not watch alone', null, 'private');

insert into public.list_items (list_id, title_id, position, note) values
  ('ddddddd1-0000-4000-8000-000000000001', 'aaaaaaa1-0000-4000-8000-000000000004', 0, 'The basement.'),
  ('ddddddd1-0000-4000-8000-000000000001', 'aaaaaaa1-0000-4000-8000-000000000009', 1, 'Caravan.'),
  ('ddddddd1-0000-4000-8000-000000000001', 'aaaaaaa1-0000-4000-8000-000000000001', 2, null),
  ('ddddddd1-0000-4000-8000-000000000002', 'bbbbbbb1-0000-4000-8000-000000000001', 0, null),
  ('ddddddd1-0000-4000-8000-000000000002', 'bbbbbbb1-0000-4000-8000-000000000005', 1, null),
  ('ddddddd1-0000-4000-8000-000000000003', 'aaaaaaa1-0000-4000-8000-000000000005', 0, null);

-- ── review likes (trigger maintains like_count) ──────────────────────────────

insert into public.review_likes (user_id, review_id) values
  ('22222222-2222-4222-8222-222222222222', 'ccccccc1-0000-4000-8000-000000000001'),
  ('33333333-3333-4333-8333-333333333333', 'ccccccc1-0000-4000-8000-000000000001'),
  ('44444444-4444-4444-8444-444444444444', 'ccccccc1-0000-4000-8000-000000000001'),
  ('11111111-1111-4111-8111-111111111111', 'ccccccc1-0000-4000-8000-000000000003'),
  ('33333333-3333-4333-8333-333333333333', 'ccccccc1-0000-4000-8000-000000000003'),
  ('11111111-1111-4111-8111-111111111111', 'ccccccc1-0000-4000-8000-000000000004');

-- ── combined 'logged' activities (what log_title would have produced) ────────

insert into public.activities (actor_id, activity_type, title_id, review_id, metadata, created_at) values
  ('11111111-1111-4111-8111-111111111111', 'logged', 'aaaaaaa1-0000-4000-8000-000000000004',
   'ccccccc1-0000-4000-8000-000000000001',
   '{"status":"watched","rating":5.0,"has_review":true,"media_type":"movie"}', now() - interval '21 days'),
  ('11111111-1111-4111-8111-111111111111', 'logged', 'aaaaaaa1-0000-4000-8000-000000000009',
   'ccccccc1-0000-4000-8000-000000000002',
   '{"status":"watched","rating":4.5,"has_review":true,"media_type":"movie"}', now() - interval '9 days'),
  ('11111111-1111-4111-8111-111111111111', 'logged', 'aaaaaaa1-0000-4000-8000-000000000003', null,
   '{"status":"watched","rating":4.0,"has_review":false,"is_rewatch":true,"media_type":"movie"}', now() - interval '5 days'),
  ('22222222-2222-4222-8222-222222222222', 'logged', 'bbbbbbb1-0000-4000-8000-000000000001',
   'ccccccc1-0000-4000-8000-000000000003',
   '{"status":"watched","rating":5.0,"has_review":true,"media_type":"tv"}', now() - interval '30 days'),
  ('33333333-3333-4333-8333-333333333333', 'logged', 'bbbbbbb1-0000-4000-8000-000000000003',
   'ccccccc1-0000-4000-8000-000000000004',
   '{"status":"watched","rating":4.0,"has_review":true,"media_type":"tv"}', now() - interval '3 days'),
  ('44444444-4444-4444-8444-444444444444', 'logged', 'aaaaaaa1-0000-4000-8000-000000000008',
   'ccccccc1-0000-4000-8000-000000000005',
   '{"status":"watched","rating":5.0,"has_review":true,"media_type":"movie"}', now() - interval '2 days'),
  ('22222222-2222-4222-8222-222222222222', 'tv_completed', 'bbbbbbb1-0000-4000-8000-000000000001', null,
   '{"media_type":"tv"}', now() - interval '30 days');

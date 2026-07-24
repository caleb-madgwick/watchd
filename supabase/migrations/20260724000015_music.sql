-- Phase 6: Music (albums, artists, songs) on the shared titles cache.
--
-- Reuses the books generalisation (source / external_id / cover_url, nullable
-- tmdb_id) rather than re-doing it. The ONLY shared-object change is *widening*
-- the source check to admit 'musicbrainz'. Music never modifies the movie/tv/book
-- functions (log_title, get_user_stats, upsert_title_reference, …) — it adds its
-- own RPCs and a listening_logs table, so movies / tv / books are unaffected.
--
-- Everything keyed by title_id (user_title_status, reviews, lists, favourites,
-- activities) works for music unchanged; music-specific catalogue lives in the
-- music_* tables below.

-- ── titles: admit a MusicBrainz identity ─────────────────────────────────────

alter table public.titles drop constraint if exists titles_source_check;
alter table public.titles
  add constraint titles_source_check check (source in ('tmdb', 'google_books', 'musicbrainz'));

-- Denormalised secondary line for DB-driven cards (watchlist / feed / lists /
-- profile) — e.g. the artist credit for an album or song. The structured artist
-- graph lives in music_item_artists; this is just for cheap display.
alter table public.titles
  add column if not exists subtitle text
    check (subtitle is null or char_length(subtitle) <= 300);

-- Music rows are unique by (external_id, media_type): a release-group, recording
-- or artist MBID never collides across the three music types.
create unique index if not exists titles_music_unique
  on public.titles (external_id, media_type) where source = 'musicbrainz';

-- ── music_artists ────────────────────────────────────────────────────────────

create table public.music_artists (
  catalogue_item_id uuid primary key references public.titles (id) on delete cascade,
  sort_name text,
  country_code text check (country_code is null or country_code ~ '^[A-Za-z]{2}$'),
  artist_type text,
  disambiguation text check (disambiguation is null or char_length(disambiguation) <= 300),
  begin_date date,
  end_date date
);

-- ── music_albums ─────────────────────────────────────────────────────────────

create table public.music_albums (
  catalogue_item_id uuid primary key references public.titles (id) on delete cascade,
  album_type text,
  secondary_types text[] not null default '{}',
  first_release_date date,
  track_count integer check (track_count is null or track_count between 0 and 1000)
);

-- ── music_songs ──────────────────────────────────────────────────────────────

create table public.music_songs (
  catalogue_item_id uuid primary key references public.titles (id) on delete cascade,
  duration_ms integer check (duration_ms is null or duration_ms between 0 and 100000000),
  isrc text check (isrc is null or isrc ~ '^[A-Za-z]{2}[A-Za-z0-9]{3}[0-9]{7}$')
);

-- ── music_item_artists: credited artists for an album or song ────────────────

create table public.music_item_artists (
  catalogue_item_id uuid not null references public.titles (id) on delete cascade,
  artist_item_id uuid not null references public.titles (id) on delete cascade,
  credit_name text,
  position integer not null default 0,
  role text not null default 'primary',
  primary key (catalogue_item_id, artist_item_id, role, position)
);

create index music_item_artists_artist_idx on public.music_item_artists (artist_item_id);

-- ── album_tracks ─────────────────────────────────────────────────────────────

create table public.album_tracks (
  album_item_id uuid not null references public.titles (id) on delete cascade,
  song_item_id uuid not null references public.titles (id) on delete cascade,
  disc_number integer not null default 1 check (disc_number between 1 and 100),
  track_number integer not null check (track_number between 1 and 1000),
  track_title text,
  duration_ms integer,
  primary key (album_item_id, disc_number, track_number)
);

create index album_tracks_song_idx on public.album_tracks (song_item_id);

-- ── provider_links: external playback links (Spotify now; Apple/YT later) ────

create table public.provider_links (
  id uuid primary key default gen_random_uuid(),
  catalogue_item_id uuid not null references public.titles (id) on delete cascade,
  provider text not null,
  url text not null check (url ~ '^https://[^ ]{1,600}$'),
  provider_item_id text,
  region_code text not null default '',
  created_at timestamptz not null default now(),
  unique (catalogue_item_id, provider, region_code)
);

create index provider_links_item_idx on public.provider_links (catalogue_item_id);

-- ── listening_logs: dated listen events (albums & songs) ─────────────────────
-- The music analogue of diary_entries; decoupled from log_title so books' diary
-- gate is untouched.

create table public.listening_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title_id uuid not null references public.titles (id) on delete cascade,
  listened_at timestamptz not null default now(),
  rating numeric(2, 1) check (
    rating is null or (rating between 0.5 and 5.0 and rating * 2 = floor(rating * 2))
  ),
  notes text check (notes is null or char_length(notes) <= 2000),
  source text not null default 'manual',
  created_at timestamptz not null default now()
);

create index listening_logs_user_idx on public.listening_logs (user_id, listened_at desc);
create index listening_logs_title_idx on public.listening_logs (title_id);

-- ── RLS: catalogue is world-readable + RPC-only writes; logs are owner-scoped ─

alter table public.music_artists enable row level security;
alter table public.music_albums enable row level security;
alter table public.music_songs enable row level security;
alter table public.music_item_artists enable row level security;
alter table public.album_tracks enable row level security;
alter table public.provider_links enable row level security;
alter table public.listening_logs enable row level security;

create policy "music_artists readable" on public.music_artists for select using (true);
create policy "music_albums readable" on public.music_albums for select using (true);
create policy "music_songs readable" on public.music_songs for select using (true);
create policy "music_item_artists readable" on public.music_item_artists for select using (true);
create policy "album_tracks readable" on public.album_tracks for select using (true);
create policy "provider_links readable" on public.provider_links for select using (true);

create policy "users read own listening logs"
  on public.listening_logs for select using (auth.uid() = user_id);
create policy "users insert own listening logs"
  on public.listening_logs for insert with check (auth.uid() = user_id);
create policy "users update own listening logs"
  on public.listening_logs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users delete own listening logs"
  on public.listening_logs for delete using (auth.uid() = user_id);

-- ── upsert_music_reference: the only write path for music titles ─────────────

create or replace function public.upsert_music_reference(
  p_mbid text,
  p_media_type public.media_type,
  p_title text,
  p_subtitle text default null,
  p_cover_url text default null,
  p_release_date date default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_cover text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated.';
  end if;
  if p_media_type not in ('artist', 'album', 'song') then
    raise exception 'upsert_music_reference only accepts music media types.';
  end if;
  if p_mbid is null or char_length(trim(p_mbid)) not between 1 and 64 then
    raise exception 'Invalid MusicBrainz id.';
  end if;
  if p_title is null or char_length(trim(p_title)) not between 1 and 500 then
    raise exception 'Invalid title.';
  end if;

  v_cover := case when p_cover_url ~ '^https://[^ ]{1,600}$' then p_cover_url end;

  insert into public.titles (source, external_id, media_type, title, subtitle, cover_url, release_date)
  values (
    'musicbrainz', trim(p_mbid), p_media_type, left(trim(p_title), 500),
    left(p_subtitle, 300), v_cover, p_release_date
  )
  on conflict (external_id, media_type) where source = 'musicbrainz' do update set
    title = excluded.title,
    subtitle = coalesce(excluded.subtitle, titles.subtitle),
    cover_url = coalesce(excluded.cover_url, titles.cover_url),
    release_date = coalesce(excluded.release_date, titles.release_date),
    metadata_updated_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

-- ── Detail upserts (catalogue metadata; any authed user may refresh) ─────────

create or replace function public.upsert_music_album_detail(
  p_item_id uuid,
  p_album_type text default null,
  p_secondary_types text[] default '{}',
  p_first_release_date date default null,
  p_track_count integer default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated.';
  end if;
  if not exists (select 1 from public.titles where id = p_item_id and media_type = 'album') then
    raise exception 'Not an album.';
  end if;
  insert into public.music_albums (catalogue_item_id, album_type, secondary_types, first_release_date, track_count)
  values (
    p_item_id, p_album_type, coalesce(p_secondary_types, '{}'), p_first_release_date,
    case when p_track_count between 0 and 1000 then p_track_count end
  )
  on conflict (catalogue_item_id) do update set
    album_type = coalesce(excluded.album_type, music_albums.album_type),
    secondary_types = case when array_length(excluded.secondary_types, 1) is not null
      then excluded.secondary_types else music_albums.secondary_types end,
    first_release_date = coalesce(excluded.first_release_date, music_albums.first_release_date),
    track_count = coalesce(excluded.track_count, music_albums.track_count);
end;
$$;

create or replace function public.upsert_music_artist_detail(
  p_item_id uuid,
  p_sort_name text default null,
  p_country_code text default null,
  p_artist_type text default null,
  p_disambiguation text default null,
  p_begin_date date default null,
  p_end_date date default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated.';
  end if;
  if not exists (select 1 from public.titles where id = p_item_id and media_type = 'artist') then
    raise exception 'Not an artist.';
  end if;
  insert into public.music_artists (catalogue_item_id, sort_name, country_code, artist_type, disambiguation, begin_date, end_date)
  values (
    p_item_id, p_sort_name,
    case when p_country_code ~ '^[A-Za-z]{2}$' then upper(p_country_code) end,
    p_artist_type, left(p_disambiguation, 300), p_begin_date, p_end_date
  )
  on conflict (catalogue_item_id) do update set
    sort_name = coalesce(excluded.sort_name, music_artists.sort_name),
    country_code = coalesce(excluded.country_code, music_artists.country_code),
    artist_type = coalesce(excluded.artist_type, music_artists.artist_type),
    disambiguation = coalesce(excluded.disambiguation, music_artists.disambiguation),
    begin_date = coalesce(excluded.begin_date, music_artists.begin_date),
    end_date = coalesce(excluded.end_date, music_artists.end_date);
end;
$$;

create or replace function public.upsert_music_song_detail(
  p_item_id uuid,
  p_duration_ms integer default null,
  p_isrc text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated.';
  end if;
  if not exists (select 1 from public.titles where id = p_item_id and media_type = 'song') then
    raise exception 'Not a song.';
  end if;
  insert into public.music_songs (catalogue_item_id, duration_ms, isrc)
  values (
    p_item_id,
    case when p_duration_ms between 0 and 100000000 then p_duration_ms end,
    case when p_isrc ~ '^[A-Za-z]{2}[A-Za-z0-9]{3}[0-9]{7}$' then upper(p_isrc) end
  )
  on conflict (catalogue_item_id) do update set
    duration_ms = coalesce(excluded.duration_ms, music_songs.duration_ms),
    isrc = coalesce(excluded.isrc, music_songs.isrc);
end;
$$;

-- ── set_music_item_artists: wholesale replace an item's artist credits ───────
-- p_artists = [{ "mbid": "...", "name": "Lorde", "credit_name": "...", "role": "primary" }, …]
-- Each artist is upserted as its own titles row so it links to a real artist id.

create or replace function public.set_music_item_artists(
  p_item_id uuid,
  p_artists jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  a jsonb;
  v_artist_id uuid;
  v_pos integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated.';
  end if;
  if not exists (select 1 from public.titles where id = p_item_id) then
    raise exception 'Unknown item.';
  end if;

  delete from public.music_item_artists where catalogue_item_id = p_item_id;

  for a in select * from jsonb_array_elements(coalesce(p_artists, '[]'::jsonb))
  loop
    continue when a->>'mbid' is null or a->>'name' is null;

    insert into public.titles (source, external_id, media_type, title)
    values ('musicbrainz', a->>'mbid', 'artist', left(a->>'name', 500))
    on conflict (external_id, media_type) where source = 'musicbrainz' do update set
      title = excluded.title, metadata_updated_at = now()
    returning id into v_artist_id;

    insert into public.music_item_artists (catalogue_item_id, artist_item_id, credit_name, position, role)
    values (p_item_id, v_artist_id, a->>'credit_name', v_pos, coalesce(a->>'role', 'primary'))
    on conflict (catalogue_item_id, artist_item_id, role, position) do nothing;

    v_pos := v_pos + 1;
  end loop;
end;
$$;

-- ── set_album_tracks: wholesale replace an album's tracklist ─────────────────
-- p_tracks = [{ "song_mbid": "...", "title": "...", "artist": "...",
--              "disc_number": 1, "track_number": 1, "duration_ms": 210000 }, …]
-- Each track's song is upserted as a titles row so tracks link to real song ids.

create or replace function public.set_album_tracks(
  p_album_item_id uuid,
  p_tracks jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  t jsonb;
  v_song_id uuid;
  v_dur integer;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated.';
  end if;
  if not exists (select 1 from public.titles where id = p_album_item_id and media_type = 'album') then
    raise exception 'Not an album.';
  end if;

  delete from public.album_tracks where album_item_id = p_album_item_id;

  for t in select * from jsonb_array_elements(coalesce(p_tracks, '[]'::jsonb))
  loop
    continue when t->>'song_mbid' is null or t->>'track_number' is null;
    v_dur := nullif(t->>'duration_ms', '')::integer;

    insert into public.titles (source, external_id, media_type, title, subtitle, cover_url)
    values (
      'musicbrainz', t->>'song_mbid', 'song', left(coalesce(t->>'title', 'Untitled'), 500),
      left(t->>'artist', 300),
      case when (t->>'cover_url') ~ '^https://[^ ]{1,600}$' then t->>'cover_url' end
    )
    on conflict (external_id, media_type) where source = 'musicbrainz' do update set
      title = excluded.title,
      subtitle = coalesce(excluded.subtitle, titles.subtitle),
      metadata_updated_at = now()
    returning id into v_song_id;

    insert into public.music_songs (catalogue_item_id, duration_ms)
    values (v_song_id, case when v_dur between 0 and 100000000 then v_dur end)
    on conflict (catalogue_item_id) do update set
      duration_ms = coalesce(excluded.duration_ms, music_songs.duration_ms);

    insert into public.album_tracks (album_item_id, song_item_id, disc_number, track_number, track_title, duration_ms)
    values (
      p_album_item_id, v_song_id,
      coalesce((t->>'disc_number')::integer, 1), (t->>'track_number')::integer,
      t->>'title', v_dur
    )
    on conflict (album_item_id, disc_number, track_number) do update set
      song_item_id = excluded.song_item_id,
      track_title = excluded.track_title,
      duration_ms = excluded.duration_ms;
  end loop;
end;
$$;

-- ── upsert_provider_link: an external playback link for an item ──────────────

create or replace function public.upsert_provider_link(
  p_item_id uuid,
  p_provider text,
  p_url text,
  p_provider_item_id text default null,
  p_region_code text default ''
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated.';
  end if;
  if p_url !~ '^https://[^ ]{1,600}$' then
    raise exception 'Invalid provider url.';
  end if;
  if not exists (select 1 from public.titles where id = p_item_id) then
    raise exception 'Unknown item.';
  end if;
  insert into public.provider_links (catalogue_item_id, provider, url, provider_item_id, region_code)
  values (p_item_id, p_provider, p_url, p_provider_item_id, coalesce(p_region_code, ''))
  on conflict (catalogue_item_id, provider, region_code) do update set
    url = excluded.url,
    provider_item_id = coalesce(excluded.provider_item_id, provider_links.provider_item_id);
end;
$$;

-- ── get_music_community_summary (mirrors get_book_community_summary) ──────────

create or replace function public.get_music_community_summary(
  p_mbid text,
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
  where external_id = p_mbid and media_type = p_media_type and source = 'musicbrainz';

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

-- ── log_listen: dated listen event for an album/song ─────────────────────────
-- Writes a listening_logs row, marks the item listened, and (albums only) emits
-- ONE combined 'logged' feed activity within a 6-hour window. Song listens stay
-- private (no activity), per the product brief. Self-contained — does NOT touch
-- log_title, so books' diary behaviour is unaffected.

create or replace function public.log_listen(
  p_title_id uuid,
  p_listened_at timestamptz default null,
  p_rating numeric default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_media public.media_type;
  v_log_id uuid;
  v_status_id uuid;
  v_activity_id uuid;
  v_recent integer;
begin
  if v_user is null then
    raise exception 'Not authenticated.';
  end if;
  select media_type into v_media from public.titles where id = p_title_id;
  if v_media is null then
    raise exception 'Unknown title.';
  end if;
  if v_media not in ('album', 'song') then
    raise exception 'Listening logs are only for albums and songs.';
  end if;
  if p_rating is not null and (p_rating < 0.5 or p_rating > 5 or p_rating * 2 <> floor(p_rating * 2)) then
    raise exception 'Rating must be between 0.5 and 5 in half-star steps.';
  end if;
  if p_notes is not null and char_length(p_notes) > 2000 then
    raise exception 'Notes must be 2,000 characters or fewer.';
  end if;

  select count(*) into v_recent
  from public.activities
  where actor_id = v_user and created_at > now() - interval '1 minute';
  if v_recent >= 30 then
    raise exception 'Too many actions. Please slow down.';
  end if;

  insert into public.listening_logs (user_id, title_id, listened_at, rating, notes)
  values (v_user, p_title_id, coalesce(p_listened_at, now()), p_rating, nullif(trim(p_notes), ''))
  returning id into v_log_id;

  insert into public.user_title_status as uts (user_id, title_id, status, rating, watched_at)
  values (v_user, p_title_id, 'watched', p_rating, current_date)
  on conflict (user_id, title_id) do update set
    status = 'watched',
    rating = coalesce(excluded.rating, uts.rating),
    watched_at = coalesce(uts.watched_at, excluded.watched_at)
  returning id into v_status_id;

  if v_media = 'album' then
    select id into v_activity_id
    from public.activities
    where actor_id = v_user and title_id = p_title_id and activity_type = 'logged'
      and created_at > now() - interval '6 hours'
    order by created_at desc
    limit 1;

    if v_activity_id is not null then
      update public.activities set
        created_at = now(),
        metadata = metadata || jsonb_strip_nulls(jsonb_build_object('status', 'watched', 'rating', p_rating))
      where id = v_activity_id;
    else
      insert into public.activities (actor_id, activity_type, title_id, metadata)
      values (
        v_user, 'logged', p_title_id,
        jsonb_strip_nulls(jsonb_build_object('status', 'watched', 'rating', p_rating, 'media_type', v_media))
      )
      returning id into v_activity_id;
    end if;
  end if;

  return jsonb_build_object('log_id', v_log_id, 'status_id', v_status_id, 'activity_id', v_activity_id);
end;
$$;

-- ── get_user_music_stats (separate from get_user_stats — books untouched) ─────

create or replace function public.get_user_music_stats(p_user_id uuid)
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

  with music as (
    select uts.title_id, uts.rating, uts.status, uts.is_favourite, t.media_type
    from public.user_title_status uts
    join public.titles t on t.id = uts.title_id
    where uts.user_id = p_user_id and t.media_type in ('album', 'song')
  )
  select jsonb_build_object(
    'albums_listened', (select count(*) from music where media_type = 'album' and status = 'watched'),
    'songs_favourited', (select count(*) from music where media_type = 'song' and is_favourite),
    'album_reviews', (
      select count(*) from public.reviews r join public.titles t on t.id = r.title_id
      where r.user_id = p_user_id and t.media_type = 'album' and r.published
    ),
    'average_album_rating', (
      select round(avg(rating)::numeric, 2) from music where media_type = 'album' and rating is not null
    ),
    'top_artists', (
      select coalesce(jsonb_agg(jsonb_build_object('artist_id', artist_id, 'name', name, 'count', cnt) order by cnt desc), '[]'::jsonb)
      from (
        select mia.artist_item_id artist_id, at.title name, count(*) cnt
        from music m
        join public.music_item_artists mia on mia.catalogue_item_id = m.title_id and mia.role = 'primary'
        join public.titles at on at.id = mia.artist_item_id
        where m.media_type = 'album' and m.rating is not null
        group by mia.artist_item_id, at.title
        order by cnt desc
        limit 8
      ) x
    )
  )
  into v_result;

  return v_result;
end;
$$;

-- ── get_activity_feed: add cover_url + subtitle to the title payload ─────────
-- Additive to the returned JSON (existing consumers ignore new fields), so music
-- and book activity can render artwork. Body is otherwise identical to the
-- original in 20260723000002_functions.sql.

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
        'title', t.title, 'poster_path', t.poster_path, 'release_date', t.release_date,
        'source', t.source, 'external_id', t.external_id, 'cover_url', t.cover_url, 'subtitle', t.subtitle
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

-- ── Grants ───────────────────────────────────────────────────────────────────

revoke all on function public.upsert_music_reference(text, public.media_type, text, text, text, date) from public, anon;
grant execute on function public.upsert_music_reference(text, public.media_type, text, text, text, date) to authenticated;

revoke all on function public.upsert_music_album_detail(uuid, text, text[], date, integer) from public, anon;
grant execute on function public.upsert_music_album_detail(uuid, text, text[], date, integer) to authenticated;

revoke all on function public.upsert_music_artist_detail(uuid, text, text, text, text, date, date) from public, anon;
grant execute on function public.upsert_music_artist_detail(uuid, text, text, text, text, date, date) to authenticated;

revoke all on function public.upsert_music_song_detail(uuid, integer, text) from public, anon;
grant execute on function public.upsert_music_song_detail(uuid, integer, text) to authenticated;

revoke all on function public.set_music_item_artists(uuid, jsonb) from public, anon;
grant execute on function public.set_music_item_artists(uuid, jsonb) to authenticated;

revoke all on function public.set_album_tracks(uuid, jsonb) from public, anon;
grant execute on function public.set_album_tracks(uuid, jsonb) to authenticated;

revoke all on function public.upsert_provider_link(uuid, text, text, text, text) from public, anon;
grant execute on function public.upsert_provider_link(uuid, text, text, text, text) to authenticated;

revoke all on function public.get_music_community_summary(text, public.media_type) from public;
grant execute on function public.get_music_community_summary(text, public.media_type) to authenticated, anon;

revoke all on function public.log_listen(uuid, timestamptz, numeric, text) from public, anon;
grant execute on function public.log_listen(uuid, timestamptz, numeric, text) to authenticated;

revoke all on function public.get_user_music_stats(uuid) from public;
grant execute on function public.get_user_music_stats(uuid) to authenticated, anon;

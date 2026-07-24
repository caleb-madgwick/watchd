-- Fix: Postgres regex repetition counts max out at 255, but the cover_url / url
-- checks used {1,600} → "invalid repetition count(s)" whenever a cover URL was
-- written (e.g. rating an album/book). Replace the bounded quantifier with an
-- unbounded [^ ]+ in the two CHECK constraints and the four functions that
-- embed the regex.

alter table public.titles drop constraint if exists titles_cover_url_check;
alter table public.titles
  add constraint titles_cover_url_check
  check (cover_url is null or cover_url ~ '^https://[^ ]+$');

alter table public.provider_links drop constraint if exists provider_links_url_check;
alter table public.provider_links
  add constraint provider_links_url_check
  check (url ~ '^https://[^ ]+$');

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

  v_cover := case when p_cover_url ~ '^https://[^ ]+$' then p_cover_url end;

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
      case when (t->>'cover_url') ~ '^https://[^ ]+$' then t->>'cover_url' end
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
  if p_url !~ '^https://[^ ]+$' then
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

  v_cover := case when p_cover_url ~ '^https://[^ ]+$' then p_cover_url end;
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

import { useEffect, useRef } from 'react';

import { config } from '@/constants/config';
import { spotifyMatch } from '@/lib/spotify/client';
import { spotifyAlbumSearchUrl, spotifyArtistSearchUrl, spotifySongSearchUrl } from '@/lib/spotify/links';
import { supabase } from '@/lib/supabase/client';
import { useCurrentUserId } from '@/providers/AuthProvider';
import type { AlbumDetails, ArtistDetails, SongDetails } from '@/types/domain';

/**
 * Populate the catalogue with the viewed album/artist/song so tracking,
 * community stats, tracklists and provider links resolve. Best-effort: every
 * failure is swallowed — enrichment is a background nicety, never blocks the UI.
 */
async function enrichAlbum(album: AlbumDetails): Promise<void> {
  if (!supabase) return;
  try {
    const subtitle = album.artistCredit ?? (album.artistNames.length ? album.artistNames.join(', ') : null);
    const spotify = await spotifyMatch('album', album.title, album.artistCredit ?? album.artistNames[0]);
    const { data: id, error } = await supabase.rpc('upsert_music_reference', {
      p_mbid: album.musicBrainzId,
      p_media_type: 'album',
      p_title: album.title,
      p_subtitle: subtitle,
      p_cover_url: album.coverUrl ?? spotify.imageUrl ?? null,
      p_release_date: album.releaseDate ?? null,
    });
    if (error || !id) return;
    const itemId = id as string;

    await supabase.rpc('upsert_music_album_detail', {
      p_item_id: itemId,
      p_album_type: album.albumType ?? null,
      p_secondary_types: album.secondaryTypes ?? [],
      p_first_release_date: album.releaseDate ?? null,
      p_track_count: album.trackCount ?? null,
    });

    if (album.artists.length > 0) {
      await supabase.rpc('set_music_item_artists', {
        p_item_id: itemId,
        p_artists: album.artists.map((a) => ({
          mbid: a.musicBrainzId,
          name: a.name,
          credit_name: a.creditName,
          role: 'primary',
        })),
      });
    }

    const tracks = album.tracks.filter((t) => t.song.musicBrainzId);
    if (tracks.length > 0) {
      await supabase.rpc('set_album_tracks', {
        p_album_item_id: itemId,
        p_tracks: tracks.map((t) => ({
          song_mbid: t.song.musicBrainzId,
          title: t.title,
          artist: t.song.artistCredit ?? subtitle ?? undefined,
          cover_url: album.coverUrl,
          disc_number: t.discNumber ?? 1,
          track_number: t.position,
          duration_ms: t.durationMs,
        })),
      });
    }

    await supabase.rpc('upsert_provider_link', {
      p_item_id: itemId,
      p_provider: 'spotify',
      p_url: spotify.url ?? spotifyAlbumSearchUrl(album.title, album.artistCredit ?? album.artistNames[0]),
      p_provider_item_id: spotify.spotifyId ?? null,
    });
  } catch {
    // best effort
  }
}

async function enrichArtist(artist: ArtistDetails): Promise<void> {
  if (!supabase) return;
  try {
    const spotify = await spotifyMatch('artist', artist.name);
    const { data: id, error } = await supabase.rpc('upsert_music_reference', {
      p_mbid: artist.musicBrainzId,
      p_media_type: 'artist',
      p_title: artist.name,
      p_subtitle: artist.disambiguation ?? null,
      p_cover_url: artist.imageUrl ?? spotify.imageUrl ?? null,
      p_release_date: null,
    });
    if (error || !id) return;
    const itemId = id as string;
    await supabase.rpc('upsert_music_artist_detail', {
      p_item_id: itemId,
      p_country_code: artist.country ?? null,
      p_disambiguation: artist.disambiguation ?? null,
    });
    await supabase.rpc('upsert_provider_link', {
      p_item_id: itemId,
      p_provider: 'spotify',
      p_url: spotify.url ?? spotifyArtistSearchUrl(artist.name),
      p_provider_item_id: spotify.spotifyId ?? null,
    });
  } catch {
    // best effort
  }
}

async function enrichSong(song: SongDetails): Promise<void> {
  if (!supabase) return;
  try {
    const subtitle = song.artistCredit ?? (song.artistNames.length ? song.artistNames.join(', ') : null);
    const spotify = await spotifyMatch('track', song.title, song.artistCredit ?? song.artistNames[0]);
    const { data: id, error } = await supabase.rpc('upsert_music_reference', {
      p_mbid: song.musicBrainzId,
      p_media_type: 'song',
      p_title: song.title,
      p_subtitle: subtitle,
      p_cover_url: song.coverUrl ?? spotify.imageUrl ?? null,
      p_release_date: null,
    });
    if (error || !id) return;
    const itemId = id as string;
    await supabase.rpc('upsert_music_song_detail', {
      p_item_id: itemId,
      p_duration_ms: song.durationMs ?? null,
      p_isrc: song.isrc ?? null,
    });
    await supabase.rpc('upsert_provider_link', {
      p_item_id: itemId,
      p_provider: 'spotify',
      p_url: spotify.url ?? spotifySongSearchUrl(song.title, song.artistCredit ?? song.artistNames[0]),
      p_provider_item_id: spotify.spotifyId ?? null,
    });
  } catch {
    // best effort
  }
}

type MusicDetails =
  | { kind: 'album'; details: AlbumDetails }
  | { kind: 'artist'; details: ArtistDetails }
  | { kind: 'song'; details: SongDetails };

/** Enrich the catalogue once per viewed music entity (authenticated, non-demo). */
export function useMusicEnrichment(input: MusicDetails | undefined): void {
  const userId = useCurrentUserId();
  const done = useRef<string | null>(null);
  useEffect(() => {
    if (config.demoMode || !userId || !input) return;
    const key = `${input.kind}-${input.details.musicBrainzId}`;
    if (done.current === key) return;
    done.current = key;
    if (input.kind === 'album') void enrichAlbum(input.details);
    else if (input.kind === 'artist') void enrichArtist(input.details);
    else void enrichSong(input.details);
  }, [input, userId]);
}

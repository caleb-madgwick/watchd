import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryKeys';
import { supabase } from '@/lib/supabase/client';
import { useCurrentUserId } from '@/providers/AuthProvider';
import type { WatchStatusRow } from '@/types/database';
import type { AlbumSummary, SongSummary } from '@/types/domain';
import { yearFromDate } from '@/utils/titles';

type MusicTitleRow = {
  external_id: string | null;
  media_type: string;
  title: string;
  subtitle: string | null;
  cover_url: string | null;
  release_date: string | null;
};

function toAlbum(row: MusicTitleRow): AlbumSummary {
  return {
    musicBrainzId: row.external_id ?? '',
    mediaType: 'album',
    title: row.title,
    artistNames: row.subtitle ? [row.subtitle] : [],
    artistCredit: row.subtitle ?? undefined,
    coverUrl: row.cover_url ?? undefined,
    releaseYear: yearFromDate(row.release_date),
    releaseDate: row.release_date ?? undefined,
  };
}

function toSong(row: MusicTitleRow): SongSummary {
  return {
    musicBrainzId: row.external_id ?? '',
    mediaType: 'song',
    title: row.title,
    artistNames: row.subtitle ? [row.subtitle] : [],
    artistCredit: row.subtitle ?? undefined,
    coverUrl: row.cover_url ?? undefined,
  };
}

const MUSIC_COLS = 'external_id, media_type, title, subtitle, cover_url, release_date';

/** A user's music by status + media type, mapped to summaries (albums/songs). */
function useUserMusic<T>(
  key: readonly unknown[],
  userId: string | undefined,
  opts: {
    mediaType: 'album' | 'song';
    status?: WatchStatusRow;
    favourite?: boolean;
    map: (r: MusicTitleRow) => T;
  },
) {
  return useQuery({
    queryKey: key,
    enabled: !!userId && !!supabase,
    staleTime: 30_000,
    queryFn: async (): Promise<T[]> => {
      let q = supabase!
        .from('user_title_status')
        .select(`updated_at, titles!inner(${MUSIC_COLS})`)
        .eq('user_id', userId!)
        .eq('titles.media_type', opts.mediaType)
        .eq('titles.source', 'musicbrainz')
        .order('updated_at', { ascending: false })
        .limit(60);
      if (opts.status) q = q.eq('status', opts.status);
      if (opts.favourite) q = q.eq('is_favourite', true);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return (data ?? [])
        .map((row) => (row.titles ? opts.map(row.titles as unknown as MusicTitleRow) : null))
        .filter((x): x is T => x !== null && (x as { musicBrainzId: string }).musicBrainzId !== '');
    },
  });
}

export function useListenBacklog(userId: string | undefined) {
  return useUserMusic<AlbumSummary>(queryKeys.listenBacklog(userId ?? 'anon'), userId, {
    mediaType: 'album',
    status: 'watchlist',
    map: toAlbum,
  });
}

export function useListenedAlbums(userId: string | undefined) {
  return useUserMusic<AlbumSummary>(queryKeys.listenedAlbums(userId ?? 'anon'), userId, {
    mediaType: 'album',
    status: 'watched',
    map: toAlbum,
  });
}

export function useFavouriteAlbums(userId: string | undefined) {
  return useUserMusic<AlbumSummary>(queryKeys.favouriteAlbums(userId ?? 'anon'), userId, {
    mediaType: 'album',
    favourite: true,
    map: toAlbum,
  });
}

export function useFavouriteSongs(userId: string | undefined) {
  return useUserMusic<SongSummary>(queryKeys.favouriteSongs(userId ?? 'anon'), userId, {
    mediaType: 'song',
    favourite: true,
    map: toSong,
  });
}

/**
 * Community-popular albums: a transparent proxy over recent listen/rating
 * activity — the most-recently engaged albums, de-duplicated. (Not an external
 * trending score.)
 */
export function usePopularAlbums() {
  return useQuery({
    queryKey: queryKeys.popularAlbums(),
    enabled: !!supabase,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<AlbumSummary[]> => {
      const { data, error } = await supabase!
        .from('user_title_status')
        .select(`updated_at, titles!inner(${MUSIC_COLS})`)
        .eq('titles.media_type', 'album')
        .eq('titles.source', 'musicbrainz')
        .in('status', ['watched', 'watchlist'])
        .order('updated_at', { ascending: false })
        .limit(60);
      if (error) throw new Error(error.message);
      const seen = new Set<string>();
      const albums: AlbumSummary[] = [];
      for (const row of data ?? []) {
        const t = row.titles as unknown as MusicTitleRow | null;
        if (!t?.external_id || seen.has(t.external_id)) continue;
        seen.add(t.external_id);
        albums.push(toAlbum(t));
        if (albums.length >= 18) break;
      }
      return albums;
    },
  });
}

/** Music stats for a profile (albums listened, songs favourited, etc.). */
export function useMusicStats(profileUserId: string | undefined) {
  const viewerId = useCurrentUserId();
  return useQuery({
    queryKey: [...queryKeys.userMusicStats(profileUserId ?? ''), viewerId ?? 'anon'],
    enabled: !!profileUserId && !!supabase,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase!.rpc('get_user_music_stats', { p_user_id: profileUserId! });
      if (error) throw new Error(error.message);
      return data;
    },
  });
}

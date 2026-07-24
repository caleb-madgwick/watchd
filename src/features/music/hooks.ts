import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { musicbrainz } from '@/lib/musicbrainz/client';
import { queryKeys } from '@/lib/queryKeys';
import { spotifyMatch } from '@/lib/spotify/client';
import type {
  AlbumDetails,
  AlbumSummary,
  ArtistDetails,
  ArtistSummary,
  Paginated,
  SongDetails,
  SongSummary,
} from '@/types/domain';

const DETAILS_STALE_MS = 24 * 60 * 60_000;
const SEARCH_STALE_MS = 5 * 60_000;

export function useAlbumDetails(mbid: string | undefined) {
  return useQuery({
    queryKey: queryKeys.albumDetails(mbid ?? ''),
    enabled: !!mbid,
    staleTime: DETAILS_STALE_MS,
    queryFn: (): Promise<AlbumDetails> => musicbrainz.albumDetails(mbid!),
  });
}

export function useArtistDetails(mbid: string | undefined) {
  return useQuery({
    queryKey: queryKeys.artistDetails(mbid ?? ''),
    enabled: !!mbid,
    staleTime: DETAILS_STALE_MS,
    queryFn: (): Promise<ArtistDetails> => musicbrainz.artistDetails(mbid!),
  });
}

export function useSongDetails(mbid: string | undefined) {
  return useQuery({
    queryKey: queryKeys.songDetails(mbid ?? ''),
    enabled: !!mbid,
    staleTime: DETAILS_STALE_MS,
    queryFn: (): Promise<SongDetails> => musicbrainz.songDetails(mbid!),
  });
}

const MIN_QUERY_LENGTH = 2;

export function useAlbumSearch(query: string, enabled = true) {
  const clean = query.trim();
  return useInfiniteQuery({
    queryKey: queryKeys.musicSearch('album', clean.toLowerCase()),
    enabled: enabled && clean.length >= MIN_QUERY_LENGTH,
    staleTime: SEARCH_STALE_MS,
    initialPageParam: 1,
    queryFn: ({ pageParam }): Promise<Paginated<AlbumSummary>> => musicbrainz.searchAlbums(clean, pageParam),
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
  });
}

export function useArtistSearch(query: string, enabled = true) {
  const clean = query.trim();
  return useInfiniteQuery({
    queryKey: queryKeys.musicSearch('artist', clean.toLowerCase()),
    enabled: enabled && clean.length >= MIN_QUERY_LENGTH,
    staleTime: SEARCH_STALE_MS,
    initialPageParam: 1,
    queryFn: ({ pageParam }): Promise<Paginated<ArtistSummary>> => musicbrainz.searchArtists(clean, pageParam),
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
  });
}

export function useSongSearch(query: string, enabled = true) {
  const clean = query.trim();
  return useInfiniteQuery({
    queryKey: queryKeys.musicSearch('song', clean.toLowerCase()),
    enabled: enabled && clean.length >= MIN_QUERY_LENGTH,
    staleTime: SEARCH_STALE_MS,
    initialPageParam: 1,
    queryFn: ({ pageParam }): Promise<Paginated<SongSummary>> => musicbrainz.searchSongs(clean, pageParam),
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
  });
}

/**
 * Resolve the best "Open in Spotify" URL for an entity: the exact deep link from
 * the Spotify API when credentials are configured, otherwise `fallback` (a
 * Spotify search link). Cached — one match per entity.
 */
export function useSpotifyUrl(
  type: 'album' | 'track' | 'artist',
  title: string,
  artist: string | undefined,
  fallback: string,
) {
  return useQuery({
    queryKey: ['spotifyMatch', type, title.toLowerCase(), (artist ?? '').toLowerCase()],
    enabled: title.length > 0,
    staleTime: DETAILS_STALE_MS,
    queryFn: async (): Promise<string> => {
      const match = await spotifyMatch(type, title, artist);
      return match.url ?? fallback;
    },
  });
}

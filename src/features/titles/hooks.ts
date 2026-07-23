import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryKeys';
import { tmdb } from '@/lib/tmdb/client';

const DETAILS_STALE_MS = 24 * 60 * 60_000;

export function useMovieDetails(tmdbId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.titleDetails('movie', tmdbId ?? 0),
    enabled: !!tmdbId,
    staleTime: DETAILS_STALE_MS,
    queryFn: () => tmdb.movieDetails(tmdbId!),
  });
}

export function useTvDetails(tmdbId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.titleDetails('tv', tmdbId ?? 0),
    enabled: !!tmdbId,
    staleTime: DETAILS_STALE_MS,
    queryFn: () => tmdb.tvDetails(tmdbId!),
  });
}

export function useSeasonDetails(tvId: number | undefined, seasonNumber: number | undefined) {
  return useQuery({
    queryKey: queryKeys.season(tvId ?? 0, seasonNumber ?? -1),
    enabled: tvId !== undefined && seasonNumber !== undefined,
    staleTime: DETAILS_STALE_MS,
    queryFn: () => tmdb.seasonDetails(tvId!, seasonNumber!),
  });
}

export function usePersonDetails(personId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.person(personId ?? 0),
    enabled: !!personId,
    staleTime: DETAILS_STALE_MS,
    queryFn: () => tmdb.personDetails(personId!),
  });
}

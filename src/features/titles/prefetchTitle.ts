import type { QueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';

import { queryKeys } from '@/lib/queryKeys';
import { supabase } from '@/lib/supabase/client';
import { tmdb } from '@/lib/tmdb/client';
import type { MovieDetails, TitleSummary, TvDetails } from '@/types/domain';

const PREFETCH_TIMEOUT_MS = 1600;

function withTimeout<T>(promise: Promise<T>): Promise<unknown> {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(resolve, PREFETCH_TIMEOUT_MS)),
  ]);
}

/**
 * Warm everything the title page needs while the disc transition plays, so
 * the destination renders instantly: TMDB details, the community summary,
 * and the backdrop image. Never rejects — a miss just means the page loads
 * its own data as usual.
 */
export function prefetchTitle(queryClient: QueryClient, title: TitleSummary): Promise<unknown> {
  const details = queryClient.prefetchQuery({
    queryKey: queryKeys.titleDetails(title.mediaType, title.tmdbId),
    queryFn: (): Promise<MovieDetails | TvDetails> =>
      title.mediaType === 'movie' ? tmdb.movieDetails(title.tmdbId) : tmdb.tvDetails(title.tmdbId),
    staleTime: 24 * 60 * 60_000,
  });

  const community = supabase
    ? queryClient.prefetchQuery({
        queryKey: queryKeys.communitySummary(title.mediaType, title.tmdbId),
        queryFn: async () => {
          const { data, error } = await supabase!.rpc('get_title_community_summary', {
            p_tmdb_id: title.tmdbId,
            p_media_type: title.mediaType,
          });
          if (error) throw new Error(error.message);
          return data;
        },
        staleTime: 60_000,
      })
    : Promise.resolve();

  const backdrop = title.backdropUrl ? Image.prefetch(title.backdropUrl) : Promise.resolve(true);

  return withTimeout(Promise.allSettled([details, community, backdrop]));
}

import type { QueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';

import { musicbrainz } from '@/lib/musicbrainz/client';
import { queryKeys } from '@/lib/queryKeys';
import { supabase } from '@/lib/supabase/client';
import type { AlbumSummary, SongSummary } from '@/types/domain';

const PREFETCH_TIMEOUT_MS = 1600;

function withTimeout<T>(promise: Promise<T>): Promise<unknown> {
  return Promise.race([promise, new Promise((resolve) => setTimeout(resolve, PREFETCH_TIMEOUT_MS))]);
}

/**
 * Warm the album/song page while the record-eject transition plays: MusicBrainz
 * details, the community summary, and the cover art. Never rejects — a miss just
 * means the destination loads its own data as usual.
 */
export function prefetchMusicItem(
  queryClient: QueryClient,
  item: AlbumSummary | SongSummary,
): Promise<unknown> {
  const details =
    item.mediaType === 'album'
      ? queryClient.prefetchQuery({
          queryKey: queryKeys.albumDetails(item.musicBrainzId),
          queryFn: () => musicbrainz.albumDetails(item.musicBrainzId),
          staleTime: 24 * 60 * 60_000,
        })
      : queryClient.prefetchQuery({
          queryKey: queryKeys.songDetails(item.musicBrainzId),
          queryFn: () => musicbrainz.songDetails(item.musicBrainzId),
          staleTime: 24 * 60 * 60_000,
        });

  const community = supabase
    ? queryClient.prefetchQuery({
        queryKey: queryKeys.musicCommunitySummary(item.mediaType, item.musicBrainzId),
        queryFn: async () => {
          const { data, error } = await supabase!.rpc('get_music_community_summary', {
            p_mbid: item.musicBrainzId,
            p_media_type: item.mediaType,
          });
          if (error) throw new Error(error.message);
          return data;
        },
        staleTime: 60_000,
      })
    : Promise.resolve();

  const cover = item.coverUrl ? Image.prefetch(item.coverUrl) : Promise.resolve(true);

  return withTimeout(Promise.allSettled([details, community, cover]));
}

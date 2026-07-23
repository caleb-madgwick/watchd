import { useInfiniteQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryKeys';
import { supabase } from '@/lib/supabase/client';
import { useCurrentUserId } from '@/providers/AuthProvider';
import type { FeedItem } from '@/types/database';

const PAGE_SIZE = 20;

/** Chronological feed from followed users (+ self), keyset-paginated. */
export function useActivityFeed() {
  const userId = useCurrentUserId();
  return useInfiniteQuery({
    queryKey: queryKeys.feed(),
    enabled: !!userId && !!supabase,
    staleTime: 30_000,
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }): Promise<FeedItem[]> => {
      const { data, error } = await supabase!.rpc('get_activity_feed', {
        p_before: pageParam,
        p_limit: PAGE_SIZE,
      });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as FeedItem[];
    },
    getNextPageParam: (lastPage) =>
      lastPage.length === PAGE_SIZE ? lastPage[lastPage.length - 1].created_at : undefined,
  });
}

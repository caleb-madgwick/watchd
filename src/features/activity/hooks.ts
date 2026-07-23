import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryKeys';
import { supabase } from '@/lib/supabase/client';
import { useCurrentUserId } from '@/providers/AuthProvider';
import { toast } from '@/stores/toastStore';
import type { FeedItem } from '@/types/database';
import type { MediaType } from '@/types/domain';

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

/** Refresh both feeds that surface a user's own activity. */
function invalidateActivityFeeds(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: queryKeys.feed() });
  queryClient.invalidateQueries({ queryKey: ['userActivity'] });
}

/**
 * Remove a single activity row (RLS allows this only for the actor's own rows).
 * Leaves the underlying watched status/diary untouched — this just hides the
 * entry from the activity feeds.
 */
export function useDeleteActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (activityId: string) => {
      if (!supabase) throw new Error('Not connected.');
      const { error } = await supabase.from('activities').delete().eq('id', activityId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => invalidateActivityFeeds(queryClient),
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Could not remove this activity.');
    },
  });
}

export interface UndoActivityInput {
  activityId: string;
  /** titles.id (uuid) — the reference row this log points at. */
  titleRowId: string;
  tmdbId: number;
  mediaType: MediaType;
}

/**
 * Fully reverse a mistaken log: clear the watched status, diary entries and TV
 * progress for the title, then remove the activity. Each delete is scoped to
 * the current user and permitted by the existing per-table DELETE policies.
 */
export function useUndoActivity() {
  const queryClient = useQueryClient();
  const userId = useCurrentUserId();
  return useMutation({
    mutationFn: async ({ activityId, titleRowId }: UndoActivityInput) => {
      if (!supabase || !userId) throw new Error('Not connected.');

      const status = await supabase
        .from('user_title_status')
        .delete()
        .eq('user_id', userId)
        .eq('title_id', titleRowId);
      if (status.error) throw new Error(status.error.message);

      const diary = await supabase
        .from('diary_entries')
        .delete()
        .eq('user_id', userId)
        .eq('title_id', titleRowId);
      if (diary.error) throw new Error(diary.error.message);

      const progress = await supabase
        .from('tv_progress')
        .delete()
        .eq('user_id', userId)
        .eq('title_id', titleRowId);
      if (progress.error) throw new Error(progress.error.message);

      const activity = await supabase.from('activities').delete().eq('id', activityId);
      if (activity.error) throw new Error(activity.error.message);
    },
    onSuccess: (_data, { tmdbId, mediaType }) => {
      const uid = userId ?? 'anon';
      queryClient.invalidateQueries({ queryKey: queryKeys.titleStatus(uid, mediaType, tmdbId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.communitySummary(mediaType, tmdbId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.watchlist(uid) });
      queryClient.invalidateQueries({ queryKey: queryKeys.diary(uid) });
      queryClient.invalidateQueries({ queryKey: queryKeys.continueWatching(uid) });
      queryClient.invalidateQueries({ queryKey: ['myStatuses'] });
      if (mediaType === 'tv') {
        queryClient.invalidateQueries({ queryKey: queryKeys.tvProgress(uid, tmdbId) });
      }
      invalidateActivityFeeds(queryClient);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Could not undo this activity.');
    },
  });
}

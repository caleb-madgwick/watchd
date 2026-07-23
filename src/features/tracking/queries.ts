import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  logTitle,
  setFavourite,
  setTitleRating,
  setTitleStatus,
  updateTvProgress,
  type LogTitleInput,
} from './api';
import { track } from '@/lib/analytics';
import { queryKeys } from '@/lib/queryKeys';
import { supabase } from '@/lib/supabase/client';
import { posterUrl } from '@/lib/tmdb/images';
import { useCurrentUserId } from '@/providers/AuthProvider';
import { toast } from '@/stores/toastStore';
import type { CommunitySummary, TvProgressRow, UserTitleStatusRow } from '@/types/database';
import type { TitleSummary, WatchStatus } from '@/types/domain';
import { yearFromDate } from '@/utils/titles';

export interface TitleStatusState {
  status: WatchStatus | null;
  rating: number | null;
  isFavourite: boolean;
  watchedAt: string | null;
}

const EMPTY_STATUS: TitleStatusState = {
  status: null,
  rating: null,
  isFavourite: false,
  watchedAt: null,
};

function mapStatusRow(row: UserTitleStatusRow | null): TitleStatusState {
  if (!row) return EMPTY_STATUS;
  return {
    status: row.status,
    rating: row.rating === null ? null : Number(row.rating),
    isFavourite: row.is_favourite,
    watchedAt: row.watched_at,
  };
}

/** The signed-in user's status/rating/favourite for one title. */
export function useTitleStatus(title: Pick<TitleSummary, 'tmdbId' | 'mediaType'> | undefined) {
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: queryKeys.titleStatus(userId ?? 'anon', title?.mediaType ?? 'movie', title?.tmdbId ?? 0),
    enabled: !!userId && !!title && !!supabase,
    staleTime: 15_000,
    queryFn: async (): Promise<TitleStatusState> => {
      const { data: titleRow, error: titleError } = await supabase!
        .from('titles')
        .select('id')
        .eq('tmdb_id', title!.tmdbId)
        .eq('media_type', title!.mediaType)
        .maybeSingle();
      if (titleError) throw new Error(titleError.message);
      if (!titleRow) return EMPTY_STATUS;

      const { data, error } = await supabase!
        .from('user_title_status')
        .select('*')
        .eq('user_id', userId!)
        .eq('title_id', titleRow.id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return mapStatusRow(data);
    },
  });
}

export function useCommunitySummary(title: Pick<TitleSummary, 'tmdbId' | 'mediaType'> | undefined) {
  return useQuery({
    queryKey: queryKeys.communitySummary(title?.mediaType ?? 'movie', title?.tmdbId ?? 0),
    enabled: !!title && !!supabase,
    staleTime: 60_000,
    queryFn: async (): Promise<CommunitySummary> => {
      const { data, error } = await supabase!.rpc('get_title_community_summary', {
        p_tmdb_id: title!.tmdbId,
        p_media_type: title!.mediaType,
      });
      if (error) throw new Error(error.message);
      return data as unknown as CommunitySummary;
    },
  });
}

export interface WatchlistItem {
  statusId: string;
  addedAt: string;
  rating: number | null;
  title: TitleSummary & { communityRating?: number };
}

export function useWatchlist() {
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: queryKeys.watchlist(userId ?? 'anon'),
    enabled: !!userId && !!supabase,
    staleTime: 30_000,
    queryFn: async (): Promise<WatchlistItem[]> => {
      const { data, error } = await supabase!
        .from('user_title_status')
        .select('id, created_at, updated_at, rating, titles(*)')
        .eq('user_id', userId!)
        .eq('status', 'watchlist')
        .order('updated_at', { ascending: false })
        .limit(500);
      if (error) throw new Error(error.message);
      return (data ?? [])
        .filter((row) => row.titles)
        .map((row) => ({
          statusId: row.id,
          addedAt: row.updated_at,
          rating: row.rating === null ? null : Number(row.rating),
          title: {
            tmdbId: row.titles!.tmdb_id,
            mediaType: row.titles!.media_type,
            title: row.titles!.title,
            posterUrl: posterUrl(row.titles!.poster_path),
            posterPath: row.titles!.poster_path ?? undefined,
            releaseYear: yearFromDate(row.titles!.release_date),
            releaseDate: row.titles!.release_date ?? undefined,
          },
        }));
    },
  });
}

export function useTvProgress(title: Pick<TitleSummary, 'tmdbId' | 'mediaType'> | undefined) {
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: queryKeys.tvProgress(userId ?? 'anon', title?.tmdbId ?? 0),
    enabled: !!userId && !!title && title.mediaType === 'tv' && !!supabase,
    staleTime: 15_000,
    queryFn: async (): Promise<TvProgressRow | null> => {
      const { data, error } = await supabase!
        .from('tv_progress')
        .select('*, titles!inner(tmdb_id, media_type)')
        .eq('user_id', userId!)
        .eq('titles.tmdb_id', title!.tmdbId)
        .eq('titles.media_type', 'tv')
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
  });
}

/** Invalidate everything a tracking mutation can affect. */
function useInvalidateTracking() {
  const queryClient = useQueryClient();
  const userId = useCurrentUserId();
  return (title: Pick<TitleSummary, 'tmdbId' | 'mediaType'>) => {
    const uid = userId ?? 'anon';
    queryClient.invalidateQueries({ queryKey: queryKeys.titleStatus(uid, title.mediaType, title.tmdbId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.communitySummary(title.mediaType, title.tmdbId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.watchlist(uid) });
    queryClient.invalidateQueries({ queryKey: queryKeys.diary(uid) });
    queryClient.invalidateQueries({ queryKey: queryKeys.continueWatching(uid) });
    queryClient.invalidateQueries({ queryKey: queryKeys.feed() });
    queryClient.invalidateQueries({ queryKey: ['myStatuses'] });
    queryClient.invalidateQueries({ queryKey: ['userActivity'] });
    if (title.mediaType === 'tv') {
      queryClient.invalidateQueries({ queryKey: queryKeys.tvProgress(uid, title.tmdbId) });
    }
  };
}

/** Watchlist toggle with optimistic update (safe rollback). */
export function useToggleWatchlist(title: TitleSummary) {
  const queryClient = useQueryClient();
  const userId = useCurrentUserId();
  const invalidate = useInvalidateTracking();
  const statusKey = queryKeys.titleStatus(userId ?? 'anon', title.mediaType, title.tmdbId);

  return useMutation({
    mutationFn: async (add: boolean) => {
      await setTitleStatus(userId!, title, add ? 'watchlist' : null);
      return add;
    },
    onMutate: async (add) => {
      await queryClient.cancelQueries({ queryKey: statusKey });
      const previous = queryClient.getQueryData<TitleStatusState>(statusKey);
      queryClient.setQueryData<TitleStatusState>(statusKey, (current) => ({
        ...(current ?? EMPTY_STATUS),
        status: add ? 'watchlist' : null,
      }));
      return { previous };
    },
    onError: (error, _add, context) => {
      if (context?.previous) queryClient.setQueryData(statusKey, context.previous);
      toast.error(error instanceof Error ? error.message : 'Could not update watchlist.');
    },
    onSuccess: (added) => {
      if (added) track('title_watchlisted', { mediaType: title.mediaType, tmdbId: title.tmdbId });
    },
    onSettled: () => invalidate(title),
  });
}

export function useSetStatus(title: TitleSummary) {
  const userId = useCurrentUserId();
  const invalidate = useInvalidateTracking();
  return useMutation({
    mutationFn: async (status: WatchStatus | null) => {
      await setTitleStatus(userId!, title, status);
      return status;
    },
    onSuccess: (status) => {
      if (status === 'watched') {
        track('title_watched', { mediaType: title.mediaType, tmdbId: title.tmdbId });
      }
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : 'Could not update status.'),
    onSettled: () => invalidate(title),
  });
}

export function useSetRating(title: TitleSummary) {
  const userId = useCurrentUserId();
  const invalidate = useInvalidateTracking();
  return useMutation({
    mutationFn: async (rating: number | null) => {
      await setTitleRating(userId!, title, rating);
      return rating;
    },
    onSuccess: (rating) => {
      if (rating) track('rating_submitted', { mediaType: title.mediaType, tmdbId: title.tmdbId, rating });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Could not save rating.'),
    onSettled: () => invalidate(title),
  });
}

export function useSetFavourite(title: TitleSummary) {
  const userId = useCurrentUserId();
  const invalidate = useInvalidateTracking();
  return useMutation({
    mutationFn: (isFavourite: boolean) => setFavourite(userId!, title, isFavourite),
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : 'Could not update favourites.'),
    onSettled: () => invalidate(title),
  });
}

export function useLogTitle(title: TitleSummary) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateTracking();
  return useMutation({
    mutationFn: (input: Omit<LogTitleInput, 'title'>) => logTitle({ ...input, title }),
    onSuccess: (_result, input) => {
      track('title_watched', { mediaType: title.mediaType, tmdbId: title.tmdbId });
      if (input.rating) {
        track('rating_submitted', { mediaType: title.mediaType, tmdbId: title.tmdbId, rating: input.rating });
      }
      if (input.reviewBody?.trim()) {
        track('review_submitted', {
          mediaType: title.mediaType,
          tmdbId: title.tmdbId,
          hasSpoilers: input.containsSpoilers ?? false,
        });
        queryClient.invalidateQueries({ queryKey: queryKeys.titleReviews(title.mediaType, title.tmdbId) });
        queryClient.invalidateQueries({ queryKey: ['userReviews'] });
      }
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Could not save log.'),
    onSettled: () => invalidate(title),
  });
}

export function useUpdateTvProgress(title: TitleSummary) {
  const invalidate = useInvalidateTracking();
  return useMutation({
    mutationFn: ({
      seasonNumber,
      episodeNumber,
      completed,
    }: {
      seasonNumber: number;
      episodeNumber: number;
      completed: boolean;
    }) => updateTvProgress(title, seasonNumber, episodeNumber, completed),
    onSuccess: (_data, variables) => {
      track('tv_progress_updated', { tmdbId: title.tmdbId, completed: variables.completed });
      toast.success(
        variables.completed
          ? `${title.title} marked as finished.`
          : `Progress saved: S${variables.seasonNumber} E${variables.episodeNumber}.`,
      );
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : 'Could not save progress.'),
    onSettled: () => invalidate(title),
  });
}

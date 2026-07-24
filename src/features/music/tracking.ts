import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  ensureMusicReference,
  logTitle,
  setFavourite,
  setTitleRating,
  setTitleStatus,
} from '@/features/tracking/api';
import { queryKeys } from '@/lib/queryKeys';
import { requireSupabase, supabase } from '@/lib/supabase/client';
import { useCurrentUserId } from '@/providers/AuthProvider';
import { toast } from '@/stores/toastStore';
import type { CommunitySummary, LogListenResult, UserTitleStatusRow } from '@/types/database';
import type { AlbumSummary, SongSummary, WatchStatus } from '@/types/domain';

/** Albums and songs are the trackable music entities (artists are not rated). */
export type MusicTrackable = AlbumSummary | SongSummary;

export interface MusicStatusState {
  status: WatchStatus | null;
  rating: number | null;
  isFavourite: boolean;
}

const EMPTY_STATUS: MusicStatusState = { status: null, rating: null, isFavourite: false };

function mapStatusRow(row: UserTitleStatusRow | null): MusicStatusState {
  if (!row) return EMPTY_STATUS;
  return {
    status: row.status,
    rating: row.rating === null ? null : Number(row.rating),
    isFavourite: row.is_favourite,
  };
}

/** The signed-in user's status/rating/favourite for one album or song. */
export function useMusicStatus(item: MusicTrackable | undefined) {
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: queryKeys.musicStatus(
      userId ?? 'anon',
      item?.mediaType ?? 'album',
      item?.musicBrainzId ?? '',
    ),
    enabled: !!userId && !!item && !!supabase,
    staleTime: 15_000,
    queryFn: async (): Promise<MusicStatusState> => {
      const { data: titleRow, error: titleError } = await supabase!
        .from('titles')
        .select('id')
        .eq('external_id', item!.musicBrainzId)
        .eq('media_type', item!.mediaType)
        .eq('source', 'musicbrainz')
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

export function useMusicCommunitySummary(item: MusicTrackable | undefined) {
  return useQuery({
    queryKey: queryKeys.musicCommunitySummary(item?.mediaType ?? 'album', item?.musicBrainzId ?? ''),
    enabled: !!item && !!supabase,
    staleTime: 60_000,
    queryFn: async (): Promise<CommunitySummary> => {
      const { data, error } = await supabase!.rpc('get_music_community_summary', {
        p_mbid: item!.musicBrainzId,
        p_media_type: item!.mediaType,
      });
      if (error) throw new Error(error.message);
      return data as unknown as CommunitySummary;
    },
  });
}

/** Invalidate everything a music tracking mutation can affect. */
function useInvalidateMusic() {
  const queryClient = useQueryClient();
  const userId = useCurrentUserId();
  return (item: MusicTrackable) => {
    const uid = userId ?? 'anon';
    queryClient.invalidateQueries({
      queryKey: queryKeys.musicStatus(uid, item.mediaType, item.musicBrainzId),
    });
    queryClient.invalidateQueries({
      queryKey: queryKeys.musicCommunitySummary(item.mediaType, item.musicBrainzId),
    });
    queryClient.invalidateQueries({ queryKey: queryKeys.listenBacklog(uid) });
    queryClient.invalidateQueries({ queryKey: queryKeys.listenedAlbums(uid) });
    queryClient.invalidateQueries({ queryKey: queryKeys.favouriteAlbums(uid) });
    queryClient.invalidateQueries({ queryKey: queryKeys.favouriteSongs(uid) });
    queryClient.invalidateQueries({ queryKey: queryKeys.userMusicStats(uid) });
    queryClient.invalidateQueries({ queryKey: queryKeys.feed() });
    queryClient.invalidateQueries({ queryKey: ['userActivity'] });
  };
}

/** Backlog ("want to listen") toggle with optimistic update. */
export function useToggleBacklog(item: MusicTrackable) {
  const queryClient = useQueryClient();
  const userId = useCurrentUserId();
  const invalidate = useInvalidateMusic();
  const statusKey = queryKeys.musicStatus(userId ?? 'anon', item.mediaType, item.musicBrainzId);

  return useMutation({
    mutationFn: async (add: boolean) => {
      await setTitleStatus(userId!, item, add ? 'watchlist' : null);
      return add;
    },
    onMutate: async (add) => {
      await queryClient.cancelQueries({ queryKey: statusKey });
      const previous = queryClient.getQueryData<MusicStatusState>(statusKey);
      queryClient.setQueryData<MusicStatusState>(statusKey, (current) => ({
        ...(current ?? EMPTY_STATUS),
        status: add ? 'watchlist' : null,
      }));
      return { previous };
    },
    onError: (error, _add, context) => {
      if (context?.previous) queryClient.setQueryData(statusKey, context.previous);
      toast.error(error instanceof Error ? error.message : 'Could not update backlog.');
    },
    onSettled: () => invalidate(item),
  });
}

/** Mark listened / clear (quiet — the feed activity comes from logging). */
export function useSetListened(item: MusicTrackable) {
  const userId = useCurrentUserId();
  const invalidate = useInvalidateMusic();
  return useMutation({
    mutationFn: (listened: boolean) => setTitleStatus(userId!, item, listened ? 'watched' : null),
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : 'Could not update status.'),
    onSettled: () => invalidate(item),
  });
}

export function useSetMusicRating(item: MusicTrackable) {
  const userId = useCurrentUserId();
  const invalidate = useInvalidateMusic();
  return useMutation({
    mutationFn: (rating: number | null) => setTitleRating(userId!, item, rating),
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Could not save rating.'),
    onSettled: () => invalidate(item),
  });
}

export function useSetMusicFavourite(item: MusicTrackable) {
  const userId = useCurrentUserId();
  const invalidate = useInvalidateMusic();
  return useMutation({
    mutationFn: (isFavourite: boolean) => setFavourite(userId!, item, isFavourite),
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : 'Could not update favourites.'),
    onSettled: () => invalidate(item),
  });
}

export interface LogListenInput {
  listenedAt?: string;
  rating?: number;
  notes?: string;
}

async function logListenApi(item: MusicTrackable, input: LogListenInput): Promise<LogListenResult> {
  const client = requireSupabase();
  const titleId = await ensureMusicReference(item);
  const { data, error } = await client.rpc('log_listen', {
    p_title_id: titleId,
    p_listened_at: input.listenedAt ?? null,
    p_rating: input.rating ?? null,
    p_notes: input.notes?.trim() ? input.notes.trim() : null,
  });
  if (error) throw new Error(error.message);
  return data as unknown as LogListenResult;
}

/** The full "listen log": records a dated listen + marks listened + feed activity. */
export function useLogListen(item: MusicTrackable) {
  const invalidate = useInvalidateMusic();
  return useMutation({
    mutationFn: (input: LogListenInput) => logListenApi(item, input),
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Could not save log.'),
    onSettled: () => invalidate(item),
  });
}

export interface LogAlbumInput {
  rating?: number;
  reviewBody?: string;
  watchedAt?: string;
}

/**
 * The album "log or review": marks listened + rating + optional written review,
 * emitting one combined feed activity. Reuses the shared log_title path so album
 * reviews live in the same reviews table as movies/TV/books.
 */
export function useLogAlbum(item: AlbumSummary) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateMusic();
  return useMutation({
    mutationFn: (input: LogAlbumInput) =>
      logTitle({
        title: item,
        status: 'watched',
        rating: input.rating,
        reviewBody: input.reviewBody,
        watchedAt: input.watchedAt,
      }),
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Could not save log.'),
    onSettled: () => {
      invalidate(item);
      queryClient.invalidateQueries({
        queryKey: queryKeys.musicReviews(item.mediaType, item.musicBrainzId),
      });
      queryClient.invalidateQueries({ queryKey: ['userReviews'] });
    },
  });
}

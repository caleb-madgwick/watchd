import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryKeys';
import { supabase } from '@/lib/supabase/client';
import { avatarPublicUrl } from '@/lib/supabase/storage';
import { posterUrl } from '@/lib/tmdb/images';
import { useCurrentUserId } from '@/providers/AuthProvider';
import { toast } from '@/stores/toastStore';
import type { MediaType, TitleSummary } from '@/types/domain';
import { yearFromDate } from '@/utils/titles';

export interface ReviewWithContext {
  id: string;
  userId: string;
  rating: number | null;
  body: string;
  containsSpoilers: boolean;
  likeCount: number;
  likedByMe: boolean;
  createdAt: string;
  updatedAt: string;
  author: { id: string; username: string; displayName: string; avatarUrl?: string };
  title?: TitleSummary;
}

type ReviewJoinRow = {
  id: string;
  user_id: string;
  rating: number | null;
  body: string;
  contains_spoilers: boolean;
  like_count: number;
  created_at: string;
  updated_at: string;
  profiles: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_path: string | null;
  } | null;
  titles?: {
    tmdb_id: number;
    media_type: MediaType;
    title: string;
    poster_path: string | null;
    release_date: string | null;
  } | null;
};

async function likedReviewIds(userId: string | null, reviewIds: string[]): Promise<Set<string>> {
  if (!userId || reviewIds.length === 0 || !supabase) return new Set();
  const { data, error } = await supabase
    .from('review_likes')
    .select('review_id')
    .eq('user_id', userId)
    .in('review_id', reviewIds);
  if (error) throw new Error(error.message);
  return new Set((data ?? []).map((row) => row.review_id));
}

function mapReview(row: ReviewJoinRow, liked: Set<string>): ReviewWithContext {
  return {
    id: row.id,
    userId: row.user_id,
    rating: row.rating === null ? null : Number(row.rating),
    body: row.body,
    containsSpoilers: row.contains_spoilers,
    likeCount: row.like_count,
    likedByMe: liked.has(row.id),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    author: {
      id: row.profiles?.id ?? row.user_id,
      username: row.profiles?.username ?? 'unknown',
      displayName: row.profiles?.display_name?.trim() || (row.profiles?.username ?? 'Unknown'),
      avatarUrl: avatarPublicUrl(row.profiles?.avatar_path),
    },
    title: row.titles
      ? {
          tmdbId: row.titles.tmdb_id,
          mediaType: row.titles.media_type,
          title: row.titles.title,
          posterUrl: posterUrl(row.titles.poster_path),
          releaseYear: yearFromDate(row.titles.release_date),
        }
      : undefined,
  };
}

export function useTitleReviews(title: Pick<TitleSummary, 'tmdbId' | 'mediaType'> | undefined) {
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: queryKeys.titleReviews(title?.mediaType ?? 'movie', title?.tmdbId ?? 0),
    enabled: !!title && !!supabase,
    staleTime: 30_000,
    queryFn: async (): Promise<ReviewWithContext[]> => {
      const client = supabase!;
      const { data: titleRow, error: titleError } = await client
        .from('titles')
        .select('id')
        .eq('tmdb_id', title!.tmdbId)
        .eq('media_type', title!.mediaType)
        .maybeSingle();
      if (titleError) throw new Error(titleError.message);
      if (!titleRow) return [];

      const { data, error } = await client
        .from('reviews')
        .select(
          'id, user_id, rating, body, contains_spoilers, like_count, created_at, updated_at, profiles!reviews_user_id_fkey(id, username, display_name, avatar_path)',
        )
        .eq('title_id', titleRow.id)
        .eq('published', true)
        .order('like_count', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) throw new Error(error.message);

      const rows = (data ?? []) as ReviewJoinRow[];
      const liked = await likedReviewIds(userId, rows.map((row) => row.id));
      return rows.map((row) => mapReview(row, liked));
    },
  });
}

/** Community reviews for a music album/song, resolved by MusicBrainz MBID. */
export function useMusicReviews(
  mbid: string | undefined,
  mediaType: 'album' | 'song' | undefined,
) {
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: queryKeys.musicReviews(mediaType ?? 'album', mbid ?? ''),
    enabled: !!mbid && !!mediaType && !!supabase,
    staleTime: 30_000,
    queryFn: async (): Promise<ReviewWithContext[]> => {
      const client = supabase!;
      const { data: titleRow, error: titleError } = await client
        .from('titles')
        .select('id')
        .eq('external_id', mbid!)
        .eq('media_type', mediaType!)
        .eq('source', 'musicbrainz')
        .maybeSingle();
      if (titleError) throw new Error(titleError.message);
      if (!titleRow) return [];

      const { data, error } = await client
        .from('reviews')
        .select(
          'id, user_id, rating, body, contains_spoilers, like_count, created_at, updated_at, profiles!reviews_user_id_fkey(id, username, display_name, avatar_path)',
        )
        .eq('title_id', titleRow.id)
        .eq('published', true)
        .order('like_count', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) throw new Error(error.message);

      const rows = (data ?? []) as ReviewJoinRow[];
      const liked = await likedReviewIds(userId, rows.map((row) => row.id));
      return rows.map((row) => mapReview(row, liked));
    },
  });
}

export function useReview(reviewId: string | undefined) {
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: queryKeys.review(reviewId ?? ''),
    enabled: !!reviewId && !!supabase,
    staleTime: 30_000,
    queryFn: async (): Promise<ReviewWithContext | null> => {
      const { data, error } = await supabase!
        .from('reviews')
        .select(
          'id, user_id, rating, body, contains_spoilers, like_count, created_at, updated_at, profiles!reviews_user_id_fkey(id, username, display_name, avatar_path), titles(tmdb_id, media_type, title, poster_path, release_date)',
        )
        .eq('id', reviewId!)
        .eq('published', true)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return null;
      const liked = await likedReviewIds(userId, [data.id]);
      return mapReview(data as ReviewJoinRow, liked);
    },
  });
}

export function useUserReviews(profileUserId: string | undefined) {
  const viewerId = useCurrentUserId();
  return useQuery({
    queryKey: [...queryKeys.userReviews(profileUserId ?? ''), viewerId ?? 'anon'],
    enabled: !!profileUserId && !!supabase,
    staleTime: 30_000,
    queryFn: async (): Promise<ReviewWithContext[]> => {
      const { data, error } = await supabase!
        .from('reviews')
        .select(
          'id, user_id, rating, body, contains_spoilers, like_count, created_at, updated_at, profiles!reviews_user_id_fkey(id, username, display_name, avatar_path), titles(tmdb_id, media_type, title, poster_path, release_date)',
        )
        .eq('user_id', profileUserId!)
        .eq('published', true)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as ReviewJoinRow[];
      const liked = await likedReviewIds(viewerId, rows.map((row) => row.id));
      return rows.map((row) => mapReview(row, liked));
    },
  });
}

/** Optimistic like toggle across every cached review list. */
export function useToggleReviewLike() {
  const queryClient = useQueryClient();
  const userId = useCurrentUserId();

  const applyDelta = (reviewId: string, liked: boolean) => {
    const update = (review: ReviewWithContext): ReviewWithContext =>
      review.id === reviewId
        ? {
            ...review,
            likedByMe: liked,
            likeCount: Math.max(0, review.likeCount + (liked ? 1 : -1)),
          }
        : review;
    queryClient.setQueriesData<ReviewWithContext[]>({ queryKey: ['titleReviews'] }, (old) =>
      old?.map(update),
    );
    queryClient.setQueriesData<ReviewWithContext[]>({ queryKey: ['musicReviews'] }, (old) =>
      old?.map(update),
    );
    queryClient.setQueriesData<ReviewWithContext[]>({ queryKey: ['userReviews'] }, (old) =>
      old?.map(update),
    );
    queryClient.setQueriesData<ReviewWithContext | null>({ queryKey: ['review'] }, (old) =>
      old ? update(old) : old,
    );
  };

  return useMutation({
    mutationFn: async ({ reviewId, like }: { reviewId: string; like: boolean }) => {
      if (!supabase || !userId) throw new Error('Sign in to like reviews.');
      if (like) {
        const { error } = await supabase
          .from('review_likes')
          .insert({ user_id: userId, review_id: reviewId });
        // Unique violation = already liked; treat as success.
        if (error && error.code !== '23505') throw new Error(error.message);
      } else {
        const { error } = await supabase
          .from('review_likes')
          .delete()
          .eq('user_id', userId)
          .eq('review_id', reviewId);
        if (error) throw new Error(error.message);
      }
    },
    onMutate: async ({ reviewId, like }) => {
      applyDelta(reviewId, like);
    },
    onError: (error, { reviewId, like }) => {
      applyDelta(reviewId, !like);
      toast.error(error instanceof Error ? error.message : 'Could not update like.');
    },
  });
}

export function useUpdateReview() {
  const queryClient = useQueryClient();
  const userId = useCurrentUserId();
  return useMutation({
    mutationFn: async ({
      reviewId,
      body,
      rating,
      containsSpoilers,
    }: {
      reviewId: string;
      body: string;
      rating: number | null;
      containsSpoilers: boolean;
    }) => {
      if (!supabase || !userId) throw new Error('Not signed in.');
      const { error } = await supabase
        .from('reviews')
        .update({ body: body.trim(), rating, contains_spoilers: containsSpoilers })
        .eq('id', reviewId)
        .eq('user_id', userId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success('Review updated.');
      queryClient.invalidateQueries({ queryKey: ['titleReviews'] });
      queryClient.invalidateQueries({ queryKey: ['userReviews'] });
      queryClient.invalidateQueries({ queryKey: ['review'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.feed() });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : 'Could not update review.'),
  });
}

export function useDeleteReview() {
  const queryClient = useQueryClient();
  const userId = useCurrentUserId();
  return useMutation({
    mutationFn: async (reviewId: string) => {
      if (!supabase || !userId) throw new Error('Not signed in.');
      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', reviewId)
        .eq('user_id', userId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success('Review deleted.');
      queryClient.invalidateQueries({ queryKey: ['titleReviews'] });
      queryClient.invalidateQueries({ queryKey: ['userReviews'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.feed() });
      queryClient.invalidateQueries({ queryKey: ['userActivity'] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : 'Could not delete review.'),
  });
}

import { useQuery } from '@tanstack/react-query';

import { avatarPublicUrl } from '@/lib/supabase/storage';
import { posterUrl } from '@/lib/tmdb/images';
import { queryKeys } from '@/lib/queryKeys';
import { supabase } from '@/lib/supabase/client';
import { tmdb } from '@/lib/tmdb/client';
import { useCurrentUserId } from '@/providers/AuthProvider';
import type { MediaType, TitleSummary } from '@/types/domain';
import { yearFromDate } from '@/utils/titles';

const TRENDING_STALE_MS = 30 * 60_000;

export function useTrending(mediaType: MediaType) {
  return useQuery({
    queryKey: queryKeys.trending(mediaType),
    queryFn: () => (mediaType === 'movie' ? tmdb.trendingMovies() : tmdb.trendingTv()),
    staleTime: TRENDING_STALE_MS,
    select: (data) => data.results,
  });
}

export function usePopular(mediaType: MediaType) {
  return useQuery({
    queryKey: queryKeys.popular(mediaType),
    queryFn: () => (mediaType === 'movie' ? tmdb.popularMovies() : tmdb.popularTv()),
    staleTime: TRENDING_STALE_MS,
    select: (data) => data.results,
  });
}

/** Genre-based suggestions driven by onboarding preferences. */
export function useGenreSuggestions(genreIds: number[]) {
  return useQuery({
    queryKey: queryKeys.discover('movie', genreIds),
    queryFn: () => tmdb.discoverByGenres('movie', genreIds),
    staleTime: TRENDING_STALE_MS,
    enabled: genreIds.length > 0,
    select: (data) => data.results,
  });
}

export interface ContinueWatchingItem {
  title: TitleSummary;
  seasonNumber: number;
  episodeNumber: number;
}

/** Shows with in-flight progress, most recently watched first. */
export function useContinueWatching() {
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: queryKeys.continueWatching(userId ?? 'anon'),
    enabled: !!userId && !!supabase,
    staleTime: 30_000,
    queryFn: async (): Promise<ContinueWatchingItem[]> => {
      const { data, error } = await supabase!
        .from('tv_progress')
        .select('season_number, episode_number, titles(*)')
        .eq('user_id', userId!)
        .eq('completed', false)
        .order('last_watched_at', { ascending: false })
        .limit(10);
      if (error) throw new Error(error.message);
      return (data ?? [])
        .filter((row) => row.titles)
        .map((row) => ({
          seasonNumber: row.season_number,
          episodeNumber: row.episode_number,
          title: {
            tmdbId: row.titles!.tmdb_id,
            mediaType: row.titles!.media_type,
            title: row.titles!.title,
            posterUrl: posterUrl(row.titles!.poster_path),
            posterPath: row.titles!.poster_path ?? undefined,
            releaseYear: yearFromDate(row.titles!.release_date),
          },
        }));
    },
  });
}

export interface FollowedReview {
  id: string;
  rating: number | null;
  body: string;
  containsSpoilers: boolean;
  likeCount: number;
  createdAt: string;
  author: { id: string; username: string; displayName: string; avatarUrl?: string };
  title: TitleSummary;
}

/** Recent reviews from people the current user follows (home screen section). */
export function useRecentReviewsFromFollows() {
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: queryKeys.recentReviewsFromFollows(userId ?? 'anon'),
    enabled: !!userId && !!supabase,
    staleTime: 60_000,
    queryFn: async (): Promise<FollowedReview[]> => {
      const client = supabase!;
      const { data: followingRows, error: followsError } = await client
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId!);
      if (followsError) throw new Error(followsError.message);
      const followingIds = (followingRows ?? []).map((row) => row.following_id);
      if (followingIds.length === 0) return [];

      const { data, error } = await client
        .from('reviews')
        .select('id, rating, body, contains_spoilers, like_count, created_at, profiles(id, username, display_name, avatar_path), titles(*)')
        .in('user_id', followingIds)
        .eq('published', true)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw new Error(error.message);

      return (data ?? [])
        .filter((row) => row.profiles && row.titles)
        .map((row) => ({
          id: row.id,
          rating: row.rating,
          body: row.body,
          containsSpoilers: row.contains_spoilers,
          likeCount: row.like_count,
          createdAt: row.created_at,
          author: {
            id: row.profiles!.id,
            username: row.profiles!.username,
            displayName: row.profiles!.display_name?.trim() || row.profiles!.username,
            avatarUrl: avatarPublicUrl(row.profiles!.avatar_path),
          },
          title: {
            tmdbId: row.titles!.tmdb_id,
            mediaType: row.titles!.media_type,
            title: row.titles!.title,
            posterUrl: posterUrl(row.titles!.poster_path),
            releaseYear: yearFromDate(row.titles!.release_date),
          },
        }));
    },
  });
}

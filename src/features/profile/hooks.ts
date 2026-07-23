import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryKeys';
import { supabase } from '@/lib/supabase/client';
import { posterUrl } from '@/lib/tmdb/images';
import { useCurrentUserId } from '@/providers/AuthProvider';
import { toast } from '@/stores/toastStore';
import { mapProfileRow, type Profile } from '@/types/profile';
import type { MediaType, TitleSummary } from '@/types/domain';
import { yearFromDate } from '@/utils/titles';

export function useProfileByUsername(username: string | undefined) {
  return useQuery({
    queryKey: queryKeys.profile(username ?? ''),
    enabled: !!username && !!supabase,
    staleTime: 30_000,
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase!
        .from('profiles')
        .select('*')
        .ilike('username', username!)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data ? mapProfileRow(data) : null;
    },
  });
}

export interface RatedTitle {
  title: TitleSummary;
  rating: number | null;
  watchedAt: string | null;
  updatedAt: string;
}

/** A user's titles by status (watched grid, favourites, public watchlist). */
export function useUserTitles(
  userId: string | undefined,
  options: { mediaType?: MediaType; status?: 'watched' | 'watchlist'; favouritesOnly?: boolean; limit?: number },
) {
  const { mediaType, status = 'watched', favouritesOnly = false, limit = 60 } = options;
  return useQuery({
    queryKey: [
      'userTitles',
      userId ?? '',
      mediaType ?? 'all',
      status,
      favouritesOnly ? 'fav' : 'all',
      limit,
    ],
    enabled: !!userId && !!supabase,
    staleTime: 30_000,
    queryFn: async (): Promise<RatedTitle[]> => {
      let query = supabase!
        .from('user_title_status')
        .select('rating, watched_at, updated_at, is_favourite, titles!inner(*)')
        .eq('user_id', userId!)
        .limit(limit);
      if (favouritesOnly) {
        // Pinned (ranked) favourites first, in slot order; then the rest.
        query = query
          .eq('is_favourite', true)
          .order('favourite_rank', { ascending: true, nullsFirst: false })
          .order('updated_at', { ascending: false });
      } else {
        query = query.eq('status', status).order('updated_at', { ascending: false });
      }
      if (mediaType) query = query.eq('titles.media_type', mediaType);

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return (data ?? [])
        .filter((row) => row.titles)
        .map((row) => ({
          rating: row.rating === null ? null : Number(row.rating),
          watchedAt: row.watched_at,
          updatedAt: row.updated_at,
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

export interface ProfileStats {
  watchedMovies: number;
  watchedShows: number;
  ratings: number;
  reviews: number;
  averageRating: number | null;
}

export function useProfileStats(userId: string | undefined) {
  return useQuery({
    queryKey: ['profileStats', userId ?? ''],
    enabled: !!userId && !!supabase,
    staleTime: 60_000,
    queryFn: async (): Promise<ProfileStats> => {
      const client = supabase!;
      const [movies, shows, ratings, reviews] = await Promise.all([
        client
          .from('user_title_status')
          .select('id, titles!inner(media_type)', { count: 'exact', head: true })
          .eq('user_id', userId!)
          .eq('status', 'watched')
          .eq('titles.media_type', 'movie'),
        client
          .from('user_title_status')
          .select('id, titles!inner(media_type)', { count: 'exact', head: true })
          .eq('user_id', userId!)
          .eq('status', 'watched')
          .eq('titles.media_type', 'tv'),
        client
          .from('user_title_status')
          .select('rating')
          .eq('user_id', userId!)
          .not('rating', 'is', null),
        client
          .from('reviews')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId!)
          .eq('published', true),
      ]);

      for (const result of [movies, shows, ratings, reviews]) {
        if (result.error) throw new Error(result.error.message);
      }

      const ratingValues = (ratings.data ?? []).map((row) => Number(row.rating));
      const averageRating =
        ratingValues.length > 0
          ? Math.round((ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length) * 10) / 10
          : null;

      return {
        watchedMovies: movies.count ?? 0,
        watchedShows: shows.count ?? 0,
        ratings: ratingValues.length,
        reviews: reviews.count ?? 0,
        averageRating,
      };
    },
  });
}

export interface DiaryEntry {
  id: string;
  watchedAt: string;
  rating: number | null;
  isRewatch: boolean;
  title: TitleSummary;
}

export function useDiary(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.diary(userId ?? ''),
    enabled: !!userId && !!supabase,
    staleTime: 30_000,
    queryFn: async (): Promise<DiaryEntry[]> => {
      const { data, error } = await supabase!
        .from('diary_entries')
        .select('id, watched_at, rating, is_rewatch, titles(*)')
        .eq('user_id', userId!)
        .order('watched_at', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw new Error(error.message);
      return (data ?? [])
        .filter((row) => row.titles)
        .map((row) => ({
          id: row.id,
          watchedAt: row.watched_at,
          rating: row.rating === null ? null : Number(row.rating),
          isRewatch: row.is_rewatch,
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

/** Recent public activity rows for one user's profile page. */
export function useUserActivity(userId: string | undefined) {
  const viewerId = useCurrentUserId();
  return useQuery({
    queryKey: [...queryKeys.userActivity(userId ?? ''), viewerId ?? 'anon'],
    enabled: !!userId && !!supabase,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase!
        .from('activities')
        .select(
          'id, activity_type, created_at, metadata, titles(id, tmdb_id, media_type, title, poster_path, release_date), reviews(id, rating, body, contains_spoilers, like_count, published), lists(id, name, visibility), profiles!activities_subject_user_id_fkey(id, username, display_name, avatar_path)',
        )
        .eq('actor_id', userId!)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
}

export interface FavouriteEntry {
  /** titles.id (uuid) — used to set the favourite rank. */
  titleId: string;
  rank: number | null;
  title: TitleSummary;
}

/** All of a user's favourited titles, pinned (ranked) ones first. */
export function useFavourites(userId: string | undefined) {
  return useQuery({
    queryKey: ['favouritesFull', userId ?? ''],
    enabled: !!userId && !!supabase,
    staleTime: 30_000,
    queryFn: async (): Promise<FavouriteEntry[]> => {
      const { data, error } = await supabase!
        .from('user_title_status')
        .select('title_id, favourite_rank, titles!inner(*)')
        .eq('user_id', userId!)
        .eq('is_favourite', true)
        .order('favourite_rank', { ascending: true, nullsFirst: false })
        .order('updated_at', { ascending: false })
        .limit(60);
      if (error) throw new Error(error.message);
      return (data ?? [])
        .filter((row) => row.titles)
        .map((row) => ({
          titleId: row.title_id,
          rank: row.favourite_rank,
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

/** Pin/unpin a favourite to a Top-4 slot (rank 1–4, or null to clear). */
export function useSetFavouriteRank() {
  const queryClient = useQueryClient();
  const userId = useCurrentUserId();
  return useMutation({
    mutationFn: async ({ titleId, rank }: { titleId: string; rank: number | null }) => {
      if (!supabase) throw new Error('Not connected.');
      const { error } = await supabase.rpc('set_favourite_rank', {
        p_title_id: titleId,
        p_rank: rank,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favouritesFull', userId ?? ''] });
      queryClient.invalidateQueries({ queryKey: ['userTitles'] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : 'Could not update favourites.'),
  });
}

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { books } from '@/lib/books/client';
import { queryKeys } from '@/lib/queryKeys';
import { avatarPublicUrl } from '@/lib/supabase/storage';
import { supabase } from '@/lib/supabase/client';
import type { CommunitySummary } from '@/types/database';
import type { BookDetails, BookSummary, Paginated } from '@/types/domain';

export interface BookReview {
  id: string;
  rating: number | null;
  body: string;
  containsSpoilers: boolean;
  likeCount: number;
  createdAt: string;
  author: { id: string; username: string; displayName: string; avatarUrl?: string };
}

const DETAILS_STALE_MS = 24 * 60 * 60_000;

export function useBookDetails(volumeId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.bookDetails(volumeId ?? ''),
    enabled: !!volumeId,
    staleTime: DETAILS_STALE_MS,
    queryFn: () => books.bookDetails(volumeId!),
  });
}

/** Infinite Google Books search (startIndex pagination handled in the client). */
export function useBookSearch(query: string) {
  const trimmed = query.trim();
  return useInfiniteQuery({
    queryKey: queryKeys.bookSearch(trimmed.toLowerCase()),
    enabled: trimmed.length >= 2,
    staleTime: 5 * 60_000,
    initialPageParam: 1,
    queryFn: ({ pageParam }): Promise<Paginated<BookSummary>> => books.searchBooks(trimmed, pageParam),
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
  });
}

export function usePopularBooks(subject = 'fiction') {
  return useQuery({
    queryKey: ['books', 'popular', subject],
    staleTime: 30 * 60_000,
    queryFn: () => books.popularBooks(subject),
    select: (data: Paginated<BookSummary>) => data.results,
  });
}

export function useBookCommunitySummary(volumeId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.bookCommunitySummary(volumeId ?? ''),
    enabled: !!volumeId && !!supabase,
    staleTime: 60_000,
    queryFn: async (): Promise<CommunitySummary> => {
      const { data, error } = await supabase!.rpc('get_book_community_summary', {
        p_volume_id: volumeId!,
      });
      if (error) throw new Error(error.message);
      return data as unknown as CommunitySummary;
    },
  });
}

/** Community reviews for a book (keyed by the book's titles row via external_id). */
export function useBookReviews(volumeId: string | undefined) {
  return useQuery({
    queryKey: ['bookReviews', volumeId ?? ''],
    enabled: !!volumeId && !!supabase,
    staleTime: 30_000,
    queryFn: async (): Promise<BookReview[]> => {
      const { data, error } = await supabase!
        .from('reviews')
        .select(
          'id, rating, body, contains_spoilers, like_count, created_at, author:profiles!reviews_user_id_fkey(id, username, display_name, avatar_path), titles!inner(external_id, media_type)',
        )
        .eq('titles.external_id', volumeId!)
        .eq('titles.media_type', 'book')
        .eq('published', true)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw new Error(error.message);
      return (data ?? [])
        .filter((r) => r.author)
        .map((r) => ({
          id: r.id,
          rating: r.rating === null ? null : Number(r.rating),
          body: r.body,
          containsSpoilers: r.contains_spoilers,
          likeCount: r.like_count,
          createdAt: r.created_at,
          author: {
            id: r.author!.id,
            username: r.author!.username,
            displayName: r.author!.display_name?.trim() || r.author!.username,
            avatarUrl: avatarPublicUrl(r.author!.avatar_path),
          },
        }));
    },
  });
}

export type { BookDetails };

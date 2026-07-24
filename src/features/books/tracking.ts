import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import {
  ensureBookReference,
  logTitle,
  setFavourite,
  setTitleRating,
  setTitleStatus,
  type LogTitleInput,
} from '@/features/tracking/api';
import { config } from '@/constants/config';
import { queryKeys } from '@/lib/queryKeys';
import { supabase } from '@/lib/supabase/client';
import { useCurrentUserId } from '@/providers/AuthProvider';
import { toast } from '@/stores/toastStore';
import type { BookProgressRow, UserTitleStatusRow } from '@/types/database';
import type { BookDetails, BookSummary, WatchStatus } from '@/types/domain';

export interface BookStatusState {
  status: WatchStatus | null;
  rating: number | null;
  isFavourite: boolean;
  watchedAt: string | null;
}

const EMPTY: BookStatusState = { status: null, rating: null, isFavourite: false, watchedAt: null };

function mapStatus(row: UserTitleStatusRow | null): BookStatusState {
  if (!row) return EMPTY;
  return {
    status: row.status,
    rating: row.rating === null ? null : Number(row.rating),
    isFavourite: row.is_favourite,
    watchedAt: row.watched_at,
  };
}

async function bookTitleId(volumeId: string): Promise<string | null> {
  const { data } = await supabase!
    .from('titles')
    .select('id')
    .eq('external_id', volumeId)
    .eq('media_type', 'book')
    .maybeSingle();
  return data?.id ?? null;
}

export function useBookStatus(book: Pick<BookSummary, 'volumeId'> | undefined) {
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: queryKeys.bookStatus(userId ?? 'anon', book?.volumeId ?? ''),
    enabled: !!userId && !!book && !!supabase,
    staleTime: 15_000,
    queryFn: async (): Promise<BookStatusState> => {
      const titleId = await bookTitleId(book!.volumeId);
      if (!titleId) return EMPTY;
      const { data, error } = await supabase!
        .from('user_title_status')
        .select('*')
        .eq('user_id', userId!)
        .eq('title_id', titleId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return mapStatus(data);
    },
  });
}

export function useBookProgress(book: Pick<BookSummary, 'volumeId'> | undefined) {
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: queryKeys.bookProgress(userId ?? 'anon', book?.volumeId ?? ''),
    enabled: !!userId && !!book && !!supabase,
    staleTime: 15_000,
    queryFn: async (): Promise<BookProgressRow | null> => {
      const titleId = await bookTitleId(book!.volumeId);
      if (!titleId) return null;
      const { data, error } = await supabase!
        .from('book_progress')
        .select('*')
        .eq('user_id', userId!)
        .eq('title_id', titleId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
  });
}

function useInvalidateBook(volumeId: string) {
  const queryClient = useQueryClient();
  const userId = useCurrentUserId();
  return () => {
    const uid = userId ?? 'anon';
    queryClient.invalidateQueries({ queryKey: queryKeys.bookStatus(uid, volumeId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.bookProgress(uid, volumeId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.bookCommunitySummary(volumeId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.feed() });
    queryClient.invalidateQueries({ queryKey: ['userTitles'] });
    queryClient.invalidateQueries({ queryKey: ['diary'] });
  };
}

export function useSetBookStatus(book: BookSummary) {
  const userId = useCurrentUserId();
  const invalidate = useInvalidateBook(book.volumeId);
  return useMutation({
    mutationFn: (status: WatchStatus | null) => setTitleStatus(userId!, book, status),
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : 'Could not update your shelf.'),
    onSettled: invalidate,
  });
}

export function useSetBookRating(book: BookSummary) {
  const userId = useCurrentUserId();
  const invalidate = useInvalidateBook(book.volumeId);
  return useMutation({
    mutationFn: (rating: number | null) => setTitleRating(userId!, book, rating),
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Could not save rating.'),
    onSettled: invalidate,
  });
}

export function useSetBookFavourite(book: BookSummary) {
  const userId = useCurrentUserId();
  const invalidate = useInvalidateBook(book.volumeId);
  return useMutation({
    mutationFn: (isFavourite: boolean) => setFavourite(userId!, book, isFavourite),
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : 'Could not update favourites.'),
    onSettled: invalidate,
  });
}

export function useLogBook(book: BookSummary) {
  const invalidate = useInvalidateBook(book.volumeId);
  return useMutation({
    mutationFn: (input: Omit<LogTitleInput, 'title'>) => logTitle({ ...input, title: book }),
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Could not save.'),
    onSettled: invalidate,
  });
}

export interface BookProgressInput {
  currentPage: number;
  totalPages?: number | null;
  completed?: boolean;
}

export function useSetBookProgress(book: BookSummary) {
  const invalidate = useInvalidateBook(book.volumeId);
  return useMutation({
    mutationFn: async ({ currentPage, totalPages, completed }: BookProgressInput) => {
      if (!supabase) throw new Error('Not connected.');
      const titleId = await ensureBookReference(book);
      const { error } = await supabase.rpc('set_book_progress', {
        p_title_id: titleId,
        p_current_page: currentPage,
        p_total_pages: totalPages ?? null,
        p_completed: completed ?? false,
      });
      if (error) throw new Error(error.message);
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : 'Could not update progress.'),
    onSettled: invalidate,
  });
}

/** Populate the titles cache with a book's metadata when its page is viewed. */
export function useBookEnrichment(details: BookDetails | undefined) {
  const userId = useCurrentUserId();
  const done = useRef<string | null>(null);
  useEffect(() => {
    if (config.demoMode || !userId || !details) return;
    if (done.current === details.volumeId) return;
    done.current = details.volumeId;
    void ensureBookReference(details).catch(() => undefined);
  }, [details, userId]);
}

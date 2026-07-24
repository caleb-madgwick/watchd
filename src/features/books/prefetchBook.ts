import type { QueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';

import { books } from '@/lib/books/client';
import { queryKeys } from '@/lib/queryKeys';
import { supabase } from '@/lib/supabase/client';
import type { BookSummary } from '@/types/domain';

// Safety cap so a dead network can't keep the transition up forever — the detail
// screen has its own skeletons. Generous, because the riffle should keep going
// until the book content is genuinely loaded, not bail after a beat.
const PREFETCH_TIMEOUT_MS = 12000;

function withTimeout<T>(promise: Promise<T>): Promise<unknown> {
  return Promise.race([promise, new Promise((resolve) => setTimeout(resolve, PREFETCH_TIMEOUT_MS))]);
}

/**
 * Warm the book detail page's data while the open-book transition plays: Google
 * Books details (+ Open Library enrichment), the community summary, and the
 * cover image. The returned promise resolves when the ESSENTIAL data (the book
 * details + its cover) has loaded — that's what gates the transition, so the
 * pages riffle until the page is genuinely ready. Community data is best-effort
 * and never blocks. Never rejects.
 */
export function prefetchBook(queryClient: QueryClient, book: BookSummary): Promise<unknown> {
  const details = queryClient.prefetchQuery({
    queryKey: queryKeys.bookDetails(book.volumeId),
    queryFn: () => books.bookDetails(book.volumeId),
    staleTime: 24 * 60 * 60_000,
  });

  // Fire-and-forget: warm the cache but don't hold up the reveal.
  if (supabase) {
    queryClient
      .prefetchQuery({
        queryKey: queryKeys.bookCommunitySummary(book.volumeId),
        queryFn: async () => {
          const { data, error } = await supabase!.rpc('get_book_community_summary', {
            p_volume_id: book.volumeId,
          });
          if (error) throw new Error(error.message);
          return data;
        },
        staleTime: 60_000,
      })
      .catch(() => {});
  }

  const cover = book.coverUrl ? Image.prefetch(book.coverUrl).catch(() => true) : Promise.resolve(true);

  return withTimeout(Promise.all([details, cover]));
}

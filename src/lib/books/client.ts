import { mergeOpenLibrary, normalizeGoogleList, normalizeVolumeDetails } from './normalize';
import { fetchBooks } from './transport';
import type {
  GoogleBooksList,
  GoogleBooksVolume,
  OpenLibraryBook,
  OpenLibraryEditionsResponse,
  OpenLibraryWork,
} from './types';
import type { BookDetails, BookSummary, Paginated } from '@/types/domain';

const PAGE_SIZE = 20;

/**
 * The books data client. Google Books is primary; bookDetails() enriches from
 * Open Library (ISBN → work → editions), best-effort — a Google-only result is
 * always valid. Google paginates by startIndex/maxResults, converted here.
 */
export const books = {
  async searchBooks(query: string, page = 1): Promise<Paginated<BookSummary>> {
    const startIndex = (page - 1) * PAGE_SIZE;
    const raw = await fetchBooks<GoogleBooksList>('/gb/volumes', {
      q: query,
      startIndex,
      maxResults: PAGE_SIZE,
    });
    return normalizeGoogleList(raw, page, PAGE_SIZE);
  },

  async popularBooks(subject = 'fiction', page = 1): Promise<Paginated<BookSummary>> {
    const startIndex = (page - 1) * PAGE_SIZE;
    const raw = await fetchBooks<GoogleBooksList>('/gb/volumes', {
      q: `subject:${subject}`,
      orderBy: 'relevance',
      startIndex,
      maxResults: PAGE_SIZE,
    });
    return normalizeGoogleList(raw, page, PAGE_SIZE);
  },

  async bookDetails(volumeId: string): Promise<BookDetails> {
    const raw = await fetchBooks<GoogleBooksVolume>(`/gb/volumes/${volumeId}`, {});
    let details = normalizeVolumeDetails(raw);

    if (details.isbn13) {
      try {
        const edition = await fetchBooks<OpenLibraryBook>(`/ol/isbn/${details.isbn13}.json`, {});
        const workKey = edition.works?.[0]?.key?.replace('/works/', '');
        let work: OpenLibraryWork | undefined;
        let editions: OpenLibraryEditionsResponse | undefined;
        if (workKey) {
          try {
            work = await fetchBooks<OpenLibraryWork>(`/ol/works/${workKey}.json`, {});
          } catch {
            // work lookup optional
          }
          try {
            editions = await fetchBooks<OpenLibraryEditionsResponse>(
              `/ol/works/${workKey}/editions.json`,
              { limit: 20 },
            );
          } catch {
            // editions optional
          }
        }
        details = mergeOpenLibrary(details, work, editions);
      } catch {
        // Open Library is a best-effort enrichment; Google-only is fine.
      }
    }

    return details;
  },
} as const;

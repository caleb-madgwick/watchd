/**
 * Google Books / Open Library → domain model normalisation (the trust boundary).
 * Google is primary; Open Library backfills ISBN/editions/covers/publication.
 */

import { googleCoverUrl, openLibraryCoverById, openLibraryCoverByIsbn } from './images';
import type {
  GoogleBooksList,
  GoogleBooksVolume,
  GoogleIndustryId,
  OpenLibraryEditionsResponse,
  OpenLibraryWork,
} from './types';
import type { BookDetails, BookEdition, BookSummary, Paginated } from '@/types/domain';

function yearFrom(date: string | undefined): number | undefined {
  if (!date) return undefined;
  const m = date.match(/\d{4}/);
  return m ? Number(m[0]) : undefined;
}

function isbnFrom(ids: GoogleIndustryId[] | undefined, kind: 'ISBN_13' | 'ISBN_10'): string | undefined {
  const raw = ids?.find((i) => i.type === kind)?.identifier;
  return raw ? raw.replace(/[^0-9Xx]/g, '') : undefined;
}

function cleanRating(value: number | undefined): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return undefined;
  return Math.round(value * 10) / 10;
}

export function normalizeVolumeSummary(v: GoogleBooksVolume): BookSummary {
  const info = v.volumeInfo ?? {};
  const isbn13 = isbnFrom(info.industryIdentifiers, 'ISBN_13');
  return {
    volumeId: v.id,
    mediaType: 'book',
    title: info.title?.trim() || 'Untitled',
    subtitle: info.subtitle?.trim() || undefined,
    authors: (info.authors ?? []).filter(Boolean),
    coverUrl:
      googleCoverUrl(info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail) ??
      openLibraryCoverByIsbn(isbn13),
    publishedYear: yearFrom(info.publishedDate),
    publishedDate: info.publishedDate,
    isbn13,
    averageRating: cleanRating(info.averageRating),
  };
}

export function normalizeVolumeDetails(v: GoogleBooksVolume): BookDetails {
  const info = v.volumeInfo ?? {};
  return {
    ...normalizeVolumeSummary(v),
    description: info.description?.trim() || undefined,
    publisher: info.publisher?.trim() || undefined,
    pageCount: info.pageCount && info.pageCount > 0 ? info.pageCount : undefined,
    categories: (info.categories ?? []).filter(Boolean),
    language: info.language?.trim() || undefined,
  };
}

/**
 * Collapse-key for a book: Google Books returns many editions of the same work
 * (same title + author, different volumeId), which read as duplicates. Editions
 * share this key so we can keep just one.
 */
export function bookKey(b: Pick<BookSummary, 'title' | 'authors'>): string {
  const title = b.title.toLowerCase().replace(/\s+/g, ' ').trim();
  const author = (b.authors[0] ?? '').toLowerCase().trim();
  return `${title}|${author}`;
}

export function normalizeGoogleList(
  raw: GoogleBooksList,
  page: number,
  pageSize: number,
): Paginated<BookSummary> {
  const total = raw.totalItems ?? raw.items?.length ?? 0;

  // De-duplicate editions within the page, preferring one that has a cover.
  const byKey = new Map<string, number>();
  const results: BookSummary[] = [];
  for (const item of raw.items ?? []) {
    const b = normalizeVolumeSummary(item);
    if (b.title === 'Untitled' && b.authors.length === 0) continue;
    const key = bookKey(b);
    const idx = byKey.get(key);
    if (idx === undefined) {
      byKey.set(key, results.length);
      results.push(b);
    } else if (!results[idx].coverUrl && b.coverUrl) {
      results[idx] = b;
    }
  }

  return {
    page,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    totalResults: total,
    results,
  };
}

/** Backfill ISBN/editions/alt-covers/first-published from Open Library. */
export function mergeOpenLibrary(
  book: BookDetails,
  work?: OpenLibraryWork,
  editions?: OpenLibraryEditionsResponse,
): BookDetails {
  const merged: BookDetails = { ...book };

  if (work) {
    merged.openLibraryWorkId = work.key?.replace('/works/', '') ?? merged.openLibraryWorkId;
    merged.firstPublishedYear = yearFrom(work.first_publish_date) ?? merged.firstPublishedYear;
    if (!merged.description) {
      merged.description =
        typeof work.description === 'string' ? work.description : work.description?.value;
    }
    const workCover = openLibraryCoverById(work.covers?.find((c) => c > 0));
    if (!merged.coverUrl && workCover) merged.coverUrl = workCover;
  }

  const editionList = (editions?.entries ?? []).slice(0, 12).map<BookEdition>((e) => ({
    isbn13: e.isbn_13?.[0],
    publisher: e.publishers?.[0],
    publishedYear: yearFrom(e.publish_date),
    coverUrl: openLibraryCoverById(e.covers?.find((c) => c > 0)) ?? openLibraryCoverByIsbn(e.isbn_13?.[0]),
  }));
  if (editionList.length > 0) {
    merged.editions = editionList;
    merged.alternativeCoverUrls = editionList
      .map((e) => e.coverUrl)
      .filter((u): u is string => !!u)
      .slice(0, 6);
  }

  return merged;
}

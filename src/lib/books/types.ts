/**
 * Raw Google Books + Open Library API shapes. These never leave src/lib/books —
 * everything is normalised to domain models (BookSummary/BookDetails) first.
 */

export interface GoogleImageLinks {
  smallThumbnail?: string;
  thumbnail?: string;
  small?: string;
  medium?: string;
  large?: string;
}

export interface GoogleIndustryId {
  type?: string; // 'ISBN_13' | 'ISBN_10' | 'OTHER'
  identifier?: string;
}

export interface GoogleVolumeInfo {
  title?: string;
  subtitle?: string;
  authors?: string[];
  publisher?: string;
  publishedDate?: string;
  description?: string;
  pageCount?: number;
  categories?: string[];
  averageRating?: number;
  language?: string;
  imageLinks?: GoogleImageLinks;
  industryIdentifiers?: GoogleIndustryId[];
}

export interface GoogleBooksVolume {
  id: string;
  volumeInfo?: GoogleVolumeInfo;
}

export interface GoogleBooksList {
  totalItems?: number;
  items?: GoogleBooksVolume[];
}

// ── Open Library ──────────────────────────────────────────────────────────────

export interface OpenLibraryBook {
  key?: string; // edition key, e.g. /books/OL...M
  works?: { key: string }[]; // work key, e.g. /works/OL...W
  isbn_13?: string[];
  isbn_10?: string[];
  publishers?: string[];
  publish_date?: string;
  covers?: number[];
  number_of_pages?: number;
}

export interface OpenLibraryEdition {
  key?: string;
  isbn_13?: string[];
  isbn_10?: string[];
  publishers?: string[];
  publish_date?: string;
  covers?: number[];
}

export interface OpenLibraryEditionsResponse {
  entries?: OpenLibraryEdition[];
}

export interface OpenLibraryWork {
  key?: string;
  first_publish_date?: string;
  covers?: number[];
  description?: string | { value?: string };
}

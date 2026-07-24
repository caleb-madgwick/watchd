/**
 * Book cover URL helpers. Google Books returns absolute URLs (normalise to
 * https, drop the page-curl overlay); Open Library covers are built from an ISBN
 * or a numeric cover id.
 */

export function googleCoverUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  return url.replace(/^http:/, 'https:').replace(/&edge=curl/g, '');
}

export type CoverSize = 'S' | 'M' | 'L';

export function openLibraryCoverByIsbn(isbn: string | undefined, size: CoverSize = 'L'): string | undefined {
  if (!isbn) return undefined;
  return `https://covers.openlibrary.org/b/isbn/${isbn}-${size}.jpg`;
}

export function openLibraryCoverById(id: number | undefined, size: CoverSize = 'L'): string | undefined {
  if (id === undefined || id === null || id < 0) return undefined;
  return `https://covers.openlibrary.org/b/id/${id}-${size}.jpg`;
}

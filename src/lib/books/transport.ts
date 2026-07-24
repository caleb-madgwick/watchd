import { FIXTURE_BOOKS, FIXTURE_BOOK_DETAILS, pagedBooks } from './fixtures';
import { config } from '@/constants/config';

export class BooksError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'BooksError';
  }
}

export type BooksParams = Record<string, string | number | undefined>;

const REQUEST_TIMEOUT_MS = 12_000;

async function fetchJson<T>(url: string, headers: Record<string, string>): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { headers, signal: controller.signal });
    if (!response.ok) {
      let message = `Book request failed (${response.status})`;
      try {
        const body = (await response.json()) as { error?: { message?: string } | string };
        if (typeof body.error === 'string') message = body.error;
        else if (body.error?.message) message = body.error.message;
      } catch {
        // keep default
      }
      throw new BooksError(message, response.status);
    }
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof BooksError) throw error;
    if ((error as Error).name === 'AbortError') {
      throw new BooksError('Book request timed out.', 408);
    }
    throw new BooksError('Network error while reaching the book service.', 0);
  } finally {
    clearTimeout(timer);
  }
}

function buildQuery(params: BooksParams = {}): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `&${qs}` : '';
}

/** Dev direct transport: hit Google Books / Open Library straight (no proxy). */
function directUrl(path: string, params: BooksParams): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue;
    search.set(key, String(value));
  }
  if (path.startsWith('/gb')) {
    if (config.googleBooksApiKey) search.set('key', config.googleBooksApiKey);
    search.set('country', search.get('country') ?? 'US');
    return `https://www.googleapis.com/books/v1${path.replace(/^\/gb/, '')}?${search.toString()}`;
  }
  return `https://openlibrary.org${path.replace(/^\/ol/, '')}?${search.toString()}`;
}

/** Demo transport: bundled fixtures; Open Library lookups resolve to empty. */
function demoFetch<T>(path: string, params: BooksParams): T {
  const asAny = (value: unknown) => value as T;
  const q = String(params.q ?? '').toLowerCase();

  if (path === '/gb/volumes') {
    return asAny(
      pagedBooks(
        q
          ? FIXTURE_BOOKS.filter(
              (v) =>
                v.volumeInfo?.title?.toLowerCase().includes(q) ||
                v.volumeInfo?.authors?.some((a) => a.toLowerCase().includes(q)),
            )
          : FIXTURE_BOOKS,
      ),
    );
  }
  const match = path.match(/^\/gb\/volumes\/([A-Za-z0-9_-]+)$/);
  if (match) {
    const detail = FIXTURE_BOOK_DETAILS[match[1]] ?? FIXTURE_BOOKS.find((v) => v.id === match[1]);
    if (detail) return asAny(detail);
    throw new BooksError('Book not available in demo mode. Configure book access for the full catalogue.', 404);
  }
  if (path.startsWith('/ol/')) {
    return asAny({}); // Open Library enrichment is best-effort; empty in demo.
  }
  throw new BooksError(`Demo mode has no fixture for ${path}.`, 404);
}

/**
 * Fetch a books path through the configured transport:
 *  - proxy:  books-proxy Edge Function (Google key server-side; production)
 *  - direct: hit Google Books / Open Library directly (dev)
 *  - demo:   bundled fixtures, no keys required
 * Paths are prefixed `/gb/…` (Google Books) or `/ol/…` (Open Library).
 */
export async function fetchBooks<T>(path: string, params: BooksParams = {}): Promise<T> {
  switch (config.booksMode) {
    case 'demo':
      return demoFetch<T>(path, params);
    case 'direct':
      return fetchJson<T>(directUrl(path, params), { Accept: 'application/json' });
    case 'proxy': {
      const url = `${config.supabaseUrl}/functions/v1/books-proxy?path=${encodeURIComponent(path)}${buildQuery(params)}`;
      return fetchJson<T>(url, {
        Authorization: `Bearer ${config.supabaseAnonKey}`,
        apikey: config.supabaseAnonKey,
        Accept: 'application/json',
      });
    }
  }
}

import {
  FIXTURE_MOVIE_DETAILS,
  FIXTURE_MOVIES,
  FIXTURE_PERSON,
  FIXTURE_SEASON,
  FIXTURE_TV,
  FIXTURE_TV_DETAILS,
  paged,
} from './fixtures';
import { config } from '@/constants/config';

export class TmdbError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'TmdbError';
  }
}

export type TmdbParams = Record<string, string | number | undefined>;

const REQUEST_TIMEOUT_MS = 12_000;

async function fetchJson<T>(url: string, headers: Record<string, string>): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { headers, signal: controller.signal });
    if (!response.ok) {
      let message = `TMDB request failed (${response.status})`;
      try {
        const body = (await response.json()) as { status_message?: string; error?: string };
        message = body.status_message ?? body.error ?? message;
      } catch {
        // keep default message
      }
      throw new TmdbError(message, response.status);
    }
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof TmdbError) throw error;
    if ((error as Error).name === 'AbortError') {
      throw new TmdbError('TMDB request timed out.', 408);
    }
    throw new TmdbError('Network error while reaching TMDB.', 0);
  } finally {
    clearTimeout(timer);
  }
}

function buildQuery(params: TmdbParams = {}): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `&${qs}` : '';
}

function directUrl(path: string, params: TmdbParams): string {
  const search = new URLSearchParams({ include_adult: 'false' });
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue;
    search.set(key, String(value));
  }
  return `https://api.themoviedb.org/3${path}?${search.toString()}`;
}

/** Demo transport: serves bundled fixtures so the app runs with zero keys. */
function demoFetch<T>(path: string, params: TmdbParams): T {
  const asAny = (value: unknown) => value as T;
  const query = String(params.query ?? '').toLowerCase();

  if (/^\/trending\/movie\//.test(path) || path === '/movie/popular' || path === '/discover/movie') {
    return asAny(paged(FIXTURE_MOVIES));
  }
  if (/^\/trending\/tv\//.test(path) || path === '/tv/popular' || path === '/discover/tv') {
    return asAny(paged(FIXTURE_TV));
  }
  if (path === '/search/movie') {
    return asAny(paged(FIXTURE_MOVIES.filter((m) => m.title?.toLowerCase().includes(query))));
  }
  if (path === '/search/tv') {
    return asAny(paged(FIXTURE_TV.filter((t) => t.name?.toLowerCase().includes(query))));
  }
  if (path === '/search/multi') {
    return asAny(
      paged([
        ...FIXTURE_MOVIES.filter((m) => m.title?.toLowerCase().includes(query)).map((m) => ({
          ...m,
          media_type: 'movie' as const,
        })),
        ...FIXTURE_TV.filter((t) => t.name?.toLowerCase().includes(query)).map((t) => ({
          ...t,
          media_type: 'tv' as const,
        })),
      ]),
    );
  }
  const movieMatch = path.match(/^\/movie\/(\d+)$/);
  if (movieMatch) {
    const details =
      FIXTURE_MOVIE_DETAILS[Number(movieMatch[1])] ??
      FIXTURE_MOVIES.find((m) => m.id === Number(movieMatch[1]));
    if (details) return asAny(details);
    throw new TmdbError('Title not available in demo mode. Configure TMDB access for the full catalogue.', 404);
  }
  const tvMatch = path.match(/^\/tv\/(\d+)$/);
  if (tvMatch) {
    const details =
      FIXTURE_TV_DETAILS[Number(tvMatch[1])] ?? FIXTURE_TV.find((t) => t.id === Number(tvMatch[1]));
    if (details) return asAny(details);
    throw new TmdbError('Title not available in demo mode. Configure TMDB access for the full catalogue.', 404);
  }
  if (/^\/tv\/\d+\/season\/\d+$/.test(path)) {
    const seasonNumber = Number(path.split('/').pop());
    return asAny({ ...FIXTURE_SEASON, season_number: seasonNumber, name: `Season ${seasonNumber}` });
  }
  if (/^\/person\/\d+$/.test(path)) {
    return asAny(FIXTURE_PERSON);
  }
  throw new TmdbError(`Demo mode has no fixture for ${path}.`, 404);
}

/**
 * Fetch a TMDB path through the configured transport:
 *  - proxy:  Supabase Edge Function holding the token server-side (production)
 *  - direct: developer's own token, local development only
 *  - demo:   bundled fixtures, no keys required
 */
export async function fetchTmdb<T>(path: string, params: TmdbParams = {}): Promise<T> {
  switch (config.tmdbMode) {
    case 'demo':
      return demoFetch<T>(path, params);
    case 'direct':
      return fetchJson<T>(directUrl(path, params), {
        Authorization: `Bearer ${config.tmdbAccessToken}`,
        Accept: 'application/json',
      });
    case 'proxy': {
      const url = `${config.supabaseUrl}/functions/v1/tmdb-proxy?path=${encodeURIComponent(path)}${buildQuery(params)}`;
      return fetchJson<T>(url, {
        Authorization: `Bearer ${config.supabaseAnonKey}`,
        apikey: config.supabaseAnonKey,
        Accept: 'application/json',
      });
    }
  }
}

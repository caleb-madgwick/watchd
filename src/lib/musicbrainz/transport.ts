import {
  FIXTURE_ARTISTS,
  FIXTURE_ARTIST_RELEASE_GROUPS,
  FIXTURE_RECORDINGS,
  FIXTURE_RELEASES,
  FIXTURE_RELEASE_GROUPS,
  FIXTURE_RELEASE_GROUP_RELEASE,
} from './fixtures';
import { config } from '@/constants/config';

export class MusicError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'MusicError';
  }
}

export type MusicParams = Record<string, string | number | undefined>;

const REQUEST_TIMEOUT_MS = 12_000;
const MB_BASE = 'https://musicbrainz.org/ws/2';

// Direct-mode identity. MusicBrainz requires a descriptive User-Agent; the
// production path goes through the proxy, which sets its own.
const USER_AGENT = 'Watchd/1.0 ( https://videoclub.app )';

async function fetchJson<T>(url: string, headers: Record<string, string>): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { headers, signal: controller.signal });
    if (!response.ok) {
      let message = `Music request failed (${response.status})`;
      try {
        const body = (await response.json()) as { error?: string };
        if (typeof body.error === 'string') message = body.error;
      } catch {
        // keep default
      }
      throw new MusicError(message, response.status);
    }
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof MusicError) throw error;
    if ((error as Error).name === 'AbortError') {
      throw new MusicError('Music request timed out.', 408);
    }
    throw new MusicError('Network error while reaching the music service.', 0);
  } finally {
    clearTimeout(timer);
  }
}

function buildQuery(params: MusicParams = {}): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `&${qs}` : '';
}

/** Dev direct transport: hit MusicBrainz straight (no proxy). Always fmt=json. */
function directUrl(path: string, params: MusicParams): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue;
    search.set(key, String(value));
  }
  search.set('fmt', 'json');
  return `${MB_BASE}${path}?${search.toString()}`;
}

/** Demo transport: bundled fixtures; enough for search + one album/artist/song. */
function demoFetch<T>(path: string, params: MusicParams): T {
  const asAny = (value: unknown) => value as T;
  const q = String(params.query ?? '').toLowerCase();

  if (path === '/artist') {
    const artists = q
      ? FIXTURE_ARTISTS.filter((a) => a.name?.toLowerCase().includes(q))
      : FIXTURE_ARTISTS;
    return asAny({ count: artists.length, offset: 0, artists });
  }
  if (path === '/release-group') {
    // Browse (by artist) or search.
    const artistId = params.artist ? String(params.artist) : undefined;
    if (artistId) {
      const groups = FIXTURE_ARTIST_RELEASE_GROUPS[artistId] ?? [];
      return asAny({ 'release-group-count': groups.length, 'release-groups': groups });
    }
    const groups = q
      ? FIXTURE_RELEASE_GROUPS.filter((g) => g.title?.toLowerCase().includes(q))
      : FIXTURE_RELEASE_GROUPS;
    return asAny({ count: groups.length, offset: 0, 'release-groups': groups });
  }
  if (path === '/recording') {
    const recs = q
      ? FIXTURE_RECORDINGS.filter((r) => r.title?.toLowerCase().includes(q))
      : FIXTURE_RECORDINGS;
    return asAny({ count: recs.length, offset: 0, recordings: recs });
  }
  const artistMatch = path.match(/^\/artist\/([^/]+)$/);
  if (artistMatch) {
    const artist = FIXTURE_ARTISTS.find((a) => a.id === artistMatch[1]);
    if (artist) return asAny(artist);
    throw new MusicError('Artist not available in demo mode.', 404);
  }
  const rgMatch = path.match(/^\/release-group\/([^/]+)$/);
  if (rgMatch) {
    const rg = FIXTURE_RELEASE_GROUPS.find((g) => g.id === rgMatch[1]);
    if (rg) {
      const release = FIXTURE_RELEASE_GROUP_RELEASE[rg.id];
      return asAny({ ...rg, releases: release ? [release] : [] });
    }
    throw new MusicError('Album not available in demo mode.', 404);
  }
  const relMatch = path.match(/^\/release\/([^/]+)$/);
  if (relMatch) {
    const release = FIXTURE_RELEASES[relMatch[1]];
    if (release) return asAny(release);
    throw new MusicError('Release not available in demo mode.', 404);
  }
  const recMatch = path.match(/^\/recording\/([^/]+)$/);
  if (recMatch) {
    const rec = FIXTURE_RECORDINGS.find((r) => r.id === recMatch[1]);
    if (rec) return asAny(rec);
    throw new MusicError('Song not available in demo mode.', 404);
  }
  throw new MusicError(`Demo mode has no fixture for ${path}.`, 404);
}

/**
 * Fetch a MusicBrainz path through the configured transport:
 *  - proxy:  musicbrainz-proxy Edge Function (sets User-Agent + rate limit)
 *  - direct: hit MusicBrainz directly, fmt=json (dev)
 *  - demo:   bundled fixtures, no network
 * Paths are the /ws/2 sub-paths, e.g. "/artist", "/release-group/{mbid}".
 */
export async function fetchMusicBrainz<T>(path: string, params: MusicParams = {}): Promise<T> {
  switch (config.musicMode) {
    case 'demo':
      return demoFetch<T>(path, params);
    case 'direct':
      return fetchJson<T>(directUrl(path, params), {
        Accept: 'application/json',
        'User-Agent': USER_AGENT,
      });
    case 'proxy': {
      const url = `${config.supabaseUrl}/functions/v1/musicbrainz-proxy?path=${encodeURIComponent(path)}${buildQuery(params)}`;
      return fetchJson<T>(url, {
        Authorization: `Bearer ${config.supabaseAnonKey}`,
        apikey: config.supabaseAnonKey,
        Accept: 'application/json',
      });
    }
  }
}

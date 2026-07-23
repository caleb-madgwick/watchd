// TMDB proxy — the production transport for Watchd's metadata.
//
// Holds the TMDB v4 read token as a server secret so it never ships in a
// client bundle. Exposes a narrow, allowlisted slice of the TMDB API with
// response caching and a per-IP rate limit.
//
// Deploy:  supabase functions deploy tmdb-proxy
// Secret:  supabase secrets set TMDB_API_TOKEN=<v4 read access token>
//
// Requests: GET /functions/v1/tmdb-proxy?path=/trending/movie/week&page=1
// (called with the project's anon key via the standard Authorization header).

const TMDB_BASE = 'https://api.themoviedb.org/3';

const ALLOWED_PATHS: { pattern: RegExp; ttlSeconds: number }[] = [
  { pattern: /^\/trending\/(movie|tv)\/(day|week)$/, ttlSeconds: 1800 },
  { pattern: /^\/(movie|tv)\/popular$/, ttlSeconds: 1800 },
  { pattern: /^\/(movie|tv)\/top_rated$/, ttlSeconds: 3600 },
  { pattern: /^\/search\/(movie|tv|multi)$/, ttlSeconds: 300 },
  { pattern: /^\/movie\/\d+$/, ttlSeconds: 86400 },
  { pattern: /^\/tv\/\d+$/, ttlSeconds: 86400 },
  { pattern: /^\/tv\/\d+\/season\/\d+$/, ttlSeconds: 86400 },
  { pattern: /^\/person\/\d+$/, ttlSeconds: 86400 },
  { pattern: /^\/genre\/(movie|tv)\/list$/, ttlSeconds: 604800 },
  { pattern: /^\/discover\/(movie|tv)$/, ttlSeconds: 1800 },
  { pattern: /^\/configuration$/, ttlSeconds: 604800 },
];

const ALLOWED_QUERY_KEYS = new Set([
  'page',
  'query',
  'append_to_response',
  'with_genres',
  'sort_by',
  'language',
  'first_air_date_year',
  'primary_release_year',
]);

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

// ── In-memory response cache (per instance; TMDB tolerates the cold misses) ──

interface CacheEntry {
  body: string;
  status: number;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_MAX_ENTRIES = 500;

function cacheGet(key: string): CacheEntry | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt < Date.now()) {
    cache.delete(key);
    return undefined;
  }
  return entry;
}

function cacheSet(key: string, entry: CacheEntry) {
  if (cache.size >= CACHE_MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, entry);
}

// ── Per-IP rate limit: 60 requests / minute ─────────────────────────────────

const rateBuckets = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT = 60;
const RATE_WINDOW_MS = 60_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(ip);
  if (!bucket || now - bucket.windowStart > RATE_WINDOW_MS) {
    rateBuckets.set(ip, { count: 1, windowStart: now });
    return false;
  }
  bucket.count += 1;
  return bucket.count > RATE_LIMIT;
}

function json(status: number, body: unknown, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS, ...extraHeaders },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }
  if (req.method !== 'GET') {
    return json(405, { error: 'Method not allowed' });
  }

  const token = Deno.env.get('TMDB_API_TOKEN');
  if (!token) {
    return json(500, {
      error: 'TMDB_API_TOKEN is not configured. Run: supabase secrets set TMDB_API_TOKEN=<token>',
    });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (isRateLimited(ip)) {
    return json(429, { error: 'Rate limit exceeded. Try again shortly.' });
  }

  const url = new URL(req.url);
  const path = url.searchParams.get('path') ?? '';
  const rule = ALLOWED_PATHS.find((r) => r.pattern.test(path));
  if (!rule) {
    return json(400, { error: `Path not allowed: ${path}` });
  }

  const upstream = new URL(TMDB_BASE + path);
  for (const [key, value] of url.searchParams.entries()) {
    if (key === 'path') continue;
    if (!ALLOWED_QUERY_KEYS.has(key)) continue;
    if (value.length > 200) continue;
    upstream.searchParams.set(key, value);
  }
  // Never proxy adult content listings.
  upstream.searchParams.set('include_adult', 'false');

  const cacheKey = upstream.toString();
  const cached = cacheGet(cacheKey);
  if (cached) {
    return new Response(cached.body, {
      status: cached.status,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': `public, max-age=${rule.ttlSeconds}`,
        'X-Proxy-Cache': 'hit',
        ...CORS_HEADERS,
      },
    });
  }

  try {
    const upstreamResponse = await fetch(cacheKey, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    const body = await upstreamResponse.text();

    if (upstreamResponse.ok) {
      cacheSet(cacheKey, {
        body,
        status: upstreamResponse.status,
        expiresAt: Date.now() + rule.ttlSeconds * 1000,
      });
    }

    return new Response(body, {
      status: upstreamResponse.status,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': upstreamResponse.ok ? `public, max-age=${rule.ttlSeconds}` : 'no-store',
        'X-Proxy-Cache': 'miss',
        ...CORS_HEADERS,
      },
    });
  } catch (error) {
    console.error('TMDB upstream error:', error instanceof Error ? error.message : error);
    return json(502, { error: 'TMDB is unreachable right now. Try again shortly.' });
  }
});

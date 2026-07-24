// MusicBrainz proxy — production transport for Video Club's music metadata.
//
// Fronts the MusicBrainz /ws/2 API behind one allowlisted, cached, rate-limited
// endpoint. MusicBrainz is keyless but REQUIRES a descriptive User-Agent and
// asks callers to stay near ~1 request/second — both are enforced here, and
// aggressive caching keeps upstream traffic low. Cover art is served straight
// from Cover Art Archive's CDN by the client (no proxy needed).
//
// Deploy:  supabase functions deploy musicbrainz-proxy
// (no secret required)
//
// Request: GET /functions/v1/musicbrainz-proxy?path=/release-group&query=melodrama
// (called with the project's anon key via the standard Authorization header).

const MB_BASE = 'https://musicbrainz.org/ws/2';
const USER_AGENT = 'Watchd/1.0 ( caleb@archi-qs.com.au )';
const MBID = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';

const ALLOWED_PATHS: { pattern: RegExp; ttlSeconds: number }[] = [
  { pattern: /^\/artist$/, ttlSeconds: 300 },
  { pattern: /^\/release-group$/, ttlSeconds: 300 },
  { pattern: /^\/recording$/, ttlSeconds: 300 },
  { pattern: new RegExp(`^/artist/${MBID}$`), ttlSeconds: 86400 },
  { pattern: new RegExp(`^/release-group/${MBID}$`), ttlSeconds: 86400 },
  { pattern: new RegExp(`^/release/${MBID}$`), ttlSeconds: 86400 },
  { pattern: new RegExp(`^/recording/${MBID}$`), ttlSeconds: 86400 },
];

const ALLOWED_QUERY_KEYS = new Set(['query', 'limit', 'offset', 'inc', 'artist', 'type']);

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

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

  const upstream = new URL(MB_BASE + path);
  for (const [key, value] of url.searchParams.entries()) {
    if (key === 'path') continue;
    if (!ALLOWED_QUERY_KEYS.has(key)) continue;
    if (value.length > 400) continue;
    upstream.searchParams.set(key, value);
  }
  // Always JSON.
  upstream.searchParams.set('fmt', 'json');

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
      headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
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
    console.error('MusicBrainz upstream error:', error instanceof Error ? error.message : error);
    return json(502, { error: 'The music service is unreachable right now. Try again shortly.' });
  }
});

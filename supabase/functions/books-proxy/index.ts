// Books proxy — production transport for Video Club's book metadata.
//
// Fronts TWO upstreams behind one allowlisted, cached, rate-limited endpoint:
//   • Google Books  (paths under /gb/…)  — primary: search, descriptions,
//     covers, categories. Uses GOOGLE_BOOKS_API_KEY if set (keyless otherwise).
//   • Open Library  (paths under /ol/…)  — ISBN lookup, editions, publication
//     history, fallback covers. Always keyless.
//
// Deploy:  supabase functions deploy books-proxy
// Secret:  supabase secrets set GOOGLE_BOOKS_API_KEY=<key>   (optional)
//
// Request: GET /functions/v1/books-proxy?path=/gb/volumes&q=dune&maxResults=20
// (called with the project's anon key via the standard Authorization header).

const GOOGLE_BASE = 'https://www.googleapis.com/books/v1';
const OPENLIB_BASE = 'https://openlibrary.org';

type Upstream = 'google' | 'openlibrary';

const ALLOWED_PATHS: { pattern: RegExp; ttlSeconds: number; upstream: Upstream }[] = [
  { pattern: /^\/gb\/volumes$/, ttlSeconds: 300, upstream: 'google' },
  { pattern: /^\/gb\/volumes\/[A-Za-z0-9_-]{1,64}$/, ttlSeconds: 86400, upstream: 'google' },
  { pattern: /^\/ol\/isbn\/[0-9Xx]{10,13}\.json$/, ttlSeconds: 86400, upstream: 'openlibrary' },
  { pattern: /^\/ol\/works\/OL\d+W\.json$/, ttlSeconds: 86400, upstream: 'openlibrary' },
  { pattern: /^\/ol\/works\/OL\d+W\/editions\.json$/, ttlSeconds: 86400, upstream: 'openlibrary' },
];

const ALLOWED_QUERY_KEYS = new Set([
  'q',
  'startIndex',
  'maxResults',
  'langRestrict',
  'country',
  'projection',
  'orderBy',
  'limit',
]);

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

  // Strip the /gb or /ol prefix and route to the right upstream base.
  const base = rule.upstream === 'google' ? GOOGLE_BASE : OPENLIB_BASE;
  const upstream = new URL(base + path.replace(/^\/(gb|ol)/, ''));
  for (const [key, value] of url.searchParams.entries()) {
    if (key === 'path') continue;
    if (!ALLOWED_QUERY_KEYS.has(key)) continue;
    if (value.length > 200) continue;
    upstream.searchParams.set(key, value);
  }
  if (rule.upstream === 'google') {
    const key = Deno.env.get('GOOGLE_BOOKS_API_KEY');
    if (key) upstream.searchParams.set('key', key);
    upstream.searchParams.set('country', upstream.searchParams.get('country') ?? 'US');
  }

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
    const upstreamResponse = await fetch(cacheKey, { headers: { Accept: 'application/json' } });
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
    console.error('Books upstream error:', error instanceof Error ? error.message : error);
    return json(502, { error: 'The book service is unreachable right now. Try again shortly.' });
  }
});

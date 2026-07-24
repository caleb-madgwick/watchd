// Spotify proxy — optional enrichment + outbound links for Video Club music.
//
// Spotify's Client Credentials flow must run server-side (it needs the client
// secret and issues an app token), so this Edge Function holds the secret,
// caches the app token, and exposes a single narrow "match" endpoint that maps
// a title + artist to a Spotify deep link, artwork and preview clip. If the
// credentials are absent it returns an empty match ({}) so the app cleanly
// falls back to Spotify search links — music never depends on Spotify.
//
// Deploy:  supabase functions deploy spotify-proxy
// Secrets: supabase secrets set SPOTIFY_CLIENT_ID=<id> SPOTIFY_CLIENT_SECRET=<secret>
//
// Request: GET /functions/v1/spotify-proxy?type=album&title=Melodrama&artist=Lorde

const TOKEN_URL = 'https://accounts.spotify.com/api/token';
const API_BASE = 'https://api.spotify.com/v1';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

type MatchType = 'album' | 'track' | 'artist';

interface SpotifyMatch {
  url?: string;
  imageUrl?: string;
  previewUrl?: string;
  spotifyId?: string;
}

// ── App token (client credentials), cached in-memory per instance ────────────

let cachedToken: { value: string; expiresAt: number } = { value: '', expiresAt: 0 };

async function getAppToken(id: string, secret: string): Promise<string | null> {
  if (cachedToken.value && cachedToken.expiresAt > Date.now()) return cachedToken.value;
  const resp = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${id}:${secret}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!resp.ok) return null;
  const json = (await resp.json()) as { access_token?: string; expires_in?: number };
  if (!json.access_token) return null;
  cachedToken = {
    value: json.access_token,
    expiresAt: Date.now() + Math.max(60, (json.expires_in ?? 3600) - 60) * 1000,
  };
  return cachedToken.value;
}

// ── Match result cache (query → result) ──────────────────────────────────────

const matchCache = new Map<string, { body: string; expiresAt: number }>();
const MATCH_TTL_MS = 24 * 60 * 60 * 1000;

const rateBuckets = new Map<string, { count: number; windowStart: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(ip);
  if (!bucket || now - bucket.windowStart > 60_000) {
    rateBuckets.set(ip, { count: 1, windowStart: now });
    return false;
  }
  bucket.count += 1;
  return bucket.count > 60;
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

interface SpotifySearchItem {
  external_urls?: { spotify?: string };
  id?: string;
  preview_url?: string | null;
  images?: { url?: string }[];
  album?: { images?: { url?: string }[] };
}

function toMatch(item: SpotifySearchItem | undefined): SpotifyMatch {
  if (!item) return {};
  const images = item.images ?? item.album?.images ?? [];
  return {
    url: item.external_urls?.spotify,
    imageUrl: images[0]?.url,
    previewUrl: item.preview_url ?? undefined,
    spotifyId: item.id,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'GET') return json(405, { error: 'Method not allowed' });

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (isRateLimited(ip)) return json(429, { error: 'Rate limit exceeded.' });

  const url = new URL(req.url);
  const type = (url.searchParams.get('type') ?? 'album') as MatchType;
  const title = (url.searchParams.get('title') ?? '').slice(0, 200).trim();
  const artist = (url.searchParams.get('artist') ?? '').slice(0, 200).trim();
  if (!['album', 'track', 'artist'].includes(type) || !title) {
    return json(400, { error: 'Provide a valid type and title.' });
  }

  const id = Deno.env.get('SPOTIFY_CLIENT_ID');
  const secret = Deno.env.get('SPOTIFY_CLIENT_SECRET');
  // No credentials configured → empty match; the client falls back to search links.
  if (!id || !secret) return json(200, {});

  const cacheKey = `${type}:${title}:${artist}`.toLowerCase();
  const cached = matchCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return new Response(cached.body, {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'X-Proxy-Cache': 'hit', ...CORS_HEADERS },
    });
  }

  try {
    const token = await getAppToken(id, secret);
    if (!token) return json(200, {});

    const q = artist ? `${title} artist:${artist}` : title;
    const search = new URL(`${API_BASE}/search`);
    search.searchParams.set('q', q);
    search.searchParams.set('type', type);
    search.searchParams.set('limit', '1');
    const resp = await fetch(search.toString(), { headers: { Authorization: `Bearer ${token}` } });
    if (!resp.ok) return json(200, {});
    const data = (await resp.json()) as Record<string, { items?: SpotifySearchItem[] }>;
    const items = data[`${type}s`]?.items ?? [];
    const match = toMatch(items[0]);

    const body = JSON.stringify(match);
    matchCache.set(cacheKey, { body, expiresAt: Date.now() + MATCH_TTL_MS });
    return new Response(body, {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'X-Proxy-Cache': 'miss', ...CORS_HEADERS },
    });
  } catch (error) {
    console.error('Spotify proxy error:', error instanceof Error ? error.message : error);
    return json(200, {});
  }
});

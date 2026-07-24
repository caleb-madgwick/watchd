/**
 * Central access point for environment configuration.
 * EXPO_PUBLIC_* variables are inlined at build time by Expo; everything read
 * here is public by definition. Secrets live only in Supabase Edge Function
 * secrets (see .env.example).
 */

export type TmdbMode = 'proxy' | 'direct' | 'demo';
export type BooksMode = 'proxy' | 'direct' | 'demo';
export type MusicMode = 'proxy' | 'direct' | 'demo';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';
const tmdbAccessToken = process.env.EXPO_PUBLIC_TMDB_ACCESS_TOKEN?.trim() ?? '';
const rawTmdbMode = process.env.EXPO_PUBLIC_TMDB_MODE?.trim().toLowerCase() ?? '';
const googleBooksApiKey = process.env.EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY?.trim() ?? '';
const rawBooksMode = process.env.EXPO_PUBLIC_BOOKS_MODE?.trim().toLowerCase() ?? '';
const rawMusicMode = process.env.EXPO_PUBLIC_MUSIC_MODE?.trim().toLowerCase() ?? '';

export const isSupabaseConfigured = supabaseUrl.length > 0 && supabaseAnonKey.length > 0;

function resolveTmdbMode(): TmdbMode {
  if (rawTmdbMode === 'proxy' || rawTmdbMode === 'direct' || rawTmdbMode === 'demo') {
    return rawTmdbMode;
  }
  if (tmdbAccessToken) return 'direct';
  if (isSupabaseConfigured) return 'proxy';
  return 'demo';
}

function resolveBooksMode(): BooksMode {
  if (rawBooksMode === 'proxy' || rawBooksMode === 'direct' || rawBooksMode === 'demo') {
    return rawBooksMode;
  }
  // Open Library is keyless; Google Books works keyless too (lower quota), so a
  // dev direct mode is viable without a key. Prefer proxy when a backend exists.
  if (isSupabaseConfigured) return 'proxy';
  return 'demo';
}

function resolveMusicMode(): MusicMode {
  if (rawMusicMode === 'proxy' || rawMusicMode === 'direct' || rawMusicMode === 'demo') {
    return rawMusicMode;
  }
  // MusicBrainz + Cover Art Archive are entirely keyless. Prefer the proxy (it
  // controls the required User-Agent and rate limit) whenever a backend exists.
  if (isSupabaseConfigured) return 'proxy';
  return 'demo';
}

export const config = {
  supabaseUrl,
  supabaseAnonKey,
  tmdbMode: resolveTmdbMode(),
  tmdbAccessToken,
  booksMode: resolveBooksMode(),
  /** Dev-only direct-mode key; production uses the GOOGLE_BOOKS_API_KEY secret in books-proxy. */
  googleBooksApiKey,
  musicMode: resolveMusicMode(),
  /** True when running without a backend — auth and social features are disabled. */
  demoMode: !isSupabaseConfigured,
} as const;

export const limits = {
  usernameMin: 3,
  usernameMax: 20,
  displayNameMax: 50,
  bioMax: 160,
  reviewMax: 10_000,
  listNameMax: 100,
  listDescriptionMax: 500,
  listItemsMax: 500,
  listNoteMax: 280,
} as const;

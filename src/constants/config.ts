/**
 * Central access point for environment configuration.
 * EXPO_PUBLIC_* variables are inlined at build time by Expo; everything read
 * here is public by definition. Secrets live only in Supabase Edge Function
 * secrets (see .env.example).
 */

export type TmdbMode = 'proxy' | 'direct' | 'demo';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';
const tmdbAccessToken = process.env.EXPO_PUBLIC_TMDB_ACCESS_TOKEN?.trim() ?? '';
const rawTmdbMode = process.env.EXPO_PUBLIC_TMDB_MODE?.trim().toLowerCase() ?? '';

export const isSupabaseConfigured = supabaseUrl.length > 0 && supabaseAnonKey.length > 0;

function resolveTmdbMode(): TmdbMode {
  if (rawTmdbMode === 'proxy' || rawTmdbMode === 'direct' || rawTmdbMode === 'demo') {
    return rawTmdbMode;
  }
  if (tmdbAccessToken) return 'direct';
  if (isSupabaseConfigured) return 'proxy';
  return 'demo';
}

export const config = {
  supabaseUrl,
  supabaseAnonKey,
  tmdbMode: resolveTmdbMode(),
  tmdbAccessToken,
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

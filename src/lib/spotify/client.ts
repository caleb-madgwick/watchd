import { config } from '@/constants/config';

export interface SpotifyMatch {
  url?: string;
  imageUrl?: string;
  previewUrl?: string;
  spotifyId?: string;
}

/**
 * Match a title + artist to a Spotify entity via the server-side spotify-proxy
 * (which holds the client credentials). Always best-effort: any failure — or
 * missing credentials — resolves to {} so callers fall back to search links.
 */
export async function spotifyMatch(
  type: 'album' | 'track' | 'artist',
  title: string,
  artist?: string,
): Promise<SpotifyMatch> {
  if (config.musicMode === 'demo' || !config.supabaseUrl) return {};
  try {
    const params = new URLSearchParams({ type, title });
    if (artist) params.set('artist', artist);
    const resp = await fetch(`${config.supabaseUrl}/functions/v1/spotify-proxy?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${config.supabaseAnonKey}`,
        apikey: config.supabaseAnonKey,
      },
    });
    if (!resp.ok) return {};
    return (await resp.json()) as SpotifyMatch;
  } catch {
    return {};
  }
}

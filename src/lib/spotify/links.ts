/**
 * Outbound Spotify links. Search deep links need no API access or credentials —
 * they open the Spotify app/web to a pre-filled search, which is enough for an
 * "Open in Spotify" affordance without depending on the Spotify Web API. Real
 * exact-match IDs / previews are a documented future enrichment.
 */

const SEARCH_BASE = 'https://open.spotify.com/search';

function query(parts: (string | undefined)[]): string {
  return encodeURIComponent(parts.filter((p): p is string => !!p && p.trim().length > 0).join(' '));
}

export function spotifyAlbumSearchUrl(title: string, artist?: string): string {
  return `${SEARCH_BASE}/${query([title, artist])}`;
}

export function spotifySongSearchUrl(title: string, artist?: string): string {
  return `${SEARCH_BASE}/${query([title, artist])}`;
}

export function spotifyArtistSearchUrl(name: string): string {
  return `${SEARCH_BASE}/${query([name])}`;
}

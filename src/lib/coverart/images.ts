/**
 * Cover Art Archive URLs. Keyed by a MusicBrainz release-group MBID (preferred
 * for albums) or a specific release MBID. The endpoint 302-redirects to the
 * actual image; no key is required. Not every release has art, so callers must
 * always provide a placeholder for the miss case.
 */

export type CoverArtSize = 250 | 500 | 1200;

const BASE = 'https://coverartarchive.org';

export function coverArtByReleaseGroup(
  mbid: string | undefined,
  size: CoverArtSize = 500,
): string | undefined {
  if (!mbid) return undefined;
  return `${BASE}/release-group/${mbid}/front-${size}`;
}

export function coverArtByRelease(
  mbid: string | undefined,
  size: CoverArtSize = 500,
): string | undefined {
  if (!mbid) return undefined;
  return `${BASE}/release/${mbid}/front-${size}`;
}

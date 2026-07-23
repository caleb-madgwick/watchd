/**
 * TMDB image URL builder.
 * Uses the documented static image base; sizes follow the standard ladder so
 * small cards never download full-resolution art.
 */

const IMAGE_BASE = 'https://image.tmdb.org/t/p/';

export type PosterSize = 'w185' | 'w342' | 'w500' | 'w780';
export type BackdropSize = 'w780' | 'w1280' | 'original';
export type ProfileSize = 'w185' | 'h632';

function buildUrl(path: string | null | undefined, size: string): string | undefined {
  if (!path) return undefined;
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${IMAGE_BASE}${size}${clean}`;
}

export function posterUrl(path: string | null | undefined, size: PosterSize = 'w342') {
  return buildUrl(path, size);
}

export function backdropUrl(path: string | null | undefined, size: BackdropSize = 'w1280') {
  return buildUrl(path, size);
}

export function profileUrl(path: string | null | undefined, size: ProfileSize = 'w185') {
  return buildUrl(path, size);
}

export function stillUrl(path: string | null | undefined) {
  return buildUrl(path, 'w300');
}

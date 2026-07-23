import type { Href } from 'expo-router';

import type { MediaType } from '@/types/domain';

export function titleHref(mediaType: MediaType, tmdbId: number): Href {
  return mediaType === 'movie' ? `/movie/${tmdbId}` : `/tv/${tmdbId}`;
}

export function mediaTypeLabel(mediaType: MediaType): string {
  return mediaType === 'movie' ? 'Movie' : 'TV';
}

export function formatRuntime(minutes?: number): string | undefined {
  if (!minutes || minutes <= 0) return undefined;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export function yearFromDate(date?: string | null): number | undefined {
  if (!date) return undefined;
  const year = Number.parseInt(date.slice(0, 4), 10);
  return Number.isFinite(year) && year > 1800 ? year : undefined;
}

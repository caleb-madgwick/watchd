import type { Href } from 'expo-router';

import type { MediaType, WatchStatus } from '@/types/domain';

export function titleHref(mediaType: MediaType, tmdbId: number): Href {
  return mediaType === 'movie' ? `/movie/${tmdbId}` : `/tv/${tmdbId}`;
}

/** Books are keyed by a Google Books volume id (string), routed to /book/[id]. */
export function bookHref(volumeId: string): Href {
  return `/book/${volumeId}`;
}

/** Music is keyed by a MusicBrainz MBID (string), routed to /{type}/[id]. */
export function albumHref(mbid: string): Href {
  return `/album/${mbid}`;
}
export function artistHref(mbid: string): Href {
  return `/artist/${mbid}`;
}
export function songHref(mbid: string): Href {
  return `/song/${mbid}`;
}

/** True for the three music media types (albums/artists/songs). */
export function isMusicType(mediaType: MediaType): boolean {
  return mediaType === 'album' || mediaType === 'artist' || mediaType === 'song';
}

/** Route to any music entity by its MBID. */
export function musicHref(mediaType: 'album' | 'artist' | 'song', mbid: string): Href {
  if (mediaType === 'album') return albumHref(mbid);
  if (mediaType === 'artist') return artistHref(mbid);
  return songHref(mbid);
}

export function mediaTypeLabel(mediaType: MediaType): string {
  switch (mediaType) {
    case 'movie':
      return 'Movie';
    case 'book':
      return 'Book';
    case 'album':
      return 'Album';
    case 'artist':
      return 'Artist';
    case 'song':
      return 'Song';
    default:
      return 'TV';
  }
}

/** Status labels read differently per medium (read / listen / watch). */
export function statusLabel(mediaType: MediaType, status: WatchStatus): string {
  if (mediaType === 'book') {
    const reading: Record<WatchStatus, string> = {
      watchlist: 'Want to read',
      watching: 'Reading',
      watched: 'Read',
      paused: 'Paused',
      dropped: 'Did not finish',
    };
    return reading[status];
  }
  if (isMusicType(mediaType)) {
    const listening: Record<WatchStatus, string> = {
      watchlist: 'Want to listen',
      watching: 'Listening',
      watched: 'Listened',
      paused: 'Paused',
      dropped: 'Dropped',
    };
    return listening[status];
  }
  const watch: Record<WatchStatus, string> = {
    watchlist: 'Watchlist',
    watching: 'Watching',
    watched: 'Watched',
    paused: 'Paused',
    dropped: 'Dropped',
  };
  return watch[status];
}

/** "3:54" from a millisecond duration. */
export function formatDurationMs(ms?: number): string | undefined {
  if (!ms || ms <= 0) return undefined;
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
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

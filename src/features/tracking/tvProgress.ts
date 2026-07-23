import type { SeasonSummary } from '@/types/domain';

export interface EpisodePointer {
  seasonNumber: number;
  episodeNumber: number;
}

/** Count of episodes watched when the pointer is at (season, episode), inclusive. */
export function episodesWatchedCount(seasons: SeasonSummary[], pointer: EpisodePointer | null): number {
  if (!pointer || pointer.seasonNumber === 0) return 0;
  let count = 0;
  for (const season of seasons) {
    if (season.seasonNumber < pointer.seasonNumber) {
      count += season.episodeCount;
    } else if (season.seasonNumber === pointer.seasonNumber) {
      count += Math.min(pointer.episodeNumber, season.episodeCount);
    }
  }
  return count;
}

export function totalEpisodeCount(seasons: SeasonSummary[]): number {
  return seasons.reduce((sum, season) => sum + season.episodeCount, 0);
}

/** 0–1 progress ratio for progress bars. */
export function progressRatio(seasons: SeasonSummary[], pointer: EpisodePointer | null): number {
  const total = totalEpisodeCount(seasons);
  if (total === 0) return 0;
  return Math.min(1, episodesWatchedCount(seasons, pointer) / total);
}

/** The episode after the pointer, rolling over season boundaries; null when finished. */
export function nextEpisode(
  seasons: SeasonSummary[],
  pointer: EpisodePointer | null,
): EpisodePointer | null {
  const ordered = [...seasons].sort((a, b) => a.seasonNumber - b.seasonNumber);
  if (ordered.length === 0) return null;

  if (!pointer || pointer.seasonNumber === 0) {
    const first = ordered[0];
    return first.episodeCount > 0 ? { seasonNumber: first.seasonNumber, episodeNumber: 1 } : null;
  }

  const currentIndex = ordered.findIndex((s) => s.seasonNumber === pointer.seasonNumber);
  if (currentIndex === -1) return null;
  const current = ordered[currentIndex];

  if (pointer.episodeNumber < current.episodeCount) {
    return { seasonNumber: current.seasonNumber, episodeNumber: pointer.episodeNumber + 1 };
  }
  const following = ordered[currentIndex + 1];
  if (following && following.episodeCount > 0) {
    return { seasonNumber: following.seasonNumber, episodeNumber: 1 };
  }
  return null;
}

/** The last episode of the final season (target for "finished the show"). */
export function finalEpisode(seasons: SeasonSummary[]): EpisodePointer | null {
  const ordered = [...seasons].sort((a, b) => a.seasonNumber - b.seasonNumber);
  const last = ordered[ordered.length - 1];
  if (!last) return null;
  return { seasonNumber: last.seasonNumber, episodeNumber: Math.max(1, last.episodeCount) };
}

/** Whether a pointer at (season, episode) represents the end of the show. */
export function isShowComplete(seasons: SeasonSummary[], pointer: EpisodePointer): boolean {
  const final = finalEpisode(seasons);
  if (!final) return false;
  return (
    pointer.seasonNumber > final.seasonNumber ||
    (pointer.seasonNumber === final.seasonNumber && pointer.episodeNumber >= final.episodeNumber)
  );
}

/** The last episode of a given season (target for "season watched"). */
export function seasonFinale(seasons: SeasonSummary[], seasonNumber: number): EpisodePointer | null {
  const season = seasons.find((s) => s.seasonNumber === seasonNumber);
  if (!season) return null;
  return { seasonNumber, episodeNumber: Math.max(1, season.episodeCount) };
}

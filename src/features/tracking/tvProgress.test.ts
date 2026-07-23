import {
  episodesWatchedCount,
  finalEpisode,
  isShowComplete,
  nextEpisode,
  progressRatio,
  seasonFinale,
  totalEpisodeCount,
} from './tvProgress';
import type { SeasonSummary } from '@/types/domain';

const seasons: SeasonSummary[] = [
  { seasonNumber: 1, name: 'Season 1', episodeCount: 7 },
  { seasonNumber: 2, name: 'Season 2', episodeCount: 13 },
  { seasonNumber: 3, name: 'Season 3', episodeCount: 13 },
];

describe('episodesWatchedCount', () => {
  it('counts inclusive of the pointer', () => {
    expect(episodesWatchedCount(seasons, { seasonNumber: 1, episodeNumber: 3 })).toBe(3);
    expect(episodesWatchedCount(seasons, { seasonNumber: 2, episodeNumber: 5 })).toBe(12);
    expect(episodesWatchedCount(seasons, { seasonNumber: 3, episodeNumber: 13 })).toBe(33);
  });

  it('handles null and season-zero pointers', () => {
    expect(episodesWatchedCount(seasons, null)).toBe(0);
    expect(episodesWatchedCount(seasons, { seasonNumber: 0, episodeNumber: 0 })).toBe(0);
  });

  it('clamps episode overshoot to the season size', () => {
    expect(episodesWatchedCount(seasons, { seasonNumber: 1, episodeNumber: 99 })).toBe(7);
  });
});

describe('totals and ratio', () => {
  it('sums all seasons', () => {
    expect(totalEpisodeCount(seasons)).toBe(33);
  });

  it('computes ratio safely', () => {
    expect(progressRatio(seasons, { seasonNumber: 1, episodeNumber: 7 })).toBeCloseTo(7 / 33);
    expect(progressRatio([], { seasonNumber: 1, episodeNumber: 1 })).toBe(0);
  });
});

describe('nextEpisode', () => {
  it('starts at S1E1 with no progress', () => {
    expect(nextEpisode(seasons, null)).toEqual({ seasonNumber: 1, episodeNumber: 1 });
  });

  it('advances within a season', () => {
    expect(nextEpisode(seasons, { seasonNumber: 2, episodeNumber: 4 })).toEqual({
      seasonNumber: 2,
      episodeNumber: 5,
    });
  });

  it('rolls over to the next season', () => {
    expect(nextEpisode(seasons, { seasonNumber: 1, episodeNumber: 7 })).toEqual({
      seasonNumber: 2,
      episodeNumber: 1,
    });
  });

  it('returns null at the end of the show', () => {
    expect(nextEpisode(seasons, { seasonNumber: 3, episodeNumber: 13 })).toBeNull();
  });
});

describe('completion helpers', () => {
  it('identifies the final episode', () => {
    expect(finalEpisode(seasons)).toEqual({ seasonNumber: 3, episodeNumber: 13 });
  });

  it('detects completion', () => {
    expect(isShowComplete(seasons, { seasonNumber: 3, episodeNumber: 13 })).toBe(true);
    expect(isShowComplete(seasons, { seasonNumber: 3, episodeNumber: 12 })).toBe(false);
  });

  it('finds a season finale', () => {
    expect(seasonFinale(seasons, 2)).toEqual({ seasonNumber: 2, episodeNumber: 13 });
    expect(seasonFinale(seasons, 9)).toBeNull();
  });
});

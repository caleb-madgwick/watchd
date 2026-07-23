import {
  normalizeMovieDetails,
  normalizeMovieSummary,
  normalizeMulti,
  normalizePaged,
  normalizeTvDetails,
  pickTrailerUrl,
} from './normalize';
import type { TmdbMovieDetails, TmdbTvDetails } from './types';

describe('normalizeMovieSummary', () => {
  it('maps a full movie', () => {
    const result = normalizeMovieSummary({
      id: 27205,
      title: 'Inception',
      original_title: 'Inception',
      poster_path: '/poster.jpg',
      backdrop_path: '/backdrop.jpg',
      release_date: '2010-07-16',
      overview: 'Dreams.',
      vote_average: 8.368,
    });
    expect(result.tmdbId).toBe(27205);
    expect(result.mediaType).toBe('movie');
    expect(result.posterUrl).toBe('https://image.tmdb.org/t/p/w342/poster.jpg');
    expect(result.posterPath).toBe('/poster.jpg');
    expect(result.releaseYear).toBe(2010);
    expect(result.tmdbRating).toBe(8.4);
  });

  it('survives missing everything', () => {
    const result = normalizeMovieSummary({ id: 1 });
    expect(result.title).toBe('Untitled');
    expect(result.posterUrl).toBeUndefined();
    expect(result.releaseYear).toBeUndefined();
    expect(result.tmdbRating).toBeUndefined();
  });

  it('treats zero ratings as unrated', () => {
    expect(normalizeMovieSummary({ id: 1, vote_average: 0 }).tmdbRating).toBeUndefined();
  });
});

describe('normalizeMulti', () => {
  it('drops person results', () => {
    expect(normalizeMulti({ media_type: 'person', id: 5 })).toBeNull();
    expect(normalizeMulti({ media_type: 'tv', id: 2, name: 'Show' })?.mediaType).toBe('tv');
  });
});

describe('normalizePaged', () => {
  it('filters nulls and keeps pagination', () => {
    const paged = normalizePaged(
      { page: 2, total_pages: 5, total_results: 100, results: [{ media_type: 'person' as const, id: 1 }, { media_type: 'movie' as const, id: 2, title: 'M' }] },
      normalizeMulti,
    );
    expect(paged.page).toBe(2);
    expect(paged.totalPages).toBe(5);
    expect(paged.results).toHaveLength(1);
  });
});

describe('pickTrailerUrl', () => {
  it('prefers official YouTube trailers', () => {
    expect(
      pickTrailerUrl({
        results: [
          { key: 'teaser', site: 'YouTube', type: 'Teaser' },
          { key: 'unofficial', site: 'YouTube', type: 'Trailer', official: false },
          { key: 'official', site: 'YouTube', type: 'Trailer', official: true },
          { key: 'vimeo', site: 'Vimeo', type: 'Trailer', official: true },
        ],
      }),
    ).toBe('https://www.youtube.com/watch?v=official');
  });

  it('falls back to teasers and handles absence', () => {
    expect(pickTrailerUrl({ results: [{ key: 't', site: 'YouTube', type: 'Teaser' }] })).toContain('t');
    expect(pickTrailerUrl({ results: [] })).toBeUndefined();
    expect(pickTrailerUrl(undefined)).toBeUndefined();
  });
});

describe('normalizeMovieDetails', () => {
  const raw: TmdbMovieDetails = {
    id: 1,
    title: 'Movie',
    runtime: 0,
    genres: [{ id: 18, name: 'Drama' }],
    credits: {
      cast: [
        { id: 2, name: 'B Actor', order: 1, character: 'B' },
        { id: 1, name: 'A Actor', order: 0, character: 'A' },
      ],
      crew: [
        { id: 9, name: 'Dir One', job: 'Director', department: 'Directing' },
        { id: 9, name: 'Dir One', job: 'Director', department: 'Directing' },
      ],
    },
    recommendations: {
      page: 1,
      total_pages: 1,
      total_results: 2,
      results: [
        { id: 7, title: 'Rec', poster_path: '/rec.jpg' },
        { id: 8, title: 'No poster' },
      ],
    },
    similar: {
      page: 1,
      total_pages: 1,
      total_results: 1,
      results: [{ id: 7, title: 'Rec duplicate', poster_path: '/rec.jpg' }],
    },
  };

  it('sorts cast, dedupes crew, and dedupes related titles without posters', () => {
    const details = normalizeMovieDetails(raw);
    expect(details.cast[0].name).toBe('A Actor');
    expect(details.directors).toHaveLength(1);
    expect(details.runtimeMinutes).toBeUndefined();
    expect(details.related).toHaveLength(1);
    expect(details.related[0].tmdbId).toBe(7);
  });
});

describe('normalizeTvDetails', () => {
  const raw: TmdbTvDetails = {
    id: 1396,
    name: 'Breaking Bad',
    number_of_seasons: 2,
    episode_run_time: [0, 47],
    created_by: [{ id: 66633, name: 'Vince Gilligan' }],
    seasons: [
      { season_number: 0, name: 'Specials', episode_count: 3 },
      { season_number: 2, name: 'Season 2', episode_count: 13 },
      { season_number: 1, name: 'Season 1', episode_count: 7 },
    ],
  };

  it('excludes specials and sorts seasons', () => {
    const details = normalizeTvDetails(raw);
    expect(details.seasons.map((s) => s.seasonNumber)).toEqual([1, 2]);
    expect(details.episodeRunTimeMinutes).toBe(47);
    expect(details.creators[0].job).toBe('Creator');
  });
});

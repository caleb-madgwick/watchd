/**
 * DEMO FIXTURES — clearly-labelled development data.
 * Served only in `demo` TMDB mode (no API keys configured) so a fresh clone is
 * fully navigable offline. Real TMDB data replaces this the moment a proxy or
 * dev token is configured. Never used in production builds with keys set.
 */

import type {
  TmdbMovieDetails,
  TmdbMovieSummary,
  TmdbPaged,
  TmdbPersonDetails,
  TmdbSeasonDetails,
  TmdbTvDetails,
  TmdbTvSummary,
} from './types';

export const FIXTURE_MOVIES: TmdbMovieSummary[] = [
  { id: 27205, title: 'Inception', poster_path: '/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg', backdrop_path: '/8ZTVqvKDQ8emSGUEMjsS4yHAwrp.jpg', release_date: '2010-07-16', overview: 'A thief who steals corporate secrets through dream-sharing technology is given the inverse task of planting an idea.', vote_average: 8.4, genre_ids: [28, 878, 53] },
  { id: 155, title: 'The Dark Knight', poster_path: '/qJ2tW6WMUDux911r6m7haRef0WH.jpg', backdrop_path: '/hqkIcbrOHL86UncnHIsHVcVmzue.jpg', release_date: '2008-07-16', overview: 'Batman raises the stakes in his war on crime as the Joker plunges Gotham into anarchy.', vote_average: 8.5, genre_ids: [18, 28, 80, 53] },
  { id: 157336, title: 'Interstellar', poster_path: '/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg', backdrop_path: '/pbrkL804c8yAv3zBZR4QPEafpAR.jpg', release_date: '2014-11-05', overview: 'A team of explorers travel through a wormhole in space in an attempt to ensure humanity’s survival.', vote_average: 8.4, genre_ids: [12, 18, 878] },
  { id: 496243, title: 'Parasite', poster_path: '/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg', backdrop_path: '/TU9NIjwzjoKPwQHoHshkFcQUCG.jpg', release_date: '2019-05-30', overview: 'All unemployed, Ki-taek’s family takes peculiar interest in the wealthy Parks, until they get entangled in an unexpected incident.', vote_average: 8.5, genre_ids: [35, 53, 18] },
  { id: 550, title: 'Fight Club', poster_path: '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg', backdrop_path: '/hZkgoQYus5vegHoetLkCJzb17zJ.jpg', release_date: '1999-10-15', overview: 'An insomniac office worker and a devil-may-care soap maker form an underground fight club.', vote_average: 8.4, genre_ids: [18, 53] },
  { id: 680, title: 'Pulp Fiction', poster_path: '/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg', backdrop_path: '/suaEOtk1N1sgg2MTM7oZd2cfVp3.jpg', release_date: '1994-09-10', overview: 'The lives of two mob hitmen, a boxer, a gangster and his wife intertwine in four tales of violence and redemption.', vote_average: 8.5, genre_ids: [53, 80] },
  { id: 603, title: 'The Matrix', poster_path: '/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg', backdrop_path: '/fNG7i7RqMErkcqhohV2a6cV1Ehy.jpg', release_date: '1999-03-31', overview: 'A computer hacker learns about the true nature of reality and his role in the war against its controllers.', vote_average: 8.2, genre_ids: [28, 878] },
  { id: 278, title: 'The Shawshank Redemption', poster_path: '/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg', backdrop_path: '/kXfqcdQKsToO0OUXHcrrNCHDBzO.jpg', release_date: '1994-09-23', overview: 'Imprisoned in the 1940s for the double murder of his wife and her lover, banker Andy Dufresne begins a new life.', vote_average: 8.7, genre_ids: [18, 80] },
  { id: 244786, title: 'Whiplash', poster_path: '/7fn624j5lj3xTme2SgiLCeuedmO.jpg', backdrop_path: '/6bbZ6XyvgfjhQwbplnUh1LSj1ky.jpg', release_date: '2014-10-10', overview: 'A promising young drummer enrolls at a cut-throat music conservatory under an instructor who will stop at nothing.', vote_average: 8.4, genre_ids: [18, 10402] },
  { id: 129, title: 'Spirited Away', poster_path: '/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg', backdrop_path: '/6oaL4DP75yABrd5EbC4H2zq5ghc.jpg', release_date: '2001-07-20', overview: 'A young girl wanders into a world ruled by gods, witches, and spirits, where humans are changed into beasts.', vote_average: 8.5, genre_ids: [16, 10751, 14] },
  { id: 872585, title: 'Oppenheimer', poster_path: '/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg', backdrop_path: '/fm6KqXpk3M2HVveHwCrBSSBaO0V.jpg', release_date: '2023-07-19', overview: 'The story of J. Robert Oppenheimer’s role in the development of the atomic bomb.', vote_average: 8.1, genre_ids: [18, 36] },
  { id: 693134, title: 'Dune: Part Two', poster_path: '/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg', backdrop_path: '/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg', release_date: '2024-02-27', overview: 'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.', vote_average: 8.2, genre_ids: [878, 12] },
];

export const FIXTURE_TV: TmdbTvSummary[] = [
  { id: 1396, name: 'Breaking Bad', poster_path: '/ggFHVNu6YYI5L9pCfOacjizRGt.jpg', backdrop_path: '/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg', first_air_date: '2008-01-20', overview: 'A high school chemistry teacher diagnosed with lung cancer teams up with a former student to secure his family’s future.', vote_average: 8.9, genre_ids: [18, 80] },
  { id: 1399, name: 'Game of Thrones', poster_path: '/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg', backdrop_path: '/2OMB0ynKlyIenMJWI2Dy9IWT4c.jpg', first_air_date: '2011-04-17', overview: 'Seven noble families fight for control of the mythical land of Westeros.', vote_average: 8.4, genre_ids: [10765, 18, 10759] },
  { id: 66732, name: 'Stranger Things', poster_path: '/49WJfeN0moxb9IPfGn8AIqMGskD.jpg', backdrop_path: '/56v2KjBlU4XaOv9rVYEQypROD7P.jpg', first_air_date: '2016-07-15', overview: 'When a young boy vanishes, a small town uncovers a mystery involving secret experiments and supernatural forces.', vote_average: 8.6, genre_ids: [10765, 18, 9648] },
  { id: 95396, name: 'Severance', poster_path: '/lFf6LLrQjYldcZItzOkGmMMigP7.jpg', backdrop_path: '/dZWEvGdBRB2xJJb8T3AlOX8U3wE.jpg', first_air_date: '2022-02-17', overview: 'Mark leads a team whose memories have been surgically divided between their work and personal lives.', vote_average: 8.4, genre_ids: [18, 9648, 878] },
  { id: 76331, name: 'Succession', poster_path: '/7HW47XbkNQ5fiwQFYGWdw9gs144.jpg', backdrop_path: '/zXqCJoDdCe7wnGmoZ4QTvhBhrLS.jpg', first_air_date: '2018-06-03', overview: 'The Roy family controls one of the biggest media and entertainment conglomerates in the world — and it is changing hands.', vote_average: 8.3, genre_ids: [18] },
  { id: 136315, name: 'The Bear', poster_path: '/sHFlbKS3WLqMnp9t2ghADIJFnuQ.jpg', backdrop_path: '/9Nzr7hDlyWyBrJVZKKesnbnyGRp.jpg', first_air_date: '2022-06-23', overview: 'A young chef from the fine dining world returns to Chicago to run his family’s sandwich shop.', vote_average: 8.3, genre_ids: [18, 35] },
];

export const FIXTURE_MOVIE_DETAILS: Record<number, TmdbMovieDetails> = {
  27205: {
    ...FIXTURE_MOVIES[0],
    runtime: 148,
    tagline: 'Your mind is the scene of the crime.',
    status: 'Released',
    genres: [
      { id: 28, name: 'Action' },
      { id: 878, name: 'Science Fiction' },
      { id: 53, name: 'Thriller' },
    ],
    vote_count: 36000,
    credits: {
      cast: [
        { id: 6193, name: 'Leonardo DiCaprio', character: 'Dom Cobb', order: 0, profile_path: null },
        { id: 24045, name: 'Joseph Gordon-Levitt', character: 'Arthur', order: 1, profile_path: null },
        { id: 27578, name: 'Elliot Page', character: 'Ariadne', order: 2, profile_path: null },
        { id: 2524, name: 'Tom Hardy', character: 'Eames', order: 3, profile_path: null },
      ],
      crew: [
        { id: 525, name: 'Christopher Nolan', job: 'Director', department: 'Directing' },
        { id: 525, name: 'Christopher Nolan', job: 'Writer', department: 'Writing' },
        { id: 947, name: 'Hans Zimmer', job: 'Original Music Composer', department: 'Sound' },
      ],
    },
    videos: { results: [{ key: 'YoHD9XEInc0', site: 'YouTube', type: 'Trailer', name: 'Official Trailer', official: true }] },
    recommendations: { page: 1, total_pages: 1, total_results: 4, results: [FIXTURE_MOVIES[1], FIXTURE_MOVIES[2], FIXTURE_MOVIES[6], FIXTURE_MOVIES[4]] },
    'watch/providers': {
      results: {
        AU: {
          link: 'https://www.themoviedb.org/movie/27205/watch?locale=AU',
          flatrate: [
            { provider_id: 8, provider_name: 'Netflix', logo_path: '/pbpMk2JmcoNnQwx5JGpXngfoWtp.jpg', display_priority: 0 },
            { provider_id: 337, provider_name: 'Disney Plus', logo_path: '/97yvRBw1GzX7fXprcF80er19ot.jpg', display_priority: 1 },
          ],
          rent: [
            { provider_id: 2, provider_name: 'Apple TV', logo_path: '/peURlLlr8jggOwK53fJ5wdQl05y.jpg', display_priority: 3 },
          ],
          buy: [
            { provider_id: 2, provider_name: 'Apple TV', logo_path: '/peURlLlr8jggOwK53fJ5wdQl05y.jpg', display_priority: 3 },
          ],
        },
        US: {
          link: 'https://www.themoviedb.org/movie/27205/watch?locale=US',
          flatrate: [
            { provider_id: 9, provider_name: 'Amazon Prime Video', logo_path: '/pvske1MyAoymrs5bguRfVqYiM9a.jpg', display_priority: 0 },
          ],
          buy: [
            { provider_id: 2, provider_name: 'Apple TV', logo_path: '/peURlLlr8jggOwK53fJ5wdQl05y.jpg', display_priority: 3 },
          ],
        },
      },
    },
  },
};

export const FIXTURE_TV_DETAILS: Record<number, TmdbTvDetails> = {
  1396: {
    ...FIXTURE_TV[0],
    tagline: 'Remember my name.',
    status: 'Ended',
    number_of_seasons: 5,
    number_of_episodes: 62,
    episode_run_time: [47],
    created_by: [{ id: 66633, name: 'Vince Gilligan' }],
    genres: [
      { id: 18, name: 'Drama' },
      { id: 80, name: 'Crime' },
    ],
    vote_count: 15000,
    seasons: [
      { season_number: 1, name: 'Season 1', episode_count: 7, air_date: '2008-01-20', poster_path: '/1BP4xYv9ZG4ZVHkL7ocOziBbSYH.jpg' },
      { season_number: 2, name: 'Season 2', episode_count: 13, air_date: '2009-03-08', poster_path: null },
      { season_number: 3, name: 'Season 3', episode_count: 13, air_date: '2010-03-21', poster_path: null },
      { season_number: 4, name: 'Season 4', episode_count: 13, air_date: '2011-07-17', poster_path: null },
      { season_number: 5, name: 'Season 5', episode_count: 16, air_date: '2012-07-15', poster_path: null },
    ],
    credits: {
      cast: [
        { id: 17419, name: 'Bryan Cranston', character: 'Walter White', order: 0, profile_path: null },
        { id: 84497, name: 'Aaron Paul', character: 'Jesse Pinkman', order: 1, profile_path: null },
        { id: 134531, name: 'Anna Gunn', character: 'Skyler White', order: 2, profile_path: null },
      ],
      crew: [],
    },
    videos: { results: [{ key: 'XZ8daibM3AE', site: 'YouTube', type: 'Trailer', name: 'Series Trailer', official: true }] },
    recommendations: { page: 1, total_pages: 1, total_results: 3, results: [FIXTURE_TV[4], FIXTURE_TV[3], FIXTURE_TV[1]] },
    'watch/providers': {
      results: {
        AU: {
          link: 'https://www.themoviedb.org/tv/1396/watch?locale=AU',
          flatrate: [
            { provider_id: 8, provider_name: 'Netflix', logo_path: '/pbpMk2JmcoNnQwx5JGpXngfoWtp.jpg', display_priority: 0 },
          ],
        },
        US: {
          link: 'https://www.themoviedb.org/tv/1396/watch?locale=US',
          flatrate: [
            { provider_id: 8, provider_name: 'Netflix', logo_path: '/pbpMk2JmcoNnQwx5JGpXngfoWtp.jpg', display_priority: 0 },
          ],
        },
      },
    },
  },
};

export const FIXTURE_SEASON: TmdbSeasonDetails = {
  season_number: 1,
  name: 'Season 1',
  overview: 'The first season introduces Walter White, a chemistry teacher with a terminal diagnosis and a dangerous new trade.',
  air_date: '2008-01-20',
  episodes: [
    { episode_number: 1, name: 'Pilot', overview: 'Walter White, a struggling high school chemistry teacher, is diagnosed with lung cancer.', air_date: '2008-01-20', runtime: 58 },
    { episode_number: 2, name: "Cat's in the Bag...", overview: 'Walt and Jesse attempt to dispose of the evidence.', air_date: '2008-01-27', runtime: 48 },
    { episode_number: 3, name: '...And the Bag’s in the River', overview: 'Walt faces a moral decision he cannot delegate.', air_date: '2008-02-10', runtime: 48 },
    { episode_number: 4, name: 'Cancer Man', overview: 'Walt tells the rest of the family about his diagnosis.', air_date: '2008-02-17', runtime: 48 },
    { episode_number: 5, name: 'Gray Matter', overview: 'Walt rejects an offer that could pay for everything.', air_date: '2008-02-24', runtime: 48 },
    { episode_number: 6, name: "Crazy Handful of Nothin'", overview: 'Walt adopts a new identity: Heisenberg.', air_date: '2008-03-02', runtime: 48 },
    { episode_number: 7, name: 'A No-Rough-Stuff-Type Deal', overview: 'Walt and Jesse expand into distribution.', air_date: '2008-03-09', runtime: 48 },
  ],
};

export const FIXTURE_PERSON: TmdbPersonDetails = {
  id: 525,
  name: 'Christopher Nolan',
  known_for_department: 'Directing',
  biography:
    'Christopher Nolan is a British-American filmmaker known for his cerebral, often nonlinear storytelling. (Demo data — connect TMDB for live information.)',
  combined_credits: {
    cast: FIXTURE_MOVIES.slice(0, 3).map((m) => ({ ...m, media_type: 'movie' as const })),
  },
};

export function paged<T>(results: T[], page = 1): TmdbPaged<T> {
  return { page, results, total_pages: 1, total_results: results.length };
}

/**
 * Raw TMDB API response shapes (the subset Video Club consumes).
 * These types never leave src/lib/tmdb — normalize.ts converts them into
 * domain models at the trust boundary.
 */

export interface TmdbPaged<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

export interface TmdbMovieSummary {
  id: number;
  title?: string;
  original_title?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string | null;
  overview?: string | null;
  vote_average?: number | null;
  vote_count?: number | null;
  genre_ids?: number[];
}

export interface TmdbTvSummary {
  id: number;
  name?: string;
  original_name?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  first_air_date?: string | null;
  overview?: string | null;
  vote_average?: number | null;
  vote_count?: number | null;
  genre_ids?: number[];
}

export type TmdbMultiResult =
  | (TmdbMovieSummary & { media_type: 'movie' })
  | (TmdbTvSummary & { media_type: 'tv' })
  | { media_type: 'person'; id: number; name?: string };

export interface TmdbGenre {
  id: number;
  name: string;
}

export interface TmdbCastMember {
  id: number;
  name?: string;
  character?: string | null;
  profile_path?: string | null;
  order?: number;
}

export interface TmdbCrewMember {
  id: number;
  name?: string;
  job?: string | null;
  department?: string | null;
}

export interface TmdbVideo {
  key?: string;
  site?: string;
  type?: string;
  name?: string;
  official?: boolean;
}

export interface TmdbCredits {
  cast?: TmdbCastMember[];
  crew?: TmdbCrewMember[];
}

export interface TmdbWatchProvider {
  provider_id: number;
  provider_name?: string;
  logo_path?: string | null;
  display_priority?: number;
}

export interface TmdbWatchCountry {
  /** JustWatch-powered TMDB "where to watch" page for this title/region. */
  link?: string;
  /** Subscription/streaming providers. */
  flatrate?: TmdbWatchProvider[];
  rent?: TmdbWatchProvider[];
  buy?: TmdbWatchProvider[];
  free?: TmdbWatchProvider[];
  ads?: TmdbWatchProvider[];
}

/** Shape of the `watch/providers` append; results keyed by ISO-3166-1 code. */
export interface TmdbWatchProviders {
  results?: Record<string, TmdbWatchCountry>;
}

export interface TmdbMovieDetails extends TmdbMovieSummary {
  runtime?: number | null;
  tagline?: string | null;
  status?: string | null;
  genres?: TmdbGenre[];
  credits?: TmdbCredits;
  videos?: { results?: TmdbVideo[] };
  recommendations?: TmdbPaged<TmdbMovieSummary>;
  similar?: TmdbPaged<TmdbMovieSummary>;
  'watch/providers'?: TmdbWatchProviders;
}

export interface TmdbSeasonSummary {
  season_number?: number;
  name?: string | null;
  episode_count?: number;
  poster_path?: string | null;
  air_date?: string | null;
  overview?: string | null;
}

export interface TmdbTvDetails extends TmdbTvSummary {
  tagline?: string | null;
  status?: string | null;
  number_of_seasons?: number;
  number_of_episodes?: number;
  episode_run_time?: number[];
  created_by?: { id: number; name?: string }[];
  seasons?: TmdbSeasonSummary[];
  genres?: TmdbGenre[];
  credits?: TmdbCredits;
  videos?: { results?: TmdbVideo[] };
  recommendations?: TmdbPaged<TmdbTvSummary>;
  similar?: TmdbPaged<TmdbTvSummary>;
  'watch/providers'?: TmdbWatchProviders;
}

export interface TmdbEpisode {
  episode_number?: number;
  name?: string | null;
  overview?: string | null;
  air_date?: string | null;
  still_path?: string | null;
  runtime?: number | null;
}

export interface TmdbSeasonDetails {
  season_number?: number;
  name?: string | null;
  overview?: string | null;
  poster_path?: string | null;
  air_date?: string | null;
  episodes?: TmdbEpisode[];
}

export interface TmdbPersonDetails {
  id: number;
  name?: string;
  profile_path?: string | null;
  biography?: string | null;
  known_for_department?: string | null;
  combined_credits?: {
    cast?: (TmdbMultiResult & { popularity?: number })[];
  };
}

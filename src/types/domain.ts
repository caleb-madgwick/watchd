/**
 * Internal domain models. TMDB and Supabase payloads are normalised into these
 * at the trust boundary — UI code never consumes raw API shapes.
 */

export type MediaType = 'movie' | 'tv';

export interface TitleSummary {
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  originalTitle?: string;
  posterUrl?: string;
  backdropUrl?: string;
  /** Raw TMDB image paths ("/abc.jpg") — stored in the titles reference table. */
  posterPath?: string;
  backdropPath?: string;
  releaseYear?: number;
  releaseDate?: string;
  overview?: string;
  /** TMDB community average, 0–10 scale. Label as external wherever shown. */
  tmdbRating?: number;
}

export interface Genre {
  id: number;
  name: string;
}

export interface CastMember {
  id: number;
  name: string;
  character?: string;
  profileUrl?: string;
}

export interface CrewMember {
  id: number;
  name: string;
  job: string;
}

export interface WatchProvider {
  id: number;
  name: string;
  logoUrl?: string;
  /**
   * Reserved for Tier 2: a direct deep link into the service on this exact
   * title. Populated only by a future deep-link source (Watchmode, etc.);
   * always undefined for TMDB-sourced data.
   */
  deepLink?: string;
}

export type WatchOfferKind = 'stream' | 'rent' | 'buy' | 'free' | 'ads';

export interface RegionWatchOffers {
  /** JustWatch-powered "where to watch" page for this title in this region. */
  link?: string;
  offers: Partial<Record<WatchOfferKind, WatchProvider[]>>;
}

/** Streaming availability keyed by ISO-3166-1 country code, e.g. "AU", "US". */
export type WatchAvailability = Record<string, RegionWatchOffers>;

export interface MovieDetails extends TitleSummary {
  mediaType: 'movie';
  tagline?: string;
  runtimeMinutes?: number;
  genres: Genre[];
  tmdbVoteCount?: number;
  directors: CrewMember[];
  keyCrew: CrewMember[];
  cast: CastMember[];
  trailerUrl?: string;
  related: TitleSummary[];
  /** Where to watch, by country. Undefined when TMDB has no provider data. */
  watch?: WatchAvailability;
}

export interface SeasonSummary {
  seasonNumber: number;
  name: string;
  episodeCount: number;
  posterUrl?: string;
  airYear?: number;
  overview?: string;
}

export interface TvDetails extends TitleSummary {
  mediaType: 'tv';
  tagline?: string;
  status?: string;
  genres: Genre[];
  tmdbVoteCount?: number;
  creators: CrewMember[];
  cast: CastMember[];
  numberOfSeasons?: number;
  numberOfEpisodes?: number;
  /** Regular seasons only (specials excluded from progress maths). */
  seasons: SeasonSummary[];
  episodeRunTimeMinutes?: number;
  trailerUrl?: string;
  related: TitleSummary[];
  /** Where to watch, by country. Undefined when TMDB has no provider data. */
  watch?: WatchAvailability;
}

export type TitleDetails = MovieDetails | TvDetails;

export interface EpisodeSummary {
  episodeNumber: number;
  name: string;
  overview?: string;
  airDate?: string;
  stillUrl?: string;
  runtimeMinutes?: number;
}

export interface SeasonDetails {
  seasonNumber: number;
  name: string;
  overview?: string;
  posterUrl?: string;
  airYear?: number;
  episodes: EpisodeSummary[];
}

export interface PersonDetails {
  id: number;
  name: string;
  profileUrl?: string;
  biography?: string;
  knownForDepartment?: string;
  credits: TitleSummary[];
}

export interface Paginated<T> {
  page: number;
  totalPages: number;
  totalResults: number;
  results: T[];
}

/** Personal tracking status for a title. */
export type WatchStatus = 'watchlist' | 'watching' | 'watched' | 'paused' | 'dropped';

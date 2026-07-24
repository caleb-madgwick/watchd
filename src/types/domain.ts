/**
 * Internal domain models. TMDB and Supabase payloads are normalised into these
 * at the trust boundary — UI code never consumes raw API shapes.
 */

export type MediaType = 'movie' | 'tv' | 'book' | 'artist' | 'album' | 'song';

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
  status?: string;
  /** ISO 639-1 language code, e.g. "en". */
  originalLanguage?: string;
  /** USD, only when TMDB reports a non-zero figure. */
  budget?: number;
  revenue?: number;
  studios?: string[];
  countries?: string[];
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
  /** ISO 639-1 language code, e.g. "en". */
  originalLanguage?: string;
  /** "2013-09-29" — the most recent episode TMDB knows about. */
  lastAirDate?: string;
  networks?: string[];
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

/**
 * Books have a Google Books volume id (string) rather than a numeric TMDB id, so
 * BookSummary/BookDetails are their own shapes (not extending TitleSummary).
 */
export interface BookSummary {
  volumeId: string;
  mediaType: 'book';
  title: string;
  subtitle?: string;
  authors: string[];
  coverUrl?: string;
  publishedYear?: number;
  publishedDate?: string;
  isbn13?: string;
  /** Google Books community average, 0–5. Label as external where shown. */
  averageRating?: number;
}

export interface BookEdition {
  isbn13?: string;
  publisher?: string;
  publishedYear?: number;
  coverUrl?: string;
}

export interface BookDetails extends BookSummary {
  description?: string;
  publisher?: string;
  pageCount?: number;
  categories: string[];
  language?: string;
  openLibraryWorkId?: string;
  editions?: BookEdition[];
  alternativeCoverUrls?: string[];
  firstPublishedYear?: number;
}

/**
 * Music (MusicBrainz + Cover Art Archive). Like books, music entities carry a
 * string id — a MusicBrainz MBID — rather than a numeric TMDB id, so they are
 * their own shapes and do not extend TitleSummary. Artwork is a full https URL
 * (Cover Art Archive), stored in titles.cover_url.
 */
export type MusicItemType = 'artist' | 'album' | 'song';

export type AlbumKind = 'album' | 'single' | 'ep' | 'compilation' | 'other';

export interface ArtistSummary {
  /** MusicBrainz artist MBID. */
  musicBrainzId: string;
  mediaType: 'artist';
  name: string;
  disambiguation?: string;
  /** ISO 3166-1 alpha-2, e.g. "NZ". */
  country?: string;
  /** Artists rarely have licensed art; usually a branded placeholder is shown. */
  imageUrl?: string;
}

export interface AlbumSummary {
  /** MusicBrainz release-group MBID. */
  musicBrainzId: string;
  mediaType: 'album';
  title: string;
  artistNames: string[];
  /** Pre-joined artist credit line for display, e.g. "Lorde". */
  artistCredit?: string;
  coverUrl?: string;
  releaseYear?: number;
  releaseDate?: string;
  albumType?: AlbumKind;
}

export interface SongSummary {
  /** MusicBrainz recording MBID. */
  musicBrainzId: string;
  mediaType: 'song';
  title: string;
  artistNames: string[];
  artistCredit?: string;
  durationMs?: number;
  coverUrl?: string;
  album?: AlbumSummary;
}

export interface TrackSummary {
  position: number;
  discNumber?: number;
  title: string;
  song: SongSummary;
  durationMs?: number;
}

export interface ArtistCredit {
  musicBrainzId: string;
  name: string;
  creditName?: string;
}

export interface AlbumDetails extends AlbumSummary {
  artists: ArtistCredit[];
  secondaryTypes?: string[];
  trackCount?: number;
  totalDurationMs?: number;
  tracks: TrackSummary[];
}

export interface ArtistReleaseGroups {
  albums: AlbumSummary[];
  eps: AlbumSummary[];
  singles: AlbumSummary[];
  compilations: AlbumSummary[];
}

export interface ArtistDetails extends ArtistSummary {
  releaseGroups: ArtistReleaseGroups;
  /** Highlighted releases for the top of the artist page. */
  topAlbums: AlbumSummary[];
}

export interface SongDetails extends SongSummary {
  isrc?: string;
  trackNumber?: number;
}

/** Any music entity surfaced in search/cards. */
export type MusicSummary = ArtistSummary | AlbumSummary | SongSummary;

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

/**
 * TMDB → domain model normalisation. All nullable/undocumented fields are
 * handled here so the UI can rely on clean shapes.
 */

import { backdropUrl, logoUrl, posterUrl, profileUrl, stillUrl } from './images';
import type {
  TmdbCredits,
  TmdbMovieDetails,
  TmdbMovieSummary,
  TmdbMultiResult,
  TmdbPaged,
  TmdbPersonDetails,
  TmdbSeasonDetails,
  TmdbSeasonSummary,
  TmdbTvDetails,
  TmdbTvSummary,
  TmdbVideo,
  TmdbWatchCountry,
  TmdbWatchProvider,
  TmdbWatchProviders,
} from './types';
import type {
  CastMember,
  CrewMember,
  MovieDetails,
  Paginated,
  PersonDetails,
  RegionWatchOffers,
  SeasonDetails,
  SeasonSummary,
  TitleSummary,
  TvDetails,
  WatchAvailability,
  WatchOfferKind,
  WatchProvider,
} from '@/types/domain';
import { yearFromDate } from '@/utils/titles';

function cleanRating(value: number | null | undefined): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return undefined;
  return Math.round(value * 10) / 10;
}

export function normalizeMovieSummary(raw: TmdbMovieSummary): TitleSummary {
  return {
    tmdbId: raw.id,
    mediaType: 'movie',
    title: raw.title?.trim() || raw.original_title?.trim() || 'Untitled',
    originalTitle: raw.original_title ?? undefined,
    posterUrl: posterUrl(raw.poster_path),
    backdropUrl: backdropUrl(raw.backdrop_path),
    posterPath: raw.poster_path ?? undefined,
    backdropPath: raw.backdrop_path ?? undefined,
    releaseYear: yearFromDate(raw.release_date),
    releaseDate: raw.release_date ?? undefined,
    overview: raw.overview?.trim() || undefined,
    tmdbRating: cleanRating(raw.vote_average),
  };
}

export function normalizeTvSummary(raw: TmdbTvSummary): TitleSummary {
  return {
    tmdbId: raw.id,
    mediaType: 'tv',
    title: raw.name?.trim() || raw.original_name?.trim() || 'Untitled',
    originalTitle: raw.original_name ?? undefined,
    posterUrl: posterUrl(raw.poster_path),
    backdropUrl: backdropUrl(raw.backdrop_path),
    posterPath: raw.poster_path ?? undefined,
    backdropPath: raw.backdrop_path ?? undefined,
    releaseYear: yearFromDate(raw.first_air_date),
    releaseDate: raw.first_air_date ?? undefined,
    overview: raw.overview?.trim() || undefined,
    tmdbRating: cleanRating(raw.vote_average),
  };
}

export function normalizeMulti(raw: TmdbMultiResult): TitleSummary | null {
  if (raw.media_type === 'movie') return normalizeMovieSummary(raw);
  if (raw.media_type === 'tv') return normalizeTvSummary(raw);
  return null;
}

export function normalizePaged<Raw, Out>(
  raw: TmdbPaged<Raw>,
  map: (item: Raw) => Out | null,
): Paginated<NonNullable<Out>> {
  return {
    page: raw.page ?? 1,
    totalPages: raw.total_pages ?? 1,
    totalResults: raw.total_results ?? raw.results?.length ?? 0,
    results: (raw.results ?? [])
      .map(map)
      .filter((item): item is NonNullable<Out> => item != null),
  };
}

function normalizeCast(credits: TmdbCredits | undefined, limit = 12): CastMember[] {
  return (credits?.cast ?? [])
    .slice()
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
    .slice(0, limit)
    .filter((c) => c.name)
    .map((c) => ({
      id: c.id,
      name: c.name as string,
      character: c.character?.trim() || undefined,
      profileUrl: profileUrl(c.profile_path),
    }));
}

function crewByJobs(credits: TmdbCredits | undefined, jobs: string[]): CrewMember[] {
  const seen = new Set<string>();
  return (credits?.crew ?? [])
    .filter((c) => c.name && c.job && jobs.includes(c.job))
    .filter((c) => {
      const key = `${c.id}-${c.job}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((c) => ({ id: c.id, name: c.name as string, job: c.job as string }));
}

export function pickTrailerUrl(videos: { results?: TmdbVideo[] } | undefined): string | undefined {
  const list = (videos?.results ?? []).filter((v) => v.site === 'YouTube' && v.key);
  const ranked =
    list.find((v) => v.type === 'Trailer' && v.official) ??
    list.find((v) => v.type === 'Trailer') ??
    list.find((v) => v.type === 'Teaser');
  return ranked?.key ? `https://www.youtube.com/watch?v=${ranked.key}` : undefined;
}

function mergeRelated<Raw>(
  recommendations: TmdbPaged<Raw> | undefined,
  similar: TmdbPaged<Raw> | undefined,
  map: (item: Raw) => TitleSummary,
  limit = 12,
): TitleSummary[] {
  const combined = [...(recommendations?.results ?? []), ...(similar?.results ?? [])].map(map);
  const seen = new Set<number>();
  const out: TitleSummary[] = [];
  for (const item of combined) {
    if (seen.has(item.tmdbId)) continue;
    seen.add(item.tmdbId);
    if (item.posterUrl) out.push(item);
    if (out.length >= limit) break;
  }
  return out;
}

/** TMDB group key → domain offer kind. `flatrate` is TMDB's term for streaming. */
const OFFER_KINDS: { tmdbKey: keyof TmdbWatchCountry; kind: WatchOfferKind }[] = [
  { tmdbKey: 'flatrate', kind: 'stream' },
  { tmdbKey: 'free', kind: 'free' },
  { tmdbKey: 'ads', kind: 'ads' },
  { tmdbKey: 'rent', kind: 'rent' },
  { tmdbKey: 'buy', kind: 'buy' },
];

function normalizeProviderList(list: TmdbWatchProvider[] | undefined): WatchProvider[] {
  return (list ?? [])
    .slice()
    // JustWatch's terms require preserving their ordering.
    .sort((a, b) => (a.display_priority ?? 999) - (b.display_priority ?? 999))
    .filter((p) => p.provider_name)
    .map((p) => ({
      id: p.provider_id,
      name: p.provider_name as string,
      logoUrl: logoUrl(p.logo_path),
      // deepLink intentionally omitted — reserved for a future deep-link source.
    }));
}

/**
 * Normalise the `watch/providers` append into region-keyed availability.
 * TMDB returns every country in one payload, so region switching is a pure
 * client-side lookup — no refetch needed.
 */
export function normalizeWatchProviders(
  raw: TmdbWatchProviders | undefined,
): WatchAvailability | undefined {
  const results = raw?.results;
  if (!results) return undefined;

  const availability: WatchAvailability = {};
  for (const [region, country] of Object.entries(results)) {
    const offers: RegionWatchOffers['offers'] = {};
    for (const { tmdbKey, kind } of OFFER_KINDS) {
      const providers = normalizeProviderList(country[tmdbKey] as TmdbWatchProvider[] | undefined);
      if (providers.length > 0) offers[kind] = providers;
    }
    // Skip regions with a bare link but no actual offers.
    if (Object.keys(offers).length === 0) continue;
    availability[region] = { link: country.link?.trim() || undefined, offers };
  }

  return Object.keys(availability).length > 0 ? availability : undefined;
}

export function normalizeMovieDetails(raw: TmdbMovieDetails): MovieDetails {
  return {
    ...normalizeMovieSummary(raw),
    mediaType: 'movie',
    tagline: raw.tagline?.trim() || undefined,
    runtimeMinutes: raw.runtime && raw.runtime > 0 ? raw.runtime : undefined,
    genres: (raw.genres ?? []).filter((g) => g.name),
    tmdbVoteCount: raw.vote_count ?? undefined,
    directors: crewByJobs(raw.credits, ['Director']),
    keyCrew: crewByJobs(raw.credits, ['Screenplay', 'Writer', 'Director of Photography', 'Original Music Composer']).slice(0, 4),
    cast: normalizeCast(raw.credits),
    trailerUrl: pickTrailerUrl(raw.videos),
    related: mergeRelated(raw.recommendations, raw.similar, normalizeMovieSummary),
    watch: normalizeWatchProviders(raw['watch/providers']),
  };
}

export function normalizeSeasonSummary(raw: TmdbSeasonSummary): SeasonSummary {
  return {
    seasonNumber: raw.season_number ?? 0,
    name: raw.name?.trim() || `Season ${raw.season_number ?? 0}`,
    episodeCount: raw.episode_count ?? 0,
    posterUrl: posterUrl(raw.poster_path, 'w185'),
    airYear: yearFromDate(raw.air_date),
    overview: raw.overview?.trim() || undefined,
  };
}

export function normalizeTvDetails(raw: TmdbTvDetails): TvDetails {
  const seasons = (raw.seasons ?? [])
    .map(normalizeSeasonSummary)
    // Specials (season 0) are excluded from progress tracking.
    .filter((s) => s.seasonNumber > 0)
    .sort((a, b) => a.seasonNumber - b.seasonNumber);

  return {
    ...normalizeTvSummary(raw),
    mediaType: 'tv',
    tagline: raw.tagline?.trim() || undefined,
    status: raw.status?.trim() || undefined,
    genres: (raw.genres ?? []).filter((g) => g.name),
    tmdbVoteCount: raw.vote_count ?? undefined,
    creators: (raw.created_by ?? [])
      .filter((c) => c.name)
      .map((c) => ({ id: c.id, name: c.name as string, job: 'Creator' })),
    cast: normalizeCast(raw.credits),
    numberOfSeasons: raw.number_of_seasons ?? (seasons.length || undefined),
    numberOfEpisodes: raw.number_of_episodes ?? undefined,
    seasons,
    episodeRunTimeMinutes: raw.episode_run_time?.find((r) => r > 0),
    trailerUrl: pickTrailerUrl(raw.videos),
    related: mergeRelated(raw.recommendations, raw.similar, normalizeTvSummary),
    watch: normalizeWatchProviders(raw['watch/providers']),
  };
}

export function normalizeSeasonDetails(raw: TmdbSeasonDetails): SeasonDetails {
  return {
    seasonNumber: raw.season_number ?? 0,
    name: raw.name?.trim() || `Season ${raw.season_number ?? 0}`,
    overview: raw.overview?.trim() || undefined,
    posterUrl: posterUrl(raw.poster_path, 'w185'),
    airYear: yearFromDate(raw.air_date),
    episodes: (raw.episodes ?? []).map((e) => ({
      episodeNumber: e.episode_number ?? 0,
      name: e.name?.trim() || `Episode ${e.episode_number ?? 0}`,
      overview: e.overview?.trim() || undefined,
      airDate: e.air_date ?? undefined,
      stillUrl: stillUrl(e.still_path),
      runtimeMinutes: e.runtime && e.runtime > 0 ? e.runtime : undefined,
    })),
  };
}

export function normalizePersonDetails(raw: TmdbPersonDetails): PersonDetails {
  const credits = (raw.combined_credits?.cast ?? [])
    .map((c) => normalizeMulti(c))
    .filter((c): c is TitleSummary => c != null && !!c.posterUrl);
  const seen = new Set<string>();
  const unique = credits.filter((c) => {
    const key = `${c.mediaType}-${c.tmdbId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return {
    id: raw.id,
    name: raw.name?.trim() || 'Unknown',
    profileUrl: profileUrl(raw.profile_path, 'h632'),
    biography: raw.biography?.trim() || undefined,
    knownForDepartment: raw.known_for_department ?? undefined,
    credits: unique.slice(0, 24),
  };
}

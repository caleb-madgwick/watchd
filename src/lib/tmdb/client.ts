/**
 * Typed TMDB client. Every method returns normalised domain models — raw TMDB
 * shapes never escape this module.
 */

import {
  normalizeMovieDetails,
  normalizeMovieSummary,
  normalizeMulti,
  normalizePaged,
  normalizePersonDetails,
  normalizeSeasonDetails,
  normalizeTvDetails,
  normalizeTvSummary,
} from './normalize';
import { fetchTmdb } from './transport';
import type {
  TmdbMovieDetails,
  TmdbMovieSummary,
  TmdbMultiResult,
  TmdbPaged,
  TmdbPersonDetails,
  TmdbSeasonDetails,
  TmdbTvDetails,
  TmdbTvSummary,
} from './types';
import type {
  MovieDetails,
  Paginated,
  PersonDetails,
  SeasonDetails,
  TitleSummary,
  TvDetails,
} from '@/types/domain';

export const tmdb = {
  async trendingMovies(page = 1): Promise<Paginated<TitleSummary>> {
    const raw = await fetchTmdb<TmdbPaged<TmdbMovieSummary>>('/trending/movie/week', { page });
    return normalizePaged(raw, normalizeMovieSummary);
  },

  async trendingTv(page = 1): Promise<Paginated<TitleSummary>> {
    const raw = await fetchTmdb<TmdbPaged<TmdbTvSummary>>('/trending/tv/week', { page });
    return normalizePaged(raw, normalizeTvSummary);
  },

  async popularMovies(page = 1): Promise<Paginated<TitleSummary>> {
    const raw = await fetchTmdb<TmdbPaged<TmdbMovieSummary>>('/movie/popular', { page });
    return normalizePaged(raw, normalizeMovieSummary);
  },

  async popularTv(page = 1): Promise<Paginated<TitleSummary>> {
    const raw = await fetchTmdb<TmdbPaged<TmdbTvSummary>>('/tv/popular', { page });
    return normalizePaged(raw, normalizeTvSummary);
  },

  async topRatedMovies(page = 1): Promise<Paginated<TitleSummary>> {
    const raw = await fetchTmdb<TmdbPaged<TmdbMovieSummary>>('/movie/top_rated', { page });
    return normalizePaged(raw, normalizeMovieSummary);
  },

  async topRatedTv(page = 1): Promise<Paginated<TitleSummary>> {
    const raw = await fetchTmdb<TmdbPaged<TmdbTvSummary>>('/tv/top_rated', { page });
    return normalizePaged(raw, normalizeTvSummary);
  },

  async searchMovies(query: string, page = 1): Promise<Paginated<TitleSummary>> {
    const raw = await fetchTmdb<TmdbPaged<TmdbMovieSummary>>('/search/movie', { query, page });
    return normalizePaged(raw, normalizeMovieSummary);
  },

  async searchTv(query: string, page = 1): Promise<Paginated<TitleSummary>> {
    const raw = await fetchTmdb<TmdbPaged<TmdbTvSummary>>('/search/tv', { query, page });
    return normalizePaged(raw, normalizeTvSummary);
  },

  async searchMulti(query: string, page = 1): Promise<Paginated<TitleSummary>> {
    const raw = await fetchTmdb<TmdbPaged<TmdbMultiResult>>('/search/multi', { query, page });
    return normalizePaged(raw, normalizeMulti);
  },

  async movieDetails(tmdbId: number): Promise<MovieDetails> {
    const raw = await fetchTmdb<TmdbMovieDetails>(`/movie/${tmdbId}`, {
      append_to_response: 'credits,videos,recommendations,similar',
    });
    return normalizeMovieDetails(raw);
  },

  async tvDetails(tmdbId: number): Promise<TvDetails> {
    const raw = await fetchTmdb<TmdbTvDetails>(`/tv/${tmdbId}`, {
      append_to_response: 'credits,videos,recommendations,similar',
    });
    return normalizeTvDetails(raw);
  },

  async seasonDetails(tvId: number, seasonNumber: number): Promise<SeasonDetails> {
    const raw = await fetchTmdb<TmdbSeasonDetails>(`/tv/${tvId}/season/${seasonNumber}`);
    return normalizeSeasonDetails(raw);
  },

  async personDetails(personId: number): Promise<PersonDetails> {
    const raw = await fetchTmdb<TmdbPersonDetails>(`/person/${personId}`, {
      append_to_response: 'combined_credits',
    });
    return normalizePersonDetails(raw);
  },

  /** Genre-based suggestions for the home screen (simple by design for MVP). */
  async discoverByGenres(
    mediaType: 'movie' | 'tv',
    genreIds: number[],
    page = 1,
  ): Promise<Paginated<TitleSummary>> {
    const params = {
      with_genres: genreIds.slice(0, 3).join(','),
      sort_by: 'popularity.desc',
      page,
    };
    if (mediaType === 'movie') {
      const raw = await fetchTmdb<TmdbPaged<TmdbMovieSummary>>('/discover/movie', params);
      return normalizePaged(raw, normalizeMovieSummary);
    }
    const raw = await fetchTmdb<TmdbPaged<TmdbTvSummary>>('/discover/tv', params);
    return normalizePaged(raw, normalizeTvSummary);
  },
};

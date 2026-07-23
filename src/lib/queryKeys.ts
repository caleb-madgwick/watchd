/**
 * Single source of truth for TanStack Query keys — keeps invalidation rules
 * consistent across features.
 */

import type { MediaType } from '@/types/domain';

export const queryKeys = {
  // TMDB (external metadata)
  trending: (mediaType: MediaType) => ['tmdb', 'trending', mediaType] as const,
  popular: (mediaType: MediaType) => ['tmdb', 'popular', mediaType] as const,
  discover: (mediaType: MediaType, genreIds: number[]) =>
    ['tmdb', 'discover', mediaType, genreIds.join(',')] as const,
  search: (scope: string, query: string) => ['tmdb', 'search', scope, query] as const,
  titleDetails: (mediaType: MediaType, tmdbId: number) =>
    ['tmdb', 'details', mediaType, tmdbId] as const,
  season: (tvId: number, seasonNumber: number) => ['tmdb', 'season', tvId, seasonNumber] as const,
  person: (personId: number) => ['tmdb', 'person', personId] as const,

  // Supabase (app data)
  profile: (username: string) => ['profile', username.toLowerCase()] as const,
  profileById: (userId: string) => ['profileById', userId] as const,
  userSearch: (query: string) => ['userSearch', query] as const,
  titleStatus: (userId: string, mediaType: MediaType, tmdbId: number) =>
    ['titleStatus', userId, mediaType, tmdbId] as const,
  communitySummary: (mediaType: MediaType, tmdbId: number) =>
    ['communitySummary', mediaType, tmdbId] as const,
  titleReviews: (mediaType: MediaType, tmdbId: number) =>
    ['titleReviews', mediaType, tmdbId] as const,
  review: (reviewId: string) => ['review', reviewId] as const,
  userReviews: (userId: string) => ['userReviews', userId] as const,
  myStatuses: (userId: string, statuses: string[]) =>
    ['myStatuses', userId, statuses.join(',')] as const,
  watchlist: (userId: string) => ['watchlist', userId] as const,
  diary: (userId: string) => ['diary', userId] as const,
  tvProgress: (userId: string, tmdbId?: number) =>
    tmdbId === undefined ? (['tvProgress', userId] as const) : (['tvProgress', userId, tmdbId] as const),
  continueWatching: (userId: string) => ['continueWatching', userId] as const,
  feed: () => ['feed'] as const,
  followers: (userId: string) => ['followers', userId] as const,
  following: (userId: string) => ['following', userId] as const,
  followState: (targetUserId: string) => ['followState', targetUserId] as const,
  lists: (userId: string) => ['lists', userId] as const,
  list: (listId: string) => ['list', listId] as const,
  listItems: (listId: string) => ['listItems', listId] as const,
  listMembership: (userId: string, mediaType: MediaType, tmdbId: number) =>
    ['listMembership', userId, mediaType, tmdbId] as const,
  favourites: (userId: string) => ['favourites', userId] as const,
  userActivity: (userId: string) => ['userActivity', userId] as const,
  recentReviewsFromFollows: (userId: string) => ['recentReviewsFromFollows', userId] as const,
} as const;

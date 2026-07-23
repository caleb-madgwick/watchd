import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryKeys';
import { supabase } from '@/lib/supabase/client';
import { avatarPublicUrl } from '@/lib/supabase/storage';
import { tmdb } from '@/lib/tmdb/client';
import type { Paginated, TitleSummary } from '@/types/domain';

export type SearchScope = 'all' | 'movie' | 'tv';

const MIN_QUERY_LENGTH = 2;

export function useTitleSearch(scope: SearchScope, query: string) {
  const clean = query.trim();
  return useInfiniteQuery({
    queryKey: queryKeys.search(scope, clean.toLowerCase()),
    enabled: clean.length >= MIN_QUERY_LENGTH,
    staleTime: 5 * 60_000,
    initialPageParam: 1,
    queryFn: async ({ pageParam }): Promise<Paginated<TitleSummary>> => {
      if (scope === 'movie') return tmdb.searchMovies(clean, pageParam);
      if (scope === 'tv') return tmdb.searchTv(clean, pageParam);
      return tmdb.searchMulti(clean, pageParam);
    },
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
  });
}

export interface UserSearchResult {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio: string;
  followerCount: number;
}

export function useUserSearch(query: string) {
  const clean = query.trim().replace(/^@/, '');
  return useQuery({
    queryKey: queryKeys.userSearch(clean.toLowerCase()),
    enabled: clean.length >= MIN_QUERY_LENGTH && !!supabase,
    staleTime: 60_000,
    queryFn: async (): Promise<UserSearchResult[]> => {
      // Escape LIKE wildcards in user input before building the pattern.
      const escaped = clean.replace(/[%_\\]/g, (m) => `\\${m}`);
      const { data, error } = await supabase!
        .from('profiles')
        .select('id, username, display_name, avatar_path, bio, follower_count')
        .or(`username.ilike.%${escaped}%,display_name.ilike.%${escaped}%`)
        .eq('onboarding_completed', true)
        .order('follower_count', { ascending: false })
        .limit(20);
      if (error) throw new Error(error.message);
      return (data ?? []).map((row) => ({
        id: row.id,
        username: row.username,
        displayName: row.display_name?.trim() || row.username,
        avatarUrl: avatarPublicUrl(row.avatar_path),
        bio: row.bio ?? '',
        followerCount: row.follower_count,
      }));
    },
  });
}

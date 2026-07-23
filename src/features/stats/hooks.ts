import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryKeys';
import { supabase } from '@/lib/supabase/client';
import type { UserStats } from '@/types/database';

/** Aggregated viewing stats for a user, all-time (year=null) or for one year. */
export function useUserStats(userId: string | null | undefined, year: number | null) {
  return useQuery({
    queryKey: queryKeys.userStats(userId ?? 'anon', year),
    enabled: !!userId && !!supabase,
    staleTime: 60_000,
    queryFn: async (): Promise<UserStats> => {
      const { data, error } = await supabase!.rpc('get_user_stats', {
        p_user_id: userId!,
        p_year: year,
      });
      if (error) throw new Error(error.message);
      return data as unknown as UserStats;
    },
  });
}

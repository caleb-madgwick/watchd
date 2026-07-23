import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryKeys';
import { supabase } from '@/lib/supabase/client';
import { useCurrentUserId } from '@/providers/AuthProvider';
import { toast } from '@/stores/toastStore';
import type { UserBadge, WatchChallenge } from '@/types/database';

/** A user's annual watch challenge (goal + derived progress) for one year. */
export function useWatchChallenge(userId: string | null | undefined, year: number) {
  return useQuery({
    queryKey: queryKeys.watchChallenge(userId ?? 'anon', year),
    enabled: !!userId && !!supabase,
    staleTime: 30_000,
    queryFn: async (): Promise<WatchChallenge> => {
      const { data, error } = await supabase!.rpc('get_watch_challenge', {
        p_user_id: userId!,
        p_year: year,
      });
      if (error) throw new Error(error.message);
      return data as unknown as WatchChallenge;
    },
  });
}

/** Set (or update) the current user's watch goal for a year. */
export function useSetWatchGoal() {
  const queryClient = useQueryClient();
  const userId = useCurrentUserId();
  return useMutation({
    mutationFn: async ({ year, goal }: { year: number; goal: number }) => {
      if (!supabase) throw new Error('Not connected.');
      const { error } = await supabase.rpc('set_watch_goal', { p_year: year, p_goal: goal });
      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, { year }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.watchChallenge(userId ?? 'anon', year) });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : 'Could not save your goal.'),
  });
}

/** Badges a user has earned. */
export function useUserBadges(userId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.userBadges(userId ?? 'anon'),
    enabled: !!userId && !!supabase,
    staleTime: 60_000,
    queryFn: async (): Promise<UserBadge[]> => {
      const { data, error } = await supabase!.rpc('get_user_badges', { p_user_id: userId! });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as UserBadge[];
    },
  });
}

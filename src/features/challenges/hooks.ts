import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryKeys';
import { supabase } from '@/lib/supabase/client';
import { useCurrentUserId } from '@/providers/AuthProvider';
import { toast } from '@/stores/toastStore';
import type { UserBadge, WatchChallenge } from '@/types/database';

export type ChallengeKind = 'watch' | 'read';

/**
 * A user's annual challenge (goal + derived progress) for one year.
 * kind 'watch' counts films + shows; 'read' counts books.
 */
export function useWatchChallenge(
  userId: string | null | undefined,
  year: number,
  kind: ChallengeKind = 'watch',
) {
  return useQuery({
    queryKey: queryKeys.watchChallenge(userId ?? 'anon', year, kind),
    enabled: !!userId && !!supabase,
    staleTime: 30_000,
    queryFn: async (): Promise<WatchChallenge> => {
      const { data, error } = await supabase!.rpc('get_watch_challenge', {
        p_user_id: userId!,
        p_year: year,
        p_kind: kind,
      });
      if (error) throw new Error(error.message);
      return data as unknown as WatchChallenge;
    },
  });
}

/** Set (or update) the current user's goal for a year and kind. */
export function useSetWatchGoal() {
  const queryClient = useQueryClient();
  const userId = useCurrentUserId();
  return useMutation({
    mutationFn: async ({ year, goal, kind = 'watch' }: { year: number; goal: number; kind?: ChallengeKind }) => {
      if (!supabase) throw new Error('Not connected.');
      const { error } = await supabase.rpc('set_watch_goal', { p_year: year, p_goal: goal, p_kind: kind });
      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, { year, kind = 'watch' }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.watchChallenge(userId ?? 'anon', year, kind),
      });
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

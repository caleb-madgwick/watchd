import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryKeys';
import { avatarPublicUrl } from '@/lib/supabase/storage';
import { supabase } from '@/lib/supabase/client';
import { useCurrentUserId } from '@/providers/AuthProvider';
import { toast } from '@/stores/toastStore';

export interface BlockedUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
}

/** Whether the current user is blocking the target. */
export function useIsBlocking(targetUserId: string | undefined) {
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: queryKeys.blocking(targetUserId ?? ''),
    enabled: !!userId && !!targetUserId && !!supabase,
    staleTime: 30_000,
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await supabase!
        .from('blocks')
        .select('blocked_id')
        .eq('blocker_id', userId!)
        .eq('blocked_id', targetUserId!)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return !!data;
    },
  });
}

/** The current user's blocked accounts. */
export function useBlockedUsers() {
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: queryKeys.blockedUsers(),
    enabled: !!userId && !!supabase,
    staleTime: 30_000,
    queryFn: async (): Promise<BlockedUser[]> => {
      const { data: rows, error } = await supabase!
        .from('blocks')
        .select('blocked_id, created_at')
        .eq('blocker_id', userId!)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      const ids = (rows ?? []).map((r) => r.blocked_id);
      if (ids.length === 0) return [];
      const { data: profiles, error: pErr } = await supabase!
        .from('profiles')
        .select('id, username, display_name, avatar_path')
        .in('id', ids);
      if (pErr) throw new Error(pErr.message);
      return (profiles ?? []).map((p) => ({
        id: p.id,
        username: p.username,
        displayName: p.display_name?.trim() || p.username,
        avatarUrl: avatarPublicUrl(p.avatar_path),
      }));
    },
  });
}

/**
 * Block or unblock a user. Blocking also drops the current user's follow of the
 * target and any friendship (their follow of the user is hidden by
 * is_blocked_either regardless).
 */
export function useToggleBlock(targetUserId: string | undefined) {
  const queryClient = useQueryClient();
  const userId = useCurrentUserId();
  return useMutation({
    mutationFn: async (block: boolean) => {
      if (!supabase || !userId || !targetUserId) throw new Error('Not connected.');
      if (block) {
        const { error } = await supabase
          .from('blocks')
          .insert({ blocker_id: userId, blocked_id: targetUserId });
        if (error && error.code !== '23505') throw new Error(error.message);
        // Sever the current user's own relationships to the target.
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', userId)
          .eq('following_id', targetUserId);
        await supabase.rpc('remove_friend', { p_other: targetUserId });
      } else {
        const { error } = await supabase
          .from('blocks')
          .delete()
          .eq('blocker_id', userId)
          .eq('blocked_id', targetUserId);
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: (_data, block) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.blocking(targetUserId ?? '') });
      queryClient.invalidateQueries({ queryKey: queryKeys.blockedUsers() });
      queryClient.invalidateQueries({ queryKey: queryKeys.followState(targetUserId ?? '') });
      queryClient.invalidateQueries({ queryKey: queryKeys.friendship(targetUserId ?? '') });
      queryClient.invalidateQueries({ queryKey: queryKeys.feed() });
      toast.success(block ? 'User blocked.' : 'User unblocked.');
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : 'Could not update block.'),
  });
}

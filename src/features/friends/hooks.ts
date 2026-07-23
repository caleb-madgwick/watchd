import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fetchFriends,
  fetchFriendship,
  fetchPendingFriendRequests,
  type FriendshipState,
} from './api';
import { track } from '@/lib/analytics';
import { queryKeys } from '@/lib/queryKeys';
import { supabase } from '@/lib/supabase/client';
import { useCurrentUserId } from '@/providers/AuthProvider';
import { toast } from '@/stores/toastStore';

/** My relationship with a target user (none / outgoing / incoming / friends). */
export function useFriendship(targetUserId: string | undefined) {
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: queryKeys.friendship(targetUserId ?? ''),
    enabled: !!userId && !!targetUserId && userId !== targetUserId && !!supabase,
    staleTime: 30_000,
    queryFn: (): Promise<FriendshipState> => fetchFriendship(userId!, targetUserId!),
  });
}

/** Accepted friends of the signed-in user. */
export function useFriends(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.friends(userId ?? ''),
    enabled: !!userId && !!supabase,
    staleTime: 60_000,
    queryFn: () => fetchFriends(userId!),
  });
}

/** Incoming pending friend requests (for the signed-in user's inbox). */
export function usePendingFriendRequests() {
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: queryKeys.pendingFriendRequests(),
    enabled: !!userId && !!supabase,
    staleTime: 30_000,
    queryFn: () => fetchPendingFriendRequests(userId!),
  });
}

/** Invalidate everything a friend mutation can affect. */
function useInvalidateFriends() {
  const queryClient = useQueryClient();
  const userId = useCurrentUserId();
  return (targetUserId?: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.friends(userId ?? '') });
    queryClient.invalidateQueries({ queryKey: queryKeys.pendingFriendRequests() });
    // Profile pages show friend_count; refresh any that are cached.
    queryClient.invalidateQueries({ queryKey: ['profile'] });
    queryClient.invalidateQueries({ queryKey: ['profileById'] });
    if (targetUserId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.friendship(targetUserId) });
    }
  };
}

export function useSendFriendRequest() {
  const invalidate = useInvalidateFriends();
  return useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!supabase) throw new Error('Sign in to add friends.');
      const { data, error } = await supabase.rpc('send_friend_request', {
        p_addressee: targetUserId,
      });
      if (error) throw new Error(error.message);
      return { targetUserId, result: data };
    },
    onSuccess: ({ targetUserId, result }) => {
      track(result?.status === 'accepted' ? 'friend_accepted' : 'friend_request_sent');
      invalidate(targetUserId);
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : 'Could not send friend request.'),
  });
}

export function useRespondFriendRequest() {
  const invalidate = useInvalidateFriends();
  return useMutation({
    mutationFn: async ({
      requestId,
      accept,
    }: {
      requestId: string;
      accept: boolean;
      // targetUserId is optional context for targeted invalidation.
      targetUserId?: string;
    }) => {
      if (!supabase) throw new Error('Not signed in.');
      const { error } = await supabase.rpc('respond_friend_request', {
        p_request: requestId,
        p_accept: accept,
      });
      if (error) throw new Error(error.message);
      return accept;
    },
    onSuccess: (accepted, { targetUserId }) => {
      if (accepted) track('friend_accepted');
      invalidate(targetUserId);
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : 'Could not update request.'),
  });
}

/** Remove a friend or cancel an outgoing pending request. */
export function useRemoveFriend() {
  const invalidate = useInvalidateFriends();
  return useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!supabase) throw new Error('Not signed in.');
      const { error } = await supabase.rpc('remove_friend', { p_other: targetUserId });
      if (error) throw new Error(error.message);
      return targetUserId;
    },
    onSuccess: (targetUserId) => invalidate(targetUserId),
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : 'Could not update friendship.'),
  });
}

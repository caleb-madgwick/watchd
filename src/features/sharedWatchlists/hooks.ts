import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ensureReference, type TrackableMedia } from '@/features/tracking/api';
import { track } from '@/lib/analytics';
import { queryKeys } from '@/lib/queryKeys';
import { supabase } from '@/lib/supabase/client';
import { useCurrentUserId } from '@/providers/AuthProvider';
import { toast } from '@/stores/toastStore';
import type {
  SharedWatchlistDetailPayload,
  SharedWatchlistInvitePayload,
  SharedWatchlistsResult,
} from '@/types/database';

/** Shared watchlists the signed-in user belongs to (+ pending invite count). */
export function useSharedWatchlists() {
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: queryKeys.sharedWatchlists(),
    enabled: !!userId && !!supabase,
    staleTime: 30_000,
    queryFn: async (): Promise<SharedWatchlistsResult> => {
      const { data, error } = await supabase!.rpc('get_shared_watchlists');
      if (error) throw new Error(error.message);
      return data as unknown as SharedWatchlistsResult;
    },
  });
}

/** Pending shared-watchlist invites addressed to the signed-in user. */
export function usePendingSharedInvites() {
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: queryKeys.pendingSharedInvites(),
    enabled: !!userId && !!supabase,
    staleTime: 30_000,
    queryFn: async (): Promise<SharedWatchlistInvitePayload[]> => {
      const { data, error } = await supabase!.rpc('get_pending_shared_watchlist_invites');
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as SharedWatchlistInvitePayload[];
    },
  });
}

/** Full detail (members + items) of one shared watchlist. */
export function useSharedWatchlist(listId: string | undefined) {
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: queryKeys.sharedWatchlist(listId ?? ''),
    enabled: !!userId && !!listId && !!supabase,
    staleTime: 15_000,
    queryFn: async (): Promise<SharedWatchlistDetailPayload> => {
      const { data, error } = await supabase!.rpc('get_shared_watchlist', { p_list: listId! });
      if (error) throw new Error(error.message);
      return data as unknown as SharedWatchlistDetailPayload;
    },
  });
}

function useInvalidateShared() {
  const queryClient = useQueryClient();
  return (listId?: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.sharedWatchlists() });
    queryClient.invalidateQueries({ queryKey: queryKeys.pendingSharedInvites() });
    if (listId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.sharedWatchlist(listId) });
    }
  };
}

export function useCreateSharedWatchlist() {
  const invalidate = useInvalidateShared();
  return useMutation({
    mutationFn: async (name: string): Promise<string> => {
      if (!supabase) throw new Error('Sign in to create a shared watchlist.');
      const { data, error } = await supabase.rpc('create_shared_watchlist', {
        p_name: name.trim(),
      });
      if (error) throw new Error(error.message);
      return data as unknown as string;
    },
    onSuccess: () => {
      track('shared_watchlist_created');
      toast.success('Shared watchlist created.');
      invalidate();
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : 'Could not create the watchlist.'),
  });
}

export function useInviteToSharedWatchlist(listId: string) {
  const invalidate = useInvalidateShared();
  return useMutation({
    mutationFn: async (inviteeId: string) => {
      if (!supabase) throw new Error('Not signed in.');
      const { error } = await supabase.rpc('invite_to_shared_watchlist', {
        p_list: listId,
        p_invitee: inviteeId,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      track('shared_watchlist_invite_sent');
      toast.success('Invite sent.');
      invalidate(listId);
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : 'Could not send the invite.'),
  });
}

export function useRespondSharedInvite() {
  const invalidate = useInvalidateShared();
  return useMutation({
    mutationFn: async ({ inviteId, accept }: { inviteId: string; accept: boolean }) => {
      if (!supabase) throw new Error('Not signed in.');
      const { error } = await supabase.rpc('respond_shared_watchlist_invite', {
        p_invite: inviteId,
        p_accept: accept,
      });
      if (error) throw new Error(error.message);
      return accept;
    },
    onSuccess: (accepted) => {
      if (accepted) toast.success('Joined the shared watchlist.');
      invalidate();
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : 'Could not update the invite.'),
  });
}

export function useAddToSharedWatchlist() {
  const invalidate = useInvalidateShared();
  return useMutation({
    mutationFn: async ({ listId, title }: { listId: string; title: TrackableMedia }) => {
      if (!supabase) throw new Error('Not signed in.');
      const titleId = await ensureReference(title);
      const { error } = await supabase.rpc('add_shared_watchlist_item', {
        p_list: listId,
        p_title_id: titleId,
      });
      if (error) throw new Error(error.message);
      return listId;
    },
    onSuccess: (listId) => {
      track('shared_watchlist_item_added');
      invalidate(listId);
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : 'Could not add to the watchlist.'),
  });
}

export function useRemoveFromSharedWatchlist(listId: string) {
  const invalidate = useInvalidateShared();
  return useMutation({
    mutationFn: async (itemId: string) => {
      if (!supabase) throw new Error('Not signed in.');
      const { error } = await supabase.rpc('remove_shared_watchlist_item', { p_item: itemId });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => invalidate(listId),
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : 'Could not remove the title.'),
  });
}

export function useToggleSharedItemWatched(listId: string) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateShared();
  const key = queryKeys.sharedWatchlist(listId);
  return useMutation({
    mutationFn: async ({ itemId, watched }: { itemId: string; watched: boolean }) => {
      if (!supabase) throw new Error('Not signed in.');
      const { error } = await supabase.rpc('set_shared_watchlist_item_watched', {
        p_item: itemId,
        p_watched: watched,
      });
      if (error) throw new Error(error.message);
    },
    onMutate: async ({ itemId, watched }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<SharedWatchlistDetailPayload>(key);
      if (previous) {
        queryClient.setQueryData<SharedWatchlistDetailPayload>(key, {
          ...previous,
          items: previous.items.map((item) => (item.id === itemId ? { ...item, watched } : item)),
        });
      }
      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
      toast.error(error instanceof Error ? error.message : 'Could not update the title.');
    },
    onSettled: () => invalidate(listId),
  });
}

export function useLeaveSharedWatchlist() {
  const invalidate = useInvalidateShared();
  return useMutation({
    mutationFn: async (listId: string) => {
      if (!supabase) throw new Error('Not signed in.');
      const { error } = await supabase.rpc('leave_shared_watchlist', { p_list: listId });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success('You left the watchlist.');
      invalidate();
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : 'Could not leave the watchlist.'),
  });
}

export function useRemoveSharedMember(listId: string) {
  const invalidate = useInvalidateShared();
  return useMutation({
    mutationFn: async (memberId: string) => {
      if (!supabase) throw new Error('Not signed in.');
      const { error } = await supabase.rpc('remove_shared_watchlist_member', {
        p_list: listId,
        p_user: memberId,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => invalidate(listId),
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : 'Could not remove the member.'),
  });
}

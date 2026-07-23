import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryKeys';
import { supabase } from '@/lib/supabase/client';
import { useCurrentUserId } from '@/providers/AuthProvider';
import { toast } from '@/stores/toastStore';
import type { NotificationItem } from '@/types/database';

const PAGE_SIZE = 30;

/** The signed-in user's notification inbox, keyset-paginated by created_at. */
export function useNotifications() {
  const userId = useCurrentUserId();
  return useInfiniteQuery({
    queryKey: queryKeys.notifications(),
    enabled: !!userId && !!supabase,
    staleTime: 15_000,
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }): Promise<NotificationItem[]> => {
      const { data, error } = await supabase!.rpc('get_notifications', {
        p_before: pageParam,
        p_limit: PAGE_SIZE,
      });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as NotificationItem[];
    },
    getNextPageParam: (lastPage) =>
      lastPage.length === PAGE_SIZE ? lastPage[lastPage.length - 1].created_at : undefined,
  });
}

/**
 * Unread badge count. Polls in the background and refetches on focus so the
 * badge stays roughly live without a realtime subscription (native push, once
 * wired, provides the instant path).
 */
export function useUnreadNotificationCount() {
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: queryKeys.unreadNotificationCount(),
    enabled: !!userId && !!supabase,
    staleTime: 30_000,
    refetchInterval: 60_000,
    queryFn: async (): Promise<number> => {
      const { data, error } = await supabase!.rpc('get_unread_notification_count');
      if (error) throw new Error(error.message);
      return (data ?? 0) as number;
    },
  });
}

/** Mark specific notifications read, or all of them when ids is omitted. */
export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids?: string[]) => {
      if (!supabase) throw new Error('Not connected.');
      const { error } = await supabase.rpc('mark_notifications_read', {
        p_ids: ids && ids.length > 0 ? ids : null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications() });
      queryClient.invalidateQueries({ queryKey: queryKeys.unreadNotificationCount() });
    },
  });
}

/** Delete a single notification (RLS scopes this to the recipient). */
export function useDeleteNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) throw new Error('Not connected.');
      const { error } = await supabase.from('notifications').delete().eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications() });
      queryClient.invalidateQueries({ queryKey: queryKeys.unreadNotificationCount() });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Could not remove this notification.');
    },
  });
}

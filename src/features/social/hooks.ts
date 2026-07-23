import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { track } from '@/lib/analytics';
import { queryKeys } from '@/lib/queryKeys';
import { supabase } from '@/lib/supabase/client';
import { avatarPublicUrl } from '@/lib/supabase/storage';
import { useCurrentUserId } from '@/providers/AuthProvider';
import { toast } from '@/stores/toastStore';

export interface FollowListEntry {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio: string;
}

export function useFollowState(targetUserId: string | undefined) {
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: queryKeys.followState(targetUserId ?? ''),
    enabled: !!userId && !!targetUserId && userId !== targetUserId && !!supabase,
    staleTime: 30_000,
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await supabase!
        .from('follows')
        .select('follower_id')
        .eq('follower_id', userId!)
        .eq('following_id', targetUserId!)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return !!data;
    },
  });
}

/** Follow/unfollow with optimistic toggle (safe rollback). */
export function useToggleFollow(targetUserId: string | undefined, targetUsername?: string) {
  const queryClient = useQueryClient();
  const userId = useCurrentUserId();
  const stateKey = queryKeys.followState(targetUserId ?? '');

  return useMutation({
    mutationFn: async (follow: boolean) => {
      if (!supabase || !userId || !targetUserId) throw new Error('Sign in to follow people.');
      if (follow) {
        const { error } = await supabase
          .from('follows')
          .insert({ follower_id: userId, following_id: targetUserId });
        if (error && error.code !== '23505') {
          throw new Error(
            error.message.includes('cannot follow') ? 'You can’t follow this user.' : error.message,
          );
        }
      } else {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', userId)
          .eq('following_id', targetUserId);
        if (error) throw new Error(error.message);
      }
      return follow;
    },
    onMutate: async (follow) => {
      await queryClient.cancelQueries({ queryKey: stateKey });
      const previous = queryClient.getQueryData<boolean>(stateKey);
      queryClient.setQueryData(stateKey, follow);
      return { previous };
    },
    onError: (error, _follow, context) => {
      queryClient.setQueryData(stateKey, context?.previous ?? false);
      toast.error(error instanceof Error ? error.message : 'Could not update follow.');
    },
    onSuccess: (followed) => {
      if (followed) track('user_followed');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: stateKey });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['followers'] });
      queryClient.invalidateQueries({ queryKey: ['following'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.feed() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.recentReviewsFromFollows(userId ?? 'anon'),
      });
      if (targetUsername) {
        queryClient.invalidateQueries({ queryKey: queryKeys.profile(targetUsername) });
      }
    },
  });
}

async function fetchFollowList(
  userId: string,
  direction: 'followers' | 'following',
): Promise<FollowListEntry[]> {
  const client = supabase!;
  const { data, error } =
    direction === 'followers'
      ? await client
          .from('follows')
          .select('profiles!follows_follower_id_fkey(id, username, display_name, avatar_path, bio)')
          .eq('following_id', userId)
          .order('created_at', { ascending: false })
          .limit(200)
      : await client
          .from('follows')
          .select('profiles!follows_following_id_fkey(id, username, display_name, avatar_path, bio)')
          .eq('follower_id', userId)
          .order('created_at', { ascending: false })
          .limit(200);
  if (error) throw new Error(error.message);

  return (data ?? [])
    .map((row) => row.profiles)
    .filter((profile): profile is NonNullable<typeof profile> => !!profile)
    .map((profile) => ({
      id: profile.id,
      username: profile.username,
      displayName: profile.display_name?.trim() || profile.username,
      avatarUrl: avatarPublicUrl(profile.avatar_path),
      bio: profile.bio ?? '',
    }));
}

export function useFollowers(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.followers(userId ?? ''),
    enabled: !!userId && !!supabase,
    staleTime: 60_000,
    queryFn: () => fetchFollowList(userId!, 'followers'),
  });
}

export function useFollowing(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.following(userId ?? ''),
    enabled: !!userId && !!supabase,
    staleTime: 60_000,
    queryFn: () => fetchFollowList(userId!, 'following'),
  });
}

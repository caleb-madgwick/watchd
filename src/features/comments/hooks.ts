import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryKeys';
import { avatarPublicUrl } from '@/lib/supabase/storage';
import { supabase } from '@/lib/supabase/client';
import { useCurrentUserId } from '@/providers/AuthProvider';
import { toast } from '@/stores/toastStore';
import type { CommentTargetRow } from '@/types/database';

export interface CommentEntry {
  id: string;
  body: string;
  parentId: string | null;
  likeCount: number;
  createdAt: string;
  likedByMe: boolean;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
}

/** Comments on a target (review/list/diary_entry), with author + my like state. */
export function useComments(targetType: CommentTargetRow, targetId: string | undefined) {
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: queryKeys.comments(targetType, targetId ?? ''),
    enabled: !!targetId && !!supabase,
    staleTime: 15_000,
    queryFn: async (): Promise<CommentEntry[]> => {
      const { data, error } = await supabase!
        .from('comments')
        .select(
          'id, body, parent_id, like_count, created_at, user_id, author:profiles!comments_user_id_fkey(id, username, display_name, avatar_path)',
        )
        .eq('target_type', targetType)
        .eq('target_id', targetId!)
        .order('created_at', { ascending: true })
        .limit(200);
      if (error) throw new Error(error.message);
      const rows = data ?? [];

      let liked = new Set<string>();
      if (userId && rows.length > 0) {
        const { data: likes } = await supabase!
          .from('content_likes')
          .select('target_id')
          .eq('user_id', userId)
          .eq('target_type', 'comment')
          .in(
            'target_id',
            rows.map((r) => r.id),
          );
        liked = new Set((likes ?? []).map((l) => l.target_id));
      }

      return rows
        .filter((r) => r.author)
        .map((r) => ({
          id: r.id,
          body: r.body,
          parentId: r.parent_id,
          likeCount: r.like_count,
          createdAt: r.created_at,
          likedByMe: liked.has(r.id),
          author: {
            id: r.author!.id,
            username: r.author!.username,
            displayName: r.author!.display_name?.trim() || r.author!.username,
            avatarUrl: avatarPublicUrl(r.author!.avatar_path),
          },
        }));
    },
  });
}

export function useAddComment(targetType: CommentTargetRow, targetId: string) {
  const queryClient = useQueryClient();
  const userId = useCurrentUserId();
  return useMutation({
    mutationFn: async ({ body, parentId }: { body: string; parentId?: string | null }) => {
      if (!supabase || !userId) throw new Error('Not connected.');
      const { error } = await supabase.from('comments').insert({
        user_id: userId,
        target_type: targetType,
        target_id: targetId,
        parent_id: parentId ?? null,
        body: body.trim(),
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.comments(targetType, targetId) }),
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : 'Could not post your comment.'),
  });
}

export function useDeleteComment(targetType: CommentTargetRow, targetId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (commentId: string) => {
      if (!supabase) throw new Error('Not connected.');
      const { error } = await supabase.from('comments').delete().eq('id', commentId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.comments(targetType, targetId) }),
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : 'Could not delete this comment.'),
  });
}

export function useToggleCommentLike(targetType: CommentTargetRow, targetId: string) {
  const queryClient = useQueryClient();
  const userId = useCurrentUserId();
  return useMutation({
    mutationFn: async ({ commentId, like }: { commentId: string; like: boolean }) => {
      if (!supabase || !userId) throw new Error('Not connected.');
      if (like) {
        const { error } = await supabase
          .from('content_likes')
          .insert({ user_id: userId, target_type: 'comment', target_id: commentId });
        if (error && error.code !== '23505') throw new Error(error.message);
      } else {
        const { error } = await supabase
          .from('content_likes')
          .delete()
          .eq('user_id', userId)
          .eq('target_type', 'comment')
          .eq('target_id', commentId);
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.comments(targetType, targetId) }),
  });
}

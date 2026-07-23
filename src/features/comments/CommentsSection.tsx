import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/primitives/Avatar';
import { Button } from '@/components/primitives/Button';
import { Text } from '@/components/primitives/Text';
import { TextInput } from '@/components/primitives/TextInput';
import { config } from '@/constants/config';
import {
  useAddComment,
  useComments,
  useDeleteComment,
  useToggleCommentLike,
  type CommentEntry,
} from '@/features/comments/hooks';
import { useCurrentUserId } from '@/providers/AuthProvider';
import { useTheme } from '@/theme/ThemeContext';
import { spacing } from '@/theme/tokens';
import type { CommentTargetRow } from '@/types/database';
import { timeAgo } from '@/utils/dates';

function CommentRow({
  comment,
  isOwn,
  isReply,
  onReply,
  onDelete,
  onToggleLike,
}: {
  comment: CommentEntry;
  isOwn: boolean;
  isReply: boolean;
  onReply: () => void;
  onDelete: () => void;
  onToggleLike: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.row, isReply && styles.reply]}>
      <Link href={`/user/${comment.author.username}`} asChild>
        <Pressable accessibilityRole="link">
          <Avatar url={comment.author.avatarUrl} name={comment.author.displayName} size={32} />
        </Pressable>
      </Link>
      <View style={styles.rowBody}>
        <Text variant="subhead" numberOfLines={1}>
          {comment.author.displayName}{' '}
          <Text variant="caption" color="muted">
            {timeAgo(comment.createdAt)}
          </Text>
        </Text>
        <Text variant="body">{comment.body}</Text>
        <View style={styles.rowActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={comment.likedByMe ? 'Unlike comment' : 'Like comment'}
            onPress={onToggleLike}
            style={styles.likeBtn}
          >
            <Ionicons
              name={comment.likedByMe ? 'heart' : 'heart-outline'}
              size={15}
              color={comment.likedByMe ? colors.accent : colors.textMuted}
            />
            {comment.likeCount > 0 ? (
              <Text variant="caption" color="muted">
                {comment.likeCount}
              </Text>
            ) : null}
          </Pressable>
          {!isReply ? (
            <Pressable accessibilityRole="button" onPress={onReply}>
              <Text variant="caption" color="muted">
                Reply
              </Text>
            </Pressable>
          ) : null}
          {isOwn ? (
            <Pressable accessibilityRole="button" onPress={onDelete}>
              <Text variant="caption" color="muted">
                Delete
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

/** Threaded comments (one reply level) with a composer. Reusable per target. */
export function CommentsSection({
  targetType,
  targetId,
}: {
  targetType: CommentTargetRow;
  targetId: string;
}) {
  const currentUserId = useCurrentUserId();
  const comments = useComments(targetType, targetId);
  const addComment = useAddComment(targetType, targetId);
  const deleteComment = useDeleteComment(targetType, targetId);
  const toggleLike = useToggleCommentLike(targetType, targetId);

  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);

  const all = comments.data ?? [];
  const topLevel = all.filter((c) => !c.parentId);
  const repliesByParent = new Map<string, CommentEntry[]>();
  all
    .filter((c) => c.parentId)
    .forEach((c) => {
      const list = repliesByParent.get(c.parentId!) ?? [];
      list.push(c);
      repliesByParent.set(c.parentId!, list);
    });

  const submit = () => {
    const body = draft.trim();
    if (!body) return;
    addComment.mutate(
      { body, parentId: replyTo?.id ?? null },
      {
        onSuccess: () => {
          setDraft('');
          setReplyTo(null);
        },
      },
    );
  };

  return (
    <View style={styles.section}>
      <Text variant="headline">
        Comments{all.length > 0 ? ` · ${all.length}` : ''}
      </Text>

      {config.demoMode || !currentUserId ? (
        <Text variant="caption" color="muted">
          Sign in to join the conversation.
        </Text>
      ) : (
        <View style={styles.composer}>
          {replyTo ? (
            <View style={styles.replyingTo}>
              <Text variant="caption" color="muted">
                Replying to {replyTo.name}
              </Text>
              <Pressable onPress={() => setReplyTo(null)} accessibilityLabel="Cancel reply">
                <Text variant="caption" color="accent">
                  Cancel
                </Text>
              </Pressable>
            </View>
          ) : null}
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={replyTo ? 'Write a reply…' : 'Add a comment…'}
            multiline
            maxLength={2000}
          />
          <Button
            title={replyTo ? 'Reply' : 'Comment'}
            size="sm"
            disabled={!draft.trim() || addComment.isPending}
            onPress={submit}
            style={styles.submit}
          />
        </View>
      )}

      {comments.isLoading ? (
        <Text variant="caption" color="muted">
          Loading comments…
        </Text>
      ) : all.length === 0 ? (
        <Text variant="caption" color="muted">
          No comments yet.
        </Text>
      ) : (
        <View style={styles.list}>
          {topLevel.map((comment) => (
            <View key={comment.id}>
              <CommentRow
                comment={comment}
                isOwn={comment.author.id === currentUserId}
                isReply={false}
                onReply={() => setReplyTo({ id: comment.id, name: comment.author.displayName })}
                onDelete={() => deleteComment.mutate(comment.id)}
                onToggleLike={() =>
                  toggleLike.mutate({ commentId: comment.id, like: !comment.likedByMe })
                }
              />
              {(repliesByParent.get(comment.id) ?? []).map((reply) => (
                <CommentRow
                  key={reply.id}
                  comment={reply}
                  isOwn={reply.author.id === currentUserId}
                  isReply
                  onReply={() => undefined}
                  onDelete={() => deleteComment.mutate(reply.id)}
                  onToggleLike={() =>
                    toggleLike.mutate({ commentId: reply.id, like: !reply.likedByMe })
                  }
                />
              ))}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.md,
  },
  composer: {
    gap: spacing.sm,
  },
  replyingTo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  submit: {
    alignSelf: 'flex-end',
  },
  list: {
    gap: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  reply: {
    marginLeft: spacing.xl,
    marginTop: spacing.md,
  },
  rowBody: {
    flex: 1,
    gap: 3,
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: 2,
  },
  likeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});

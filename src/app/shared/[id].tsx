import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { TitleCard } from '@/components/media/TitleCard';
import { Avatar } from '@/components/primitives/Avatar';
import { Button } from '@/components/primitives/Button';
import { EmptyState } from '@/components/primitives/EmptyState';
import { ErrorState } from '@/components/primitives/ErrorState';
import { IconButton } from '@/components/primitives/IconButton';
import { Modal } from '@/components/primitives/Modal';
import { CardListSkeleton } from '@/components/primitives/Skeleton';
import { Text } from '@/components/primitives/Text';
import { useFriends } from '@/features/friends/hooks';
import { ProfileSubpageShell } from '@/features/profile/ProfileSubpageShell';
import {
  useInviteToSharedWatchlist,
  useLeaveSharedWatchlist,
  useRemoveFromSharedWatchlist,
  useSharedWatchlist,
  useToggleSharedItemWatched,
} from '@/features/sharedWatchlists/hooks';
import { avatarPublicUrl } from '@/lib/supabase/storage';
import { posterUrl } from '@/lib/tmdb/images';
import { useCurrentUserId } from '@/providers/AuthProvider';
import { useTheme } from '@/theme/ThemeContext';
import { contentWidth, radius, spacing } from '@/theme/tokens';
import type { SharedWatchlistDetailPayload } from '@/types/database';
import { mediaTypeLabel, titleHref } from '@/utils/titles';

type Detail = SharedWatchlistDetailPayload;

function InviteFriendsModal({
  listId,
  members,
  visible,
  onClose,
}: {
  listId: string;
  members: Detail['members'];
  visible: boolean;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const userId = useCurrentUserId();
  const friends = useFriends(userId ?? undefined);
  const invite = useInviteToSharedWatchlist(listId);

  const memberIds = useMemo(() => new Set(members.map((m) => m.id)), [members]);
  const invitable = (friends.data ?? []).filter((f) => !memberIds.has(f.id));

  return (
    <Modal visible={visible} onClose={onClose} title="Invite a friend">
      <View style={styles.modalBody}>
        {invitable.length === 0 ? (
          <Text variant="callout" color="muted">
            {(friends.data?.length ?? 0) === 0
              ? 'Add friends first — you can only invite friends to a shared watchlist.'
              : 'All your friends are already in this watchlist.'}
          </Text>
        ) : (
          invitable.map((friend) => (
            <Pressable
              key={friend.id}
              accessibilityRole="button"
              disabled={invite.isPending}
              onPress={() => invite.mutate(friend.id, { onSuccess: onClose })}
              style={({ pressed }) => [
                styles.friendRow,
                {
                  backgroundColor: pressed ? colors.surfaceHigh : colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Avatar url={friend.avatarUrl} name={friend.displayName} size={36} />
              <View style={styles.friendText}>
                <Text variant="headline" numberOfLines={1}>
                  {friend.displayName}
                </Text>
                <Text variant="caption" color="muted" numberOfLines={1}>
                  @{friend.username}
                </Text>
              </View>
              <Ionicons name="add-circle-outline" size={22} color={colors.accent} />
            </Pressable>
          ))
        )}
      </View>
    </Modal>
  );
}

export default function SharedWatchlistDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const detail = useSharedWatchlist(id);
  const toggleWatched = useToggleSharedItemWatched(id ?? '');
  const removeItem = useRemoveFromSharedWatchlist(id ?? '');
  const leave = useLeaveSharedWatchlist();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  const data = detail.data;

  return (
    <ProfileSubpageShell
      title={data?.name ?? 'Shared watchlist'}
      subtitle={
        data
          ? `${data.item_count} title${data.item_count === 1 ? '' : 's'} · ${data.member_count} member${data.member_count === 1 ? '' : 's'}`
          : undefined
      }
    >
      <Stack.Screen
        options={{ title: data ? `${data.name} — Watchd` : 'Shared watchlist — Watchd' }}
      />
      {detail.isLoading ? (
        <View style={styles.loading}>
          <CardListSkeleton count={5} />
        </View>
      ) : detail.isError ? (
        <ErrorState
          title="Couldn’t load this watchlist"
          message="You may not be a member, or it was deleted."
          onRetry={() => detail.refetch()}
        />
      ) : !data ? (
        <EmptyState icon="albums-outline" title="Watchlist not found" />
      ) : (
        <FlatList<Detail['items'][number]>
          data={data.items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View style={styles.header}>
              <View style={styles.members}>
                {data.members.slice(0, 8).map((member) => (
                  <View key={member.id} style={styles.memberChip}>
                    <Avatar
                      url={avatarPublicUrl(member.avatar_path)}
                      name={member.display_name?.trim() || member.username}
                      size={32}
                    />
                  </View>
                ))}
              </View>
              <View style={styles.actions}>
                <Button
                  title="Invite friend"
                  variant="secondary"
                  size="sm"
                  icon="person-add-outline"
                  onPress={() => setInviteOpen(true)}
                />
                <Button
                  title="Leave"
                  variant="outline"
                  size="sm"
                  icon="exit-outline"
                  onPress={() => setConfirmLeave(true)}
                />
              </View>
            </View>
          }
          ListEmptyComponent={
            <EmptyState
              icon="albums-outline"
              title="Nothing added yet"
              message="Open any movie or show and use “Add to shared watchlist”, or add from a title page."
            />
          }
          renderItem={({ item }) => {
            const addedByName = item.added_by?.display_name?.trim() || item.added_by?.username;
            return (
              <View style={styles.itemRow}>
                <View style={styles.itemCard}>
                  <TitleCard
                    title={item.title.title}
                    posterUrl={posterUrl(item.title.poster_path)}
                    mediaTypeLabel={mediaTypeLabel(item.title.media_type)}
                    overview={
                      addedByName
                        ? `Added by ${addedByName}${item.watched ? ' · watched' : ''}`
                        : item.watched
                          ? 'Watched'
                          : undefined
                    }
                    href={titleHref(item.title.media_type, item.title.tmdb_id)}
                  />
                </View>
                <View style={styles.itemControls}>
                  <IconButton
                    icon={item.watched ? 'checkmark-circle' : 'checkmark-circle-outline'}
                    accessibilityLabel={
                      item.watched
                        ? `Mark ${item.title.title} as not watched`
                        : `Mark ${item.title.title} as watched`
                    }
                    color={item.watched ? colors.accent : undefined}
                    size={19}
                    disabled={toggleWatched.isPending}
                    onPress={() =>
                      toggleWatched.mutate({ itemId: item.id, watched: !item.watched })
                    }
                  />
                  <IconButton
                    icon="close"
                    accessibilityLabel={`Remove ${item.title.title}`}
                    size={17}
                    disabled={removeItem.isPending}
                    onPress={() => removeItem.mutate(item.id)}
                  />
                </View>
              </View>
            );
          }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {data ? (
        <InviteFriendsModal
          listId={data.id}
          members={data.members}
          visible={inviteOpen}
          onClose={() => setInviteOpen(false)}
        />
      ) : null}

      {data ? (
        <Modal
          visible={confirmLeave}
          onClose={() => setConfirmLeave(false)}
          title="Leave watchlist?"
        >
          <View style={styles.modalBody}>
            <Text variant="callout" color="secondary">
              You’ll lose access to “{data.name}”.
              {data.my_role === 'owner' && data.member_count > 1
                ? ' Ownership will pass to another member.'
                : data.member_count === 1
                  ? ' As the last member, the watchlist will be deleted.'
                  : ''}
            </Text>
            <Button
              title="Leave"
              variant="danger"
              fullWidth
              loading={leave.isPending}
              onPress={() => leave.mutate(data.id, { onSuccess: () => router.replace('/shared') })}
            />
            <Button title="Stay" variant="ghost" fullWidth onPress={() => setConfirmLeave(false)} />
          </View>
        </Modal>
      ) : null}
    </ProfileSubpageShell>
  );
}

const styles = StyleSheet.create({
  loading: {
    padding: spacing.lg,
  },
  list: {
    paddingVertical: spacing.md,
    paddingBottom: spacing['6xl'],
    width: '100%',
    maxWidth: contentWidth.page,
    alignSelf: 'center',
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  members: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  memberChip: {
    marginRight: -spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemCard: {
    flex: 1,
  },
  itemControls: {
    flexDirection: 'row',
    paddingRight: spacing.xs,
  },
  modalBody: {
    gap: spacing.md,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    padding: spacing.md,
  },
  friendText: {
    flex: 1,
    gap: 1,
  },
});

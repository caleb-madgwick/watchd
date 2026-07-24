import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { TitleCard } from '@/components/media/TitleCard';
import { CommentsSection } from '@/features/comments/CommentsSection';
import { Button } from '@/components/primitives/Button';
import { EmptyState } from '@/components/primitives/EmptyState';
import { ErrorState } from '@/components/primitives/ErrorState';
import { IconButton } from '@/components/primitives/IconButton';
import { Modal } from '@/components/primitives/Modal';
import { CardListSkeleton } from '@/components/primitives/Skeleton';
import { Text } from '@/components/primitives/Text';
import {
  useDeleteList,
  useDuplicateList,
  useList,
  useListItems,
  useRemoveFromList,
  useReorderList,
  useToggleListLike,
} from '@/features/lists/hooks';
import { ProfileSubpageShell } from '@/features/profile/ProfileSubpageShell';
import { useCurrentUserId } from '@/providers/AuthProvider';
import { contentWidth, spacing } from '@/theme/tokens';
import { bookHref, mediaTypeLabel, musicHref, titleHref } from '@/utils/titles';

export default function ListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const currentUserId = useCurrentUserId();
  const list = useList(id);
  const items = useListItems(id);
  const removeFromList = useRemoveFromList(id ?? '');
  const reorder = useReorderList(id ?? '');
  const deleteList = useDeleteList();
  const toggleLike = useToggleListLike(id ?? '');
  const duplicate = useDuplicateList();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isOwner = !!list.data && list.data.ownerId === currentUserId;

  const move = (index: number, direction: -1 | 1) => {
    if (!items.data) return;
    const target = index + direction;
    if (target < 0 || target >= items.data.length) return;
    const ids = items.data.map((item) => item.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    reorder.mutate(ids);
  };

  return (
    <ProfileSubpageShell
      title={list.data?.name ?? 'List'}
      subtitle={
        list.data
          ? `${list.data.itemCount} title${list.data.itemCount === 1 ? '' : 's'}${list.data.visibility === 'private' ? ' · private' : ''}`
          : undefined
      }
    >
      <Stack.Screen options={{ title: list.data ? `${list.data.name} — Video Club` : 'List — Video Club' }} />
      {list.isLoading || items.isLoading ? (
        <View style={styles.loading}>
          <CardListSkeleton count={5} />
        </View>
      ) : list.isError ? (
        <ErrorState
          title="Couldn’t load this list"
          message="Check your connection and try again."
          onRetry={() => list.refetch()}
        />
      ) : !list.data ? (
        <EmptyState
          icon="albums-outline"
          title="List not found"
          message="It may be private or deleted."
        />
      ) : (
        <FlatList
          data={items.data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View style={styles.header}>
              {list.data.description ? (
                <Text variant="callout" color="secondary">
                  {list.data.description}
                </Text>
              ) : null}
              {currentUserId ? (
                <View style={styles.ownerActions}>
                  <Button
                    title={list.data.likeCount > 0 ? String(list.data.likeCount) : 'Like'}
                    variant={list.data.likedByMe ? 'primary' : 'secondary'}
                    size="sm"
                    icon={list.data.likedByMe ? 'heart' : 'heart-outline'}
                    onPress={() => toggleLike.mutate(!(list.data?.likedByMe ?? false))}
                  />
                  <Button
                    title="Copy"
                    variant="secondary"
                    size="sm"
                    icon="copy-outline"
                    loading={duplicate.isPending}
                    onPress={() => {
                      const data = list.data;
                      if (data) duplicate.mutate(data.id);
                    }}
                  />
                </View>
              ) : null}
              {isOwner ? (
                <View style={styles.ownerActions}>
                  <Button
                    title="Edit details"
                    variant="secondary"
                    size="sm"
                    icon="create-outline"
                    onPress={() => {
                      const data = list.data;
                      if (data) router.push(`/list/edit/${data.id}`);
                    }}
                  />
                  <Button
                    title="Delete list"
                    variant="outline"
                    size="sm"
                    icon="trash-outline"
                    onPress={() => setConfirmDelete(true)}
                  />
                </View>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            <EmptyState
              icon="albums-outline"
              title="Nothing in this list yet"
              message={
                isOwner
                  ? 'Open any movie, show or book and use “Add to list”.'
                  : 'Titles will appear once the owner adds them.'
              }
            />
          }
          ListFooterComponent={
            list.data ? (
              <View style={styles.commentsWrap}>
                <CommentsSection targetType="list" targetId={list.data.id} />
              </View>
            ) : null
          }
          renderItem={({ item, index }) => (
            <View style={styles.itemRow}>
              <Text variant="caption" color="muted" style={styles.rank}>
                {index + 1}
              </Text>
              <View style={styles.itemCard}>
                <TitleCard
                  title={item.title.title}
                  posterUrl={item.title.posterUrl}
                  year={item.title.releaseYear}
                  mediaTypeLabel={mediaTypeLabel(item.title.mediaType)}
                  overview={item.note ?? undefined}
                  href={
                    item.volumeId
                      ? bookHref(item.volumeId)
                      : item.musicBrainzId
                        ? musicHref(item.title.mediaType as 'album' | 'artist' | 'song', item.musicBrainzId)
                        : titleHref(item.title.mediaType, item.title.tmdbId)
                  }
                />
              </View>
              {isOwner ? (
                <View style={styles.itemControls}>
                  <IconButton
                    icon="chevron-up"
                    accessibilityLabel={`Move ${item.title.title} up`}
                    size={17}
                    disabled={index === 0}
                    onPress={() => move(index, -1)}
                  />
                  <IconButton
                    icon="chevron-down"
                    accessibilityLabel={`Move ${item.title.title} down`}
                    size={17}
                    disabled={index === (items.data?.length ?? 0) - 1}
                    onPress={() => move(index, 1)}
                  />
                  <IconButton
                    icon="close"
                    accessibilityLabel={`Remove ${item.title.title} from list`}
                    size={17}
                    onPress={() => removeFromList.mutate(item.id)}
                  />
                </View>
              ) : null}
            </View>
          )}
          showsVerticalScrollIndicator={false}
        />
      )}

      {list.data ? (
        <Modal visible={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete list?">
          <View style={styles.modalBody}>
            <Text variant="callout" color="secondary">
              “{list.data.name}” and its {list.data.itemCount} entries will be permanently removed.
            </Text>
            <Button
              title="Delete list"
              variant="danger"
              fullWidth
              loading={deleteList.isPending}
              onPress={() => {
                const data = list.data;
                if (data) deleteList.mutate(data.id);
              }}
            />
            <Button title="Keep it" variant="ghost" fullWidth onPress={() => setConfirmDelete(false)} />
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
  commentsWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  ownerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rank: {
    width: 28,
    textAlign: 'center',
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
});

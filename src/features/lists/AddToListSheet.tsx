import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { useAddToList, useListMembership, useUserLists } from './hooks';
import { Button } from '@/components/primitives/Button';
import { Modal } from '@/components/primitives/Modal';
import { Text } from '@/components/primitives/Text';
import { useAddToSharedWatchlist, useSharedWatchlists } from '@/features/sharedWatchlists/hooks';
import { useCurrentUserId } from '@/providers/AuthProvider';
import { toast } from '@/stores/toastStore';
import { useTheme } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme/tokens';
import type { TrackableMedia } from '@/features/tracking/api';

export function AddToListSheet({
  title,
  visible,
  onClose,
}: {
  title: TrackableMedia;
  visible: boolean;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const userId = useCurrentUserId();
  const lists = useUserLists(userId ?? undefined);
  const membership = useListMembership(title);
  const addToList = useAddToList();
  const sharedWatchlists = useSharedWatchlists();
  const addToShared = useAddToSharedWatchlist();
  const shared = sharedWatchlists.data?.watchlists ?? [];
  const displayName = title.title;

  return (
    <Modal visible={visible} onClose={onClose} title="Add to list">
      <View style={styles.body}>
        <Text variant="callout" color="secondary" numberOfLines={1}>
          {displayName}
        </Text>

        {shared.length > 0 ? (
          <>
            <Text variant="footnote" color="muted" style={styles.sectionLabel}>
              SHARED WATCHLISTS
            </Text>
            {shared.map((watchlist) => (
              <Pressable
                key={watchlist.id}
                accessibilityRole="button"
                disabled={addToShared.isPending}
                onPress={() =>
                  addToShared.mutate(
                    { listId: watchlist.id, title },
                    { onSuccess: () => toast.success(`Added to ${watchlist.name}.`) },
                  )
                }
                style={({ pressed }) => [
                  styles.row,
                  {
                    backgroundColor: pressed ? colors.surfaceHigh : colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Ionicons name="albums-outline" size={20} color={colors.accent} />
                <View style={styles.rowText}>
                  <Text variant="headline" numberOfLines={1}>
                    {watchlist.name}
                  </Text>
                  <Text variant="caption" color="muted">
                    {watchlist.member_count} member{watchlist.member_count === 1 ? '' : 's'} ·
                    shared
                  </Text>
                </View>
              </Pressable>
            ))}
            <Text variant="footnote" color="muted" style={styles.sectionLabel}>
              YOUR LISTS
            </Text>
          </>
        ) : null}
        {lists.data && lists.data.length > 0 ? (
          lists.data.map((list) => {
            const added = membership.data?.has(list.id) ?? false;
            return (
              <Pressable
                key={list.id}
                accessibilityRole="button"
                accessibilityState={{ selected: added, disabled: added }}
                disabled={added || addToList.isPending}
                onPress={() =>
                  addToList.mutate(
                    { listId: list.id, title },
                    { onSuccess: () => toast.success(`Added to ${list.name}.`) },
                  )
                }
                style={({ pressed }) => [
                  styles.row,
                  {
                    backgroundColor: added
                      ? colors.accentSoft
                      : pressed
                        ? colors.surfaceHigh
                        : colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Ionicons
                  name={added ? 'checkmark-circle' : 'add-circle-outline'}
                  size={20}
                  color={added ? colors.accent : colors.textSecondary}
                />
                <View style={styles.rowText}>
                  <Text variant="headline" numberOfLines={1}>
                    {list.name}
                  </Text>
                  <Text variant="caption" color="muted">
                    {list.itemCount} title{list.itemCount === 1 ? '' : 's'}
                    {list.visibility === 'private' ? ' · private' : ''}
                  </Text>
                </View>
              </Pressable>
            );
          })
        ) : (
          <Text variant="callout" color="muted">
            You don’t have any lists yet.
          </Text>
        )}
        <Button
          title="New list"
          variant="outline"
          icon="add"
          fullWidth
          onPress={() => {
            onClose();
            router.push('/list/create');
          }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: spacing.md,
  },
  sectionLabel: {
    letterSpacing: 1,
    marginTop: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    padding: spacing.md,
  },
  rowText: {
    flex: 1,
    gap: 1,
  },
});

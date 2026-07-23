import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { useAddToList, useListMembership, useUserLists } from './hooks';
import { Button } from '@/components/primitives/Button';
import { Modal } from '@/components/primitives/Modal';
import { Text } from '@/components/primitives/Text';
import { useCurrentUserId } from '@/providers/AuthProvider';
import { toast } from '@/stores/toastStore';
import { useTheme } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme/tokens';
import type { TitleSummary } from '@/types/domain';

export function AddToListSheet({
  title,
  visible,
  onClose,
}: {
  title: TitleSummary;
  visible: boolean;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const userId = useCurrentUserId();
  const lists = useUserLists(userId ?? undefined);
  const membership = useListMembership(title);
  const addToList = useAddToList();

  return (
    <Modal visible={visible} onClose={onClose} title="Add to list">
      <View style={styles.body}>
        <Text variant="callout" color="secondary" numberOfLines={1}>
          {title.title}
        </Text>
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

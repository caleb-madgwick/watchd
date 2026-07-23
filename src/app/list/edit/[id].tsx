import { router, Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/primitives/EmptyState';
import { CardListSkeleton } from '@/components/primitives/Skeleton';
import { useList, useUpdateList } from '@/features/lists/hooks';
import { ListForm } from '@/features/lists/ListForm';
import { ProfileSubpageShell } from '@/features/profile/ProfileSubpageShell';
import { useCurrentUserId } from '@/providers/AuthProvider';
import { contentWidth, spacing } from '@/theme/tokens';

export default function EditListScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const currentUserId = useCurrentUserId();
  const list = useList(id);
  const updateList = useUpdateList(id ?? '');

  const isOwner = !!list.data && list.data.ownerId === currentUserId;

  return (
    <ProfileSubpageShell title="Edit list">
      <Stack.Screen options={{ title: 'Edit list — Watchd' }} />
      <View style={styles.page}>
        {list.isLoading ? (
          <CardListSkeleton count={2} />
        ) : !list.data || !isOwner ? (
          <EmptyState
            icon="lock-closed-outline"
            title="Can’t edit this list"
            message="Only the owner can edit a list."
          />
        ) : (
          <ListForm
            initial={{
              name: list.data.name,
              description: list.data.description,
              visibility: list.data.visibility,
            }}
            submitTitle="Save changes"
            submitting={updateList.isPending}
            onSubmit={(values) =>
              updateList.mutate(values, { onSuccess: () => router.back() })
            }
          />
        )}
      </View>
    </ProfileSubpageShell>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    width: '100%',
    maxWidth: contentWidth.prose,
    alignSelf: 'center',
    padding: spacing.lg,
  },
});

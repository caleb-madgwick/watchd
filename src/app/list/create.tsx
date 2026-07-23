import { router, Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/primitives/EmptyState';
import { config } from '@/constants/config';
import { useCreateList } from '@/features/lists/hooks';
import { ListForm } from '@/features/lists/ListForm';
import { ProfileSubpageShell } from '@/features/profile/ProfileSubpageShell';
import { useAuth } from '@/providers/AuthProvider';
import { contentWidth, spacing } from '@/theme/tokens';

export default function CreateListScreen() {
  const { session } = useAuth();
  const createList = useCreateList();

  return (
    <ProfileSubpageShell title="New list">
      <Stack.Screen options={{ title: 'New list — Watchd' }} />
      <View style={styles.page}>
        {config.demoMode || !session ? (
          <EmptyState
            icon="albums-outline"
            title="Sign in to create lists"
            message="Lists live in your account."
          />
        ) : (
          <ListForm
            submitTitle="Create list"
            submitting={createList.isPending}
            onSubmit={(values) =>
              createList.mutate(values, {
                onSuccess: (id) => router.replace(`/list/${id}`),
              })
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

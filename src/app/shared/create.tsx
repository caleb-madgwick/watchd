import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/primitives/Button';
import { EmptyState } from '@/components/primitives/EmptyState';
import { Text } from '@/components/primitives/Text';
import { TextInput } from '@/components/primitives/TextInput';
import { config } from '@/constants/config';
import { useCreateSharedWatchlist } from '@/features/sharedWatchlists/hooks';
import { ProfileSubpageShell } from '@/features/profile/ProfileSubpageShell';
import { useAuth } from '@/providers/AuthProvider';
import { contentWidth, spacing } from '@/theme/tokens';

export default function CreateSharedWatchlistScreen() {
  const { session } = useAuth();
  const create = useCreateSharedWatchlist();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | undefined>();

  const submit = () => {
    if (!name.trim()) {
      setError('Give your shared watchlist a name.');
      return;
    }
    setError(undefined);
    create.mutate(name, {
      onSuccess: (id) => router.replace(`/shared/${id}`),
    });
  };

  return (
    <ProfileSubpageShell title="New shared watchlist">
      <Stack.Screen options={{ title: 'New shared watchlist — Video Club' }} />
      <View style={styles.page}>
        {config.demoMode || !session ? (
          <EmptyState
            icon="albums-outline"
            title="Sign in to create a shared watchlist"
            message="Shared watchlists live in your account."
          />
        ) : (
          <View style={styles.form}>
            <TextInput
              label="Name"
              value={name}
              onChangeText={setName}
              maxLength={100}
              error={error}
              placeholder="e.g. Movie nights"
              autoFocus
            />
            <Text variant="footnote" color="muted">
              You’ll be the owner. Invite friends once it’s created — everyone can add and check off
              titles together.
            </Text>
            <Button
              title="Create shared watchlist"
              fullWidth
              loading={create.isPending}
              onPress={submit}
            />
          </View>
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
  form: {
    gap: spacing.lg,
  },
});

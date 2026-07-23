import { router, Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/primitives/EmptyState';
import { ErrorState } from '@/components/primitives/ErrorState';
import { IconButton } from '@/components/primitives/IconButton';
import { Screen } from '@/components/primitives/Screen';
import { Skeleton } from '@/components/primitives/Skeleton';
import { useProfileByUsername } from '@/features/profile/hooks';
import { ProfileView } from '@/features/profile/ProfileView';
import { useCurrentUserId } from '@/providers/AuthProvider';
import { spacing } from '@/theme/tokens';

export default function UserProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const currentUserId = useCurrentUserId();
  const insets = useSafeAreaInsets();
  const profile = useProfileByUsername(username);

  return (
    <Screen>
      <Stack.Screen
        options={{ title: profile.data ? `@${profile.data.username} — Watchd` : 'Profile — Watchd' }}
      />
      <IconButton
        icon="chevron-back"
        accessibilityLabel="Go back"
        variant="filled"
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home'))}
        style={[styles.back, { top: insets.top + spacing.sm }]}
      />
      {profile.isLoading ? (
        <View style={[styles.loading, { paddingTop: insets.top + spacing['5xl'] }]}>
          <Skeleton width={84} height={84} radius={999} />
          <Skeleton width="50%" height={26} />
          <Skeleton width="70%" height={14} />
        </View>
      ) : profile.isError ? (
        <ErrorState
          title="Couldn’t load this profile"
          message="Check your connection and try again."
          onRetry={() => profile.refetch()}
        />
      ) : !profile.data ? (
        <EmptyState
          icon="person-outline"
          title="User not found"
          message={`Nobody goes by @${username ?? ''} here.`}
        />
      ) : (
        <ProfileView profile={profile.data} isSelf={profile.data.id === currentUserId} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: {
    position: 'absolute',
    left: spacing.md,
    zIndex: 10,
  },
  loading: {
    alignItems: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
});

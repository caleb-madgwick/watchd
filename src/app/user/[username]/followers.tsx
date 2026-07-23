import { Stack, useLocalSearchParams } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/primitives/EmptyState';
import { CardListSkeleton } from '@/components/primitives/Skeleton';
import { UserCard } from '@/components/profiles/UserCard';
import { useProfileByUsername } from '@/features/profile/hooks';
import { ProfileSubpageShell } from '@/features/profile/ProfileSubpageShell';
import { FollowButton } from '@/features/social/FollowButton';
import { useFollowers } from '@/features/social/hooks';
import { contentWidth, spacing } from '@/theme/tokens';

export default function FollowersScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const profile = useProfileByUsername(username);
  const followers = useFollowers(profile.data?.id);

  return (
    <ProfileSubpageShell title="Followers" subtitle={username ? `@${username}` : undefined}>
      <Stack.Screen options={{ title: `Followers of @${username ?? ''} — Video Club` }} />
      {profile.isLoading || followers.isLoading ? (
        <View style={styles.loading}>
          <CardListSkeleton count={5} />
        </View>
      ) : !followers.data || followers.data.length === 0 ? (
        <EmptyState icon="people-outline" title="No followers yet" />
      ) : (
        <FlatList
          data={followers.data}
          keyExtractor={(user) => user.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <UserCard
              username={item.username}
              displayName={item.displayName}
              avatarUrl={item.avatarUrl}
              subtitle={item.bio || undefined}
              trailing={<FollowButton targetUserId={item.id} targetUsername={item.username} />}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
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
    maxWidth: contentWidth.prose,
    alignSelf: 'center',
  },
});

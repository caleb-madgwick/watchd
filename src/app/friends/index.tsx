import { Stack } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';

import { Button } from '@/components/primitives/Button';
import { EmptyState } from '@/components/primitives/EmptyState';
import { ErrorState } from '@/components/primitives/ErrorState';
import { CardListSkeleton } from '@/components/primitives/Skeleton';
import { Text } from '@/components/primitives/Text';
import { UserCard } from '@/components/profiles/UserCard';
import { config } from '@/constants/config';
import {
  useFriends,
  usePendingFriendRequests,
  useRespondFriendRequest,
} from '@/features/friends/hooks';
import { ProfileSubpageShell } from '@/features/profile/ProfileSubpageShell';
import { useAuth, useCurrentUserId } from '@/providers/AuthProvider';
import { contentWidth, spacing } from '@/theme/tokens';
import type { FriendListEntry, PendingFriendRequest } from '@/features/friends/api';

function RequestRow({ request }: { request: PendingFriendRequest }) {
  const respond = useRespondFriendRequest();
  return (
    <UserCard
      username={request.from.username}
      displayName={request.from.displayName}
      avatarUrl={request.from.avatarUrl}
      subtitle="wants to be friends"
      trailing={
        <View style={styles.actions}>
          <Button
            title="Accept"
            size="sm"
            icon="checkmark"
            disabled={respond.isPending}
            onPress={() =>
              respond.mutate({
                requestId: request.requestId,
                accept: true,
                targetUserId: request.from.id,
              })
            }
          />
          <Button
            title="Decline"
            variant="secondary"
            size="sm"
            disabled={respond.isPending}
            onPress={() =>
              respond.mutate({
                requestId: request.requestId,
                accept: false,
                targetUserId: request.from.id,
              })
            }
          />
        </View>
      }
    />
  );
}

export default function FriendsScreen() {
  const { session } = useAuth();
  const userId = useCurrentUserId();
  const friends = useFriends(userId ?? undefined);
  const requests = usePendingFriendRequests();

  const requestItems = requests.data ?? [];
  const friendItems = friends.data ?? [];

  return (
    <ProfileSubpageShell
      title="Friends"
      subtitle={friends.data ? `${friendItems.length} friends` : undefined}
    >
      <Stack.Screen options={{ title: 'Friends — Watchd' }} />
      {config.demoMode || !session ? (
        <EmptyState
          icon="people-outline"
          title="Sign in to add friends"
          message="Friends are your inner circle for sharing watchlists."
        />
      ) : friends.isLoading ? (
        <View style={styles.loading}>
          <CardListSkeleton count={5} />
        </View>
      ) : friends.isError ? (
        <ErrorState
          title="Couldn’t load your friends"
          message="Check your connection and try again."
          onRetry={() => friends.refetch()}
        />
      ) : (
        <FlatList<FriendListEntry>
          data={friendItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            requestItems.length > 0 ? (
              <View style={styles.requests}>
                <Text variant="footnote" color="muted" style={styles.sectionLabel}>
                  FRIEND REQUESTS
                </Text>
                {requestItems.map((request) => (
                  <RequestRow key={request.requestId} request={request} />
                ))}
                <Text variant="footnote" color="muted" style={styles.sectionLabel}>
                  FRIENDS
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              icon="people-outline"
              title="No friends yet"
              message="Add friends from their profile to build a shared watchlist together."
            />
          }
          renderItem={({ item }) => (
            <UserCard
              username={item.username}
              displayName={item.displayName}
              avatarUrl={item.avatarUrl}
              subtitle={item.bio || undefined}
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
  requests: {
    gap: spacing.xs,
  },
  sectionLabel: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    letterSpacing: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
});

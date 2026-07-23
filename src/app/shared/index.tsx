import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/primitives/Avatar';
import { Button } from '@/components/primitives/Button';
import { EmptyState } from '@/components/primitives/EmptyState';
import { ErrorState } from '@/components/primitives/ErrorState';
import { LinkPressable } from '@/components/primitives/LinkPressable';
import { CardListSkeleton } from '@/components/primitives/Skeleton';
import { Text } from '@/components/primitives/Text';
import { config } from '@/constants/config';
import { avatarPublicUrl } from '@/lib/supabase/storage';
import {
  usePendingSharedInvites,
  useRespondSharedInvite,
  useSharedWatchlists,
} from '@/features/sharedWatchlists/hooks';
import { ProfileSubpageShell } from '@/features/profile/ProfileSubpageShell';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/theme/ThemeContext';
import { contentWidth, radius, spacing } from '@/theme/tokens';
import type { SharedWatchlistInvitePayload, SharedWatchlistSummaryPayload } from '@/types/database';

function InviteRow({ invite }: { invite: SharedWatchlistInvitePayload }) {
  const { colors } = useTheme();
  const respond = useRespondSharedInvite();
  const inviterName = invite.inviter.display_name?.trim() || invite.inviter.username;
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.inviteHeader}>
        <Avatar url={avatarPublicUrl(invite.inviter.avatar_path)} name={inviterName} size={36} />
        <View style={styles.inviteText}>
          <Text variant="headline" numberOfLines={1}>
            {invite.watchlist.name}
          </Text>
          <Text variant="footnote" color="muted" numberOfLines={1}>
            {inviterName} invited you · {invite.watchlist.item_count} titles
          </Text>
        </View>
      </View>
      <View style={styles.inviteActions}>
        <Button
          title="Join"
          size="sm"
          icon="checkmark"
          disabled={respond.isPending}
          onPress={() => respond.mutate({ inviteId: invite.id, accept: true })}
        />
        <Button
          title="Dismiss"
          variant="secondary"
          size="sm"
          disabled={respond.isPending}
          onPress={() => respond.mutate({ inviteId: invite.id, accept: false })}
        />
      </View>
    </View>
  );
}

function WatchlistCard({ item }: { item: SharedWatchlistSummaryPayload }) {
  const { colors } = useTheme();
  return (
    <LinkPressable
      href={`/shared/${item.id}`}
      accessibilityLabel={item.name}
      style={({ pressed, hovered }) => [
        styles.card,
        styles.watchlistRow,
        {
          backgroundColor: pressed || hovered ? colors.surfaceHigh : colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
        <View style={[styles.icon, { backgroundColor: colors.accentSoft }]}>
          <Ionicons name="albums" size={22} color={colors.accent} />
        </View>
        <View style={styles.watchlistText}>
          <Text variant="headline" numberOfLines={1}>
            {item.name}
          </Text>
          <Text variant="footnote" color="muted">
            {item.item_count} title{item.item_count === 1 ? '' : 's'} · {item.member_count} member
            {item.member_count === 1 ? '' : 's'}
            {item.role === 'owner' ? ' · owner' : ''}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </LinkPressable>
  );
}

export default function SharedWatchlistsScreen() {
  const { session } = useAuth();
  const watchlists = useSharedWatchlists();
  const invites = usePendingSharedInvites();

  const items = watchlists.data?.watchlists ?? [];
  const inviteItems = invites.data ?? [];

  return (
    <ProfileSubpageShell
      title="Shared watchlists"
      subtitle={watchlists.data ? `${items.length} shared` : undefined}
    >
      <Stack.Screen options={{ title: 'Shared watchlists — Video Club' }} />
      {config.demoMode || !session ? (
        <EmptyState
          icon="albums-outline"
          title="Sign in to share a watchlist"
          message="Create a shared space and invite friends to build it together."
        />
      ) : watchlists.isLoading ? (
        <View style={styles.loading}>
          <CardListSkeleton count={4} />
        </View>
      ) : watchlists.isError ? (
        <ErrorState
          title="Couldn’t load your shared watchlists"
          message="Check your connection and try again."
          onRetry={() => watchlists.refetch()}
        />
      ) : (
        <FlatList<SharedWatchlistSummaryPayload>
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View style={styles.headerBlock}>
              <Button
                title="New shared watchlist"
                icon="add"
                variant="outline"
                fullWidth
                onPress={() => router.push('/shared/create')}
              />
              {inviteItems.length > 0 ? (
                <View style={styles.invites}>
                  <Text variant="footnote" color="muted" style={styles.sectionLabel}>
                    INVITES
                  </Text>
                  {inviteItems.map((invite) => (
                    <InviteRow key={invite.id} invite={invite} />
                  ))}
                </View>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            <EmptyState
              icon="albums-outline"
              title="No shared watchlists yet"
              message="Create one and invite a friend to plan what to watch together."
            />
          }
          renderItem={({ item }) => <WatchlistCard item={item} />}
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
  headerBlock: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.lg,
  },
  invites: {
    gap: spacing.sm,
  },
  sectionLabel: {
    letterSpacing: 1,
  },
  card: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    gap: spacing.md,
  },
  watchlistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  watchlistText: {
    flex: 1,
    gap: 2,
  },
  inviteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  inviteText: {
    flex: 1,
    gap: 2,
  },
  inviteActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});

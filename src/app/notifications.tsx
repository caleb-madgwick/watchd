import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/primitives/Avatar';
import { EmptyState } from '@/components/primitives/EmptyState';
import { ErrorState } from '@/components/primitives/ErrorState';
import { CardListSkeleton } from '@/components/primitives/Skeleton';
import { Text } from '@/components/primitives/Text';
import { config } from '@/constants/config';
import {
  useMarkNotificationsRead,
  useNotifications,
  useUnreadNotificationCount,
} from '@/features/notifications/hooks';
import { presentNotification } from '@/features/notifications/present';
import { ProfileSubpageShell } from '@/features/profile/ProfileSubpageShell';
import { avatarPublicUrl } from '@/lib/supabase/storage';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/theme/ThemeContext';
import { contentWidth, radius, spacing } from '@/theme/tokens';
import type { NotificationItem } from '@/types/database';
import { timeAgo } from '@/utils/dates';

function NotificationRow({
  item,
  viewerUsername,
  unread,
}: {
  item: NotificationItem;
  viewerUsername: string | null;
  unread: boolean;
}) {
  const { colors } = useTheme();
  const { icon, verb, href } = presentNotification(item, viewerUsername);
  const name = item.actor?.display_name?.trim() || item.actor?.username || 'Someone';

  return (
    <Pressable
      accessibilityRole={href ? 'link' : undefined}
      disabled={!href}
      onPress={() => href && router.push(href)}
      style={({ pressed, hovered }) => [
        styles.row,
        {
          backgroundColor: unread
            ? colors.accentSoft
            : pressed || hovered
              ? colors.surface
              : 'transparent',
        },
      ]}
    >
      <View>
        <Avatar url={avatarPublicUrl(item.actor?.avatar_path ?? null)} name={name} size={44} />
        <View style={[styles.typeBadge, { backgroundColor: colors.accent, borderColor: colors.bg }]}>
          <Ionicons name={icon} size={11} color={colors.onAccent} />
        </View>
      </View>

      <View style={styles.rowText}>
        <Text variant="subhead" numberOfLines={3}>
          {name}{' '}
          <Text variant="subhead" color="muted">
            {verb}
          </Text>
        </Text>
        <Text variant="caption" color="muted">
          {timeAgo(item.created_at)}
        </Text>
      </View>

      {unread ? <View style={[styles.unreadDot, { backgroundColor: colors.accent }]} /> : null}
    </Pressable>
  );
}

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const notifications = useNotifications();
  const unread = useUnreadNotificationCount();
  const markRead = useMarkNotificationsRead();

  const items = notifications.data?.pages.flat() ?? [];

  // Capture which entries were unread on first load, then mark everything read
  // so the badge clears on open while the highlight persists for this session.
  const initialUnread = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!notifications.isSuccess || initialUnread.current !== null) return;
    const firstPage = notifications.data?.pages[0] ?? [];
    const ids = new Set(firstPage.filter((n) => !n.read_at).map((n) => n.id));
    initialUnread.current = ids;
    if ((unread.data ?? 0) > 0) markRead.mutate(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications.isSuccess]);

  if (config.demoMode) {
    return (
      <ProfileSubpageShell title="Notifications">
        <EmptyState
          icon="notifications-outline"
          title="Notifications need an account"
          message="Connect Supabase and sign in to get notified about follows, likes, comments and friend requests."
        />
      </ProfileSubpageShell>
    );
  }

  return (
    <ProfileSubpageShell title="Notifications">
      <View style={styles.page}>
        {notifications.isLoading ? (
          <View style={styles.skeletons}>
            <CardListSkeleton count={6} />
          </View>
        ) : notifications.isError ? (
          <ErrorState
            title="Couldn’t load notifications"
            message="Check your connection and try again."
            onRetry={() => notifications.refetch()}
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon="notifications-outline"
            title="You’re all caught up"
            message="Follows, likes, comments and friend requests will show up here."
          />
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <NotificationRow
                item={item}
                viewerUsername={profile?.username ?? null}
                unread={initialUnread.current?.has(item.id) ?? false}
              />
            )}
            contentContainerStyle={styles.list}
            onEndReached={() => {
              if (notifications.hasNextPage && !notifications.isFetchingNextPage) {
                notifications.fetchNextPage();
              }
            }}
            onEndReachedThreshold={0.4}
            refreshing={notifications.isRefetching && !notifications.isFetchingNextPage}
            onRefresh={() => notifications.refetch()}
            ListFooterComponent={
              notifications.isFetchingNextPage ? (
                <ActivityIndicator color={colors.accent} style={styles.footerSpinner} />
              ) : null
            }
            showsVerticalScrollIndicator={false}
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
  },
  skeletons: {
    padding: spacing.lg,
  },
  list: {
    padding: spacing.sm,
    paddingBottom: spacing['6xl'],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  typeBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 20,
    height: 20,
    borderRadius: radius.full,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: radius.full,
  },
  footerSpinner: {
    paddingVertical: spacing.xl,
  },
});

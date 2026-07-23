import { useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { ActivityCard } from '@/components/activity/ActivityCard';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { EmptyState } from '@/components/primitives/EmptyState';
import { ErrorState } from '@/components/primitives/ErrorState';
import { FilterChip } from '@/components/primitives/FilterChip';
import { Screen } from '@/components/primitives/Screen';
import { CardListSkeleton } from '@/components/primitives/Skeleton';
import { Text } from '@/components/primitives/Text';
import { config } from '@/constants/config';
import { useActivityFeed } from '@/features/activity/hooks';
import { useTheme } from '@/theme/ThemeContext';
import { contentWidth, spacing } from '@/theme/tokens';
import type { FeedItem } from '@/types/database';

type ActivityFilter = 'all' | 'watches' | 'reviews' | 'lists' | 'follows';

const FILTERS: { value: ActivityFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'watches', label: 'Watches' },
  { value: 'reviews', label: 'Reviews' },
  { value: 'lists', label: 'Lists' },
  { value: 'follows', label: 'Follows' },
];

function matchesFilter(item: FeedItem, filter: ActivityFilter): boolean {
  switch (filter) {
    case 'watches':
      return item.activity_type === 'logged' || item.activity_type === 'tv_completed';
    case 'reviews':
      return item.activity_type === 'logged' && item.metadata?.has_review === true;
    case 'lists':
      return item.activity_type === 'list_created';
    case 'follows':
      return item.activity_type === 'followed';
    default:
      return true;
  }
}

export default function ActivityScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const feed = useActivityFeed();
  const [filter, setFilter] = useState<ActivityFilter>('all');

  const allItems = feed.data?.pages.flat() ?? [];
  const items = filter === 'all' ? allItems : allItems.filter((item) => matchesFilter(item, filter));

  if (config.demoMode) {
    return (
      <Screen padTop>
        <EmptyState
          icon="pulse-outline"
          title="Activity needs an account"
          message="Connect Supabase and follow people to see their watching, ratings and reviews here."
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={[styles.page, { paddingTop: insets.top + spacing.lg }]}>
        <View style={styles.headingRow}>
          <Text variant="title1">Activity</Text>
          <NotificationBell />
        </View>

        {allItems.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filters}
          >
            {FILTERS.map((f) => (
              <FilterChip
                key={f.value}
                label={f.label}
                selected={filter === f.value}
                onPress={() => setFilter(f.value)}
              />
            ))}
          </ScrollView>
        ) : null}

        {feed.isLoading ? (
          <View style={styles.skeletons}>
            <CardListSkeleton count={5} />
          </View>
        ) : feed.isError ? (
          <ErrorState
            title="Couldn’t load your feed"
            message="Check your connection and try again."
            onRetry={() => feed.refetch()}
          />
        ) : allItems.length === 0 ? (
          <EmptyState
            icon="people-outline"
            title="Nothing here yet"
            message="Follow other members — their watches, ratings, reviews and lists will appear here."
            actionTitle="Find people to follow"
            onAction={() => router.push('/search')}
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon="funnel-outline"
            title="No matching activity"
            message="Nothing here for this filter yet — try another."
          />
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <ActivityCard item={item} />}
            ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
            contentContainerStyle={styles.list}
            onEndReached={() => {
              if (feed.hasNextPage && !feed.isFetchingNextPage) feed.fetchNextPage();
            }}
            onEndReachedThreshold={0.4}
            refreshing={feed.isRefetching && !feed.isFetchingNextPage}
            onRefresh={() => feed.refetch()}
            ListFooterComponent={
              feed.isFetchingNextPage ? (
                <ActivityIndicator color={colors.accent} style={styles.footerSpinner} />
              ) : null
            }
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    width: '100%',
    maxWidth: contentWidth.prose,
    alignSelf: 'center',
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  filters: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  skeletons: {
    padding: spacing.lg,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['6xl'],
  },
  footerSpinner: {
    paddingVertical: spacing.xl,
  },
});

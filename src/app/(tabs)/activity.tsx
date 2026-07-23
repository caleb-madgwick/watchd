import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { ActivityCard } from '@/components/activity/ActivityCard';
import { EmptyState } from '@/components/primitives/EmptyState';
import { ErrorState } from '@/components/primitives/ErrorState';
import { Screen } from '@/components/primitives/Screen';
import { CardListSkeleton } from '@/components/primitives/Skeleton';
import { Text } from '@/components/primitives/Text';
import { config } from '@/constants/config';
import { useActivityFeed } from '@/features/activity/hooks';
import { useTheme } from '@/theme/ThemeContext';
import { contentWidth, spacing } from '@/theme/tokens';

export default function ActivityScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const feed = useActivityFeed();

  const items = feed.data?.pages.flat() ?? [];

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
        <Text variant="title1" style={styles.heading}>
          Activity
        </Text>

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
        ) : items.length === 0 ? (
          <EmptyState
            icon="people-outline"
            title="Nothing here yet"
            message="Follow other members — their watches, ratings, reviews and lists will appear here."
            actionTitle="Find people to follow"
            onAction={() => router.push('/search')}
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
  heading: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
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

import { useInfiniteQuery } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PosterCard } from '@/components/media/PosterCard';
import { ErrorState } from '@/components/primitives/ErrorState';
import { ResponsiveGrid } from '@/components/primitives/ResponsiveGrid';
import { Screen } from '@/components/primitives/Screen';
import { SegmentedControl } from '@/components/primitives/SegmentedControl';
import { PosterRowSkeleton } from '@/components/primitives/Skeleton';
import { Text } from '@/components/primitives/Text';
import { tmdb } from '@/lib/tmdb/client';
import { useTheme } from '@/theme/ThemeContext';
import { contentWidth, spacing } from '@/theme/tokens';
import type { MediaType, Paginated, TitleSummary } from '@/types/domain';
import { titleHref } from '@/utils/titles';

type BrowseTab = 'trending' | 'popular' | 'top_rated';

const TABS: { value: BrowseTab; label: string }[] = [
  { value: 'trending', label: 'Trending' },
  { value: 'popular', label: 'Popular' },
  { value: 'top_rated', label: 'Top rated' },
];

function fetchPage(mediaType: MediaType, tab: BrowseTab, page: number): Promise<Paginated<TitleSummary>> {
  if (mediaType === 'movie') {
    if (tab === 'trending') return tmdb.trendingMovies(page);
    if (tab === 'top_rated') return tmdb.topRatedMovies(page);
    return tmdb.popularMovies(page);
  }
  if (tab === 'trending') return tmdb.trendingTv(page);
  if (tab === 'top_rated') return tmdb.topRatedTv(page);
  return tmdb.popularTv(page);
}

/** Dedicated Movies / TV browse pages behind the sidebar sections. */
export function BrowseTitlesScreen({ mediaType }: { mediaType: MediaType }) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<BrowseTab>('trending');

  const browse = useInfiniteQuery({
    queryKey: ['tmdb', 'browse', mediaType, tab],
    staleTime: 30 * 60_000,
    initialPageParam: 1,
    queryFn: ({ pageParam }) => fetchPage(mediaType, tab, pageParam),
    getNextPageParam: (lastPage) =>
      lastPage.page < Math.min(lastPage.totalPages, 20) ? lastPage.page + 1 : undefined,
  });

  const titles = browse.data?.pages.flatMap((page) => page.results) ?? [];
  const heading = mediaType === 'movie' ? 'Movies' : 'TV shows';

  return (
    <Screen>
      <Stack.Screen options={{ title: `${heading} — Video Club` }} />
      <View style={[styles.page, { paddingTop: insets.top + spacing.lg }]}>
        <View style={styles.header}>
          <Text variant="title1">{heading}</Text>
          <View style={styles.tabs}>
            <SegmentedControl options={TABS} value={tab} onChange={setTab} />
          </View>
        </View>

        {browse.isLoading ? (
          <View style={styles.loading}>
            <PosterRowSkeleton count={4} />
          </View>
        ) : browse.isError ? (
          <ErrorState
            title={`Couldn’t load ${heading.toLowerCase()}`}
            message="TMDB may be unreachable right now."
            onRetry={() => browse.refetch()}
          />
        ) : (
          <ResponsiveGrid
            containerWidth={Math.min(width, contentWidth.page)}
            data={titles}
            keyExtractor={(item) => `${item.mediaType}-${item.tmdbId}`}
            minItemWidth={116}
            renderItem={(item, itemWidth) => (
              <PosterCard
                title={item.title}
                posterUrl={item.posterUrl}
                year={item.releaseYear}
                rating={item.tmdbRating ? item.tmdbRating / 2 : undefined}
                href={titleHref(item.mediaType, item.tmdbId)}
                width={itemWidth}
              />
            )}
            onEndReached={() => {
              if (browse.hasNextPage && !browse.isFetchingNextPage) browse.fetchNextPage();
            }}
            ListFooterComponent={
              browse.isFetchingNextPage ? (
                <ActivityIndicator color={colors.accent} style={styles.footerSpinner} />
              ) : null
            }
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
    maxWidth: contentWidth.page,
    alignSelf: 'center',
  },
  header: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  tabs: {
    maxWidth: 380,
  },
  loading: {
    paddingVertical: spacing.lg,
  },
  footerSpinner: {
    paddingVertical: spacing.xl,
  },
});

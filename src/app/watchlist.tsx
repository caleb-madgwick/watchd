import { useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';

import { TitleCard } from '@/components/media/TitleCard';
import { EmptyState } from '@/components/primitives/EmptyState';
import { ErrorState } from '@/components/primitives/ErrorState';
import { FilterChip } from '@/components/primitives/FilterChip';
import { IconButton } from '@/components/primitives/IconButton';
import { CardListSkeleton } from '@/components/primitives/Skeleton';
import { Stack } from 'expo-router';
import { config } from '@/constants/config';
import { ProfileSubpageShell } from '@/features/profile/ProfileSubpageShell';
import { useSetStatus, useWatchlist, type WatchlistItem } from '@/features/tracking/queries';
import { useAuth } from '@/providers/AuthProvider';
import { contentWidth, spacing } from '@/theme/tokens';
import type { MediaType, TitleSummary } from '@/types/domain';
import { mediaTypeLabel, titleHref } from '@/utils/titles';

type SortKey = 'added' | 'title' | 'release';

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'added', label: 'Recently added' },
  { value: 'title', label: 'Title' },
  { value: 'release', label: 'Release date' },
];

function MarkWatchedButton({ title }: { title: TitleSummary }) {
  const setStatus = useSetStatus(title);
  return (
    <IconButton
      icon="checkmark-circle-outline"
      accessibilityLabel={`Mark ${title.title} as watched`}
      onPress={() => setStatus.mutate('watched')}
      disabled={setStatus.isPending}
    />
  );
}

export default function WatchlistScreen() {
  const { session } = useAuth();
  const watchlist = useWatchlist();
  const [sort, setSort] = useState<SortKey>('added');
  const [typeFilter, setTypeFilter] = useState<MediaType | 'all'>('all');

  const items = useMemo(() => {
    let filtered: WatchlistItem[] = watchlist.data ?? [];
    if (typeFilter !== 'all') {
      filtered = filtered.filter((item) => item.title.mediaType === typeFilter);
    }
    const sorted = [...filtered];
    if (sort === 'title') {
      sorted.sort((a, b) => a.title.title.localeCompare(b.title.title));
    } else if (sort === 'release') {
      sorted.sort((a, b) => (b.title.releaseDate ?? '').localeCompare(a.title.releaseDate ?? ''));
    }
    return sorted;
  }, [watchlist.data, sort, typeFilter]);

  return (
    <ProfileSubpageShell
      title="Watchlist"
      subtitle={watchlist.data ? `${watchlist.data.length} saved` : undefined}
    >
      <Stack.Screen options={{ title: 'Watchlist — Watchd' }} />
      {config.demoMode || !session ? (
        <EmptyState
          icon="bookmark-outline"
          title="Sign in to build a watchlist"
          message="Save anything you want to watch later."
        />
      ) : watchlist.isLoading ? (
        <View style={styles.loading}>
          <CardListSkeleton count={6} />
        </View>
      ) : watchlist.isError ? (
        <ErrorState
          title="Couldn’t load your watchlist"
          message="Check your connection and try again."
          onRetry={() => watchlist.refetch()}
        />
      ) : (watchlist.data?.length ?? 0) === 0 ? (
        <EmptyState
          icon="bookmark-outline"
          title="Nothing saved yet"
          message="Tap the bookmark on any movie or show to add it here."
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.statusId}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filters}
            >
              <FilterChip
                label="All"
                selected={typeFilter === 'all'}
                onPress={() => setTypeFilter('all')}
              />
              <FilterChip
                label="Movies"
                selected={typeFilter === 'movie'}
                onPress={() => setTypeFilter('movie')}
              />
              <FilterChip
                label="TV"
                selected={typeFilter === 'tv'}
                onPress={() => setTypeFilter('tv')}
              />
              <View style={styles.filterDivider} />
              {SORTS.map((option) => (
                <FilterChip
                  key={option.value}
                  label={option.label}
                  selected={sort === option.value}
                  onPress={() => setSort(option.value)}
                />
              ))}
            </ScrollView>
          }
          renderItem={({ item }) => (
            <TitleCard
              title={item.title.title}
              posterUrl={item.title.posterUrl}
              year={item.title.releaseYear}
              mediaTypeLabel={mediaTypeLabel(item.title.mediaType)}
              href={titleHref(item.title.mediaType, item.title.tmdbId)}
              trailing={<MarkWatchedButton title={item.title} />}
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
    paddingBottom: spacing['6xl'],
    width: '100%',
    maxWidth: contentWidth.page,
    alignSelf: 'center',
  },
  filters: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  filterDivider: {
    width: spacing.md,
  },
});

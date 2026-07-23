import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TitleCard } from '@/components/media/TitleCard';
import { Button } from '@/components/primitives/Button';
import { EmptyState } from '@/components/primitives/EmptyState';
import { ErrorState } from '@/components/primitives/ErrorState';
import { Screen } from '@/components/primitives/Screen';
import { SearchInput } from '@/components/primitives/SearchInput';
import { CardListSkeleton } from '@/components/primitives/Skeleton';
import { Text } from '@/components/primitives/Text';
import { useTitleSearch } from '@/features/search/hooks';
import { LogSheet } from '@/features/tracking/LogSheet';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { contentWidth, spacing } from '@/theme/tokens';
import type { TitleSummary } from '@/types/domain';
import { mediaTypeLabel, titleHref } from '@/utils/titles';

/** The Log tab: find a title fast, log it in place. */
export default function LogScreen() {
  const insets = useSafeAreaInsets();
  const [input, setInput] = useState('');
  const query = useDebouncedValue(input, 350);
  const [logging, setLogging] = useState<TitleSummary | null>(null);

  const search = useTitleSearch('all', query);
  const results = search.data?.pages.flatMap((page) => page.results) ?? [];
  const showingResults = query.trim().length >= 2;

  return (
    <Screen>
      <View style={[styles.page, { paddingTop: insets.top + spacing.lg }]}>
        <View style={styles.header}>
          <Text variant="title1">Log something</Text>
          <Text variant="callout" color="secondary">
            Search for what you just watched, then rate and review it.
          </Text>
        </View>
        <View style={styles.searchWrap}>
          <SearchInput
            placeholder="What did you watch?"
            value={input}
            onChangeText={setInput}
            onClear={() => setInput('')}
            autoFocus={false}
          />
        </View>

        {!showingResults ? (
          <EmptyState
            icon="create-outline"
            title="Log your latest watch"
            message="Search a movie or show, then log it with a date, rating and review — all in one step."
          />
        ) : search.isLoading ? (
          <View style={styles.skeletons}>
            <CardListSkeleton count={5} />
          </View>
        ) : search.isError ? (
          <ErrorState
            title="Search failed"
            message="Couldn’t reach the catalogue. Try again."
            onRetry={() => search.refetch()}
          />
        ) : results.length === 0 ? (
          <EmptyState
            icon="telescope-outline"
            title={`No results for “${query.trim()}”`}
            message="Check the spelling or try another title."
          />
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item) => `${item.mediaType}-${item.tmdbId}`}
            keyboardShouldPersistTaps="handled"
            onEndReached={() => {
              if (search.hasNextPage && !search.isFetchingNextPage) search.fetchNextPage();
            }}
            onEndReachedThreshold={0.4}
            renderItem={({ item }) => (
              <TitleCard
                title={item.title}
                posterUrl={item.posterUrl}
                year={item.releaseYear}
                mediaTypeLabel={mediaTypeLabel(item.mediaType)}
                href={titleHref(item.mediaType, item.tmdbId)}
                trailing={<Button title="Log" size="sm" onPress={() => setLogging(item)} />}
              />
            )}
            contentContainerStyle={styles.results}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {logging ? (
        <LogSheet title={logging} visible={!!logging} onClose={() => setLogging(null)} />
      ) : null}
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
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  searchWrap: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  skeletons: {
    padding: spacing.lg,
  },
  results: {
    paddingBottom: spacing['6xl'],
  },
});

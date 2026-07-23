import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { ErrorState } from '@/components/primitives/ErrorState';
import { EmptyState } from '@/components/primitives/EmptyState';
import { RatingInput } from '@/components/primitives/RatingStars';
import { SearchInput } from '@/components/primitives/SearchInput';
import { CardListSkeleton } from '@/components/primitives/Skeleton';
import { Text } from '@/components/primitives/Text';
import { OnboardingShell } from '@/features/onboarding/OnboardingShell';
import { updateProfile } from '@/features/profile/api';
import { useTitleSearch } from '@/features/search/hooks';
import { rateInitialTitle } from '@/features/tracking/api';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { track } from '@/lib/analytics';
import { tmdb } from '@/lib/tmdb/client';
import { useAuth } from '@/providers/AuthProvider';
import { toast } from '@/stores/toastStore';
import { useTheme } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme/tokens';
import type { TitleSummary } from '@/types/domain';

function titleKey(title: TitleSummary) {
  return `${title.mediaType}-${title.tmdbId}`;
}

function RateRow({
  title,
  rating,
  onRate,
}: {
  title: TitleSummary;
  rating: number;
  onRate: (title: TitleSummary, value: number) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {title.posterUrl ? (
        <Image
          source={{ uri: title.posterUrl }}
          style={styles.poster}
          contentFit="cover"
          accessibilityLabel={`${title.title} poster`}
        />
      ) : (
        <View style={[styles.poster, { backgroundColor: colors.surfaceRaised }]} />
      )}
      <View style={styles.rowBody}>
        <Text variant="headline" numberOfLines={1}>
          {title.title}
        </Text>
        <Text variant="caption" color="muted">
          {[title.releaseYear, title.mediaType === 'movie' ? 'Movie' : 'TV']
            .filter(Boolean)
            .join(' · ')}
        </Text>
        <View style={styles.ratingWrap}>
          <RatingInput value={rating} onChange={(value) => onRate(title, value)} size={26} />
        </View>
      </View>
    </View>
  );
}

export default function RateTitlesStep() {
  const { session, refreshProfile } = useAuth();
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [finishing, setFinishing] = useState(false);
  const [input, setInput] = useState('');
  const query = useDebouncedValue(input, 350);
  const searching = query.trim().length >= 2;

  const popular = useQuery({
    queryKey: ['onboarding', 'rateTitles'],
    queryFn: async () => {
      const [movies, tv] = await Promise.all([tmdb.popularMovies(), tmdb.popularTv()]);
      // Interleave movies and shows so both are represented.
      const mixed: TitleSummary[] = [];
      const max = Math.max(movies.results.length, tv.results.length);
      for (let i = 0; i < max && mixed.length < 20; i++) {
        if (movies.results[i]) mixed.push(movies.results[i]);
        if (tv.results[i] && mixed.length < 20) mixed.push(tv.results[i]);
      }
      return mixed;
    },
    staleTime: 30 * 60_000,
  });

  const search = useTitleSearch('all', searching ? query : '');
  const searchResults = useMemo(
    () => search.data?.pages.flatMap((page) => page.results) ?? [],
    [search.data],
  );

  const titles = searching ? searchResults : (popular.data ?? []);
  const activeQuery = searching ? search : popular;
  const ratedCount = useMemo(() => Object.values(ratings).filter((r) => r > 0).length, [ratings]);

  const onRate = (title: TitleSummary, value: number) => {
    const key = titleKey(title);
    setRatings((current) => ({ ...current, [key]: value }));
    if (session && value > 0) {
      rateInitialTitle(session.user.id, title, value).catch(() => {
        toast.error(`Could not save your rating for ${title.title}.`);
        setRatings((current) => ({ ...current, [key]: 0 }));
      });
    }
  };

  const completeOnboarding = async () => {
    if (!session || finishing) return;
    setFinishing(true);
    try {
      await updateProfile(session.user.id, { onboarding_completed: true });
      track('onboarding_completed');
      await refreshProfile();
      router.replace('/(tabs)/home');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not finish onboarding.');
    } finally {
      setFinishing(false);
    }
  };

  return (
    <OnboardingShell
      step={4}
      title="Rate what you've seen"
      subtitle="Search anything you've watched, or pick from what's popular. Every rating sharpens your home feed — finish whenever you like."
      actionTitle={
        ratedCount > 0
          ? `Finish with ${ratedCount} rating${ratedCount === 1 ? '' : 's'}`
          : 'Finish setup'
      }
      onAction={completeOnboarding}
      actionLoading={finishing}
    >
      <View style={styles.searchWrap}>
        <SearchInput
          placeholder="Search movies and shows you've watched…"
          value={input}
          onChangeText={setInput}
          onClear={() => setInput('')}
        />
      </View>

      {activeQuery.isLoading ? (
        <CardListSkeleton count={5} />
      ) : activeQuery.isError ? (
        <ErrorState
          compact
          title="Couldn’t load titles"
          message="Check your connection — or your TMDB configuration — and try again."
          onRetry={() => activeQuery.refetch()}
        />
      ) : titles.length === 0 ? (
        <EmptyState
          compact
          icon="telescope-outline"
          title={searching ? `No results for “${query.trim()}”` : 'Nothing to show'}
          message={searching ? 'Try a different spelling or a broader search.' : undefined}
        />
      ) : (
        <FlatList
          data={titles}
          keyExtractor={titleKey}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onEndReached={() => {
            if (searching && search.hasNextPage && !search.isFetchingNextPage) {
              search.fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.4}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          renderItem={({ item }) => (
            <RateRow title={item} rating={ratings[titleKey(item)] ?? 0} onRate={onRate} />
          )}
        />
      )}
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  searchWrap: {
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.md,
  },
  poster: {
    width: 64,
    height: 96,
    borderRadius: radius.xs,
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  ratingWrap: {
    marginTop: spacing.xs,
    alignSelf: 'flex-start',
  },
});

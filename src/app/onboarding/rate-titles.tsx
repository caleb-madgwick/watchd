import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { ErrorState } from '@/components/primitives/ErrorState';
import { RatingInput } from '@/components/primitives/RatingStars';
import { CardListSkeleton } from '@/components/primitives/Skeleton';
import { Text } from '@/components/primitives/Text';
import { OnboardingShell } from '@/features/onboarding/OnboardingShell';
import { updateProfile } from '@/features/profile/api';
import { rateInitialTitle } from '@/features/tracking/api';
import { track } from '@/lib/analytics';
import { tmdb } from '@/lib/tmdb/client';
import { useAuth } from '@/providers/AuthProvider';
import { toast } from '@/stores/toastStore';
import { useTheme } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme/tokens';
import type { TitleSummary } from '@/types/domain';

const REQUIRED_RATINGS = 5;

export default function RateTitlesStep() {
  const { session, refreshProfile } = useAuth();
  const { colors } = useTheme();
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [finishing, setFinishing] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
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

  const ratedCount = useMemo(() => Object.values(ratings).filter((r) => r > 0).length, [ratings]);

  const onRate = (title: TitleSummary, value: number) => {
    const key = `${title.mediaType}-${title.tmdbId}`;
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
      title="Rate a few titles"
      subtitle={`Rate at least ${REQUIRED_RATINGS} things you've seen — it makes your home feed instantly yours.`}
      actionTitle={
        ratedCount >= REQUIRED_RATINGS
          ? 'Finish setup'
          : `Rate ${REQUIRED_RATINGS - ratedCount} more to finish`
      }
      onAction={completeOnboarding}
      actionLoading={finishing}
      actionDisabled={ratedCount < REQUIRED_RATINGS}
      onSkip={completeOnboarding}
    >
      {isLoading ? (
        <CardListSkeleton count={5} />
      ) : isError || !data ? (
        <ErrorState
          compact
          title="Couldn’t load titles"
          message="Check your connection — or your TMDB configuration — and try again."
          onRetry={() => refetch()}
        />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => `${item.mediaType}-${item.tmdbId}`}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: spacing.lg }} />}
          renderItem={({ item }) => {
            const key = `${item.mediaType}-${item.tmdbId}`;
            return (
              <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {item.posterUrl ? (
                  <Image
                    source={{ uri: item.posterUrl }}
                    style={styles.poster}
                    contentFit="cover"
                    accessibilityLabel={`${item.title} poster`}
                  />
                ) : (
                  <View style={[styles.poster, { backgroundColor: colors.surfaceRaised }]} />
                )}
                <View style={styles.rowBody}>
                  <Text variant="headline" numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text variant="caption" color="muted">
                    {[item.releaseYear, item.mediaType === 'movie' ? 'Movie' : 'TV']
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                  <View style={styles.ratingWrap}>
                    <RatingInput
                      value={ratings[key] ?? 0}
                      onChange={(value) => onRate(item, value)}
                      size={26}
                    />
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
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

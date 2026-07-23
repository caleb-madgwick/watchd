import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { CastRow } from '@/components/media/CastRow';
import { MediaRow } from '@/components/media/MediaRow';
import { WhereToWatch } from '@/components/media/WhereToWatch';
import { ErrorState } from '@/components/primitives/ErrorState';
import { Screen } from '@/components/primitives/Screen';
import { SegmentedControl } from '@/components/primitives/SegmentedControl';
import { Skeleton } from '@/components/primitives/Skeleton';
import { Text } from '@/components/primitives/Text';
import { useCommunitySummary } from '@/features/tracking/queries';
import { TitleActionBar } from '@/features/tracking/TitleActionBar';
import { useTitleEnrichment } from '@/features/titles/enrich';
import { useMovieDetails } from '@/features/titles/hooks';
import {
  formatFullDate,
  formatMoney,
  languageName,
  TitleFacts,
} from '@/features/titles/TitleFacts';
import { TitleHero } from '@/features/titles/TitleHero';
import { TitleReviewsSection } from '@/features/titles/TitleReviewsSection';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { track } from '@/lib/analytics';
import { contentWidth, spacing } from '@/theme/tokens';
import { formatRuntime } from '@/utils/titles';

type MovieTab = 'overview' | 'cast' | 'reviews' | 'more';

export default function MovieDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const tmdbId = Number.parseInt(params.id ?? '', 10);
  const validId = Number.isFinite(tmdbId) && tmdbId > 0;
  const { isDesktop } = useBreakpoint();
  const [tab, setTab] = useState<MovieTab>('overview');

  const details = useMovieDetails(validId ? tmdbId : undefined);
  const community = useCommunitySummary(validId ? { tmdbId, mediaType: 'movie' } : undefined);
  useTitleEnrichment(details.data);

  useEffect(() => {
    if (validId) track('title_opened', { mediaType: 'movie', tmdbId });
  }, [validId, tmdbId]);

  if (!validId) {
    return (
      <Screen padTop>
        <ErrorState title="Movie not found" message="This link doesn’t point to a valid movie." />
      </Screen>
    );
  }

  const movie = details.data;

  const tabs: { value: MovieTab; label: string }[] = movie
    ? [
        { value: 'overview' as const, label: 'Overview' },
        ...(movie.cast.length > 0 ? [{ value: 'cast' as const, label: 'Cast' }] : []),
        { value: 'reviews' as const, label: 'Reviews' },
        ...(movie.related.length > 0 ? [{ value: 'more' as const, label: 'More' }] : []),
      ]
    : [];

  return (
    <Screen>
      <Stack.Screen options={{ title: movie ? `${movie.title} — Video Club` : 'Movie — Video Club' }} />
      {details.isLoading ? (
        <View style={styles.loading}>
          <Skeleton height={280} radius={0} />
          <View style={styles.loadingBody}>
            <Skeleton width="60%" height={28} />
            <Skeleton width="40%" height={16} />
            <Skeleton height={90} />
          </View>
        </View>
      ) : details.isError || !movie ? (
        <ErrorState
          title="Couldn’t load this movie"
          message="TMDB may be unreachable, or this title may not exist."
          onRetry={() => details.refetch()}
        />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <TitleHero
            title={movie.title}
            tagline={movie.tagline}
            backdropUrl={movie.backdropUrl}
            posterUrl={movie.posterUrl}
            trailerUrl={movie.trailerUrl}
            metaParts={[
              movie.releaseYear?.toString(),
              formatRuntime(movie.runtimeMinutes),
              movie.genres
                .slice(0, 3)
                .map((g) => g.name)
                .join(', ') || undefined,
            ]}
            ratings={{
              tmdbRating: movie.tmdbRating,
              communityRating: community.data?.avg_rating ?? null,
              communityCount: community.data?.rating_count ?? 0,
              watchedCount: community.data?.watched_count ?? 0,
            }}
          />

          <View style={styles.body}>
            <TitleActionBar title={movie} />
            <SegmentedControl
              options={tabs}
              value={tab}
              onChange={setTab}
              scrollable={!isDesktop}
            />
          </View>

          {tab === 'overview' ? (
            <>
              <View style={[styles.body, styles.pane]}>
                {movie.overview ? (
                  <Text variant="body" color="secondary" style={styles.prose}>
                    {movie.overview}
                  </Text>
                ) : null}
                {movie.directors.length > 0 || movie.keyCrew.length > 0 ? (
                  <View style={styles.crewBlock}>
                    {movie.directors.length > 0 ? (
                      <Text variant="callout" color="secondary">
                        <Text variant="headline">Directed by </Text>
                        {movie.directors.map((d) => d.name).join(', ')}
                      </Text>
                    ) : null}
                    {movie.keyCrew
                      .filter((crew) => crew.job !== 'Director')
                      .slice(0, 3)
                      .map((crew) => (
                        <Text key={`${crew.id}-${crew.job}`} variant="footnote" color="muted">
                          {crew.job}: {crew.name}
                        </Text>
                      ))}
                  </View>
                ) : null}
                <TitleFacts
                  facts={[
                    { label: 'Released', value: formatFullDate(movie.releaseDate) },
                    { label: 'Status', value: movie.status },
                    { label: 'Language', value: languageName(movie.originalLanguage) },
                    { label: 'Budget', value: formatMoney(movie.budget) },
                    { label: 'Box office', value: formatMoney(movie.revenue) },
                    { label: 'Studio', value: movie.studios?.join(', ') || undefined },
                    { label: 'Country', value: movie.countries?.join(', ') || undefined },
                  ]}
                />
              </View>
              {movie.watch ? (
                <View style={styles.paneFull}>
                  <WhereToWatch availability={movie.watch} />
                </View>
              ) : null}
            </>
          ) : null}

          {tab === 'cast' ? (
            <View style={styles.paneFull}>
              <CastRow cast={movie.cast} />
            </View>
          ) : null}

          {tab === 'reviews' ? (
            <View style={styles.paneFull}>
              <TitleReviewsSection title={movie} />
            </View>
          ) : null}

          {tab === 'more' ? (
            <View style={styles.paneFull}>
              <MediaRow heading="More like this" titles={movie.related} />
            </View>
          ) : null}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: spacing['6xl'],
  },
  loading: {
    gap: spacing.lg,
  },
  loadingBody: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  body: {
    width: '100%',
    maxWidth: contentWidth.page,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },
  pane: {
    paddingTop: spacing.xl,
    gap: spacing.xl,
  },
  paneFull: {
    width: '100%',
    maxWidth: contentWidth.page,
    alignSelf: 'center',
    paddingTop: spacing.xl,
  },
  prose: {
    maxWidth: contentWidth.prose,
  },
  crewBlock: {
    gap: spacing.xs,
  },
});

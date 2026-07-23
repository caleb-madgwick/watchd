import { Stack, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { CastRow } from '@/components/media/CastRow';
import { MediaRow } from '@/components/media/MediaRow';
import { RatingSummary } from '@/components/media/RatingSummary';
import { Button } from '@/components/primitives/Button';
import { ErrorState } from '@/components/primitives/ErrorState';
import { Screen } from '@/components/primitives/Screen';
import { Skeleton } from '@/components/primitives/Skeleton';
import { Text } from '@/components/primitives/Text';
import { TmdbAttribution } from '@/components/TmdbAttribution';
import { useCommunitySummary } from '@/features/tracking/queries';
import { TitleActionBar } from '@/features/tracking/TitleActionBar';
import { useMovieDetails } from '@/features/titles/hooks';
import { TitleHero } from '@/features/titles/TitleHero';
import { TitleReviewsSection } from '@/features/titles/TitleReviewsSection';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { track } from '@/lib/analytics';
import { contentWidth, spacing } from '@/theme/tokens';
import { formatRuntime } from '@/utils/titles';

export default function MovieDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const tmdbId = Number.parseInt(params.id ?? '', 10);
  const validId = Number.isFinite(tmdbId) && tmdbId > 0;
  const { isDesktop } = useBreakpoint();

  const details = useMovieDetails(validId ? tmdbId : undefined);
  const community = useCommunitySummary(validId ? { tmdbId, mediaType: 'movie' } : undefined);

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

  return (
    <Screen>
      <Stack.Screen options={{ title: movie ? `${movie.title} — Watchd` : 'Movie — Watchd' }} />
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
            metaParts={[
              movie.releaseYear?.toString(),
              formatRuntime(movie.runtimeMinutes),
              movie.genres
                .slice(0, 3)
                .map((g) => g.name)
                .join(', ') || undefined,
            ]}
          />

          <View style={[styles.columns, isDesktop && styles.columnsWide]}>
            <View style={[styles.actionsColumn, isDesktop && styles.actionsColumnWide]}>
              <TitleActionBar title={movie} />
              <RatingSummary
                tmdbRating={movie.tmdbRating}
                tmdbVoteCount={movie.tmdbVoteCount}
                communityRating={community.data?.avg_rating ?? null}
                communityCount={community.data?.rating_count ?? 0}
                watchedCount={community.data?.watched_count ?? 0}
              />
              {movie.trailerUrl ? (
                <Button
                  title="Watch trailer"
                  variant="outline"
                  icon="play-outline"
                  fullWidth
                  onPress={() => WebBrowser.openBrowserAsync(movie.trailerUrl!)}
                />
              ) : null}
            </View>

            <View style={styles.mainColumn}>
              {movie.overview ? (
                <View style={styles.block}>
                  <Text variant="title3">Overview</Text>
                  <Text variant="body" color="secondary">
                    {movie.overview}
                  </Text>
                </View>
              ) : null}

              {movie.directors.length > 0 || movie.keyCrew.length > 0 ? (
                <View style={styles.block}>
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
            </View>
          </View>

          {movie.cast.length > 0 ? (
            <View style={styles.fullSection}>
              <Text variant="title3" style={styles.sectionHeading}>
                Cast
              </Text>
              <CastRow cast={movie.cast} />
            </View>
          ) : null}

          <View style={styles.fullSection}>
            <TitleReviewsSection title={movie} />
          </View>

          {movie.related.length > 0 ? (
            <View style={styles.fullSection}>
              <MediaRow heading="More like this" titles={movie.related} />
            </View>
          ) : null}

          <TmdbAttribution compact />
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
  columns: {
    width: '100%',
    maxWidth: contentWidth.page,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    gap: spacing.xl,
  },
  columnsWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing['3xl'],
  },
  actionsColumn: {
    gap: spacing.md,
  },
  actionsColumnWide: {
    width: 320,
  },
  mainColumn: {
    flex: 1,
    gap: spacing.xl,
    maxWidth: contentWidth.prose,
  },
  block: {
    gap: spacing.sm,
  },
  fullSection: {
    width: '100%',
    maxWidth: contentWidth.page,
    alignSelf: 'center',
    marginTop: spacing['2xl'],
  },
  sectionHeading: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
});

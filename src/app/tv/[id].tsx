import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { CastRow } from '@/components/media/CastRow';
import { LinkPressable } from '@/components/primitives/LinkPressable';
import { MediaRow } from '@/components/media/MediaRow';
import { RatingSummary } from '@/components/media/RatingSummary';
import { WhereToWatch } from '@/components/media/WhereToWatch';
import { Button } from '@/components/primitives/Button';
import { ErrorState } from '@/components/primitives/ErrorState';
import { Screen } from '@/components/primitives/Screen';
import { Skeleton } from '@/components/primitives/Skeleton';
import { Text } from '@/components/primitives/Text';
import { TmdbAttribution } from '@/components/TmdbAttribution';
import { useCommunitySummary } from '@/features/tracking/queries';
import { TitleActionBar } from '@/features/tracking/TitleActionBar';
import { TvProgressPanel } from '@/features/tracking/TvProgressPanel';
import { useTvDetails } from '@/features/titles/hooks';
import { TitleHero } from '@/features/titles/TitleHero';
import { TitleReviewsSection } from '@/features/titles/TitleReviewsSection';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { track } from '@/lib/analytics';
import { useTheme } from '@/theme/ThemeContext';
import { aspect, contentWidth, radius, spacing } from '@/theme/tokens';

export default function TvDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const tmdbId = Number.parseInt(params.id ?? '', 10);
  const validId = Number.isFinite(tmdbId) && tmdbId > 0;
  const { isDesktop } = useBreakpoint();
  const { colors } = useTheme();

  const details = useTvDetails(validId ? tmdbId : undefined);
  const community = useCommunitySummary(validId ? { tmdbId, mediaType: 'tv' } : undefined);

  useEffect(() => {
    if (validId) track('title_opened', { mediaType: 'tv', tmdbId });
  }, [validId, tmdbId]);

  if (!validId) {
    return (
      <Screen padTop>
        <ErrorState title="Show not found" message="This link doesn’t point to a valid TV show." />
      </Screen>
    );
  }

  const tv = details.data;

  return (
    <Screen>
      <Stack.Screen options={{ title: tv ? `${tv.title} — Watchd` : 'TV show — Watchd' }} />
      {details.isLoading ? (
        <View style={styles.loading}>
          <Skeleton height={280} radius={0} />
          <View style={styles.loadingBody}>
            <Skeleton width="60%" height={28} />
            <Skeleton width="40%" height={16} />
            <Skeleton height={90} />
          </View>
        </View>
      ) : details.isError || !tv ? (
        <ErrorState
          title="Couldn’t load this show"
          message="TMDB may be unreachable, or this title may not exist."
          onRetry={() => details.refetch()}
        />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <TitleHero
            title={tv.title}
            tagline={tv.tagline}
            backdropUrl={tv.backdropUrl}
            posterUrl={tv.posterUrl}
            metaParts={[
              tv.releaseYear?.toString(),
              tv.status,
              tv.numberOfSeasons
                ? `${tv.numberOfSeasons} season${tv.numberOfSeasons === 1 ? '' : 's'}`
                : undefined,
              tv.numberOfEpisodes ? `${tv.numberOfEpisodes} episodes` : undefined,
            ]}
          />

          <View style={[styles.columns, isDesktop && styles.columnsWide]}>
            <View style={[styles.actionsColumn, isDesktop && styles.actionsColumnWide]}>
              <TitleActionBar title={tv} />
              <TvProgressPanel tv={tv} />
              <RatingSummary
                tmdbRating={tv.tmdbRating}
                tmdbVoteCount={tv.tmdbVoteCount}
                communityRating={community.data?.avg_rating ?? null}
                communityCount={community.data?.rating_count ?? 0}
                watchedCount={community.data?.watched_count ?? 0}
              />
              {tv.trailerUrl ? (
                <Button
                  title="Watch trailer"
                  variant="outline"
                  icon="play-outline"
                  fullWidth
                  onPress={() => WebBrowser.openBrowserAsync(tv.trailerUrl!)}
                />
              ) : null}
            </View>

            <View style={styles.mainColumn}>
              {tv.overview ? (
                <View style={styles.block}>
                  <Text variant="title3">Overview</Text>
                  <Text variant="body" color="secondary">
                    {tv.overview}
                  </Text>
                </View>
              ) : null}
              {tv.creators.length > 0 ? (
                <Text variant="callout" color="secondary">
                  <Text variant="headline">Created by </Text>
                  {tv.creators.map((c) => c.name).join(', ')}
                </Text>
              ) : null}
              {tv.genres.length > 0 ? (
                <Text variant="footnote" color="muted">
                  {tv.genres.map((g) => g.name).join(' · ')}
                </Text>
              ) : null}
            </View>
          </View>

          {tv.watch ? (
            <View style={styles.fullSection}>
              <WhereToWatch availability={tv.watch} />
            </View>
          ) : null}

          {tv.seasons.length > 0 ? (
            <View style={styles.fullSection}>
              <Text variant="title3" style={styles.sectionHeading}>
                Seasons
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.seasonsRow}
              >
                {tv.seasons.map((season) => (
                  <LinkPressable
                    key={season.seasonNumber}
                    href={`/tv/${tmdbId}/season/${season.seasonNumber}`}
                    accessibilityLabel={`${season.name}, ${season.episodeCount} episodes`}
                    style={({ pressed, hovered }) => [
                      styles.seasonCard,
                      {
                        backgroundColor: pressed || hovered ? colors.surfaceHigh : colors.surface,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                      {season.posterUrl ? (
                        <Image
                          source={{ uri: season.posterUrl }}
                          style={[styles.seasonPoster, { backgroundColor: colors.surfaceRaised }]}
                          contentFit="cover"
                        />
                      ) : (
                        <View style={[styles.seasonPoster, { backgroundColor: colors.surfaceRaised }]} />
                      )}
                      <View style={styles.seasonMeta}>
                        <Text variant="subhead" numberOfLines={1}>
                          {season.name}
                        </Text>
                        <Text variant="caption" color="muted">
                          {season.episodeCount} ep{season.episodeCount === 1 ? '' : 's'}
                          {season.airYear ? ` · ${season.airYear}` : ''}
                        </Text>
                      </View>
                  </LinkPressable>
                ))}
              </ScrollView>
            </View>
          ) : null}

          {tv.cast.length > 0 ? (
            <View style={styles.fullSection}>
              <Text variant="title3" style={styles.sectionHeading}>
                Cast
              </Text>
              <CastRow cast={tv.cast} />
            </View>
          ) : null}

          <View style={styles.fullSection}>
            <TitleReviewsSection title={tv} />
          </View>

          {tv.related.length > 0 ? (
            <View style={styles.fullSection}>
              <MediaRow heading="More like this" titles={tv.related} />
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
    gap: spacing.lg,
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
  seasonsRow: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  seasonCard: {
    width: 132,
    borderRadius: radius.sm,
    borderWidth: 1,
    overflow: 'hidden',
  },
  seasonPoster: {
    width: '100%',
    height: 132 / aspect.poster,
  },
  seasonMeta: {
    padding: spacing.sm,
    gap: 2,
  },
});

import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { CastRow } from '@/components/media/CastRow';
import { MediaRow } from '@/components/media/MediaRow';
import { WhereToWatch } from '@/components/media/WhereToWatch';
import { ErrorState } from '@/components/primitives/ErrorState';
import { LinkPressable } from '@/components/primitives/LinkPressable';
import { ReelScroller } from '@/components/primitives/ReelScroller';
import { Screen } from '@/components/primitives/Screen';
import { SegmentedControl } from '@/components/primitives/SegmentedControl';
import { Skeleton } from '@/components/primitives/Skeleton';
import { Text } from '@/components/primitives/Text';
import { useCommunitySummary } from '@/features/tracking/queries';
import { TitleActionBar } from '@/features/tracking/TitleActionBar';
import { TvProgressPanel } from '@/features/tracking/TvProgressPanel';
import { useTitleEnrichment } from '@/features/titles/enrich';
import { useTvDetails } from '@/features/titles/hooks';
import { formatFullDate, languageName, TitleFacts } from '@/features/titles/TitleFacts';
import { TitleHero } from '@/features/titles/TitleHero';
import { TitleReviewsSection } from '@/features/titles/TitleReviewsSection';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { track } from '@/lib/analytics';
import { useTheme } from '@/theme/ThemeContext';
import { aspect, contentWidth, radius, spacing } from '@/theme/tokens';

type TvTab = 'overview' | 'seasons' | 'cast' | 'reviews' | 'more';

export default function TvDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const tmdbId = Number.parseInt(params.id ?? '', 10);
  const validId = Number.isFinite(tmdbId) && tmdbId > 0;
  const { isDesktop } = useBreakpoint();
  const { colors } = useTheme();
  const [tab, setTab] = useState<TvTab>('overview');

  const details = useTvDetails(validId ? tmdbId : undefined);
  const community = useCommunitySummary(validId ? { tmdbId, mediaType: 'tv' } : undefined);
  useTitleEnrichment(details.data);

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

  const tabs: { value: TvTab; label: string }[] = tv
    ? [
        { value: 'overview' as const, label: 'Overview' },
        ...(tv.seasons.length > 0 ? [{ value: 'seasons' as const, label: 'Seasons' }] : []),
        ...(tv.cast.length > 0 ? [{ value: 'cast' as const, label: 'Cast' }] : []),
        { value: 'reviews' as const, label: 'Reviews' },
        ...(tv.related.length > 0 ? [{ value: 'more' as const, label: 'More' }] : []),
      ]
    : [];

  return (
    <Screen>
      <Stack.Screen options={{ title: tv ? `${tv.title} — Video Club` : 'TV show — Video Club' }} />
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
            trailerUrl={tv.trailerUrl}
            metaParts={[
              tv.releaseYear?.toString(),
              tv.numberOfSeasons
                ? `${tv.numberOfSeasons} season${tv.numberOfSeasons === 1 ? '' : 's'}`
                : undefined,
              tv.numberOfEpisodes ? `${tv.numberOfEpisodes} episodes` : undefined,
              tv.status,
            ]}
            ratings={{
              tmdbRating: tv.tmdbRating,
              communityRating: community.data?.avg_rating ?? null,
              communityCount: community.data?.rating_count ?? 0,
              watchedCount: community.data?.watched_count ?? 0,
            }}
          />

          <View style={styles.body}>
            <TitleActionBar title={tv} />
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
                {tv.overview ? (
                  <Text variant="body" color="secondary" style={styles.prose}>
                    {tv.overview}
                  </Text>
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
                <TitleFacts
                  facts={[
                    { label: 'First aired', value: formatFullDate(tv.releaseDate) },
                    { label: 'Last aired', value: formatFullDate(tv.lastAirDate) },
                    { label: 'Network', value: tv.networks?.join(', ') || undefined },
                    {
                      label: 'Episode length',
                      value: tv.episodeRunTimeMinutes ? `${tv.episodeRunTimeMinutes} min` : undefined,
                    },
                    { label: 'Language', value: languageName(tv.originalLanguage) },
                  ]}
                />
              </View>
              {tv.watch ? (
                <View style={styles.paneFull}>
                  <WhereToWatch availability={tv.watch} />
                </View>
              ) : null}
            </>
          ) : null}

          {tab === 'seasons' ? (
            <View style={styles.paneFull}>
              <View style={styles.progressWrap}>
                <TvProgressPanel tv={tv} />
              </View>
              <ReelScroller
                contentContainerStyle={styles.seasonsRow}
                paddleCenter={132 / aspect.poster / 2}
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
              </ReelScroller>
            </View>
          ) : null}

          {tab === 'cast' ? (
            <View style={styles.paneFull}>
              <CastRow cast={tv.cast} />
            </View>
          ) : null}

          {tab === 'reviews' ? (
            <View style={styles.paneFull}>
              <TitleReviewsSection title={tv} />
            </View>
          ) : null}

          {tab === 'more' ? (
            <View style={styles.paneFull}>
              <MediaRow heading="More like this" titles={tv.related} />
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
  progressWrap: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
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

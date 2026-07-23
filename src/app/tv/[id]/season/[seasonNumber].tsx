import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/primitives/Button';
import { ErrorState } from '@/components/primitives/ErrorState';
import { IconButton } from '@/components/primitives/IconButton';
import { Screen } from '@/components/primitives/Screen';
import { CardListSkeleton } from '@/components/primitives/Skeleton';
import { Text } from '@/components/primitives/Text';
import { config } from '@/constants/config';
import { useTvProgress, useUpdateTvProgress } from '@/features/tracking/queries';
import { isShowComplete, seasonFinale } from '@/features/tracking/tvProgress';
import { useSeasonDetails, useTvDetails } from '@/features/titles/hooks';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/theme/ThemeContext';
import { contentWidth, radius, spacing } from '@/theme/tokens';
import { formatDate } from '@/utils/dates';
import { formatRuntime } from '@/utils/titles';

export default function SeasonDetailScreen() {
  const params = useLocalSearchParams<{ id: string; seasonNumber: string }>();
  const tvId = Number.parseInt(params.id ?? '', 10);
  const seasonNumber = Number.parseInt(params.seasonNumber ?? '', 10);
  const valid = Number.isFinite(tvId) && tvId > 0 && Number.isFinite(seasonNumber) && seasonNumber >= 0;

  const { colors } = useTheme();
  const { session } = useAuth();
  const insets = useSafeAreaInsets();

  const tv = useTvDetails(valid ? tvId : undefined);
  const season = useSeasonDetails(valid ? tvId : undefined, valid ? seasonNumber : undefined);
  const progress = useTvProgress(tv.data);
  const update = useUpdateTvProgress(
    tv.data ?? { tmdbId: tvId, mediaType: 'tv', title: `Show ${tvId}` },
  );

  if (!valid) {
    return (
      <Screen padTop>
        <ErrorState title="Season not found" message="This link doesn’t point to a valid season." />
      </Screen>
    );
  }

  const canTrack = !!session && !config.demoMode && !!tv.data;
  const pointer = progress.data
    ? { seasonNumber: progress.data.season_number, episodeNumber: progress.data.episode_number }
    : null;

  const isEpisodeWatched = (episodeNumber: number) =>
    !!pointer &&
    (pointer.seasonNumber > seasonNumber ||
      (pointer.seasonNumber === seasonNumber && pointer.episodeNumber >= episodeNumber));

  const markUpTo = (episodeNumber: number) => {
    if (!tv.data) return;
    const target = { seasonNumber, episodeNumber };
    update.mutate({
      seasonNumber,
      episodeNumber,
      completed: isShowComplete(tv.data.seasons, target),
    });
  };

  const markSeasonWatched = () => {
    if (!tv.data) return;
    const finale = seasonFinale(tv.data.seasons, seasonNumber);
    if (!finale) return;
    update.mutate({
      seasonNumber: finale.seasonNumber,
      episodeNumber: finale.episodeNumber,
      completed: isShowComplete(tv.data.seasons, finale),
    });
  };

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: tv.data ? `${tv.data.title} · ${season.data?.name ?? `Season ${seasonNumber}`} — Watchd` : 'Season — Watchd',
        }}
      />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm, borderBottomColor: colors.border }]}>
        <IconButton
          icon="chevron-back"
          accessibilityLabel="Go back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace(`/tv/${tvId}`))}
        />
        <View style={styles.headerText}>
          <Text variant="title3" numberOfLines={1}>
            {season.data?.name ?? `Season ${seasonNumber}`}
          </Text>
          {tv.data ? (
            <Text variant="caption" color="muted" numberOfLines={1}>
              {tv.data.title}
            </Text>
          ) : null}
        </View>
        {canTrack ? (
          <Button title="Season watched" size="sm" variant="secondary" onPress={markSeasonWatched} />
        ) : null}
      </View>

      {season.isLoading ? (
        <View style={styles.loading}>
          <CardListSkeleton count={6} />
        </View>
      ) : season.isError || !season.data ? (
        <ErrorState
          title="Couldn’t load this season"
          message="TMDB may be unreachable right now."
          onRetry={() => season.refetch()}
        />
      ) : (
        <FlatList
          data={season.data.episodes}
          keyExtractor={(episode) => String(episode.episodeNumber)}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            season.data.overview ? (
              <Text variant="callout" color="secondary" style={styles.overview}>
                {season.data.overview}
              </Text>
            ) : null
          }
          renderItem={({ item: episode }) => {
            const watched = isEpisodeWatched(episode.episodeNumber);
            return (
              <View
                style={[
                  styles.episode,
                  { backgroundColor: colors.surface, borderColor: watched ? colors.accent : colors.border },
                ]}
              >
                {episode.stillUrl ? (
                  <Image
                    source={{ uri: episode.stillUrl }}
                    style={[styles.still, { backgroundColor: colors.surfaceRaised }]}
                    contentFit="cover"
                  />
                ) : null}
                <View style={styles.episodeBody}>
                  <Text variant="headline" numberOfLines={2}>
                    {episode.episodeNumber}. {episode.name}
                  </Text>
                  <Text variant="caption" color="muted">
                    {[formatDate(episode.airDate), formatRuntime(episode.runtimeMinutes)]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                  {episode.overview ? (
                    <Text variant="footnote" color="secondary" numberOfLines={2}>
                      {episode.overview}
                    </Text>
                  ) : null}
                </View>
                {canTrack ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                      watched
                        ? `Episode ${episode.episodeNumber} watched`
                        : `Mark watched up to episode ${episode.episodeNumber}`
                    }
                    accessibilityState={{ selected: watched }}
                    onPress={() => markUpTo(episode.episodeNumber)}
                    hitSlop={8}
                    style={styles.check}
                  >
                    <Ionicons
                      name={watched ? 'checkmark-circle' : 'ellipse-outline'}
                      size={26}
                      color={watched ? colors.accent : colors.textMuted}
                    />
                  </Pressable>
                ) : null}
              </View>
            );
          }}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerText: {
    flex: 1,
  },
  loading: {
    padding: spacing.lg,
  },
  list: {
    padding: spacing.lg,
    paddingBottom: spacing['6xl'],
    width: '100%',
    maxWidth: contentWidth.page,
    alignSelf: 'center',
  },
  overview: {
    marginBottom: spacing.lg,
  },
  episode: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    padding: spacing.md,
  },
  still: {
    width: 100,
    height: 56,
    borderRadius: radius.xs,
  },
  episodeBody: {
    flex: 1,
    gap: 2,
  },
  check: {
    padding: spacing.xs,
  },
});

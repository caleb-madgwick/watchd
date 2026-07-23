import { StyleSheet, View } from 'react-native';

import { useTvProgress, useUpdateTvProgress } from './queries';
import {
  episodesWatchedCount,
  finalEpisode,
  isShowComplete,
  nextEpisode,
  totalEpisodeCount,
  type EpisodePointer,
} from './tvProgress';
import { Button } from '@/components/primitives/Button';
import { Text } from '@/components/primitives/Text';
import { config } from '@/constants/config';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme/tokens';
import type { TvDetails } from '@/types/domain';

/**
 * Show-level progress: where you're up to, mark-next-episode, finish the show.
 * Episode-precise controls live on the season pages.
 */
export function TvProgressPanel({ tv }: { tv: TvDetails }) {
  const { session } = useAuth();
  const { colors } = useTheme();
  const progress = useTvProgress(tv);
  const update = useUpdateTvProgress(tv);

  if (config.demoMode || !session || tv.seasons.length === 0) return null;

  const pointer: EpisodePointer | null = progress.data
    ? { seasonNumber: progress.data.season_number, episodeNumber: progress.data.episode_number }
    : null;
  const completed = progress.data?.completed ?? false;
  const watched = episodesWatchedCount(tv.seasons, pointer);
  const total = tv.numberOfEpisodes ?? totalEpisodeCount(tv.seasons);
  const ratio = total > 0 ? Math.min(1, watched / total) : 0;
  const next = nextEpisode(tv.seasons, pointer);
  const finale = finalEpisode(tv.seasons);

  const markNext = () => {
    if (!next) return;
    update.mutate({
      seasonNumber: next.seasonNumber,
      episodeNumber: next.episodeNumber,
      completed: isShowComplete(tv.seasons, next),
    });
  };

  const markShowWatched = () => {
    if (!finale) return;
    update.mutate({
      seasonNumber: finale.seasonNumber,
      episodeNumber: finale.episodeNumber,
      completed: true,
    });
  };

  return (
    <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.headerRow}>
        <Text variant="headline">Your progress</Text>
        <Text variant="caption" color="muted">
          {completed ? 'Finished' : pointer ? `S${pointer.seasonNumber} · E${pointer.episodeNumber}` : 'Not started'}
        </Text>
      </View>

      <View
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: total, now: watched }}
        style={[styles.track, { backgroundColor: colors.surfaceHigh }]}
      >
        <View
          style={[
            styles.fill,
            { backgroundColor: completed ? colors.success : colors.accent, width: `${Math.round(ratio * 100)}%` },
          ]}
        />
      </View>
      <Text variant="caption" color="muted">
        {watched} of {total} episodes
      </Text>

      <View style={styles.buttons}>
        {!completed && next ? (
          <Button
            title={`Watched S${next.seasonNumber} E${next.episodeNumber}`}
            variant="secondary"
            size="sm"
            icon="checkmark"
            loading={update.isPending}
            onPress={markNext}
          />
        ) : null}
        {!completed ? (
          <Button
            title="Finished the show"
            variant="outline"
            size="sm"
            icon="checkmark-done"
            onPress={markShowWatched}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  track: {
    height: 6,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.full,
  },
  buttons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});

import { StyleSheet, View } from 'react-native';

import { LinkPressable } from '@/components/primitives/LinkPressable';
import { Text } from '@/components/primitives/Text';
import { useTheme } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme/tokens';
import type { TrackSummary } from '@/types/domain';
import { formatDurationMs } from '@/utils/titles';

export interface TrackListProps {
  tracks: TrackSummary[];
  /** Album context carried to the song page so it shows the album's cover. */
  albumCoverUrl?: string;
  albumMbid?: string;
  albumTitle?: string;
}

/** Compact album tracklist; tapping a track opens its song page. */
export function TrackList({ tracks, albumCoverUrl, albumMbid, albumTitle }: TrackListProps) {
  const { colors } = useTheme();
  if (tracks.length === 0) return null;

  return (
    <View style={styles.list}>
      {tracks.map((track) => {
        const duration = formatDurationMs(track.durationMs);
        const hasSong = !!track.song.musicBrainzId;
        const row = (
          <>
            <Text variant="footnote" color="muted" style={styles.number}>
              {track.position}
            </Text>
            <Text variant="callout" numberOfLines={1} style={styles.title}>
              {track.title}
            </Text>
            {duration ? (
              <Text variant="footnote" color="muted">
                {duration}
              </Text>
            ) : null}
          </>
        );
        return hasSong ? (
          <LinkPressable
            key={`${track.discNumber ?? 1}-${track.position}`}
            href={{
              pathname: '/song/[id]',
              params: {
                id: track.song.musicBrainzId,
                cover: albumCoverUrl ?? '',
                albumId: albumMbid ?? '',
                albumTitle: albumTitle ?? '',
              },
            }}
            accessibilityLabel={`${track.title}, track ${track.position}`}
            style={({ pressed, hovered }) => [
              styles.row,
              { backgroundColor: pressed || hovered ? colors.surfaceRaised : 'transparent' },
            ]}
          >
            {row}
          </LinkPressable>
        ) : (
          <View key={`${track.discNumber ?? 1}-${track.position}`} style={styles.row}>
            {row}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 1,
    borderRadius: radius.sm,
  },
  number: {
    width: 24,
    textAlign: 'right',
  },
  title: {
    flex: 1,
  },
});

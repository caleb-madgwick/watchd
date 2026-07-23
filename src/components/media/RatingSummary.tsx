import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/primitives/Text';
import { useTheme } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme/tokens';

export interface RatingSummaryProps {
  /** TMDB average on its native 0–10 scale — always labelled as external. */
  tmdbRating?: number;
  tmdbVoteCount?: number;
  /** Video Club community average on the 0–5 scale. */
  communityRating?: number | null;
  communityCount?: number;
  watchedCount?: number;
}

export function RatingSummary({
  tmdbRating,
  tmdbVoteCount,
  communityRating,
  communityCount = 0,
  watchedCount = 0,
}: RatingSummaryProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.cell}>
        <View style={styles.valueRow}>
          <Ionicons name="star" size={14} color={colors.star} />
          <Text variant="title3">
            {communityRating != null && communityCount > 0 ? communityRating.toFixed(1) : '–'}
          </Text>
        </View>
        <Text variant="caption" color="muted">
          Video Club · {communityCount} rating{communityCount === 1 ? '' : 's'}
        </Text>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.cell}>
        <View style={styles.valueRow}>
          <Ionicons name="globe-outline" size={14} color={colors.textMuted} />
          <Text variant="title3">{tmdbRating ? tmdbRating.toFixed(1) : '–'}</Text>
          <Text variant="caption" color="muted">
            /10
          </Text>
        </View>
        <Text variant="caption" color="muted">
          TMDB{tmdbVoteCount ? ` · ${Intl.NumberFormat().format(tmdbVoteCount)} votes` : ' rating'}
        </Text>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.cell}>
        <View style={styles.valueRow}>
          <Ionicons name="eye-outline" size={15} color={colors.textMuted} />
          <Text variant="title3">{watchedCount}</Text>
        </View>
        <Text variant="caption" color="muted">
          watched here
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: spacing.md,
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.xs,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    marginVertical: spacing.xs,
  },
});

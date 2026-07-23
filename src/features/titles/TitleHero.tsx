import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackdropHero } from '@/components/media/BackdropHero';
import { DvdCase } from '@/components/media/DvdCase';
import { IconButton } from '@/components/primitives/IconButton';
import { Text } from '@/components/primitives/Text';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useTheme } from '@/theme/ThemeContext';
import { aspect, fontFamily, spacing } from '@/theme/tokens';

export interface TitleHeroRatings {
  /** TMDB average on its native 0–10 scale — always labelled as external. */
  tmdbRating?: number;
  /** Video Club community average on the 0–5 scale. */
  communityRating?: number | null;
  communityCount?: number;
  watchedCount?: number;
}

export interface TitleHeroProps {
  title: string;
  tagline?: string;
  backdropUrl?: string;
  posterUrl?: string;
  /** "2010 · 2h 28m · Action, Thriller" style meta line parts. */
  metaParts: (string | undefined)[];
  /** Compact score line rendered under the meta line. */
  ratings?: TitleHeroRatings;
  /** Renders a small trailer chip in the headline. */
  trailerUrl?: string;
}

/** One segment of the hero's compact score line. */
function Score({
  icon,
  color,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  value: string;
  label: string;
}) {
  return (
    <View style={styles.score}>
      <Ionicons name={icon} size={13} color={color} />
      <Text variant="subhead">{value}</Text>
      <Text variant="caption" color="muted">
        {label}
      </Text>
    </View>
  );
}

/** Cinematic page header: backdrop fading into the background, DVD case + headline. */
export function TitleHero({
  title,
  tagline,
  backdropUrl,
  posterUrl,
  metaParts,
  ratings,
  trailerUrl,
}: TitleHeroProps) {
  const insets = useSafeAreaInsets();
  const { isWide, width } = useBreakpoint();
  const { colors } = useTheme();

  const heroHeight = Math.min(isWide ? 380 : width / aspect.backdrop + 100, 440);
  const posterWidth = isWide ? 150 : 110;

  const hasCommunity = ratings?.communityRating != null && (ratings.communityCount ?? 0) > 0;
  const showScores =
    !!ratings && (hasCommunity || !!ratings.tmdbRating || (ratings.watchedCount ?? 0) > 0);

  return (
    <View>
      <BackdropHero backdropUrl={backdropUrl} height={heroHeight}>
        <View style={[styles.headline, { paddingBottom: spacing.lg }]}>
          <View style={styles.headlineRow}>
            {posterUrl ? (
              <DvdCase posterUrl={posterUrl} title={title} width={posterWidth} still />
            ) : null}
            <View style={styles.headlineText}>
              <Text variant={isWide ? 'display' : 'title1'} accessibilityRole="header">
                {title}
              </Text>
              <Text variant="subhead" color="secondary">
                {metaParts.filter(Boolean).join(' · ')}
              </Text>
              {showScores ? (
                <View style={styles.scoreLine}>
                  {hasCommunity ? (
                    <Score
                      icon="star"
                      color={colors.star}
                      value={ratings!.communityRating!.toFixed(1)}
                      label={`club (${ratings!.communityCount})`}
                    />
                  ) : null}
                  {ratings?.tmdbRating ? (
                    <Score
                      icon="globe-outline"
                      color={colors.textMuted}
                      value={ratings.tmdbRating.toFixed(1)}
                      label="tmdb"
                    />
                  ) : null}
                  {(ratings?.watchedCount ?? 0) > 0 ? (
                    <Score
                      icon="eye-outline"
                      color={colors.textMuted}
                      value={String(ratings!.watchedCount)}
                      label="watched"
                    />
                  ) : null}
                </View>
              ) : null}
              <View style={styles.chipLine}>
                {trailerUrl ? (
                  <Pressable
                    accessibilityRole="link"
                    accessibilityLabel="Watch trailer"
                    onPress={() => void WebBrowser.openBrowserAsync(trailerUrl)}
                    style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                      styles.trailerChip,
                      {
                        borderColor: colors.accent,
                        backgroundColor:
                          pressed || hovered ? colors.accentSoft : 'transparent',
                        transform: [
                          { skewX: '-6deg' },
                          ...(pressed ? [{ translateX: 1 }, { translateY: 1 }] : []),
                        ],
                      },
                    ]}
                  >
                    <Ionicons name="play" size={12} color={colors.accent} />
                    <Text style={[styles.trailerLabel, { color: colors.accent }]}>TRAILER</Text>
                  </Pressable>
                ) : null}
                {tagline ? (
                  <Text variant="hand" color="secondary" numberOfLines={1} style={styles.tagline}>
                    “{tagline}”
                  </Text>
                ) : null}
              </View>
            </View>
          </View>
        </View>
      </BackdropHero>
      <IconButton
        icon="chevron-back"
        accessibilityLabel="Go back"
        variant="filled"
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home'))}
        style={[styles.back, { top: insets.top + spacing.sm }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headline: {
    width: '100%',
    maxWidth: 1120,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
  },
  headlineRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.lg,
  },
  headlineText: {
    flex: 1,
    gap: spacing.xs,
    paddingBottom: spacing.xs,
  },
  scoreLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: spacing.lg,
    rowGap: spacing.xs,
  },
  score: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  chipLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  trailerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    height: 28,
    paddingHorizontal: spacing.md,
    borderRadius: 4,
    borderWidth: 1.5,
  },
  trailerLabel: {
    fontFamily: fontFamily.display,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1,
  },
  tagline: {
    flexShrink: 1,
  },
  back: {
    position: 'absolute',
    left: spacing.md,
  },
});

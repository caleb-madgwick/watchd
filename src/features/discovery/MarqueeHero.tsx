import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { LinkPressable } from '@/components/primitives/LinkPressable';
import { Text } from '@/components/primitives/Text';
import { useTheme } from '@/theme/ThemeContext';
import { fontFamily, palette, radius, spacing } from '@/theme/tokens';
import type { TitleSummary } from '@/types/domain';
import { prefersReducedMotion } from '@/utils/motion';
import { mediaTypeLabel, titleHref } from '@/utils/titles';

const BULB_COUNT = 14;

/** One row of marquee bulbs; three phase groups chase each other. */
function BulbRow({ phases }: { phases: [Animated.Value, Animated.Value, Animated.Value] }) {
  return (
    <View style={styles.bulbRow} pointerEvents="none">
      {Array.from({ length: BULB_COUNT }).map((_, i) => (
        <Animated.View
          key={i}
          style={[
            styles.bulb,
            {
              opacity: phases[i % 3].interpolate({
                inputRange: [0, 1],
                outputRange: [0.25, 1],
              }),
            },
          ]}
        />
      ))}
    </View>
  );
}

/** "NOW SHOWING" marquee: featured title in a bulb-lit frame. */
export function MarqueeHero({ title }: { title: TitleSummary }) {
  const { scheme } = useTheme();
  const [phases] = useState<[Animated.Value, Animated.Value, Animated.Value]>(() => [
    new Animated.Value(1),
    new Animated.Value(0.4),
    new Animated.Value(0.1),
  ]);

  useEffect(() => {
    if (prefersReducedMotion()) {
      phases.forEach((phase) => phase.setValue(1));
      return;
    }
    const loops = phases.map((phase, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 220),
          Animated.timing(phase, { toValue: 1, duration: 220, useNativeDriver: true }),
          Animated.timing(phase, { toValue: 0.15, duration: 440, useNativeDriver: true }),
        ]),
      ),
    );
    loops.forEach((loop) => loop.start());
    return () => loops.forEach((loop) => loop.stop());
  }, [phases]);

  const frame = scheme === 'dark' ? '#241C15' : '#4A3423';

  return (
    <View style={styles.wrapper}>
      <View style={[styles.frame, { backgroundColor: frame }]}>
        <BulbRow phases={phases} />
        <LinkPressable
          href={titleHref(title.mediaType, title.tmdbId)}
          accessibilityLabel={`Now showing: ${title.title}`}
          style={({ pressed, hovered }) => ({
            borderRadius: radius.sm,
            overflow: 'hidden',
            opacity: pressed ? 0.92 : 1,
            transform: [{ scale: hovered ? 1.005 : 1 }],
          })}
        >
          <View style={styles.stage}>
            {title.backdropUrl ? (
              <Image
                source={{ uri: title.backdropUrl }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                transition={300}
                accessibilityLabel={`${title.title} backdrop`}
              />
            ) : null}
            <LinearGradient
              colors={['rgba(5,6,8,0.05)', 'rgba(5,6,8,0.45)', 'rgba(5,6,8,0.92)']}
              locations={[0, 0.55, 1]}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.stageContent}>
              <View style={[styles.nowShowing, { backgroundColor: palette.marigold400 }]}>
                <Text
                  style={{
                    fontFamily: fontFamily.display,
                    fontSize: 12,
                    lineHeight: 17,
                    color: '#2B1F04',
                    letterSpacing: 2,
                  }}
                >
                  NOW SHOWING
                </Text>
              </View>
              <Text
                numberOfLines={2}
                style={{
                  fontFamily: fontFamily.display,
                  fontSize: 30,
                  lineHeight: 38,
                  color: palette.cream,
                  letterSpacing: 0.6,
                }}
              >
                {title.title.toUpperCase()}
              </Text>
              <Text variant="subhead" style={{ color: 'rgba(244,241,234,0.8)' }}>
                {[title.releaseYear, mediaTypeLabel(title.mediaType), 'Tap for tonight’s pick']
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </View>
          </View>
        </LinkPressable>
        <BulbRow phases={phases} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: spacing.lg,
  },
  frame: {
    borderRadius: radius.lg,
    padding: spacing.sm,
    gap: spacing.sm,
    boxShadow: '0px 10px 22px rgba(0,0,0,0.35)',
  },
  bulbRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    height: 12,
  },
  bulb: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: palette.marigold400,
    boxShadow: '0px 0px 6px rgba(245,178,26,0.8)',
  },
  stage: {
    height: 210,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: '#0B0D10',
    justifyContent: 'flex-end',
  },
  stageContent: {
    padding: spacing.xl,
    gap: spacing.sm,
  },
  nowShowing: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 3,
    transform: [{ skewX: '-6deg' }],
  },
});

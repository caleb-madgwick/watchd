import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';

import { Text } from '@/components/primitives/Text';
import { useTheme } from '@/theme/ThemeContext';
import { aspect, palette, spacing } from '@/theme/tokens';

function prefersReducedMotion(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export interface BookCaseProps {
  posterUrl?: string;
  title: string;
  width: number;
  /** Hover: the cover cracks open and the pages fan. */
  lifted?: boolean;
  /** Press: opens wider. */
  pressed?: boolean;
  /** Static product-shot pose, no interaction (hero usage). */
  still?: boolean;
}

/** Fanned pages, back → front. Each opens a little less than the cover (-72°). */
const PAGE_ANGLES = [-58, -44, -28];

/**
 * A hardcover book as a 3D object. At rest it's a closed book (cover + spine +
 * peeking fore-edge). On hover the cover hinges open on the spine and the pages
 * fan out; press opens it wider — like thumbing through it.
 */
export function BookCase({
  posterUrl,
  title,
  width,
  lifted = false,
  pressed = false,
  still = false,
}: BookCaseProps) {
  const { colors } = useTheme();
  const height = width / aspect.book;
  const [open] = useState(() => new Animated.Value(0));

  const target = still ? 0 : pressed ? 1 : lifted ? 0.62 : 0;

  useEffect(() => {
    if (prefersReducedMotion()) {
      open.setValue(target);
      return;
    }
    Animated.spring(open, { toValue: target, useNativeDriver: true, speed: 13, bounciness: 5 }).start();
  }, [target, open]);

  const spineWidth = Math.max(7, width * 0.055);

  const hinge = (angle: number) => [
    { perspective: 900 },
    { translateX: -width / 2 },
    { rotateY: open.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${angle}deg`] }) },
    { translateX: width / 2 },
  ];

  return (
    <View style={{ width, height, overflow: 'visible' }}>
      <Animated.View
        style={[
          styles.caseGroup,
          {
            transform: [
              { perspective: 1200 },
              { rotateY: open.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-6deg'] }) },
              { translateY: open.interpolate({ inputRange: [0, 1], outputRange: [0, -height * 0.035] }) },
              { scale: open.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] }) },
            ],
          },
        ]}
      >
        {/* Back board (the far cover the pages are bound to) */}
        <View style={[styles.board, { backgroundColor: palette.ink800 }]} />

        {/* Fore-edge: the closed page block peeking past the cover on the right */}
        <View
          style={[
            styles.pageBlock,
            { backgroundColor: palette.paper200, right: 0, top: height * 0.018, bottom: height * 0.018 },
          ]}
        />

        {/* Fanning pages, hinged on the spine (left edge) */}
        {PAGE_ANGLES.map((angle, i) => (
          <Animated.View
            key={angle}
            style={[
              styles.leaf,
              {
                width: width - spineWidth,
                left: spineWidth,
                top: height * (0.02 + i * 0.006),
                bottom: height * (0.02 + i * 0.006),
                backgroundColor: i % 2 === 0 ? palette.paper50 : palette.paper100,
                transform: hinge(angle),
                zIndex: 2 + i,
              },
            ]}
          >
            <LinearGradient
              colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0)']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 0.18, y: 0.5 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
            {/* fore-edge line */}
            <View style={[styles.foreEdge, { backgroundColor: palette.paper300 }]} />
          </Animated.View>
        ))}

        {/* Front cover: hinges furthest open on the spine */}
        <Animated.View
          style={[styles.coverSlot, { width, left: 0, transform: hinge(-72), zIndex: 20 }]}
        >
          <View style={[styles.cover, { backgroundColor: palette.ink700 }]}>
            {posterUrl ? (
              <Image
                source={{ uri: posterUrl }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                transition={200}
                accessibilityLabel={`${title} cover`}
              />
            ) : (
              <View style={[StyleSheet.absoluteFill, styles.fallback, { backgroundColor: colors.surfaceRaised }]}>
                <Ionicons name="book-outline" size={width * 0.2} color={colors.textMuted} />
                <Text variant="caption" color="muted" align="center" numberOfLines={3} style={styles.fallbackTitle}>
                  {title}
                </Text>
              </View>
            )}
            {/* Glossy sheen that fades as it opens */}
            <AnimatedLinearGradient
              colors={['rgba(255,255,255,0.20)', 'rgba(255,255,255,0.03)', 'rgba(255,255,255,0)']}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.7, y: 1 }}
              style={[
                StyleSheet.absoluteFill,
                { opacity: open.interpolate({ inputRange: [0, 1], outputRange: [1, 0.25] }) },
              ]}
              pointerEvents="none"
            />
            {/* Spine crease near the hinge */}
            <LinearGradient
              colors={['rgba(0,0,0,0.45)', 'rgba(0,0,0,0.12)', 'rgba(0,0,0,0)']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.crease}
              pointerEvents="none"
            />
          </View>
        </Animated.View>

        {/* The spine (binding) sits fixed on the left, above everything */}
        <View style={[styles.spine, { width: spineWidth, zIndex: 30 }]}>
          <LinearGradient
            colors={[palette.ink950, palette.ink700, palette.ink900]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </View>
      </Animated.View>
    </View>
  );
}

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

const RADIUS = { left: 3, right: 6 };

const styles = StyleSheet.create({
  caseGroup: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    overflow: 'visible',
    borderTopLeftRadius: RADIUS.left,
    borderBottomLeftRadius: RADIUS.left,
    borderTopRightRadius: RADIUS.right,
    borderBottomRightRadius: RADIUS.right,
    boxShadow: '0px 10px 18px rgba(0,0,0,0.42)',
    shadowColor: '#000000',
    shadowOpacity: 0.35,
    shadowRadius: 13,
    shadowOffset: { width: 0, height: 9 },
    elevation: 6,
  },
  board: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: RADIUS.left,
    borderBottomLeftRadius: RADIUS.left,
    borderTopRightRadius: RADIUS.right,
    borderBottomRightRadius: RADIUS.right,
  },
  pageBlock: {
    position: 'absolute',
    width: '94%',
    borderTopRightRadius: RADIUS.right - 1,
    borderBottomRightRadius: RADIUS.right - 1,
  },
  leaf: {
    position: 'absolute',
    borderTopRightRadius: RADIUS.right - 1,
    borderBottomRightRadius: RADIUS.right - 1,
    overflow: 'hidden',
  },
  foreEdge: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 1.5,
  },
  coverSlot: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
  cover: {
    flex: 1,
    borderTopLeftRadius: RADIUS.left,
    borderBottomLeftRadius: RADIUS.left,
    borderTopRightRadius: RADIUS.right,
    borderBottomRightRadius: RADIUS.right,
    overflow: 'hidden',
  },
  crease: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 14,
  },
  spine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    borderTopLeftRadius: RADIUS.left,
    borderBottomLeftRadius: RADIUS.left,
    overflow: 'hidden',
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
  },
  fallbackTitle: {
    paddingHorizontal: spacing.xs,
  },
});

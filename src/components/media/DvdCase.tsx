import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';

import { Disc } from './Disc';
import { Text } from '@/components/primitives/Text';
import { useTheme } from '@/theme/ThemeContext';
import { aspect, spacing } from '@/theme/tokens';

function prefersReducedMotion(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export interface DvdCaseProps {
  posterUrl?: string;
  title: string;
  width: number;
  /** Hover: swings the cover open, revealing the tray and disc. */
  lifted?: boolean;
  /** Press: opens wider — the grab. */
  pressed?: boolean;
  /** Static product-shot pose with no interaction (hero usage). */
  still?: boolean;
}

// Disc visuals live in ./Disc so the page transition can reuse them.

/**
 * A DVD keep-case as a 3D object. At rest it stands in a 3/4 product pose:
 * visible spine, contact shadow. On hover the front cover hinges open on the
 * spine, revealing the moulded tray, retention clips and the disc — press
 * pulls it wider, like taking the disc out.
 */
export function DvdCase({
  posterUrl,
  title,
  width,
  lifted = false,
  pressed = false,
  still = false,
}: DvdCaseProps) {
  const { colors, scheme } = useTheme();
  const height = width / aspect.poster;
  const [open] = useState(() => new Animated.Value(0));

  const target = still ? 0 : pressed ? 1 : lifted ? 0.62 : 0;

  useEffect(() => {
    if (prefersReducedMotion()) {
      open.setValue(target);
      return;
    }
    Animated.spring(open, { toValue: target, useNativeDriver: true, speed: 13, bounciness: 5 }).start();
  }, [target, open]);

  const dark = scheme === 'dark';
  const discSize = width * 0.76;
  const shell = dark ? '#101318' : '#2C2F36';
  // Kept dark so the hairline never reads as a bright arc at the corner curves.
  const shellEdge = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.35)';

  return (
    <View style={{ width, height, overflow: 'visible' }}>
      {/* The case; turns slightly as the cover opens */}
      <Animated.View
        style={[
          styles.caseGroup,
          {
            transform: [
              { perspective: 1100 },
              { rotateY: open.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-5deg'] }) },
              { translateY: open.interpolate({ inputRange: [0, 1], outputRange: [0, -height * 0.035] }) },
              { scale: open.interpolate({ inputRange: [0, 1], outputRange: [1, 1.025] }) },
            ],
          },
        ]}
      >
        {/* ── Back shell + moulded tray interior ── */}
        <View style={[styles.tray, { backgroundColor: shell, borderColor: shellEdge }]}>
          <View
            style={[
              styles.recess,
              {
                width: discSize * 1.1,
                height: discSize * 1.1,
                borderRadius: (discSize * 1.1) / 2,
                top: (height - discSize * 1.1) / 2,
                right: width * 0.055,
              },
            ]}
          />
          <View style={{ position: 'absolute', top: (height - discSize) / 2, right: width * 0.085 }}>
            <Disc
              posterUrl={posterUrl}
              size={discSize}
              rotate={open.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '24deg'] })}
            />
          </View>
          {/* Retention clips, top and bottom like the reference shells */}
          {[0.08, 0.86].map((t) => (
            <View key={t} style={[styles.clipH, { top: height * t, left: width * 0.045 }]} />
          ))}
          {/* Shade that lifts as the cover opens */}
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              styles.trayShade,
              { opacity: open.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0.08] }) },
            ]}
            pointerEvents="none"
          />
        </View>

        {/* ── Front cover: hinges on the case's left edge ── */}
        <Animated.View
          style={[
            styles.coverSlot,
            {
              left: 0,
              width,
              transform: [
                { perspective: 900 },
                { translateX: -width / 2 },
                { rotateY: open.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-72deg'] }) },
                { translateX: width / 2 },
              ],
            },
          ]}
        >
          <View style={[styles.cover, { backgroundColor: shell, borderColor: shellEdge }]}>
            {posterUrl ? (
              <Image
                source={{ uri: posterUrl }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                transition={200}
                accessibilityLabel={`${title} case art`}
              />
            ) : (
              <View style={[StyleSheet.absoluteFill, styles.fallback, { backgroundColor: colors.surfaceRaised }]}>
                <Ionicons name="film-outline" size={width * 0.2} color={colors.textMuted} />
                <Text variant="caption" color="muted" align="center" numberOfLines={3} style={styles.fallbackTitle}>
                  {title}
                </Text>
              </View>
            )}
            {/* Clear-sleeve sheen, fading as it opens */}
            <AnimatedLinearGradient
              colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0.04)', 'rgba(255,255,255,0)']}
              start={{ x: 0.05, y: 0 }}
              end={{ x: 0.65, y: 1 }}
              style={[
                StyleSheet.absoluteFill,
                { opacity: open.interpolate({ inputRange: [0, 1], outputRange: [1, 0.3] }) },
              ]}
              pointerEvents="none"
            />
            {/* Hinge-side crease */}
            <LinearGradient
              colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0)']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={[styles.crease]}
              pointerEvents="none"
            />
          </View>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

const styles = StyleSheet.create({
  caseGroup: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    overflow: 'visible',
    // Rounded to match the case shell so the shadow hugs the corners instead
    // of squaring off past them.
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    // Natural drop shadow that follows the case (and its tilt). boxShadow is
    // the form react-native-web actually renders; legacy shadow* props are
    // kept for older native fallback.
    boxShadow: '0px 9px 16px rgba(0,0,0,0.45)',
    shadowColor: '#000000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  tray: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 3,
    borderBottomLeftRadius: 3,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  recess: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.38)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  clipH: {
    position: 'absolute',
    width: 26,
    height: 7,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  trayShade: {
    backgroundColor: '#000000',
  },
  coverSlot: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
  cover: {
    flex: 1,
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  crease: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 10,
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

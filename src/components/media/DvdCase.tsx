import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';

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
  /** Hover state: springs the case up off the shelf. */
  lifted?: boolean;
  /** Press state: the little grab dip. */
  pressed?: boolean;
}

/**
 * Poster artwork presented as a DVD keep-case: plastic edge, dark spine with
 * a fold highlight, diagonal sheen, shelf shadow. When `lifted`, the case
 * springs up and tilts open-side toward the viewer, like being picked up.
 */
export function DvdCase({ posterUrl, title, width, lifted = false, pressed = false }: DvdCaseProps) {
  const { colors, scheme } = useTheme();
  const height = width / aspect.poster;
  // useState initialisers, not useAnimatedValue: react-native-web lacks it.
  const [lift] = useState(() => new Animated.Value(0));
  const [grab] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (prefersReducedMotion()) {
      lift.setValue(lifted ? 1 : 0);
      return;
    }
    Animated.spring(lift, {
      toValue: lifted ? 1 : 0,
      useNativeDriver: true,
      speed: 18,
      bounciness: 7,
    }).start();
  }, [lifted, lift]);

  useEffect(() => {
    Animated.spring(grab, {
      toValue: pressed ? 1 : 0,
      useNativeDriver: true,
      speed: 24,
      bounciness: 4,
    }).start();
  }, [pressed, grab]);

  const spineWidth = Math.max(6, width * 0.075);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          transform: [
            { perspective: 800 },
            {
              translateY: lift.interpolate({ inputRange: [0, 1], outputRange: [0, -width * 0.07] }),
            },
            {
              rotateY: lift.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-8deg'] }),
            },
            {
              scale: Animated.subtract(
                lift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] }),
                grab.interpolate({ inputRange: [0, 1], outputRange: [0, 0.04] }),
              ),
            },
          ],
        },
        lifted ? styles.shadowLifted : styles.shadowResting,
        { shadowColor: scheme === 'dark' ? '#000000' : '#4A3B28' },
      ]}
    >
      <View
        style={[
          styles.case,
          {
            backgroundColor: scheme === 'dark' ? '#0A0C0F' : '#2A2C31',
            borderColor: scheme === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.25)',
          },
        ]}
      >
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
            <Ionicons name="film-outline" size={width * 0.22} color={colors.textMuted} />
            <Text variant="caption" color="muted" align="center" numberOfLines={3} style={styles.fallbackTitle}>
              {title}
            </Text>
          </View>
        )}

        {/* Spine: dark left edge of the keep-case with a fold highlight */}
        <LinearGradient
          colors={['rgba(0,0,0,0.55)', 'rgba(0,0,0,0.18)', 'rgba(0,0,0,0)']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[styles.spine, { width: spineWidth * 1.9 }]}
          pointerEvents="none"
        />
        <View
          style={[styles.spineFold, { left: spineWidth, backgroundColor: 'rgba(255,255,255,0.18)' }]}
          pointerEvents="none"
        />

        {/* Plastic sheen across the sleeve */}
        <LinearGradient
          colors={['rgba(255,255,255,0.16)', 'rgba(255,255,255,0.02)', 'rgba(255,255,255,0)']}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.6, y: 0.9 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  case: {
    flex: 1,
    // Keep-case corners: tight on the spine side, rounder on the opening side.
    borderTopLeftRadius: 3,
    borderBottomLeftRadius: 3,
    borderTopRightRadius: 9,
    borderBottomRightRadius: 9,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  spine: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  spineFold: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    opacity: 0.7,
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
  shadowResting: {
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  shadowLifted: {
    shadowOpacity: 0.5,
    shadowRadius: 18,
    shadowOffset: { width: -6, height: 14 },
    elevation: 10,
  },
});

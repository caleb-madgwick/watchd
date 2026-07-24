import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';

import { Record } from './Record';
import { Text } from '@/components/primitives/Text';
import { useTheme } from '@/theme/ThemeContext';
import { spacing } from '@/theme/tokens';

function prefersReducedMotion(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export interface RecordSleeveProps {
  posterUrl?: string;
  title: string;
  width: number;
  /** Hover: slides the record out to the right. */
  lifted?: boolean;
  /** Press: pulls it out further — the grab. */
  pressed?: boolean;
  /** Static product-shot pose with no interaction (hero usage). */
  still?: boolean;
}

/**
 * A square record sleeve as a physical object. At rest the black vinyl peeks
 * from the right edge; on hover the record slides out and turns a little; press
 * pulls it further, like sliding the LP from its jacket. The music sibling of
 * DvdCase — same prop shape and reduced-motion handling.
 */
export function RecordSleeve({
  posterUrl,
  title,
  width,
  lifted = false,
  pressed = false,
  still = false,
}: RecordSleeveProps) {
  const { colors, scheme } = useTheme();
  const [open] = useState(() => new Animated.Value(0));
  const target = still ? 0.28 : pressed ? 1 : lifted ? 0.7 : 0;

  useEffect(() => {
    if (prefersReducedMotion()) {
      open.setValue(target);
      return;
    }
    Animated.spring(open, { toValue: target, useNativeDriver: true, speed: 13, bounciness: 6 }).start();
  }, [target, open]);

  const dark = scheme === 'dark';
  const sleeveEdge = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.28)';
  const discSize = width * 0.9;
  // The record slides from tucked-in (peeking on the right) to pulled out.
  const translateX = open.interpolate({ inputRange: [0, 1], outputRange: [width * 0.16, width * 0.52] });
  const rotate = open.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '10deg'] });

  return (
    <View style={{ width, height: width, overflow: 'visible' }}>
      {/* The record, behind the sleeve, sliding out to the right */}
      <Animated.View
        style={{
          position: 'absolute',
          top: (width - discSize) / 2,
          left: 0,
          transform: [{ translateX }],
        }}
        pointerEvents="none"
      >
        <Record posterUrl={posterUrl} size={discSize} rotate={rotate} labelColor={colors.accent} />
      </Animated.View>

      {/* The sleeve (front cover) sits on top */}
      <Animated.View
        style={[
          styles.sleeve,
          {
            borderColor: sleeveEdge,
            transform: [
              { perspective: 1000 },
              { rotateY: open.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-4deg'] }) },
            ],
          },
        ]}
      >
        {posterUrl ? (
          <Image
            source={{ uri: posterUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={200}
            accessibilityLabel={`${title} sleeve art`}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.fallback, { backgroundColor: colors.surfaceRaised }]}>
            <Ionicons name="musical-notes-outline" size={width * 0.22} color={colors.textMuted} />
            <Text variant="caption" color="muted" align="center" numberOfLines={3} style={styles.fallbackTitle}>
              {title}
            </Text>
          </View>
        )}
        {/* Card sheen */}
        <LinearGradient
          colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.03)', 'rgba(255,255,255,0)']}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.7, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        {/* Opening seam on the right, where the record slides out */}
        <LinearGradient
          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.28)']}
          start={{ x: 0.7, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.seam}
          pointerEvents="none"
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  sleeve: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    boxShadow: '0px 8px 16px rgba(0,0,0,0.4)',
    shadowColor: '#000000',
    shadowOpacity: 0.32,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  seam: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: 14,
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

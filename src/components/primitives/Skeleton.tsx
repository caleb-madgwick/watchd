import { useEffect, useState } from 'react';
import {
  Animated,
  Platform,
  StyleSheet,
  View,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '@/theme/ThemeContext';
import { radius as radiusTokens, spacing } from '@/theme/tokens';

export interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

/** Pulsing placeholder block. Respects reduced motion by settling at rest opacity. */
export function Skeleton({ width = '100%', height = 16, radius = radiusTokens.xs, style }: SkeletonProps) {
  const { colors } = useTheme();
  // useState initializer (not useAnimatedValue): react-native-web doesn't
  // implement useAnimatedValue, and reading a ref during render trips lint.
  const [opacity] = useState(() => new Animated.Value(0.6));

  useEffect(() => {
    const useNativeDriver = Platform.OS !== 'web';
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver }),
        Animated.timing(opacity, { toValue: 0.6, duration: 700, useNativeDriver }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width, height, borderRadius: radius, backgroundColor: colors.skeletonBase, opacity }, style]}
    />
  );
}

/** Horizontal row of poster-shaped skeletons for media carousels. */
export function PosterRowSkeleton({ count = 4, posterWidth = 120 }: { count?: number; posterWidth?: number }) {
  return (
    <View style={styles.row}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={{ gap: spacing.sm }}>
          <Skeleton width={posterWidth} height={posterWidth * 1.5} radius={radiusTokens.sm} />
          <Skeleton width={posterWidth * 0.8} height={12} />
        </View>
      ))}
    </View>
  );
}

/** Stacked card-shaped skeletons for feeds and lists. */
export function CardListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <View style={styles.stack}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.card}>
          <Skeleton width={44} height={44} radius={radiusTokens.full} />
          <View style={styles.cardBody}>
            <Skeleton width="55%" height={13} />
            <Skeleton width="90%" height={13} />
            <Skeleton width="75%" height={13} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    overflow: 'hidden',
  },
  stack: {
    gap: spacing.lg,
  },
  card: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cardBody: {
    flex: 1,
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },
});

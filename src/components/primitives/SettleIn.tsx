import { useEffect, useState } from 'react';
import { Animated } from 'react-native';

import { prefersReducedMotion } from '@/utils/motion';

export interface SettleInProps {
  children: React.ReactNode;
  /** Position in the row/grid — drives the stagger delay. */
  index?: number;
  /** Cap so late items in infinite lists don't wait forever. */
  maxStagger?: number;
}

/**
 * Entrance for shelf items: drop in and settle with a small spring, staggered
 * by index — like cases being placed on the shelf one after another.
 */
export function SettleIn({ children, index = 0, maxStagger = 10 }: SettleInProps) {
  const [progress] = useState(() => new Animated.Value(prefersReducedMotion() ? 1 : 0));

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const animation = Animated.spring(progress, {
      toValue: 1,
      useNativeDriver: true,
      speed: 16,
      bounciness: 6,
      delay: Math.min(index, maxStagger) * 45,
    });
    animation.start();
    return () => animation.stop();
  }, [progress, index, maxStagger]);

  return (
    <Animated.View
      style={{
        opacity: progress,
        transform: [
          { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-14, 0] }) },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}

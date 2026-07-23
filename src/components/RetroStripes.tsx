import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/ThemeContext';
import { palette } from '@/theme/tokens';

/**
 * Tri-colour awning stripes — the little burst of video-store signage used
 * under headers and section moments. Decorative only.
 */
export function RetroStripes({ width = 96, height = 5 }: { width?: number; height?: number }) {
  const { scheme } = useTheme();
  const colors =
    scheme === 'dark'
      ? [palette.jade400, palette.marigold400, palette.cobalt400]
      : [palette.jade500, palette.marigold600, palette.cobalt600];

  return (
    <View style={[styles.row, { width, height }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <View
          key={i}
          style={[
            styles.tick,
            {
              backgroundColor: colors[i % 3],
              height,
              transform: [{ skewX: '-24deg' }],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 5,
    overflow: 'hidden',
  },
  tick: {
    flex: 1,
    borderRadius: 1,
  },
});

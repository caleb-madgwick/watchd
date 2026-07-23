import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/primitives/Text';

/** Simple deterministic hash so a member always gets the same barcode. */
function hashCode(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export interface BarcodeProps {
  seed: string;
  height?: number;
  color?: string;
  /** Optional human-readable line under the bars. */
  label?: string;
}

/** Decorative membership barcode generated from a seed string. */
export function Barcode({ seed, height = 26, color = '#1C1E22', label }: BarcodeProps) {
  let value = hashCode(seed) || 1;
  const bars: number[] = [];
  for (let i = 0; i < 28; i++) {
    bars.push((value % 3) + 1);
    value = ((value * 1103515245 + 12345) & 0x7fffffff) >>> 3 || i + 1;
  }

  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={[styles.row, { height }]}>
        {bars.map((barWidth, i) => (
          <View
            key={i}
            style={{
              width: barWidth,
              height: i % 7 === 0 ? height : height * 0.82,
              backgroundColor: color,
              marginRight: 2,
            }}
          />
        ))}
      </View>
      {label ? (
        <Text variant="micro" style={[styles.label, { color }]} numberOfLines={1}>
          {label}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  label: {
    marginTop: 3,
    letterSpacing: 2,
  },
});

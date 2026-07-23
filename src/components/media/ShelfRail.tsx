import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/primitives/Text';
import { useTheme } from '@/theme/ThemeContext';
import { fontFamily, palette } from '@/theme/tokens';

/** Laminate shelf rail the DVD cases sit on. */
export function ShelfRail({ height = 11 }: { height?: number }) {
  const { scheme } = useTheme();
  const colors: [string, string, string] =
    scheme === 'dark'
      ? ['#3B2F25', '#241C15', '#191410']
      : ['#B08A64', '#8A6B4D', '#6B4F37'];

  return (
    <View style={[styles.rail, { height }]} accessibilityElementsHidden>
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={styles.edgeHighlight} />
    </View>
  );
}

const TALKER_COLORS = [
  { bg: palette.jade400, text: '#04160F' },
  { bg: palette.marigold400, text: '#2B1F04' },
  { bg: palette.cobalt600, text: palette.cream },
];

function hashCode(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(hash);
}

/** Shelf-talker label: the colour-block section sign clipped to the shelf. */
export function ShelfTalker({ label }: { label: string }) {
  const colors = TALKER_COLORS[hashCode(label) % TALKER_COLORS.length];

  return (
    <View style={[styles.talker, { backgroundColor: colors.bg }]}>
      <Text
        numberOfLines={1}
        style={{
          fontFamily: fontFamily.display,
          fontSize: 15,
          lineHeight: 21,
          color: colors.text,
          letterSpacing: 1,
        }}
      >
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    width: '100%',
    borderRadius: 2,
    overflow: 'hidden',
    boxShadow: '0px 6px 10px rgba(0,0,0,0.28)',
  },
  edgeHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  talker: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 3,
    transform: [{ skewX: '-6deg' }],
    boxShadow: '2px 2px 0px rgba(0,0,0,0.3)',
  },
});

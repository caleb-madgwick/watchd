import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/primitives/Text';
import { useTheme } from '@/theme/ThemeContext';
import { fontFamily } from '@/theme/tokens';

/** The Watchd wordmark: display type with a marquee-gold full stop. */
export function Wordmark({ size = 34 }: { size?: number }) {
  const { colors } = useTheme();
  return (
    <View style={styles.row} accessibilityRole="header" accessibilityLabel="Watchd">
      <Text
        style={{
          fontFamily: fontFamily.display,
          fontSize: size,
          lineHeight: size * 1.2,
          color: colors.text,
          letterSpacing: -1,
        }}
      >
        watchd
      </Text>
      <View
        style={{
          width: size * 0.22,
          height: size * 0.22,
          borderRadius: size,
          backgroundColor: colors.accent,
          marginBottom: size * 0.14,
          marginLeft: 2,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
});

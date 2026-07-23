import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/primitives/Text';
import { useTheme } from '@/theme/ThemeContext';
import { fontFamily } from '@/theme/tokens';

/** The Video Club wordmark: display type with a jade "play" accent on Club. */
export function Wordmark({ size = 34 }: { size?: number }) {
  const { colors } = useTheme();
  return (
    <View style={styles.row} accessibilityRole="header" accessibilityLabel="Video Club">
      <Text
        style={{
          fontFamily: fontFamily.display,
          fontSize: size,
          lineHeight: size * 1.25,
          color: colors.text,
          letterSpacing: -0.5,
        }}
      >
        Video{' '}
        <Text
          style={{
            fontFamily: fontFamily.display,
            fontSize: size,
            lineHeight: size * 1.25,
            color: colors.accent,
            letterSpacing: -0.5,
          }}
        >
          Club
        </Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
});

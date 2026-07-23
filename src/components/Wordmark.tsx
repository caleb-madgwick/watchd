import { StyleSheet, Text, View } from 'react-native';

import { RetroStripes } from '@/components/RetroStripes';
import { useTheme } from '@/theme/ThemeContext';
import { fontFamily, palette, spacing } from '@/theme/tokens';

export interface WordmarkProps {
  size?: number;
  /**
   * inline — nav rails and headers.
   * sign   — bigger shop-sign lockup with awning stripes (auth/onboarding).
   */
  variant?: 'inline' | 'sign';
}

/**
 * The Video Club mark: an original badge in the 90s rental-chain idiom —
 * ultra-bold condensed caps on a tilted colour block with a hard offset
 * shadow. (Deliberately our own lockup, not any real chain's logo.)
 */
export function Wordmark({ size = 24, variant = 'inline' }: WordmarkProps) {
  const { colors, scheme } = useTheme();

  const badge = (
    <View
      accessibilityRole="header"
      accessibilityLabel="Video Club"
      style={[
        styles.badge,
        {
          backgroundColor: colors.accent,
          borderColor: scheme === 'dark' ? palette.ink950 : '#083D2E',
          paddingHorizontal: size * 0.5,
          paddingVertical: size * 0.18,
          borderRadius: Math.max(4, size * 0.16),
          transform: [{ skewX: '-8deg' }],
          shadowColor: '#000000',
        },
      ]}
    >
      <Text
        numberOfLines={1}
        style={{
          fontFamily: fontFamily.display,
          fontSize: size,
          lineHeight: size * 1.3,
          color: palette.cream,
          letterSpacing: size * 0.06,
          textShadowColor: 'rgba(0,0,0,0.35)',
          textShadowOffset: { width: 0, height: 2 },
          textShadowRadius: 0,
        }}
      >
        VIDEO CLUB
      </Text>
    </View>
  );

  if (variant === 'sign') {
    return (
      <View style={styles.sign}>
        {badge}
        <RetroStripes width={size * 4.4} height={Math.max(4, size * 0.14)} />
      </View>
    );
  }

  return badge;
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderWidth: 2,
    boxShadow: '4px 4px 0px rgba(0,0,0,0.45)',
    shadowOpacity: 0.45,
    shadowRadius: 0,
    shadowOffset: { width: 4, height: 4 },
    elevation: 5,
  },
  sign: {
    alignItems: 'center',
    gap: spacing.lg,
  },
});

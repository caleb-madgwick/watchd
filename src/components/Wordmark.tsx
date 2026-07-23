import { StyleSheet, Text, View } from 'react-native';

import { RetroStripes } from '@/components/RetroStripes';
import { useTheme } from '@/theme/ThemeContext';
import { fontFamily, radius, spacing } from '@/theme/tokens';

export interface WordmarkProps {
  size?: number;
  /**
   * inline — nav rails and headers.
   * sign   — the shop-sign badge for auth/onboarding: boxed, glowing, striped.
   */
  variant?: 'inline' | 'sign';
}

/** The Video Club wordmark: neon-glow display type, "Club" in the accent. */
export function Wordmark({ size = 34, variant = 'inline' }: WordmarkProps) {
  const { colors } = useTheme();

  const text = (
    <Text
      accessibilityRole="header"
      accessibilityLabel="Video Club"
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
          textShadowColor: colors.glow,
          textShadowRadius: size * 0.45,
          textShadowOffset: { width: 0, height: 0 },
        }}
      >
        Club
      </Text>
    </Text>
  );

  if (variant === 'sign') {
    return (
      <View
        style={[
          styles.sign,
          {
            backgroundColor: colors.surface,
            borderColor: colors.accent,
            shadowColor: colors.glow,
          },
        ]}
      >
        {text}
        <RetroStripes width={size * 2.6} height={Math.max(4, size * 0.14)} />
      </View>
    );
  }

  return <View style={styles.inline}>{text}</View>;
}

const styles = StyleSheet.create({
  inline: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  sign: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing['3xl'],
    borderRadius: radius.lg,
    borderWidth: 2,
    shadowOpacity: 1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
});

import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from './Text';
import { useTheme } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme/tokens';

export interface SpoilerTextProps {
  children: string;
  numberOfLines?: number;
}

/** Review body hidden behind an explicit reveal action when flagged as a spoiler. */
export function SpoilerText({ children, numberOfLines }: SpoilerTextProps) {
  const { colors } = useTheme();
  const [revealed, setRevealed] = useState(false);

  if (revealed) {
    return (
      <Text variant="callout" color="secondary" numberOfLines={numberOfLines}>
        {children}
      </Text>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="This review contains spoilers. Tap to reveal."
      onPress={() => setRevealed(true)}
      style={({ pressed }) => [
        styles.cover,
        {
          backgroundColor: pressed ? colors.surfaceHigh : colors.surfaceRaised,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.coverContent}>
        <Ionicons name="eye-off-outline" size={16} color={colors.textMuted} />
        <Text variant="subhead" color="muted">
          Contains spoilers — tap to reveal
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cover: {
    borderRadius: radius.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  coverContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});

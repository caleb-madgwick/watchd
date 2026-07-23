import { Pressable, StyleSheet } from 'react-native';

import { Text } from './Text';
import { useTheme } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme/tokens';

export interface FilterChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  disabled?: boolean;
}

export function FilterChip({ label, selected = false, onPress, disabled }: FilterChipProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled: disabled ?? false }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.chip,
        {
          backgroundColor: selected ? colors.accentSoft : pressed ? colors.surfaceRaised : colors.surface,
          borderColor: selected ? colors.accent : colors.border,
          opacity: disabled ? 0.5 : 1,
          // Price-sticker wiggle on hover.
          transform: hovered && !disabled ? [{ rotate: '-1.5deg' }, { translateY: -1 }] : [],
          boxShadow: hovered && !disabled ? '2px 2px 0px rgba(0,0,0,0.25)' : undefined,
        },
      ]}
    >
      <Text variant="subhead" style={{ color: selected ? colors.accent : colors.textSecondary }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.lg,
    height: 36,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

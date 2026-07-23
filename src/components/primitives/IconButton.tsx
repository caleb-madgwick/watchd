import { Ionicons } from '@expo/vector-icons';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeContext';
import { minTouchTarget, radius } from '@/theme/tokens';

export interface IconButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  icon: keyof typeof Ionicons.glyphMap;
  /** Required for screen readers. */
  accessibilityLabel: string;
  size?: number;
  color?: string;
  active?: boolean;
  variant?: 'plain' | 'filled';
  style?: StyleProp<ViewStyle>;
}

export function IconButton({
  icon,
  accessibilityLabel,
  size = 22,
  color,
  active = false,
  variant = 'plain',
  disabled,
  style,
  ...rest
}: IconButtonProps) {
  const { colors } = useTheme();
  const iconColor = color ?? (active ? colors.accent : colors.textSecondary);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: disabled ?? false, selected: active }}
      disabled={disabled}
      {...rest}
      style={({ pressed }) => [
        {
          minWidth: minTouchTarget,
          minHeight: minTouchTarget,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: radius.full,
          backgroundColor:
            variant === 'filled'
              ? pressed
                ? colors.surfaceHigh
                : colors.surfaceRaised
              : pressed
                ? colors.accentSoft
                : 'transparent',
          opacity: disabled ? 0.4 : 1,
        },
        style,
      ]}
    >
      <Ionicons name={icon} size={size} color={iconColor} />
    </Pressable>
  );
}

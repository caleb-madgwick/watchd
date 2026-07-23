import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Text } from './Text';
import { useTheme } from '@/theme/ThemeContext';
import { minTouchTarget, radius, spacing } from '@/theme/tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

const sizeStyles: Record<ButtonSize, { height: number; paddingH: number; fontSize: number }> = {
  sm: { height: 36, paddingH: spacing.md, fontSize: 14 },
  md: { height: minTouchTarget, paddingH: spacing.lg, fontSize: 15 },
  lg: { height: 52, paddingH: spacing.xl, fontSize: 16 },
};

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  fullWidth = false,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const { colors } = useTheme();
  const s = sizeStyles[size];
  const isDisabled = disabled || loading;

  const variantStyles = (pressed: boolean): { container: ViewStyle; textColor: string } => {
    switch (variant) {
      case 'primary':
        return {
          container: { backgroundColor: pressed ? colors.accentPressed : colors.accent },
          textColor: colors.onAccent,
        };
      case 'secondary':
        return {
          container: { backgroundColor: pressed ? colors.surfaceHigh : colors.surfaceRaised },
          textColor: colors.text,
        };
      case 'outline':
        return {
          container: {
            backgroundColor: pressed ? colors.accentSoft : 'transparent',
            borderWidth: 1,
            borderColor: colors.borderStrong,
          },
          textColor: colors.text,
        };
      case 'danger':
        return {
          container: { backgroundColor: pressed ? colors.dangerPressed : colors.danger },
          textColor: '#FFFFFF',
        };
      case 'ghost':
      default:
        return {
          container: { backgroundColor: pressed ? colors.accentSoft : 'transparent' },
          textColor: colors.accent,
        };
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      {...rest}
      style={({ pressed }) => {
        const v = variantStyles(pressed);
        return [
          styles.base,
          {
            height: s.height,
            paddingHorizontal: s.paddingH,
            opacity: isDisabled && !loading ? 0.5 : 1,
          },
          v.container,
          fullWidth && styles.fullWidth,
          style,
        ];
      }}
    >
      {({ pressed }) => {
        const v = variantStyles(pressed);
        return loading ? (
          <ActivityIndicator size="small" color={v.textColor} />
        ) : (
          <View style={styles.content}>
            {icon ? <Ionicons name={icon} size={s.fontSize + 3} color={v.textColor} /> : null}
            <Text
              variant="headline"
              style={{ color: v.textColor, fontSize: s.fontSize, lineHeight: s.fontSize + 5 }}
            >
              {title}
            </Text>
          </View>
        );
      }}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    alignSelf: 'flex-start',
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});

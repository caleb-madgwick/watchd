import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { useTheme } from '@/theme/ThemeContext';
import { typeScale, type TypeVariant } from '@/theme/tokens';

export interface TextProps extends RNTextProps {
  variant?: TypeVariant;
  color?: 'primary' | 'secondary' | 'muted' | 'accent' | 'danger' | 'success' | 'onAccent';
  align?: 'left' | 'center' | 'right';
}

export function Text({
  variant = 'body',
  color = 'primary',
  align,
  style,
  children,
  ...rest
}: TextProps) {
  const { colors } = useTheme();
  const colorValue = {
    primary: colors.text,
    secondary: colors.textSecondary,
    muted: colors.textMuted,
    accent: colors.accent,
    danger: colors.danger,
    success: colors.success,
    onAccent: colors.onAccent,
  }[color];

  return (
    <RNText
      {...rest}
      style={[typeScale[variant], { color: colorValue }, align ? { textAlign: align } : null, style]}
    >
      {children}
    </RNText>
  );
}

import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { Text } from './Text';
import { useTheme } from '@/theme/ThemeContext';
import { radius } from '@/theme/tokens';

export interface AvatarProps {
  url?: string | null;
  /** Display name or username used for the fallback initial + a11y label. */
  name: string;
  size?: number;
}

export function Avatar({ url, name, size = 40 }: AvatarProps) {
  const { colors } = useTheme();
  const initial = (name.trim()[0] ?? '?').toUpperCase();

  if (!url) {
    return (
      <View
        accessibilityLabel={`${name} avatar`}
        style={[
          styles.fallback,
          {
            width: size,
            height: size,
            backgroundColor: colors.accentSoft,
            borderColor: colors.border,
          },
        ]}
      >
        <Text
          variant="headline"
          style={{ color: colors.accent, fontSize: size * 0.42, lineHeight: size * 0.55 }}
        >
          {initial}
        </Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri: url }}
      accessibilityLabel={`${name} avatar`}
      style={{ width: size, height: size, borderRadius: radius.full, backgroundColor: colors.surfaceRaised }}
      contentFit="cover"
      transition={150}
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
});

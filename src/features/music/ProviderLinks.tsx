import { Ionicons } from '@expo/vector-icons';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/primitives/Text';
import { useTheme } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme/tokens';

export interface ProviderLink {
  label: string;
  url: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

/** Outbound "open in" buttons for streaming services. */
export function ProviderLinks({ links }: { links: ProviderLink[] }) {
  const { colors } = useTheme();
  if (links.length === 0) return null;

  return (
    <View style={styles.row}>
      {links.map((link) => (
        <Pressable
          key={link.label}
          accessibilityRole="link"
          accessibilityLabel={link.label}
          onPress={() => Linking.openURL(link.url)}
          style={({ pressed, hovered }) => [
            styles.chip,
            {
              backgroundColor: pressed || hovered ? colors.surfaceHigh : colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons name={link.icon ?? 'play'} size={16} color={colors.accent} />
          <Text variant="subhead">{link.label}</Text>
          <Ionicons name="open-outline" size={14} color={colors.textMuted} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
});

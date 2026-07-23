import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { Button } from './Button';
import { Text } from './Text';
import { useTheme } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme/tokens';

export interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  actionTitle?: string;
  onAction?: () => void;
  compact?: boolean;
}

export function EmptyState({
  icon = 'film-outline',
  title,
  message,
  actionTitle,
  onAction,
  compact = false,
}: EmptyStateProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, compact && styles.compact]}>
      <View style={[styles.iconWrap, { backgroundColor: colors.accentSoft }]}>
        <Ionicons name={icon} size={compact ? 22 : 30} color={colors.accent} />
      </View>
      <Text variant={compact ? 'headline' : 'title3'} align="center">
        {title}
      </Text>
      {message ? (
        <Text variant="callout" color="secondary" align="center" style={styles.message}>
          {message}
        </Text>
      ) : null}
      {actionTitle && onAction ? (
        <Button title={actionTitle} variant="secondary" size="sm" onPress={onAction} style={styles.action} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing['5xl'],
    paddingHorizontal: spacing['2xl'],
    gap: spacing.md,
  },
  compact: {
    paddingVertical: spacing['2xl'],
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  message: {
    maxWidth: 320,
  },
  action: {
    marginTop: spacing.sm,
  },
});

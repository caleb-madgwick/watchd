import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { Button } from './Button';
import { Text } from './Text';
import { useTheme } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme/tokens';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  compact?: boolean;
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'Check your connection and try again.',
  onRetry,
  compact = false,
}: ErrorStateProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, compact && styles.compact]} accessibilityRole="alert">
      <View style={[styles.iconWrap, { backgroundColor: 'rgba(229,72,77,0.12)' }]}>
        <Ionicons name="cloud-offline-outline" size={compact ? 22 : 30} color={colors.danger} />
      </View>
      <Text variant={compact ? 'headline' : 'title3'} align="center">
        {title}
      </Text>
      <Text variant="callout" color="secondary" align="center" style={styles.message}>
        {message}
      </Text>
      {onRetry ? (
        <Button title="Try again" variant="secondary" size="sm" onPress={onRetry} style={styles.action} />
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

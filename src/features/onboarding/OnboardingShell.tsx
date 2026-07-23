import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/primitives/Button';
import { Text } from '@/components/primitives/Text';
import { useTheme } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme/tokens';

const STEPS = ['Username', 'Profile', 'Genres', 'Ratings'] as const;

export interface OnboardingShellProps {
  step: 1 | 2 | 3 | 4;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Primary action pinned to the bottom. */
  actionTitle: string;
  onAction: () => void;
  actionLoading?: boolean;
  actionDisabled?: boolean;
  onSkip?: () => void;
}

export function OnboardingShell({
  step,
  title,
  subtitle,
  children,
  actionTitle,
  onAction,
  actionLoading,
  actionDisabled,
  onSkip,
}: OnboardingShellProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.xl }]}>
      <View style={styles.container}>
        <View
          style={styles.progress}
          accessibilityLabel={`Step ${step} of ${STEPS.length}: ${STEPS[step - 1]}`}
        >
          {STEPS.map((label, index) => (
            <View
              key={label}
              style={[
                styles.progressBar,
                {
                  backgroundColor: index < step ? colors.accent : colors.surfaceHigh,
                },
              ]}
            />
          ))}
        </View>

        <Text variant="title1" style={styles.title}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="callout" color="secondary" style={styles.subtitle}>
            {subtitle}
          </Text>
        ) : null}

        <View style={styles.body}>{children}</View>

        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
          <Button
            title={actionTitle}
            fullWidth
            size="lg"
            onPress={onAction}
            loading={actionLoading}
            disabled={actionDisabled}
          />
          {onSkip ? (
            <Button title="Skip for now" variant="ghost" fullWidth onPress={onSkip} />
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    paddingHorizontal: spacing.xl,
  },
  progress: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing['3xl'],
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: radius.full,
  },
  title: {
    marginBottom: spacing.sm,
  },
  subtitle: {
    marginBottom: spacing.xl,
  },
  body: {
    flex: 1,
  },
  footer: {
    gap: spacing.sm,
    paddingTop: spacing.lg,
  },
});

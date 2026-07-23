import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/primitives/Button';
import { EmptyState } from '@/components/primitives/EmptyState';
import { Text } from '@/components/primitives/Text';
import { TextInput } from '@/components/primitives/TextInput';
import { config } from '@/constants/config';
import { useLetterboxdImport } from '@/features/import/letterboxd';
import { ProfileSubpageShell } from '@/features/profile/ProfileSubpageShell';
import { useCurrentUserId } from '@/providers/AuthProvider';
import { useTheme } from '@/theme/ThemeContext';
import { contentWidth, radius, spacing } from '@/theme/tokens';

export default function ImportScreen() {
  const { colors } = useTheme();
  const userId = useCurrentUserId();
  const { run, running, progress, result, error } = useLetterboxdImport();
  const [csv, setCsv] = useState('');

  if (config.demoMode || !userId) {
    return (
      <ProfileSubpageShell title="Import">
        <EmptyState
          icon="cloud-upload-outline"
          title="Sign in to import"
          message="Bring your Letterboxd history into Video Club."
        />
      </ProfileSubpageShell>
    );
  }

  const pct = progress && progress.total > 0 ? Math.round((progress.processed / progress.total) * 100) : 0;

  return (
    <ProfileSubpageShell title="Import from Letterboxd" subtitle="Movies only">
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <Text variant="callout" color="secondary">
          Export your data from Letterboxd (Settings → Import &amp; Export → Export your data), open
          {' '}
          <Text variant="callout">diary.csv</Text> or <Text variant="callout">watched.csv</Text>, and
          paste its contents below. Up to 100 films per run — paste in chunks for a larger library.
        </Text>

        <TextInput
          value={csv}
          onChangeText={setCsv}
          placeholder="Paste CSV contents here…"
          multiline
          autoCapitalize="none"
          style={styles.textarea}
        />

        {error ? (
          <Text variant="caption" color="danger">
            {error}
          </Text>
        ) : null}

        {progress && running ? (
          <View style={styles.progressWrap}>
            <View style={[styles.track, { backgroundColor: colors.surfaceRaised }]}>
              <View style={[styles.fill, { width: `${pct}%`, backgroundColor: colors.accent }]} />
            </View>
            <Text variant="caption" color="muted">
              Importing {progress.processed} of {progress.total}…
            </Text>
          </View>
        ) : null}

        {result ? (
          <View style={[styles.result, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text variant="headline">Import complete</Text>
            <Text variant="caption" color="muted">
              {result.imported} imported
              {result.failed > 0 ? ` · ${result.failed} couldn’t be matched` : ''} of {result.total}.
            </Text>
          </View>
        ) : null}

        <Button
          title={running ? 'Importing…' : 'Import'}
          icon="cloud-upload-outline"
          loading={running}
          disabled={running || !csv.trim()}
          onPress={() => run(csv)}
        />
      </ScrollView>
    </ProfileSubpageShell>
  );
}

const styles = StyleSheet.create({
  page: {
    width: '100%',
    maxWidth: contentWidth.prose,
    alignSelf: 'center',
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing['6xl'],
  },
  textarea: {
    minHeight: 160,
  },
  progressWrap: {
    gap: spacing.xs,
  },
  track: {
    height: 10,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.full,
  },
  result: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 4,
  },
});

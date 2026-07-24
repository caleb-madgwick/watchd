import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useBookProgress, useSetBookProgress } from './tracking';
import { Button } from '@/components/primitives/Button';
import { Text } from '@/components/primitives/Text';
import { TextInput } from '@/components/primitives/TextInput';
import { config } from '@/constants/config';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme/tokens';
import type { BookDetails } from '@/types/domain';

/** Reading progress: current page / total, a % bar, and "Finished". */
export function BookProgressPanel({ book }: { book: BookDetails }) {
  const { session } = useAuth();
  const { colors } = useTheme();
  const progress = useBookProgress(book);
  const setProgress = useSetBookProgress(book);
  const [pageInput, setPageInput] = useState('');

  if (config.demoMode || !session) return null;

  const total = book.pageCount ?? progress.data?.total_pages ?? null;
  const current = progress.data?.current_page ?? 0;
  const percent = progress.data?.percent ?? 0;
  const completed = progress.data?.completed ?? false;

  const updatePage = () => {
    const p = Number.parseInt(pageInput, 10);
    if (!Number.isFinite(p) || p < 0) return;
    setProgress.mutate({
      currentPage: p,
      totalPages: total ?? undefined,
      completed: total ? p >= total : false,
    });
    setPageInput('');
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text variant="headline">Reading progress</Text>

      <View style={[styles.track, { backgroundColor: colors.surfaceRaised }]}>
        <View style={[styles.fill, { width: `${percent}%`, backgroundColor: colors.accent }]} />
      </View>
      <Text variant="caption" color="muted">
        {completed ? 'Finished 🎉' : `Page ${current}${total ? ` of ${total}` : ''} · ${percent}%`}
      </Text>

      <View style={styles.row}>
        <View style={styles.inputField}>
          <TextInput
            value={pageInput}
            onChangeText={setPageInput}
            placeholder={total ? `Current page (of ${total})` : 'Current page'}
            keyboardType="number-pad"
          />
        </View>
        <Button
          title="Update"
          size="sm"
          disabled={!pageInput.trim() || setProgress.isPending}
          onPress={updatePage}
        />
      </View>

      {!completed ? (
        <Button
          title="Mark as finished"
          variant="secondary"
          icon="checkmark-circle-outline"
          loading={setProgress.isPending}
          onPress={() =>
            setProgress.mutate({ currentPage: total ?? current, totalPages: total ?? undefined, completed: true })
          }
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.md, borderWidth: 1, padding: spacing.md, gap: spacing.sm },
  track: { height: 10, borderRadius: radius.full, overflow: 'hidden', marginTop: spacing.xs },
  fill: { height: '100%', borderRadius: radius.full },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginTop: spacing.xs },
  inputField: { flex: 1 },
});

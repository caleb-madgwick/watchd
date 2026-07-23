import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/primitives/Button';
import { Text } from '@/components/primitives/Text';
import { TextInput } from '@/components/primitives/TextInput';
import { config } from '@/constants/config';
import { useAddTag, useRemoveTag, useTitleTags } from '@/features/tags/hooks';
import { useCurrentUserId } from '@/providers/AuthProvider';
import { useTheme } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme/tokens';
import type { TitleSummary } from '@/types/domain';

/** Your personal free-text tags on a title (private organisation). */
export function TitleTags({ title }: { title: TitleSummary }) {
  const { colors } = useTheme();
  const currentUserId = useCurrentUserId();
  const tags = useTitleTags(title);
  const addTag = useAddTag(title);
  const removeTag = useRemoveTag(title);
  const [draft, setDraft] = useState('');

  if (config.demoMode || !currentUserId) return null;

  const submit = () => {
    const value = draft.trim();
    if (!value) return;
    addTag.mutate(value, { onSuccess: () => setDraft('') });
  };

  const list = tags.data ?? [];

  return (
    <View style={styles.wrap}>
      <Text variant="subhead">Your tags</Text>
      {list.length > 0 ? (
        <View style={styles.chips}>
          {list.map((tag) => (
            <Pressable
              key={tag}
              accessibilityRole="button"
              accessibilityLabel={`Remove tag ${tag}`}
              onPress={() => removeTag.mutate(tag)}
              style={[styles.chip, { backgroundColor: colors.surfaceRaised }]}
            >
              <Text variant="caption">{tag}</Text>
              <Ionicons name="close" size={13} color={colors.textMuted} />
            </Pressable>
          ))}
        </View>
      ) : null}
      <View style={styles.inputRow}>
        <View style={styles.inputField}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Add a tag…"
            autoCapitalize="none"
            maxLength={30}
            onSubmitEditing={submit}
            returnKeyType="done"
          />
        </View>
        <Button
          title="Add"
          size="sm"
          disabled={!draft.trim() || addTag.isPending}
          onPress={submit}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  inputField: {
    flex: 1,
  },
});

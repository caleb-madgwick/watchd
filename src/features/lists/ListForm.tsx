import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/primitives/Button';
import { SegmentedControl } from '@/components/primitives/SegmentedControl';
import { Text } from '@/components/primitives/Text';
import { TextInput } from '@/components/primitives/TextInput';
import { limits } from '@/constants/config';
import { spacing } from '@/theme/tokens';
import type { ListVisibilityRow } from '@/types/database';

export interface ListFormValues {
  name: string;
  description: string;
  visibility: ListVisibilityRow;
}

export function ListForm({
  initial,
  submitTitle,
  submitting,
  onSubmit,
}: {
  initial?: Partial<ListFormValues>;
  submitTitle: string;
  submitting: boolean;
  onSubmit: (values: ListFormValues) => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [visibility, setVisibility] = useState<ListVisibilityRow>(initial?.visibility ?? 'public');
  const [error, setError] = useState<string | undefined>();

  const submit = () => {
    if (!name.trim()) {
      setError('Give your list a name.');
      return;
    }
    setError(undefined);
    onSubmit({ name, description, visibility });
  };

  return (
    <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
      <TextInput
        label="Name"
        value={name}
        onChangeText={setName}
        maxLength={limits.listNameMax}
        error={error}
        placeholder="e.g. Perfect final acts"
        autoFocus
      />
      <TextInput
        label="Description (optional)"
        value={description}
        onChangeText={setDescription}
        multiline
        maxLength={limits.listDescriptionMax}
        placeholder="What ties these titles together?"
        hint={`${description.length}/${limits.listDescriptionMax}`}
      />
      <View style={styles.visibility}>
        <Text variant="subhead" color="secondary">
          Visibility
        </Text>
        <SegmentedControl
          options={[
            { value: 'public', label: 'Public' },
            { value: 'private', label: 'Private' },
          ]}
          value={visibility}
          onChange={setVisibility}
        />
        <Text variant="footnote" color="muted">
          {visibility === 'public'
            ? 'Anyone can view this list, and creating it appears in your followers’ feeds.'
            : 'Only you can see this list.'}
        </Text>
      </View>
      <Button title={submitTitle} fullWidth size="lg" loading={submitting} onPress={submit} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.xl,
    paddingBottom: spacing['5xl'],
  },
  visibility: {
    gap: spacing.sm,
  },
});

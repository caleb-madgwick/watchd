import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useLogAlbum, useLogListen, type MusicTrackable } from './tracking';
import { Button } from '@/components/primitives/Button';
import { FilterChip } from '@/components/primitives/FilterChip';
import { Modal } from '@/components/primitives/Modal';
import { RatingInput } from '@/components/primitives/RatingStars';
import { TextInput } from '@/components/primitives/TextInput';
import { Text } from '@/components/primitives/Text';
import { toast } from '@/stores/toastStore';
import { spacing } from '@/theme/tokens';
import type { AlbumSummary } from '@/types/domain';

function isoDaysAgo(days: number): string {
  const ms = Date.now() - days * 24 * 60 * 60 * 1000;
  return new Date(ms).toISOString();
}
function dateDaysAgo(days: number): string {
  return isoDaysAgo(days).slice(0, 10);
}

/**
 * Log a listen. Albums capture rating + an optional written review and post to
 * the feed (shared review system); songs capture rating + a private reaction.
 */
export function LogMusicSheet({
  item,
  visible,
  onClose,
  initialRating,
}: {
  item: MusicTrackable;
  visible: boolean;
  onClose: () => void;
  initialRating?: number | null;
}) {
  const isAlbum = item.mediaType === 'album';
  const logAlbum = useLogAlbum(item as AlbumSummary);
  const logListen = useLogListen(item);
  const [rating, setRating] = useState(initialRating ?? 0);
  const [text, setText] = useState('');
  const [when, setWhen] = useState<'today' | 'yesterday'>('today');
  const pending = isAlbum ? logAlbum.isPending : logListen.isPending;

  const save = () => {
    const onSuccess = () => {
      toast.success(`Logged ${item.title}.`);
      onClose();
    };
    if (isAlbum) {
      logAlbum.mutate(
        {
          rating: rating > 0 ? rating : undefined,
          reviewBody: text.trim() ? text.trim() : undefined,
          watchedAt: when === 'today' ? dateDaysAgo(0) : dateDaysAgo(1),
        },
        { onSuccess },
      );
    } else {
      logListen.mutate(
        {
          rating: rating > 0 ? rating : undefined,
          notes: text.trim() ? text.trim() : undefined,
          listenedAt: when === 'today' ? isoDaysAgo(0) : isoDaysAgo(1),
        },
        { onSuccess },
      );
    }
  };

  return (
    <Modal visible={visible} onClose={onClose} title={isAlbum ? 'Log or review' : 'Log song'}>
      <View style={styles.body}>
        <Text variant="headline" numberOfLines={2}>
          {item.title}
        </Text>

        <View style={styles.field}>
          <Text variant="caption" color="muted" style={styles.label}>
            Your rating
          </Text>
          <RatingInput value={rating} onChange={setRating} size={28} />
        </View>

        <View style={styles.field}>
          <Text variant="caption" color="muted" style={styles.label}>
            Listened
          </Text>
          <View style={styles.chips}>
            <FilterChip label="Today" selected={when === 'today'} onPress={() => setWhen('today')} />
            <FilterChip label="Yesterday" selected={when === 'yesterday'} onPress={() => setWhen('yesterday')} />
          </View>
        </View>

        <View style={styles.field}>
          <Text variant="caption" color="muted" style={styles.label}>
            {isAlbum ? 'Review (optional)' : 'Reaction (optional)'}
          </Text>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={isAlbum ? 'What did you think?' : 'A quick thought…'}
            multiline
            maxLength={isAlbum ? 10000 : 2000}
          />
        </View>

        <Button title="Save log" icon="checkmark" fullWidth loading={pending} onPress={save} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: spacing.lg,
  },
  field: {
    gap: spacing.sm,
  },
  label: {
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  chips: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});

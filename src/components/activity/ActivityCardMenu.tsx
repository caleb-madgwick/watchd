import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/primitives/Button';
import { IconButton } from '@/components/primitives/IconButton';
import { Modal } from '@/components/primitives/Modal';
import { Text } from '@/components/primitives/Text';
import { useDeleteActivity, useUndoActivity } from '@/features/activity/hooks';
import { spacing } from '@/theme/tokens';
import type { FeedItem } from '@/types/database';

/**
 * Owner-only edit menu for one activity row. Offers two escape hatches for a
 * mistaken entry: remove it from the feed, or fully undo the log (also clearing
 * the watched status/diary). Rendered only when the viewer is the actor.
 */
export function ActivityCardMenu({ item }: { item: FeedItem }) {
  const [open, setOpen] = useState(false);
  const deleteActivity = useDeleteActivity();
  const undoActivity = useUndoActivity();

  // "I didn't watch this" only applies to a title-based log / TV completion.
  const canUndo =
    !!item.title && (item.activity_type === 'logged' || item.activity_type === 'tv_completed');
  const busy = deleteActivity.isPending || undoActivity.isPending;
  const close = () => setOpen(false);

  return (
    <>
      <IconButton
        icon="ellipsis-horizontal"
        accessibilityLabel="Activity options"
        size={18}
        onPress={() => setOpen(true)}
      />

      <Modal visible={open} onClose={close} title="Edit activity">
        <View style={styles.body}>
          {item.title ? (
            <Text variant="callout" color="secondary" numberOfLines={1}>
              {item.title.title}
            </Text>
          ) : null}

          <View style={styles.action}>
            <Button
              title="Remove from activity"
              variant="secondary"
              icon="eye-off-outline"
              fullWidth
              loading={deleteActivity.isPending}
              disabled={busy}
              onPress={() => deleteActivity.mutate(item.id, { onSuccess: close })}
            />
            <Text variant="footnote" color="muted">
              Hides this from your activity. Your watched mark stays.
            </Text>
          </View>

          {canUndo ? (
            <View style={styles.action}>
              <Button
                title="Undo — I didn't watch this"
                variant="danger"
                icon="arrow-undo-outline"
                fullWidth
                loading={undoActivity.isPending}
                disabled={busy}
                onPress={() =>
                  undoActivity.mutate(
                    {
                      activityId: item.id,
                      titleRowId: item.title!.id,
                      tmdbId: item.title!.tmdb_id,
                      mediaType: item.title!.media_type,
                    },
                    { onSuccess: close },
                  )
                }
              />
              <Text variant="footnote" color="muted">
                Also un-marks it as watched and clears your diary and progress for this title.
              </Text>
            </View>
          ) : null}

          <Button title="Cancel" variant="ghost" fullWidth disabled={busy} onPress={close} />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: spacing.lg,
  },
  action: {
    gap: spacing.xs,
  },
});

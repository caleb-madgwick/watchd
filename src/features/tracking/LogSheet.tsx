import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { Button } from '@/components/primitives/Button';
import { FilterChip } from '@/components/primitives/FilterChip';
import { Modal } from '@/components/primitives/Modal';
import { RatingInput } from '@/components/primitives/RatingStars';
import { Text } from '@/components/primitives/Text';
import { TextInput } from '@/components/primitives/TextInput';
import { limits } from '@/constants/config';
import { useLogTitle, type TitleStatusState } from '@/features/tracking/queries';
import { toast } from '@/stores/toastStore';
import { useTheme } from '@/theme/ThemeContext';
import { spacing } from '@/theme/tokens';
import type { TitleSummary } from '@/types/domain';
import { todayISODate } from '@/utils/dates';

export interface LogSheetProps {
  title: TitleSummary;
  visible: boolean;
  onClose: () => void;
  currentStatus?: TitleStatusState;
  /** Prefill for editing an existing review from the title page. */
  initialReview?: { body: string; containsSpoilers: boolean };
}

function yesterdayISODate(): string {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return todayISODate(date);
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The full "log" flow: watched (+date), rating, optional review with spoiler
 * flag, rewatch marker. Saves atomically via log_title() and produces a single
 * combined feed entry.
 */
export function LogSheet({ title, visible, onClose, currentStatus, initialReview }: LogSheetProps) {
  const { colors } = useTheme();
  const logMutation = useLogTitle(title);

  const [rating, setRating] = useState(currentStatus?.rating ?? 0);
  const [watchedAt, setWatchedAt] = useState(todayISODate());
  const [customDate, setCustomDate] = useState(false);
  const [isRewatch, setIsRewatch] = useState(false);
  const [reviewBody, setReviewBody] = useState(initialReview?.body ?? '');
  const [containsSpoilers, setContainsSpoilers] = useState(initialReview?.containsSpoilers ?? false);
  const [dateError, setDateError] = useState<string | undefined>();

  const isMovie = title.mediaType === 'movie';

  const onSave = () => {
    if (customDate && !DATE_PATTERN.test(watchedAt)) {
      setDateError('Use the format YYYY-MM-DD.');
      return;
    }
    const parsed = new Date(watchedAt);
    if (Number.isNaN(parsed.getTime()) || parsed.getTime() > Date.now() + 86_400_000) {
      setDateError('The watched date cannot be in the future.');
      return;
    }
    setDateError(undefined);

    logMutation.mutate(
      {
        status: 'watched',
        rating: rating > 0 ? rating : undefined,
        watchedAt,
        reviewBody: reviewBody.trim() || undefined,
        containsSpoilers: reviewBody.trim() ? containsSpoilers : undefined,
        isRewatch: isMovie ? isRewatch : undefined,
        createDiaryEntry: isMovie,
      },
      {
        onSuccess: () => {
          toast.success(
            reviewBody.trim()
              ? `Logged and reviewed ${title.title}.`
              : `Logged ${title.title}.`,
          );
          onClose();
        },
      },
    );
  };

  return (
    <Modal visible={visible} onClose={onClose} title={`Log ${isMovie ? 'movie' : 'show'}`}>
      <View style={styles.container}>
        <View style={styles.titleBlock}>
          <Text variant="title3">{title.title}</Text>
          {title.releaseYear ? (
            <Text variant="footnote" color="muted">
              {title.releaseYear}
            </Text>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text variant="subhead" color="secondary">
            Your rating
          </Text>
          <RatingInput value={rating} onChange={setRating} size={34} />
        </View>

        <View style={styles.section}>
          <Text variant="subhead" color="secondary">
            Watched on
          </Text>
          <View style={styles.dateChips}>
            <FilterChip
              label="Today"
              selected={!customDate && watchedAt === todayISODate()}
              onPress={() => {
                setCustomDate(false);
                setWatchedAt(todayISODate());
              }}
            />
            <FilterChip
              label="Yesterday"
              selected={!customDate && watchedAt === yesterdayISODate()}
              onPress={() => {
                setCustomDate(false);
                setWatchedAt(yesterdayISODate());
              }}
            />
            <FilterChip label="Pick a date" selected={customDate} onPress={() => setCustomDate(true)} />
          </View>
          {customDate ? (
            <TextInput
              label="Date"
              value={watchedAt}
              onChangeText={setWatchedAt}
              placeholder="YYYY-MM-DD"
              autoCapitalize="none"
              error={dateError}
            />
          ) : null}
        </View>

        {isMovie ? (
          <View style={styles.switchRow}>
            <Text variant="callout">I’ve seen this before (rewatch)</Text>
            <Switch
              value={isRewatch}
              onValueChange={setIsRewatch}
              trackColor={{ true: colors.accent, false: colors.surfaceHigh }}
              thumbColor="#FFFFFF"
              accessibilityLabel="Mark as rewatch"
            />
          </View>
        ) : null}

        <View style={styles.section}>
          <Text variant="subhead" color="secondary">
            Review (optional)
          </Text>
          <TextInput
            multiline
            value={reviewBody}
            onChangeText={setReviewBody}
            placeholder="What did you think?"
            maxLength={limits.reviewMax}
            hint={
              reviewBody.length > limits.reviewMax - 500
                ? `${reviewBody.length}/${limits.reviewMax}`
                : undefined
            }
          />
          {reviewBody.trim() ? (
            <View style={styles.switchRow}>
              <Text variant="callout">Contains spoilers</Text>
              <Switch
                value={containsSpoilers}
                onValueChange={setContainsSpoilers}
                trackColor={{ true: colors.accent, false: colors.surfaceHigh }}
                thumbColor="#FFFFFF"
                accessibilityLabel="Mark review as containing spoilers"
              />
            </View>
          ) : null}
        </View>

        <Button
          title={reviewBody.trim() ? 'Save log and review' : 'Save log'}
          fullWidth
          size="lg"
          loading={logMutation.isPending}
          onPress={onSave}
        />
        <Text variant="caption" color="muted" align="center">
          Marks this {isMovie ? 'movie' : 'show'} as watched
          {isMovie ? ' and adds a diary entry' : ''}.
        </Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xl,
  },
  titleBlock: {
    gap: 2,
  },
  section: {
    gap: spacing.sm,
  },
  dateChips: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
});

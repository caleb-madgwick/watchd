import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';

import { Button } from '@/components/primitives/Button';
import { EmptyState } from '@/components/primitives/EmptyState';
import { RatingInput } from '@/components/primitives/RatingStars';
import { CardListSkeleton } from '@/components/primitives/Skeleton';
import { Text } from '@/components/primitives/Text';
import { TextInput } from '@/components/primitives/TextInput';
import { limits } from '@/constants/config';
import { ProfileSubpageShell } from '@/features/profile/ProfileSubpageShell';
import { useReview, useUpdateReview } from '@/features/reviews/hooks';
import { useCurrentUserId } from '@/providers/AuthProvider';
import { useTheme } from '@/theme/ThemeContext';
import { contentWidth, spacing } from '@/theme/tokens';

function EditForm({
  reviewId,
  initialBody,
  initialRating,
  initialSpoilers,
}: {
  reviewId: string;
  initialBody: string;
  initialRating: number;
  initialSpoilers: boolean;
}) {
  const { colors } = useTheme();
  const update = useUpdateReview();
  const [body, setBody] = useState(initialBody);
  const [rating, setRating] = useState(initialRating);
  const [containsSpoilers, setContainsSpoilers] = useState(initialSpoilers);
  const [error, setError] = useState<string | undefined>();

  const onSave = () => {
    if (!body.trim()) {
      setError('A review needs some text — or delete it instead.');
      return;
    }
    setError(undefined);
    update.mutate(
      {
        reviewId,
        body,
        rating: rating > 0 ? rating : null,
        containsSpoilers,
      },
      { onSuccess: () => router.back() },
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
      <View style={styles.ratingWrap}>
        <Text variant="subhead" color="secondary">
          Your rating
        </Text>
        <RatingInput value={rating} onChange={setRating} size={32} />
      </View>
      <TextInput
        label="Review"
        multiline
        value={body}
        onChangeText={setBody}
        maxLength={limits.reviewMax}
        error={error}
        hint={`${body.length}/${limits.reviewMax}`}
      />
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
      <Button title="Save changes" fullWidth size="lg" loading={update.isPending} onPress={onSave} />
    </ScrollView>
  );
}

export default function EditReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const currentUserId = useCurrentUserId();
  const review = useReview(id);

  return (
    <ProfileSubpageShell title="Edit review">
      <Stack.Screen options={{ title: 'Edit review — Video Club' }} />
      <View style={styles.page}>
        {review.isLoading ? (
          <CardListSkeleton count={1} />
        ) : !review.data || review.data.userId !== currentUserId ? (
          <EmptyState
            icon="lock-closed-outline"
            title="Can’t edit this review"
            message="Only the author can edit a review."
          />
        ) : (
          <EditForm
            reviewId={review.data.id}
            initialBody={review.data.body}
            initialRating={review.data.rating ?? 0}
            initialSpoilers={review.data.containsSpoilers}
          />
        )}
      </View>
    </ProfileSubpageShell>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    width: '100%',
    maxWidth: contentWidth.prose,
    alignSelf: 'center',
    padding: spacing.lg,
  },
  form: {
    gap: spacing.xl,
    paddingBottom: spacing['5xl'],
  },
  ratingWrap: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});

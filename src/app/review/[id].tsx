import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/primitives/Button';
import { EmptyState } from '@/components/primitives/EmptyState';
import { ErrorState } from '@/components/primitives/ErrorState';
import { Modal } from '@/components/primitives/Modal';
import { CardListSkeleton } from '@/components/primitives/Skeleton';
import { Text } from '@/components/primitives/Text';
import { CommentsSection } from '@/features/comments/CommentsSection';
import { ReviewCard } from '@/components/reviews/ReviewCard';
import { ProfileSubpageShell } from '@/features/profile/ProfileSubpageShell';
import { useDeleteReview, useReview, useToggleReviewLike } from '@/features/reviews/hooks';
import { supabase } from '@/lib/supabase/client';
import { useAuth, useCurrentUserId } from '@/providers/AuthProvider';
import { toast } from '@/stores/toastStore';
import { contentWidth, spacing } from '@/theme/tokens';

export default function ReviewDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const currentUserId = useCurrentUserId();
  const review = useReview(id);
  const toggleLike = useToggleReviewLike();
  const deleteReview = useDeleteReview();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reporting, setReporting] = useState(false);

  const isOwn = review.data?.userId === currentUserId;

  const submitReport = async (reason: string) => {
    if (!supabase || !currentUserId || !review.data) return;
    const { error } = await supabase.from('reports').insert({
      reporter_id: currentUserId,
      review_id: review.data.id,
      reason,
    });
    setReporting(false);
    if (error && error.code !== '23505') {
      toast.error('Could not submit the report.');
    } else {
      toast.success('Thanks — the report was recorded.');
    }
  };

  return (
    <ProfileSubpageShell title="Review">
      <Stack.Screen options={{ title: 'Review — Video Club' }} />
      <ScrollView
        style={styles.page}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {review.isLoading ? (
          <CardListSkeleton count={1} />
        ) : review.isError ? (
          <ErrorState
            title="Couldn’t load this review"
            message="Check your connection and try again."
            onRetry={() => review.refetch()}
          />
        ) : !review.data ? (
          <EmptyState
            icon="chatbubble-ellipses-outline"
            title="Review not found"
            message="It may have been deleted by its author."
          />
        ) : (
          <View style={styles.content}>
            <ReviewCard
              review={{
                id: review.data.id,
                body: review.data.body,
                rating: review.data.rating,
                containsSpoilers: review.data.containsSpoilers,
                likeCount: review.data.likeCount,
                createdAt: review.data.createdAt,
                editedAt:
                  review.data.updatedAt !== review.data.createdAt ? review.data.updatedAt : null,
                author: review.data.author,
                title: review.data.title
                  ? {
                      tmdbId: review.data.title.tmdbId,
                      mediaType: review.data.title.mediaType,
                      name: review.data.title.title,
                      posterUrl: review.data.title.posterUrl,
                      releaseYear: review.data.title.releaseYear,
                    }
                  : undefined,
              }}
              likedByMe={review.data.likedByMe}
              onToggleLike={
                session
                  ? () => {
                      const data = review.data;
                      if (data) toggleLike.mutate({ reviewId: data.id, like: !data.likedByMe });
                    }
                  : undefined
              }
              numberOfLines={0}
            />

            {isOwn ? (
              <View style={styles.actions}>
                <Button
                  title="Edit review"
                  variant="secondary"
                  icon="create-outline"
                  onPress={() => {
                    const data = review.data;
                    if (data) router.push(`/review/edit/${data.id}`);
                  }}
                />
                <Button
                  title="Delete"
                  variant="danger"
                  icon="trash-outline"
                  onPress={() => setConfirmDelete(true)}
                />
              </View>
            ) : session ? (
              <Button
                title="Report review"
                variant="ghost"
                size="sm"
                icon="flag-outline"
                onPress={() => setReporting(true)}
                style={styles.reportButton}
              />
            ) : null}

            <CommentsSection targetType="review" targetId={review.data.id} />
          </View>
        )}
      </ScrollView>

      {review.data ? (
        <Modal visible={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete review?">
          <View style={styles.modalBody}>
            <Text variant="callout" color="secondary">
              This permanently removes your review and its likes.
            </Text>
            <Button
              title="Delete review"
              variant="danger"
              fullWidth
              loading={deleteReview.isPending}
              onPress={() => {
                const data = review.data;
                if (!data) return;
                deleteReview.mutate(data.id, {
                  onSuccess: () => {
                    setConfirmDelete(false);
                    router.back();
                  },
                });
              }}
            />
            <Button title="Keep it" variant="ghost" fullWidth onPress={() => setConfirmDelete(false)} />
          </View>
        </Modal>
      ) : null}

      <Modal visible={reporting} onClose={() => setReporting(false)} title="Report this review">
        <View style={styles.modalBody}>
          <Text variant="callout" color="secondary">
            Why are you reporting it?
          </Text>
          {[
            { reason: 'spam', label: 'Spam or advertising' },
            { reason: 'abuse', label: 'Abusive or hateful' },
            { reason: 'spoilers', label: 'Unmarked spoilers' },
            { reason: 'other', label: 'Something else' },
          ].map((option) => (
            <Button
              key={option.reason}
              title={option.label}
              variant="secondary"
              fullWidth
              onPress={() => submitReport(option.reason)}
            />
          ))}
        </View>
      </Modal>
    </ProfileSubpageShell>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    width: '100%',
    maxWidth: contentWidth.prose,
    alignSelf: 'center',
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing['6xl'],
  },
  content: {
    gap: spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  reportButton: {
    alignSelf: 'flex-start',
  },
  modalBody: {
    gap: spacing.md,
  },
});

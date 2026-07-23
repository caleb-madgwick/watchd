import { StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/primitives/EmptyState';
import { CardListSkeleton } from '@/components/primitives/Skeleton';
import { Text } from '@/components/primitives/Text';
import { ReviewCard } from '@/components/reviews/ReviewCard';
import { config } from '@/constants/config';
import { useTitleReviews, useToggleReviewLike } from '@/features/reviews/hooks';
import { useAuth } from '@/providers/AuthProvider';
import { spacing } from '@/theme/tokens';
import type { TitleSummary } from '@/types/domain';

/** Community reviews block on movie/TV pages. */
export function TitleReviewsSection({ title }: { title: TitleSummary }) {
  const { session } = useAuth();
  const reviews = useTitleReviews(title);
  const toggleLike = useToggleReviewLike();

  if (config.demoMode) return null;

  return (
    <View style={styles.section}>
      <Text variant="title3" style={styles.heading}>
        Reviews from the community
      </Text>
      {reviews.isLoading ? (
        <View style={styles.list}>
          <CardListSkeleton count={2} />
        </View>
      ) : !reviews.data || reviews.data.length === 0 ? (
        <EmptyState
          compact
          icon="chatbubble-ellipses-outline"
          title="No reviews yet"
          message="Be the first — use “Log or review” above."
        />
      ) : (
        <View style={styles.list}>
          {reviews.data.map((review) => (
            <ReviewCard
              key={review.id}
              review={{
                id: review.id,
                body: review.body,
                rating: review.rating,
                containsSpoilers: review.containsSpoilers,
                likeCount: review.likeCount,
                createdAt: review.createdAt,
                editedAt: review.updatedAt !== review.createdAt ? review.updatedAt : null,
                author: review.author,
              }}
              likedByMe={review.likedByMe}
              onToggleLike={
                session
                  ? () => toggleLike.mutate({ reviewId: review.id, like: !review.likedByMe })
                  : undefined
              }
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.md,
  },
  heading: {
    paddingHorizontal: spacing.lg,
  },
  list: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
});

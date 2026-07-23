import { Stack, useLocalSearchParams } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/primitives/EmptyState';
import { CardListSkeleton } from '@/components/primitives/Skeleton';
import { ReviewCard } from '@/components/reviews/ReviewCard';
import { useProfileByUsername } from '@/features/profile/hooks';
import { ProfileSubpageShell } from '@/features/profile/ProfileSubpageShell';
import { useToggleReviewLike, useUserReviews } from '@/features/reviews/hooks';
import { useAuth } from '@/providers/AuthProvider';
import { contentWidth, spacing } from '@/theme/tokens';

export default function UserReviewsScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const { session } = useAuth();
  const profile = useProfileByUsername(username);
  const reviews = useUserReviews(profile.data?.id);
  const toggleLike = useToggleReviewLike();

  return (
    <ProfileSubpageShell title="Reviews" subtitle={username ? `@${username}` : undefined}>
      <Stack.Screen options={{ title: `Reviews by @${username ?? ''} — Video Club` }} />
      {profile.isLoading || reviews.isLoading ? (
        <View style={styles.loading}>
          <CardListSkeleton count={4} />
        </View>
      ) : !reviews.data || reviews.data.length === 0 ? (
        <EmptyState
          icon="chatbubble-ellipses-outline"
          title="No reviews yet"
          message="Reviews they publish will appear here."
        />
      ) : (
        <FlatList
          data={reviews.data}
          keyExtractor={(review) => review.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          renderItem={({ item: review }) => (
            <ReviewCard
              review={{
                id: review.id,
                body: review.body,
                rating: review.rating,
                containsSpoilers: review.containsSpoilers,
                likeCount: review.likeCount,
                createdAt: review.createdAt,
                editedAt: review.updatedAt !== review.createdAt ? review.updatedAt : null,
                author: review.author,
                title: review.title
                  ? {
                      tmdbId: review.title.tmdbId,
                      mediaType: review.title.mediaType,
                      name: review.title.title,
                      posterUrl: review.title.posterUrl,
                      releaseYear: review.title.releaseYear,
                    }
                  : undefined,
              }}
              likedByMe={review.likedByMe}
              onToggleLike={
                session ? () => toggleLike.mutate({ reviewId: review.id, like: !review.likedByMe }) : undefined
              }
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </ProfileSubpageShell>
  );
}

const styles = StyleSheet.create({
  loading: {
    padding: spacing.lg,
  },
  list: {
    padding: spacing.lg,
    paddingBottom: spacing['6xl'],
    width: '100%',
    maxWidth: contentWidth.prose,
    alignSelf: 'center',
  },
});

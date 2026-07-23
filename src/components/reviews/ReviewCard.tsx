import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/primitives/Avatar';
import { LinkPressable } from '@/components/primitives/LinkPressable';
import { RatingStars } from '@/components/primitives/RatingStars';
import { SpoilerText } from '@/components/primitives/SpoilerText';
import { Text } from '@/components/primitives/Text';
import { useTheme } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme/tokens';
import type { MediaType } from '@/types/domain';
import { timeAgo } from '@/utils/dates';
import { titleHref } from '@/utils/titles';

export interface ReviewCardData {
  id: string;
  body: string;
  rating: number | null;
  containsSpoilers: boolean;
  likeCount: number;
  createdAt: string;
  editedAt?: string | null;
  author: { username: string; displayName: string; avatarUrl?: string };
  /** Show the reviewed title (feed/home contexts). Omit on the title's own page. */
  title?: {
    tmdbId: number;
    mediaType: MediaType;
    name: string;
    posterUrl?: string;
    releaseYear?: number;
  };
}

export interface ReviewCardProps {
  review: ReviewCardData;
  likedByMe?: boolean;
  onToggleLike?: () => void;
  /** Truncate long bodies (opens full review). */
  numberOfLines?: number;
  href?: string;
}

export function ReviewCard({ review, likedByMe, onToggleLike, numberOfLines = 6 }: ReviewCardProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.header}>
        <Link href={`/user/${review.author.username}`} asChild>
          <Pressable accessibilityRole="link" style={styles.author}>
            <Avatar url={review.author.avatarUrl} name={review.author.displayName} size={34} />
            <View style={styles.authorText}>
              <Text variant="subhead" numberOfLines={1}>
                {review.author.displayName}
              </Text>
              <Text variant="caption" color="muted" numberOfLines={1}>
                @{review.author.username} · {timeAgo(review.createdAt)}
                {review.editedAt ? ' · edited' : ''}
              </Text>
            </View>
          </Pressable>
        </Link>
        {review.rating ? <RatingStars value={review.rating} size={13} /> : null}
      </View>

      {review.title ? (
        <LinkPressable
          href={titleHref(review.title.mediaType, review.title.tmdbId)}
          accessibilityLabel={`${review.title.name}${review.title.releaseYear ? `, ${review.title.releaseYear}` : ''}`}
          style={({ pressed, hovered }) => [
            styles.titleRow,
            { backgroundColor: pressed || hovered ? colors.surfaceHigh : colors.surfaceRaised },
          ]}
        >
            {review.title.posterUrl ? (
              <Image source={{ uri: review.title.posterUrl }} style={styles.poster} contentFit="cover" />
            ) : (
              <View style={[styles.poster, { backgroundColor: colors.surfaceHigh }]} />
            )}
            <Text variant="subhead" numberOfLines={1} style={styles.titleName}>
              {review.title.name}
              {review.title.releaseYear ? (
                <Text variant="subhead" color="muted">
                  {'  '}
                  {review.title.releaseYear}
                </Text>
              ) : null}
            </Text>
            <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
        </LinkPressable>
      ) : null}

      {review.containsSpoilers ? (
        <SpoilerText numberOfLines={numberOfLines}>{review.body}</SpoilerText>
      ) : (
        <Text variant="hand" color="secondary" numberOfLines={numberOfLines}>
          {review.body}
        </Text>
      )}

      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={likedByMe ? 'Unlike review' : 'Like review'}
          accessibilityState={{ selected: likedByMe ?? false, disabled: !onToggleLike }}
          disabled={!onToggleLike}
          onPress={onToggleLike}
          hitSlop={8}
          style={styles.likeButton}
        >
          <Ionicons
            name={likedByMe ? 'heart' : 'heart-outline'}
            size={17}
            color={likedByMe ? colors.danger : colors.textMuted}
          />
          <Text variant="caption" color="muted">
            {review.likeCount > 0 ? review.likeCount : 'Like'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  author: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    flexShrink: 1,
  },
  authorText: {
    flexShrink: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.xs,
    padding: spacing.xs,
    paddingRight: spacing.sm,
  },
  poster: {
    width: 26,
    height: 39,
    borderRadius: 4,
  },
  titleName: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 32,
    paddingRight: spacing.md,
  },
});

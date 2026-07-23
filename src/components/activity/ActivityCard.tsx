import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/primitives/Avatar';
import { RatingStars } from '@/components/primitives/RatingStars';
import { SpoilerText } from '@/components/primitives/SpoilerText';
import { Text } from '@/components/primitives/Text';
import { avatarPublicUrl } from '@/lib/supabase/storage';
import { posterUrl } from '@/lib/tmdb/images';
import { useTheme } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme/tokens';
import type { FeedItem } from '@/types/database';
import { activityVerb } from '@/utils/activity';
import { timeAgo } from '@/utils/dates';
import { titleHref, yearFromDate } from '@/utils/titles';

/** One feed entry: combined verbs, title chip, review preview, timestamps. */
export function ActivityCard({ item }: { item: FeedItem }) {
  const { colors } = useTheme();
  const displayName = item.actor.display_name?.trim() || item.actor.username;
  const rating = typeof item.metadata.rating === 'number' ? item.metadata.rating : null;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.headerRow}>
        <Link href={`/user/${item.actor.username}`} asChild>
          <Pressable accessibilityRole="link" style={styles.actor}>
            <Avatar url={avatarPublicUrl(item.actor.avatar_path)} name={displayName} size={36} />
            <View style={styles.actorText}>
              <Text variant="subhead" numberOfLines={2}>
                {displayName}{' '}
                <Text variant="subhead" color="muted">
                  {activityVerb(item)}
                </Text>
                {item.subject_user ? (
                  <Text variant="subhead" color="accent">
                    {' '}
                    @{item.subject_user.username}
                  </Text>
                ) : null}
              </Text>
              <Text variant="caption" color="muted">
                {timeAgo(item.created_at)}
              </Text>
            </View>
          </Pressable>
        </Link>
        {rating ? <RatingStars value={rating} size={12} /> : null}
      </View>

      {item.title ? (
        <Link href={titleHref(item.title.media_type, item.title.tmdb_id)} asChild>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={item.title.title}
            style={({ pressed }) => [
              styles.titleChip,
              { backgroundColor: pressed ? colors.surfaceHigh : colors.surfaceRaised },
            ]}
          >
            {posterUrl(item.title.poster_path, 'w185') ? (
              <Image
                source={{ uri: posterUrl(item.title.poster_path, 'w185') }}
                style={styles.poster}
                contentFit="cover"
              />
            ) : (
              <View style={[styles.poster, { backgroundColor: colors.surfaceHigh }]} />
            )}
            <View style={styles.titleChipText}>
              <Text variant="headline" numberOfLines={1}>
                {item.title.title}
              </Text>
              <Text variant="caption" color="muted">
                {[
                  yearFromDate(item.title.release_date),
                  item.title.media_type === 'movie' ? 'Movie' : 'TV',
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={15} color={colors.textMuted} />
          </Pressable>
        </Link>
      ) : null}

      {item.review ? (
        <View style={styles.review}>
          {item.review.contains_spoilers ? (
            <SpoilerText numberOfLines={4}>{item.review.body}</SpoilerText>
          ) : (
            <Text variant="callout" color="secondary" numberOfLines={4}>
              {item.review.body}
            </Text>
          )}
          <Link href={`/review/${item.review.id}`} asChild>
            <Pressable accessibilityRole="link" hitSlop={6} style={styles.reviewLink}>
              <Text variant="caption" color="accent">
                Full review
              </Text>
              {item.review.like_count > 0 ? (
                <Text variant="caption" color="muted">
                  · {item.review.like_count} like{item.review.like_count === 1 ? '' : 's'}
                </Text>
              ) : null}
            </Pressable>
          </Link>
        </View>
      ) : null}

      {item.list ? (
        <Link href={`/list/${item.list.id}`} asChild>
          <Pressable
            accessibilityRole="link"
            style={({ pressed }) => [
              styles.titleChip,
              { backgroundColor: pressed ? colors.surfaceHigh : colors.surfaceRaised },
            ]}
          >
            <Ionicons name="albums-outline" size={20} color={colors.accent} style={styles.listIcon} />
            <View style={styles.titleChipText}>
              <Text variant="headline" numberOfLines={1}>
                {item.list.name}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={15} color={colors.textMuted} />
          </Pressable>
        </Link>
      ) : null}
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  actor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    flex: 1,
  },
  actorText: {
    flex: 1,
    gap: 1,
  },
  titleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.xs,
    padding: spacing.xs,
    paddingRight: spacing.sm,
  },
  poster: {
    width: 34,
    height: 51,
    borderRadius: 4,
  },
  listIcon: {
    marginHorizontal: spacing.xs,
  },
  titleChipText: {
    flex: 1,
    gap: 1,
  },
  review: {
    gap: spacing.xs,
  },
  reviewLink: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignSelf: 'flex-start',
  },
});

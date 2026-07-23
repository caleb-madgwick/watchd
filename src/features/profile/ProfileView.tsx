import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDiary, useProfileStats, useUserActivity, useUserTitles } from './hooks';
import { ActivityCard } from '@/components/activity/ActivityCard';
import { Barcode } from '@/components/Barcode';
import { RetroStripes } from '@/components/RetroStripes';
import { Wordmark } from '@/components/Wordmark';
import { ListCard } from '@/components/lists/ListCard';
import { MediaRow } from '@/components/media/MediaRow';
import { Avatar } from '@/components/primitives/Avatar';
import { LinkPressable } from '@/components/primitives/LinkPressable';
import { Button } from '@/components/primitives/Button';
import { EmptyState } from '@/components/primitives/EmptyState';
import { RatingStars } from '@/components/primitives/RatingStars';
import { Text } from '@/components/primitives/Text';
import { ReviewCard } from '@/components/reviews/ReviewCard';
import { useUserBadges, useWatchChallenge } from '@/features/challenges/hooks';
import { FriendButton } from '@/features/friends/FriendButton';
import { usePendingFriendRequests } from '@/features/friends/hooks';
import { useUserLists } from '@/features/lists/hooks';
import { useUserReviews, useToggleReviewLike } from '@/features/reviews/hooks';
import { BlockButton } from '@/features/social/BlockButton';
import { FollowButton } from '@/features/social/FollowButton';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/theme/ThemeContext';
import { contentWidth, fontFamily, radius, spacing } from '@/theme/tokens';
import { prefersReducedMotion } from '@/utils/motion';
import type { FeedItem } from '@/types/database';
import { formatDate } from '@/utils/dates';
import type { Profile } from '@/types/profile';

function StatCell({ value, label }: { value: string | number; label: string }) {
  return (
    <View style={styles.statCell}>
      <Text variant="title3">{value}</Text>
      <Text variant="caption" color="muted">
        {label}
      </Text>
    </View>
  );
}

/** Deterministic faux card number — the embossed digits on the member card. */
function memberNumber(username: string): string {
  let h = 7;
  for (let i = 0; i < username.length; i += 1) {
    h = (h * 31 + username.charCodeAt(i)) >>> 0;
  }
  const digits = `${h}`.padStart(12, '0').slice(-12);
  return `${digits.slice(0, 4)} ${digits.slice(4, 8)} ${digits.slice(8, 12)}`;
}

/** The profile header as a laminated Video Club membership card. */
function MembershipCard({
  profile,
  isSelf,
  pendingCount,
}: {
  profile: Profile;
  isSelf: boolean;
  pendingCount: number;
}) {
  const { scheme } = useTheme();
  const [tilt] = useState(() => new Animated.Value(0));
  const memberYear = new Date(profile.createdAt).getFullYear();
  const dark = scheme === 'dark';
  const inkOnCard = dark ? '#F4F1EA' : '#221A16';

  const setHover = (to: number) => {
    if (prefersReducedMotion()) return;
    Animated.spring(tilt, { toValue: to, useNativeDriver: true, speed: 20, bounciness: 5 }).start();
  };

  return (
    <Animated.View
      onPointerEnter={() => setHover(1)}
      onPointerLeave={() => setHover(0)}
      style={[
        styles.card,
        {
          transform: [
            { rotateZ: tilt.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-0.7deg'] }) },
            { translateY: tilt.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) },
          ],
        },
      ]}
    >
      <LinearGradient
        colors={dark ? ['#1D232B', '#12151A'] : ['#FFFDF7', '#F1E8D6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Holographic laminate sheen */}
      <LinearGradient
        colors={['rgba(94,224,176,0.10)', 'rgba(255,255,255,0)', 'rgba(124,107,255,0.10)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0.8 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Oversized ghost disc, like the printed watermark on old rental cards */}
      <View style={styles.cardWatermark} pointerEvents="none">
        <Ionicons
          name="disc-outline"
          size={190}
          color={dark ? 'rgba(94,224,176,0.08)' : 'rgba(31,122,90,0.10)'}
        />
      </View>

      <View style={styles.cardTop}>
        <Wordmark size={17} />
        <Text variant="micro" color="muted" style={styles.cardKicker}>
          MEMBER CARD
        </Text>
      </View>

      <RetroStripes width={150} height={5} />

      <View style={styles.cardIdentity}>
        <Avatar url={profile.avatarUrl} name={profile.displayName} size={72} />
        <View style={styles.cardNameBlock}>
          <Text
            numberOfLines={1}
            style={{
              fontFamily: fontFamily.display,
              fontSize: 30,
              lineHeight: 38,
              color: inkOnCard,
              letterSpacing: 1,
            }}
          >
            {profile.displayName.toUpperCase()}
          </Text>
          <Text variant="subhead" color="muted" numberOfLines={1}>
            @{profile.username}
          </Text>
          {profile.bio ? (
            <Text variant="footnote" color="secondary" numberOfLines={2} style={styles.cardBio}>
              {profile.bio}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.followRow}>
        <Link href={`/user/${profile.username}/followers`} asChild>
          <Pressable accessibilityRole="link" hitSlop={6}>
            <Text variant="subhead" color="secondary">
              <Text variant="headline">{profile.followerCount}</Text> followers
            </Text>
          </Pressable>
        </Link>
        <Link href={`/user/${profile.username}/following`} asChild>
          <Pressable accessibilityRole="link" hitSlop={6}>
            <Text variant="subhead" color="secondary">
              <Text variant="headline">{profile.followingCount}</Text> following
            </Text>
          </Pressable>
        </Link>
        {isSelf ? (
          <Link href="/friends" asChild>
            <Pressable accessibilityRole="link" hitSlop={6}>
              <Text variant="subhead" color="secondary">
                <Text variant="headline">{profile.friendCount}</Text> friends
                {pendingCount > 0 ? (
                  <Text variant="subhead" color="accent">
                    {' '}
                    · {pendingCount} new
                  </Text>
                ) : null}
              </Text>
            </Pressable>
          </Link>
        ) : (
          <Text variant="subhead" color="secondary">
            <Text variant="headline">{profile.friendCount}</Text> friends
          </Text>
        )}
      </View>

      <Text
        accessibilityElementsHidden
        style={{
          fontFamily: fontFamily.bodySemiBold,
          fontSize: 16,
          lineHeight: 22,
          letterSpacing: 4,
          color: inkOnCard,
          opacity: 0.75,
        }}
      >
        {memberNumber(profile.username)}
      </Text>

      <View style={styles.cardBottom}>
        <Barcode
          seed={profile.username}
          height={22}
          color={dark ? 'rgba(244,241,234,0.85)' : '#221A16'}
          label={`MEMBER SINCE ${memberYear}`}
        />
        <View style={styles.cardActions}>
          {isSelf ? (
            <Button
              title="Edit profile"
              variant="outline"
              size="sm"
              onPress={() => router.push('/settings')}
            />
          ) : (
            <>
              <FollowButton targetUserId={profile.id} targetUsername={profile.username} />
              <FriendButton targetUserId={profile.id} />
              <BlockButton targetUserId={profile.id} />
            </>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

/** Maps a profile-activity join row into the FeedItem shape ActivityCard renders. */
function toFeedItem(
  row: NonNullable<ReturnType<typeof useUserActivity>['data']>[number],
  profile: Profile,
): FeedItem | null {
  if (row.reviews && row.reviews.published === false) return null;
  return {
    id: row.id,
    activity_type: row.activity_type,
    created_at: row.created_at,
    metadata: row.metadata,
    actor: {
      id: profile.id,
      username: profile.username,
      display_name: profile.displayName,
      avatar_path: profile.avatarPath,
    },
    title: row.titles,
    review: row.reviews
      ? {
          id: row.reviews.id,
          rating: row.reviews.rating,
          body: row.reviews.body,
          contains_spoilers: row.reviews.contains_spoilers,
          like_count: row.reviews.like_count,
        }
      : null,
    list: row.lists,
    subject_user: row.profiles,
  };
}

export function ProfileView({ profile, isSelf }: { profile: Profile; isSelf: boolean }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();

  const challengeYear = new Date().getFullYear();
  const stats = useProfileStats(profile.id);
  const challenge = useWatchChallenge(profile.id, challengeYear);
  const badges = useUserBadges(profile.id);
  const favourites = useUserTitles(profile.id, { favouritesOnly: true, limit: 12 });
  const watchedMovies = useUserTitles(profile.id, {
    mediaType: 'movie',
    status: 'watched',
    limit: 12,
  });
  const watchedShows = useUserTitles(profile.id, { mediaType: 'tv', status: 'watched', limit: 12 });
  const watchlist = useUserTitles(profile.id, { status: 'watchlist', limit: 12 });
  const reviews = useUserReviews(profile.id);
  const lists = useUserLists(profile.id);
  const diary = useDiary(profile.id);
  const activity = useUserActivity(profile.id);
  const toggleLike = useToggleReviewLike();
  const pendingRequests = usePendingFriendRequests();
  const pendingCount = isSelf ? (pendingRequests.data?.length ?? 0) : 0;

  const feedItems = (activity.data ?? [])
    .map((row) => toFeedItem(row, profile))
    .filter((item): item is FeedItem => !!item)
    .slice(0, 4);

  const hasAnyContent =
    (stats.data?.watchedMovies ?? 0) > 0 ||
    (stats.data?.watchedShows ?? 0) > 0 ||
    (reviews.data?.length ?? 0) > 0 ||
    (lists.data?.length ?? 0) > 0;

  const challengeGoal = challenge.data?.goal ?? null;
  const challengePct = challengeGoal
    ? Math.min(100, Math.round(((challenge.data?.watched ?? 0) / challengeGoal) * 100))
    : 0;
  const challengeInner = (
    <>
      <View style={styles.challengeHead}>
        <Ionicons name="flag" size={15} color={colors.accent} />
        <Text variant="subhead">{challengeYear} watch challenge</Text>
      </View>
      {challengeGoal ? (
        <>
          <Text variant="caption" color="muted">
            {challenge.data?.watched ?? 0} of {challengeGoal}
            {challenge.data?.completed ? ' · complete 🎉' : ' watched'}
          </Text>
          <View style={[styles.challengeTrack, { backgroundColor: colors.surfaceRaised }]}>
            <View
              style={[styles.challengeFill, { width: `${challengePct}%`, backgroundColor: colors.accent }]}
            />
          </View>
        </>
      ) : (
        <Text variant="caption" color="muted">
          Tap to set a goal for {challengeYear}
        </Text>
      )}
    </>
  );

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.scroll, { paddingTop: insets.top + spacing.xl }]}
    >
      <View style={styles.page}>
        <MembershipCard profile={profile} isSelf={isSelf} pendingCount={pendingCount} />

        <LinkPressable
          href={`/user/${profile.username}/stats`}
          accessibilityLabel={`View ${isSelf ? 'your' : `@${profile.username}'s`} stats`}
          style={({ pressed, hovered }) => [
            styles.stats,
            {
              backgroundColor: pressed || hovered ? colors.surfaceHigh : colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <StatCell value={stats.data?.watchedMovies ?? '–'} label="movies" />
          <StatCell value={stats.data?.watchedShows ?? '–'} label="shows" />
          <View style={styles.statCell}>
            {stats.data?.averageRating ? (
              <>
                <RatingStars value={stats.data.averageRating} size={12} />
                <Text variant="caption" color="muted">
                  avg of {stats.data.ratings}
                </Text>
              </>
            ) : (
              <>
                <Text variant="title3">–</Text>
                <Text variant="caption" color="muted">
                  ratings
                </Text>
              </>
            )}
          </View>
          <StatCell value={stats.data?.reviews ?? '–'} label="reviews" />
        </LinkPressable>

        {isSelf ? (
          <LinkPressable
            href="/challenge"
            accessibilityLabel="Watch challenge"
            style={({ pressed, hovered }) => [
              styles.challengeCard,
              {
                backgroundColor: pressed || hovered ? colors.surfaceHigh : colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            {challengeInner}
          </LinkPressable>
        ) : challengeGoal ? (
          <View style={[styles.challengeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {challengeInner}
          </View>
        ) : null}

        {badges.data && badges.data.length > 0 ? (
          <View style={styles.badgesRow}>
            {badges.data.slice(0, 10).map((b) => (
              <View
                key={b.code}
                style={[styles.badge, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <Ionicons name={b.icon as keyof typeof Ionicons.glyphMap} size={15} color={colors.accent} />
                <Text variant="micro" numberOfLines={1}>
                  {b.name}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {isSelf ? (
          <View style={styles.quickLinks}>
            <LinkPressable
              href="/shared"
              style={({ pressed, hovered }) => [
                styles.quickLink,
                {
                  backgroundColor: pressed || hovered ? colors.surfaceHigh : colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text variant="subhead">Shared watchlists</Text>
              <Text variant="caption" color="muted">
                Plan what to watch with friends
              </Text>
            </LinkPressable>
          </View>
        ) : null}

        {!hasAnyContent && !stats.isLoading ? (
          <EmptyState
            icon="film-outline"
            title={isSelf ? 'Your profile is a blank reel' : 'Nothing here yet'}
            message={
              isSelf
                ? 'Log your first movie or show and it will show up here.'
                : `${profile.displayName} hasn’t logged anything yet.`
            }
            actionTitle={isSelf ? 'Log something' : undefined}
            onAction={isSelf ? () => router.push('/log') : undefined}
          />
        ) : (
          <View style={styles.sections}>
            {favourites.data && favourites.data.length > 0 ? (
              <MediaRow
                heading="Favourites"
                titles={favourites.data.map((r) => r.title)}
                posterWidth={104}
                seeAllHref={isSelf ? '/favourites/edit' : undefined}
              />
            ) : null}

            {feedItems.length > 0 ? (
              <View style={styles.section}>
                <Text variant="title3" style={styles.sectionHeading}>
                  Recent activity
                </Text>
                <View style={styles.cardsColumn}>
                  {feedItems.map((item) => (
                    <ActivityCard key={item.id} item={item} />
                  ))}
                </View>
              </View>
            ) : null}

            {watchedMovies.data && watchedMovies.data.length > 0 ? (
              <MediaRow
                heading={`Watched movies${stats.data ? ` · ${stats.data.watchedMovies}` : ''}`}
                titles={watchedMovies.data.map((r) => r.title)}
                seeAllHref={`/user/${profile.username}/watched`}
                posterWidth={104}
              />
            ) : null}

            {watchedShows.data && watchedShows.data.length > 0 ? (
              <MediaRow
                heading={`Watched shows${stats.data ? ` · ${stats.data.watchedShows}` : ''}`}
                titles={watchedShows.data.map((r) => r.title)}
                seeAllHref={`/user/${profile.username}/watched`}
                posterWidth={104}
              />
            ) : null}

            {diary.data && diary.data.length > 0 ? (
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <Text variant="title3">Diary</Text>
                  <Link href={`/user/${profile.username}/diary`} asChild>
                    <Pressable accessibilityRole="link" hitSlop={6}>
                      <Text variant="subhead" color="accent">
                        See all
                      </Text>
                    </Pressable>
                  </Link>
                </View>
                <View style={styles.cardsColumn}>
                  {diary.data.slice(0, 3).map((entry) => (
                    <View
                      key={entry.id}
                      style={[
                        styles.diaryRow,
                        { backgroundColor: colors.surface, borderColor: colors.border },
                      ]}
                    >
                      <Text variant="caption" color="muted" style={styles.diaryDate}>
                        {formatDate(entry.watchedAt)}
                      </Text>
                      <Text variant="subhead" numberOfLines={1} style={styles.diaryTitle}>
                        {entry.title.title}
                        {entry.isRewatch ? (
                          <Text variant="caption" color="muted">
                            {' '}
                            ↻
                          </Text>
                        ) : null}
                      </Text>
                      {entry.rating ? <RatingStars value={entry.rating} size={11} /> : null}
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {reviews.data && reviews.data.length > 0 ? (
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <Text variant="title3">Reviews</Text>
                  <Link href={`/user/${profile.username}/reviews`} asChild>
                    <Pressable accessibilityRole="link" hitSlop={6}>
                      <Text variant="subhead" color="accent">
                        See all
                      </Text>
                    </Pressable>
                  </Link>
                </View>
                <View style={styles.cardsColumn}>
                  {reviews.data.slice(0, 2).map((review) => (
                    <ReviewCard
                      key={review.id}
                      review={{
                        id: review.id,
                        body: review.body,
                        rating: review.rating,
                        containsSpoilers: review.containsSpoilers,
                        likeCount: review.likeCount,
                        createdAt: review.createdAt,
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
                        session
                          ? () =>
                              toggleLike.mutate({ reviewId: review.id, like: !review.likedByMe })
                          : undefined
                      }
                      numberOfLines={4}
                    />
                  ))}
                </View>
              </View>
            ) : null}

            {lists.data && lists.data.length > 0 ? (
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <Text variant="title3">Lists</Text>
                  <Link href={`/user/${profile.username}/lists`} asChild>
                    <Pressable accessibilityRole="link" hitSlop={6}>
                      <Text variant="subhead" color="accent">
                        See all
                      </Text>
                    </Pressable>
                  </Link>
                </View>
                <View style={styles.cardsColumn}>
                  {lists.data.slice(0, 3).map((list) => (
                    <ListCard key={list.id} list={list} />
                  ))}
                </View>
              </View>
            ) : isSelf ? (
              <View style={styles.section}>
                <Text variant="title3" style={styles.sectionHeading}>
                  Lists
                </Text>
                <EmptyState
                  compact
                  icon="albums-outline"
                  title="No lists yet"
                  message="Collect titles into themed lists — public or private."
                  actionTitle="Create a list"
                  onAction={() => router.push('/list/create')}
                />
              </View>
            ) : null}

            {watchlist.data && watchlist.data.length > 0 ? (
              <MediaRow
                heading="Watchlist"
                titles={watchlist.data.map((r) => r.title)}
                seeAllHref={isSelf ? '/watchlist' : undefined}
                posterWidth={104}
              />
            ) : null}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: spacing['6xl'],
  },
  page: {
    width: '100%',
    maxWidth: contentWidth.page,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    alignItems: 'flex-start',
  },
  headerText: {
    flex: 1,
    gap: spacing.xs,
  },
  bio: {
    marginTop: spacing.xs,
  },
  followRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    marginTop: spacing.sm,
  },
  card: {
    marginHorizontal: spacing.lg,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.md,
    overflow: 'hidden',
    boxShadow: '0px 12px 24px rgba(0,0,0,0.30)',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardWatermark: {
    position: 'absolute',
    right: -34,
    top: 24,
  },
  cardKicker: {
    letterSpacing: 2,
  },
  cardIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginTop: spacing.sm,
  },
  cardNameBlock: {
    flex: 1,
    gap: 2,
  },
  cardBio: {
    marginTop: spacing.xs,
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.lg,
    marginTop: spacing.sm,
  },
  cardActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  headerAction: {
    marginTop: spacing.xs,
    gap: spacing.sm,
    alignItems: 'flex-end',
  },
  stats: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: spacing.md,
  },
  challengeCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  challengeHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  challengeTrack: {
    height: 10,
    borderRadius: radius.full,
    overflow: 'hidden',
    marginTop: 4,
  },
  challengeFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: radius.full,
    borderWidth: 1,
    paddingVertical: 5,
    paddingHorizontal: spacing.sm,
  },
  quickLinks: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  quickLink: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: 2,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  sections: {
    gap: spacing['3xl'],
    marginTop: spacing['2xl'],
  },
  section: {
    gap: spacing.md,
  },
  sectionHeading: {
    paddingHorizontal: spacing.lg,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  cardsColumn: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  diaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  diaryDate: {
    width: 88,
  },
  diaryTitle: {
    flex: 1,
  },
});

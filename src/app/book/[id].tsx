import { Link, router, Stack, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/primitives/Avatar';
import { ErrorState } from '@/components/primitives/ErrorState';
import { IconButton } from '@/components/primitives/IconButton';
import { RatingStars } from '@/components/primitives/RatingStars';
import { Screen } from '@/components/primitives/Screen';
import { Skeleton } from '@/components/primitives/Skeleton';
import { SpoilerText } from '@/components/primitives/SpoilerText';
import { Text } from '@/components/primitives/Text';
import { BookCase } from '@/components/media/BookCase';
import { TmdbAttribution } from '@/components/TmdbAttribution';
import {
  useBookCommunitySummary,
  useBookDetails,
  useBookReviews,
  type BookReview,
} from '@/features/books/hooks';
import { BookActionBar } from '@/features/books/BookActionBar';
import { BookProgressPanel } from '@/features/books/BookProgressPanel';
import { useBookEnrichment } from '@/features/books/tracking';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useTheme } from '@/theme/ThemeContext';
import { contentWidth, radius, spacing } from '@/theme/tokens';
import { timeAgo } from '@/utils/dates';

function Fact({ label, value }: { label: string; value?: string | number }) {
  const { colors } = useTheme();
  if (value === undefined || value === null || value === '') return null;
  return (
    <View style={[styles.fact, { borderBottomColor: colors.border }]}>
      <Text variant="caption" color="muted">
        {label}
      </Text>
      <Text variant="callout">{String(value)}</Text>
    </View>
  );
}

function ReviewRow({ review }: { review: BookReview }) {
  const { colors } = useTheme();
  return (
    <Link href={`/review/${review.id}`} asChild>
      <Pressable
        accessibilityRole="link"
        style={[styles.review, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <View style={styles.reviewHead}>
          <Avatar url={review.author.avatarUrl} name={review.author.displayName} size={30} />
          <View style={styles.reviewHeadText}>
            <Text variant="subhead" numberOfLines={1}>
              {review.author.displayName}
            </Text>
            <Text variant="caption" color="muted">
              {timeAgo(review.createdAt)}
            </Text>
          </View>
          {review.rating ? <RatingStars value={review.rating} size={12} /> : null}
        </View>
        {review.containsSpoilers ? (
          <SpoilerText numberOfLines={5}>{review.body}</SpoilerText>
        ) : (
          <Text variant="callout" color="secondary" numberOfLines={5}>
            {review.body}
          </Text>
        )}
      </Pressable>
    </Link>
  );
}

export default function BookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const volumeId = id ?? '';
  const { colors } = useTheme();
  const { isWide } = useBreakpoint();
  const insets = useSafeAreaInsets();

  const details = useBookDetails(volumeId || undefined);
  useBookEnrichment(details.data);
  const community = useBookCommunitySummary(volumeId || undefined);
  const reviews = useBookReviews(volumeId || undefined);

  const book = details.data;
  const heroWidth = isWide ? 168 : 132;

  return (
    <Screen>
      <Stack.Screen options={{ title: book ? `${book.title} — Video Club` : 'Book — Video Club' }} />
      <IconButton
        icon="chevron-back"
        accessibilityLabel="Go back"
        variant="filled"
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home'))}
        style={[styles.back, { top: insets.top + spacing.sm }]}
      />

      {details.isLoading ? (
        <View style={[styles.loading, { paddingTop: insets.top + spacing['5xl'] }]}>
          <Skeleton width={heroWidth} height={heroWidth / 0.66} radius={6} />
          <Skeleton width="60%" height={26} />
          <Skeleton height={90} />
        </View>
      ) : details.isError || !book ? (
        <ErrorState
          title="Couldn’t load this book"
          message="The book service may be unreachable, or this title may not exist."
          onRetry={() => details.refetch()}
        />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <View style={[styles.hero, { paddingTop: insets.top + spacing['4xl'] }]}>
            <BookCase posterUrl={book.coverUrl} title={book.title} width={heroWidth} still />
            <Text variant="title1" align="center" style={styles.heroTitle}>
              {book.title}
            </Text>
            {book.subtitle ? (
              <Text variant="callout" color="secondary" align="center">
                {book.subtitle}
              </Text>
            ) : null}
            {book.authors.length > 0 ? (
              <Text variant="subhead" color="muted" align="center">
                {book.authors.join(', ')}
              </Text>
            ) : null}
            <View style={styles.ratingRow}>
              {community.data?.avg_rating ? (
                <View style={styles.ratingChip}>
                  <RatingStars value={community.data.avg_rating} size={13} />
                  <Text variant="caption" color="muted">
                    {community.data.avg_rating} ({community.data.rating_count})
                  </Text>
                </View>
              ) : null}
              {book.averageRating ? (
                <Text variant="caption" color="muted">
                  Google readers {book.averageRating}★
                </Text>
              ) : null}
            </View>
          </View>

          <View style={styles.body}>
            <BookActionBar book={book} />
            <BookProgressPanel book={book} />

            {book.description ? (
              <View style={styles.section}>
                <Text variant="title3">Overview</Text>
                <Text variant="body" color="secondary">
                  {book.description}
                </Text>
              </View>
            ) : null}

            <View style={styles.section}>
              <Text variant="title3">Details</Text>
              <Fact label="Publisher" value={book.publisher} />
              <Fact label="Published" value={book.publishedDate} />
              <Fact label="First published" value={book.firstPublishedYear} />
              <Fact label="Pages" value={book.pageCount} />
              <Fact label="Language" value={book.language ? book.language.toUpperCase() : undefined} />
              <Fact label="ISBN" value={book.isbn13} />
            </View>

            {book.categories.length > 0 ? (
              <View style={styles.section}>
                <Text variant="title3">Categories</Text>
                <View style={styles.chips}>
                  {book.categories.map((c) => (
                    <View key={c} style={[styles.chip, { backgroundColor: colors.surfaceRaised }]}>
                      <Text variant="caption">{c}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            <View style={styles.section}>
              <Text variant="title3">
                Reviews{reviews.data && reviews.data.length > 0 ? ` · ${reviews.data.length}` : ''}
              </Text>
              {reviews.data && reviews.data.length > 0 ? (
                reviews.data.map((r) => <ReviewRow key={r.id} review={r} />)
              ) : (
                <Text variant="caption" color="muted">
                  No reviews yet — be the first.
                </Text>
              )}
            </View>

            <TmdbAttribution compact />
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { position: 'absolute', left: spacing.md, zIndex: 10 },
  loading: { alignItems: 'center', gap: spacing.lg, paddingHorizontal: spacing.lg },
  scroll: { paddingBottom: spacing['6xl'] },
  hero: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  heroTitle: { marginTop: spacing.md },
  ratingRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  ratingChip: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  body: {
    width: '100%',
    maxWidth: contentWidth.prose,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  section: { gap: spacing.sm },
  fact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: { paddingVertical: 6, paddingHorizontal: spacing.sm, borderRadius: radius.full },
  review: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  reviewHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  reviewHeadText: { flex: 1, gap: 1 },
});

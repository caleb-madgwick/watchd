import { useQuery } from '@tanstack/react-query';
import { Link, router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MediaRow } from '@/components/media/MediaRow';
import { PosterCard } from '@/components/media/PosterCard';
import { Button } from '@/components/primitives/Button';
import { EmptyState } from '@/components/primitives/EmptyState';
import { ErrorState } from '@/components/primitives/ErrorState';
import { Screen } from '@/components/primitives/Screen';
import { Text } from '@/components/primitives/Text';
import { RetroStripes } from '@/components/RetroStripes';
import { ReviewCard } from '@/components/reviews/ReviewCard';
import { Wordmark } from '@/components/Wordmark';
import { config } from '@/constants/config';
import {
  useContinueWatching,
  useGenreSuggestions,
  usePopular,
  useRecentReviewsFromFollows,
  useTrending,
} from '@/features/discovery/hooks';
import { useWatchlist } from '@/features/tracking/queries';
import { supabase } from '@/lib/supabase/client';
import { posterUrl } from '@/lib/tmdb/images';
import { useAuth } from '@/providers/AuthProvider';
import { contentWidth, spacing } from '@/theme/tokens';
import type { TitleSummary } from '@/types/domain';
import { titleHref, yearFromDate } from '@/utils/titles';

/** Titles the community has logged most recently (proxy for local popularity). */
function useCommunityPopular() {
  return useQuery({
    queryKey: ['communityPopular'],
    enabled: !!supabase,
    staleTime: 2 * 60_000,
    queryFn: async (): Promise<TitleSummary[]> => {
      const { data, error } = await supabase!
        .from('activities')
        .select('titles(*)')
        .in('activity_type', ['logged', 'tv_completed'])
        .order('created_at', { ascending: false })
        .limit(40);
      if (error) throw new Error(error.message);
      const seen = new Set<string>();
      const titles: TitleSummary[] = [];
      for (const row of data ?? []) {
        const t = row.titles;
        if (!t) continue;
        const key = `${t.media_type}-${t.tmdb_id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        titles.push({
          tmdbId: t.tmdb_id,
          mediaType: t.media_type,
          title: t.title,
          posterUrl: posterUrl(t.poster_path),
          releaseYear: yearFromDate(t.release_date),
        });
        if (titles.length >= 12) break;
      }
      return titles;
    },
  });
}

export default function HomeScreen() {
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();

  const trendingMovies = useTrending('movie');
  const trendingTv = useTrending('tv');
  const popularMovies = usePopular('movie');
  const communityPopular = useCommunityPopular();
  const continueWatching = useContinueWatching();
  const watchlist = useWatchlist();
  const followedReviews = useRecentReviewsFromFollows();
  const suggestions = useGenreSuggestions(profile?.favouriteGenres ?? []);

  const firstName = profile?.displayName.split(' ')[0];
  const everythingFailed = trendingMovies.isError && trendingTv.isError;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.page}>
          <View style={styles.header}>
            <View>
              <Wordmark size={24} />
              <View style={styles.headerStripes}>
                <RetroStripes width={88} height={4} />
              </View>
              <Text variant="callout" color="secondary" style={styles.greeting}>
                {firstName ? `What are we watching tonight, ${firstName}?` : 'What are we watching tonight?'}
              </Text>
            </View>
          </View>

          {config.demoMode ? (
            <View style={styles.demoBanner}>
              <Text variant="footnote" color="muted">
                Demo mode — showing bundled sample data. Add Supabase and TMDB keys in .env for the
                full experience.
              </Text>
            </View>
          ) : null}

          {everythingFailed ? (
            <ErrorState
              title="Couldn’t load discovery"
              message="TMDB is unreachable. Check your connection or TMDB configuration."
              onRetry={() => {
                trendingMovies.refetch();
                trendingTv.refetch();
              }}
            />
          ) : (
            <View style={styles.sections}>
              {continueWatching.data && continueWatching.data.length > 0 ? (
                <View style={styles.section}>
                  <Text variant="title3" style={styles.sectionHeading}>
                    Continue watching
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hRow}>
                    {continueWatching.data.map((item) => (
                      <View key={`${item.title.tmdbId}`} style={styles.continueItem}>
                        <PosterCard
                          title={item.title.title}
                          posterUrl={item.title.posterUrl}
                          subtitle={`Up next · S${item.seasonNumber} E${item.episodeNumber + 1}`}
                          href={titleHref('tv', item.title.tmdbId)}
                          width={120}
                        />
                      </View>
                    ))}
                  </ScrollView>
                </View>
              ) : null}

              <MediaRow
                heading="Trending movies"
                titles={trendingMovies.data}
                loading={trendingMovies.isLoading}
                seeAllHref="/movies"
              />
              <MediaRow
                heading="Trending TV"
                titles={trendingTv.data}
                loading={trendingTv.isLoading}
                seeAllHref="/tv"
              />

              {watchlist.data && watchlist.data.length > 0 ? (
                <MediaRow
                  heading="From your watchlist"
                  titles={watchlist.data.slice(0, 12).map((item) => item.title)}
                  seeAllHref="/watchlist"
                />
              ) : null}

              {!config.demoMode ? (
                <View style={styles.section}>
                  <Text variant="title3" style={styles.sectionHeading}>
                    Latest from people you follow
                  </Text>
                  {followedReviews.isLoading ? null : followedReviews.data &&
                    followedReviews.data.length > 0 ? (
                    <View style={styles.reviewsColumn}>
                      {followedReviews.data.slice(0, 4).map((review) => (
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
                            title: {
                              tmdbId: review.title.tmdbId,
                              mediaType: review.title.mediaType,
                              name: review.title.title,
                              posterUrl: review.title.posterUrl,
                              releaseYear: review.title.releaseYear,
                            },
                          }}
                          numberOfLines={4}
                        />
                      ))}
                    </View>
                  ) : (
                    <EmptyState
                      compact
                      icon="people-outline"
                      title="Your feed is quiet"
                      message="Follow other members to see their reviews and activity here."
                      actionTitle="Find people"
                      onAction={() => router.push('/search')}
                    />
                  )}
                </View>
              ) : null}

              {communityPopular.data && communityPopular.data.length > 0 ? (
                <MediaRow heading="Popular with the community" titles={communityPopular.data} />
              ) : null}

              {profile && profile.favouriteGenres.length > 0 ? (
                <MediaRow
                  heading="Because of your favourite genres"
                  titles={suggestions.data}
                  loading={suggestions.isLoading}
                />
              ) : null}

              <MediaRow
                heading="Popular movies"
                titles={popularMovies.data}
                loading={popularMovies.isLoading}
              />
            </View>
          )}

          <View style={styles.footerLinks}>
            <Link href="/watchlist" asChild>
              <Button title="Open watchlist" variant="outline" icon="bookmark-outline" />
            </Link>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing['6xl'],
  },
  page: {
    width: '100%',
    maxWidth: contentWidth.page,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  headerStripes: {
    marginTop: spacing.xs,
  },
  greeting: {
    marginTop: spacing.md,
  },
  demoBanner: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  sections: {
    gap: spacing['3xl'],
  },
  section: {
    gap: spacing.md,
  },
  sectionHeading: {
    paddingHorizontal: spacing.lg,
  },
  hRow: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  continueItem: {
    marginRight: 0,
  },
  reviewsColumn: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  footerLinks: {
    alignItems: 'center',
    marginTop: spacing['3xl'],
  },
});

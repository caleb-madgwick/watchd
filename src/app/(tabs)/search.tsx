import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BookCard } from '@/components/media/BookCard';
import { MusicCard } from '@/components/media/MusicCard';
import { TitleCard } from '@/components/media/TitleCard';
import { EmptyState } from '@/components/primitives/EmptyState';
import { ErrorState } from '@/components/primitives/ErrorState';
import { ResponsiveGrid } from '@/components/primitives/ResponsiveGrid';
import { Screen } from '@/components/primitives/Screen';
import { SearchInput } from '@/components/primitives/SearchInput';
import { SegmentedControl } from '@/components/primitives/SegmentedControl';
import { CardListSkeleton } from '@/components/primitives/Skeleton';
import { Text } from '@/components/primitives/Text';
import { UserCard } from '@/components/profiles/UserCard';
import { config } from '@/constants/config';
import { useBookSearch } from '@/features/books/hooks';
import { useAlbumSearch, useArtistSearch, useSongSearch } from '@/features/music/hooks';
import { bookKey } from '@/lib/books/normalize';
import { useTitleSearch, useUserSearch, type SearchScope } from '@/features/search/hooks';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { track } from '@/lib/analytics';
import { useRecentSearches } from '@/stores/recentSearchesStore';
import { useTheme } from '@/theme/ThemeContext';
import { contentWidth, spacing } from '@/theme/tokens';
import type { AlbumSummary, SongSummary, TitleSummary } from '@/types/domain';
import { artistHref, mediaTypeLabel, titleHref } from '@/utils/titles';

type Scope = SearchScope | 'user' | 'book';

const SCOPES: { value: Scope; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'movie', label: 'Movies' },
  { value: 'tv', label: 'TV' },
  { value: 'book', label: 'Books' },
  { value: 'album', label: 'Albums' },
  { value: 'artist', label: 'Artists' },
  { value: 'song', label: 'Songs' },
  { value: 'user', label: 'People' },
];

export default function SearchScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [input, setInput] = useState('');
  const [scope, setScope] = useState<Scope>('all');
  const query = useDebouncedValue(input, 350);
  const recents = useRecentSearches();

  const titleActive = scope === 'all' || scope === 'movie' || scope === 'tv';
  const titleScope: SearchScope = scope === 'movie' || scope === 'tv' ? scope : 'all';
  const titleSearch = useTitleSearch(titleScope, titleActive ? query : '');
  const userSearch = useUserSearch(scope === 'user' || scope === 'all' ? query : '');
  const bookSearch = useBookSearch(scope === 'book' ? query : '');
  const albumSearch = useAlbumSearch(query, scope === 'album');
  const artistSearch = useArtistSearch(query, scope === 'artist');
  const songSearch = useSongSearch(query, scope === 'song');

  const showingResults = query.trim().length >= 2;
  const titles: TitleSummary[] = titleActive
    ? (titleSearch.data?.pages.flatMap((page) => page.results) ?? [])
    : [];
  const seenBookKeys = new Set<string>();
  const books =
    scope === 'book'
      ? (bookSearch.data?.pages.flatMap((page) => page.results) ?? []).filter((b) => {
          const k = bookKey(b);
          if (seenBookKeys.has(k)) return false;
          seenBookKeys.add(k);
          return true;
        })
      : [];
  const users = scope === 'user' || scope === 'all' ? (userSearch.data ?? []) : [];
  const albums = scope === 'album' ? (albumSearch.data?.pages.flatMap((page) => page.results) ?? []) : [];
  const artists = scope === 'artist' ? (artistSearch.data?.pages.flatMap((page) => page.results) ?? []) : [];
  const songs = scope === 'song' ? (songSearch.data?.pages.flatMap((page) => page.results) ?? []) : [];
  const musicGridItems: (AlbumSummary | SongSummary)[] = scope === 'album' ? albums : songs;

  const commitSearch = () => {
    if (input.trim().length >= 2) {
      recents.add(input);
      track('search_performed', { scope: scope === 'user' ? 'user' : scope });
    }
  };

  const isLoading =
    (titleActive && titleSearch.isLoading) ||
    (scope === 'user' && userSearch.isLoading) ||
    (scope === 'book' && bookSearch.isLoading) ||
    (scope === 'album' && albumSearch.isLoading) ||
    (scope === 'artist' && artistSearch.isLoading) ||
    (scope === 'song' && songSearch.isLoading);
  const isError =
    scope === 'book'
      ? bookSearch.isError
      : scope === 'album'
        ? albumSearch.isError
        : scope === 'artist'
          ? artistSearch.isError
          : scope === 'song'
            ? songSearch.isError
            : scope === 'user'
              ? userSearch.isError
              : titleSearch.isError;
  const isEmpty =
    showingResults &&
    !isLoading &&
    !isError &&
    titles.length === 0 &&
    books.length === 0 &&
    albums.length === 0 &&
    artists.length === 0 &&
    songs.length === 0 &&
    (scope === 'all' || scope === 'user' ? users.length === 0 : true);

  return (
    <Screen>
      <View style={[styles.page, { paddingTop: insets.top + spacing.lg }]}>
        <View style={styles.searchBar}>
          <SearchInput
            placeholder="Movies, shows, people…"
            value={input}
            onChangeText={setInput}
            onClear={() => setInput('')}
            onSubmitEditing={commitSearch}
            autoFocus={false}
          />
          <View style={styles.scopes}>
            <SegmentedControl options={SCOPES} value={scope} onChange={setScope} scrollable />
          </View>
        </View>

        {!showingResults ? (
          recents.searches.length > 0 ? (
            <View style={styles.recents}>
              <View style={styles.recentsHeader}>
                <Text variant="title3">Recent searches</Text>
                <Pressable accessibilityRole="button" onPress={recents.clear} hitSlop={8}>
                  <Text variant="subhead" color="accent">
                    Clear
                  </Text>
                </Pressable>
              </View>
              {recents.searches.map((recent) => (
                <View key={recent} style={styles.recentRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Search for ${recent}`}
                    onPress={() => setInput(recent)}
                    style={({ pressed }) => [
                      styles.recentMain,
                      { backgroundColor: pressed ? colors.surfaceRaised : 'transparent' },
                    ]}
                  >
                    <Ionicons name="time-outline" size={17} color={colors.textMuted} />
                    <Text variant="callout" color="secondary" style={styles.recentText} numberOfLines={1}>
                      {recent}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${recent} from recent searches`}
                    onPress={() => recents.remove(recent)}
                    hitSlop={10}
                    style={styles.recentRemove}
                  >
                    <Ionicons name="close" size={16} color={colors.textMuted} />
                  </Pressable>
                </View>
              ))}
            </View>
          ) : (
            <EmptyState
              icon="search-outline"
              title="Find anything"
              message="Search across movies, TV shows and other members."
            />
          )
        ) : isLoading ? (
          <View style={styles.skeletons}>
            <CardListSkeleton count={6} />
          </View>
        ) : isError ? (
          <ErrorState
            title="Search failed"
            message="Something went wrong reaching the catalogue. Try again."
            onRetry={() =>
              scope === 'book'
                ? bookSearch.refetch()
                : scope === 'album'
                  ? albumSearch.refetch()
                  : scope === 'artist'
                    ? artistSearch.refetch()
                    : scope === 'song'
                      ? songSearch.refetch()
                      : scope === 'user'
                        ? userSearch.refetch()
                        : titleSearch.refetch()
            }
          />
        ) : isEmpty ? (
          <EmptyState
            icon="telescope-outline"
            title={`No results for “${query.trim()}”`}
            message="Try a different spelling or a broader search."
          />
        ) : scope === 'book' ? (
          <ResponsiveGrid
            containerWidth={Math.min(width, contentWidth.page)}
            data={books}
            keyExtractor={(b) => `book-${b.volumeId}`}
            minItemWidth={112}
            renderItem={(b, itemWidth) => <BookCard book={b} width={itemWidth} />}
            onEndReached={() => {
              if (bookSearch.hasNextPage && !bookSearch.isFetchingNextPage) bookSearch.fetchNextPage();
            }}
            ListFooterComponent={
              bookSearch.isFetchingNextPage ? (
                <ActivityIndicator color={colors.accent} style={styles.footerSpinner} />
              ) : null
            }
          />
        ) : scope === 'album' || scope === 'song' ? (
          <ResponsiveGrid
            containerWidth={Math.min(width, contentWidth.page)}
            data={musicGridItems}
            keyExtractor={(item) => `${item.mediaType}-${item.musicBrainzId}`}
            minItemWidth={132}
            renderItem={(item, itemWidth) => <MusicCard item={item} width={itemWidth} />}
            onEndReached={() => {
              const q = scope === 'album' ? albumSearch : songSearch;
              if (q.hasNextPage && !q.isFetchingNextPage) q.fetchNextPage();
            }}
            ListFooterComponent={
              (scope === 'album' ? albumSearch : songSearch).isFetchingNextPage ? (
                <ActivityIndicator color={colors.accent} style={styles.footerSpinner} />
              ) : null
            }
          />
        ) : scope === 'artist' ? (
          <FlatList
            data={artists}
            keyExtractor={(item) => `artist-${item.musicBrainzId}`}
            keyboardShouldPersistTaps="handled"
            onEndReached={() => {
              if (artistSearch.hasNextPage && !artistSearch.isFetchingNextPage) artistSearch.fetchNextPage();
            }}
            onEndReachedThreshold={0.4}
            renderItem={({ item }) => (
              <TitleCard
                title={item.name}
                mediaTypeLabel={mediaTypeLabel('artist')}
                overview={item.disambiguation}
                href={artistHref(item.musicBrainzId)}
              />
            )}
            ListFooterComponent={
              artistSearch.isFetchingNextPage ? (
                <ActivityIndicator color={colors.accent} style={styles.footerSpinner} />
              ) : null
            }
            contentContainerStyle={styles.results}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <FlatList
            data={titles}
            keyExtractor={(item) => `${item.mediaType}-${item.tmdbId}`}
            keyboardShouldPersistTaps="handled"
            onEndReached={() => {
              if (scope !== 'user' && titleSearch.hasNextPage && !titleSearch.isFetchingNextPage) {
                titleSearch.fetchNextPage();
              }
            }}
            onEndReachedThreshold={0.4}
            ListHeaderComponent={
              users.length > 0 ? (
                <View style={styles.userSection}>
                  <Text variant="title3" style={styles.sectionHeading}>
                    People
                  </Text>
                  {users.slice(0, scope === 'user' ? undefined : 3).map((user) => (
                    <UserCard
                      key={user.id}
                      username={user.username}
                      displayName={user.displayName}
                      avatarUrl={user.avatarUrl}
                      subtitle={`${user.followerCount} follower${user.followerCount === 1 ? '' : 's'}`}
                    />
                  ))}
                  {titles.length > 0 ? (
                    <Text variant="title3" style={[styles.sectionHeading, styles.titlesHeading]}>
                      Titles
                    </Text>
                  ) : null}
                </View>
              ) : null
            }
            renderItem={({ item }) => (
              <TitleCard
                title={item.title}
                posterUrl={item.posterUrl}
                year={item.releaseYear}
                mediaTypeLabel={mediaTypeLabel(item.mediaType)}
                overview={item.overview}
                href={titleHref(item.mediaType, item.tmdbId)}
              />
            )}
            ListFooterComponent={
              titleSearch.isFetchingNextPage ? (
                <ActivityIndicator color={colors.accent} style={styles.footerSpinner} />
              ) : null
            }
            contentContainerStyle={styles.results}
            showsVerticalScrollIndicator={false}
          />
        )}

        {config.demoMode && showingResults ? (
          <Text variant="caption" color="muted" align="center" style={styles.demoNote}>
            Demo mode: searching a small bundled catalogue only.
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    width: '100%',
    maxWidth: contentWidth.page,
    alignSelf: 'center',
  },
  searchBar: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  scopes: {
    maxWidth: 440,
  },
  recents: {
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  recentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recentMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: 10,
  },
  recentText: {
    flex: 1,
  },
  recentRemove: {
    padding: spacing.sm,
  },
  skeletons: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  results: {
    paddingBottom: spacing['6xl'],
  },
  userSection: {
    marginBottom: spacing.sm,
  },
  sectionHeading: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  titlesHeading: {
    marginTop: spacing.lg,
  },
  footerSpinner: {
    paddingVertical: spacing.xl,
  },
  demoNote: {
    paddingBottom: spacing.md,
  },
});

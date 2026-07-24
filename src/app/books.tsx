import { Stack, router } from 'expo-router';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';

import { BookCard } from '@/components/media/BookCard';
import { Button } from '@/components/primitives/Button';
import { EmptyState } from '@/components/primitives/EmptyState';
import { ResponsiveGrid } from '@/components/primitives/ResponsiveGrid';
import { Screen } from '@/components/primitives/Screen';
import { CardListSkeleton } from '@/components/primitives/Skeleton';
import { Text } from '@/components/primitives/Text';
import { usePopularBooks } from '@/features/books/hooks';
import { contentWidth, spacing } from '@/theme/tokens';
import type { BookSummary } from '@/types/domain';

function BookShelf({ heading, subject, width }: { heading: string; subject: string; width: number }) {
  const shelf = usePopularBooks(subject);
  const books = shelf.data ?? [];
  return (
    <>
      <Text variant="title3" style={styles.sectionHeading}>
        {heading}
      </Text>
      {shelf.isLoading ? (
        <View style={styles.skeletons}>
          <CardListSkeleton count={6} />
        </View>
      ) : books.length === 0 ? (
        <EmptyState
          compact
          icon="book-outline"
          title="Nothing on the shelf yet"
          message="Search for a book and shelve it to get started."
        />
      ) : (
        <ResponsiveGrid
          containerWidth={Math.min(width, contentWidth.page)}
          data={books}
          keyExtractor={(item: BookSummary) => `book-${item.volumeId}`}
          minItemWidth={112}
          renderItem={(item: BookSummary, itemWidth: number) => <BookCard book={item} width={itemWidth} />}
        />
      )}
    </>
  );
}

export default function BooksScreen() {
  const { width } = useWindowDimensions();

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Books — Video Club' }} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.page}>
          <View style={styles.header}>
            <Text variant="display">Books</Text>
            <Text variant="callout" color="secondary">
              Fiction and non-fiction — track your reading, rate, review and build your shelves.
            </Text>
            <Button
              title="Search books"
              icon="search"
              variant="outline"
              onPress={() => router.push('/search')}
              style={styles.searchButton}
            />
          </View>

          <BookShelf heading="Popular fiction" subject="fiction" width={width} />
          <BookShelf heading="Non-fiction" subject="nonfiction" width={width} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingTop: spacing.xl,
    paddingBottom: spacing['6xl'],
  },
  page: {
    width: '100%',
    maxWidth: contentWidth.page,
    alignSelf: 'center',
    gap: spacing.lg,
  },
  header: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  searchButton: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
  },
  sectionHeading: {
    paddingHorizontal: spacing.lg,
  },
  skeletons: {
    paddingHorizontal: spacing.lg,
  },
});

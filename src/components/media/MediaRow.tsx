import { Ionicons } from '@expo/vector-icons';
import { Link, type Href } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { PosterCard } from './PosterCard';
import { PosterRowSkeleton } from '@/components/primitives/Skeleton';
import { Text } from '@/components/primitives/Text';
import { useTheme } from '@/theme/ThemeContext';
import { spacing } from '@/theme/tokens';
import type { TitleSummary } from '@/types/domain';
import { titleHref } from '@/utils/titles';

export interface MediaRowProps {
  heading: string;
  titles: TitleSummary[] | undefined;
  loading?: boolean;
  seeAllHref?: Href;
  posterWidth?: number;
  emptyMessage?: string;
}

/** Horizontal poster carousel with a section heading. */
export function MediaRow({
  heading,
  titles,
  loading = false,
  seeAllHref,
  posterWidth = 120,
  emptyMessage,
}: MediaRowProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text variant="title3">{heading}</Text>
        {seeAllHref ? (
          <Link href={seeAllHref} asChild>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={`See all: ${heading}`}
              style={styles.seeAll}
              hitSlop={8}
            >
              <Text variant="subhead" color="accent">
                See all
              </Text>
              <Ionicons name="chevron-forward" size={14} color={colors.accent} />
            </Pressable>
          </Link>
        ) : null}
      </View>
      {loading ? (
        <PosterRowSkeleton posterWidth={posterWidth} />
      ) : !titles || titles.length === 0 ? (
        emptyMessage ? (
          <Text variant="callout" color="muted" style={styles.empty}>
            {emptyMessage}
          </Text>
        ) : null
      ) : (
        <FlatList
          horizontal
          data={titles}
          keyExtractor={(item) => `${item.mediaType}-${item.tmdbId}`}
          renderItem={({ item }) => (
            <PosterCard
              title={item.title}
              posterUrl={item.posterUrl}
              year={item.releaseYear}
              rating={item.tmdbRating ? item.tmdbRating / 2 : undefined}
              href={titleHref(item.mediaType, item.tmdbId)}
              width={posterWidth}
            />
          )}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ width: spacing.md }} />}
          showsHorizontalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  seeAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minHeight: 32,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
  },
  empty: {
    paddingHorizontal: spacing.lg,
  },
});

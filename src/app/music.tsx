import { Stack, router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { MusicRow } from '@/components/media/MusicRow';
import { Button } from '@/components/primitives/Button';
import { Screen } from '@/components/primitives/Screen';
import { Text } from '@/components/primitives/Text';
import { MUSIC_GENRES, useFeaturedAlbums, useGenreAlbums } from '@/features/music/discovery';
import { usePopularAlbums } from '@/features/music/library';
import { contentWidth, spacing } from '@/theme/tokens';

/** One genre shelf — self-contained so each owns its own query + skeleton. */
function GenreRail({ label, tag }: { label: string; tag: string }) {
  const genre = useGenreAlbums(tag);
  // Hide a genre entirely if it resolved to nothing (keeps the page tidy).
  if (!genre.isLoading && (!genre.data || genre.data.length === 0)) return null;
  return <MusicRow heading={label} items={genre.data} loading={genre.isLoading} />;
}

export default function MusicScreen() {
  const popular = usePopularAlbums();
  const featured = useFeaturedAlbums();
  const hasCommunity = (popular.data?.length ?? 0) > 0;
  const topAlbums = hasCommunity ? (popular.data ?? []) : (featured.data ?? []);
  const topLoading = hasCommunity ? popular.isLoading : popular.isLoading || featured.isLoading;

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Music — Video Club' }} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.page}>
          <View style={styles.header}>
            <Text variant="display">Music</Text>
            <Text variant="callout" color="secondary">
              Albums, artists and songs — rate, review and build your record shelf.
            </Text>
            <Button
              title="Search music"
              icon="search"
              variant="outline"
              onPress={() => router.push('/search')}
              style={styles.searchButton}
            />
          </View>

          <View style={styles.rails}>
            <MusicRow
              heading={hasCommunity ? 'Popular albums' : 'Featured albums'}
              items={topAlbums}
              loading={topLoading}
            />
            {MUSIC_GENRES.map((genre) => (
              <GenreRail key={genre.tag} label={genre.label} tag={genre.tag} />
            ))}
          </View>
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
  },
  header: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  searchButton: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
  },
  rails: {
    gap: spacing['3xl'],
  },
});

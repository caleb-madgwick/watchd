import { Stack, router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { MusicRow } from '@/components/media/MusicRow';
import { Button } from '@/components/primitives/Button';
import { Screen } from '@/components/primitives/Screen';
import { Text } from '@/components/primitives/Text';
import { GENRE_SHELVES, useFeaturedAlbums } from '@/features/music/discovery';
import { usePopularAlbums } from '@/features/music/library';
import { contentWidth, spacing } from '@/theme/tokens';

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
            {GENRE_SHELVES.map((shelf) => (
              <MusicRow key={shelf.label} heading={shelf.label} items={shelf.albums} />
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

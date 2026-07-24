import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { MusicRow } from '@/components/media/MusicRow';
import { ErrorState } from '@/components/primitives/ErrorState';
import { Screen } from '@/components/primitives/Screen';
import { Skeleton } from '@/components/primitives/Skeleton';
import { Text } from '@/components/primitives/Text';
import { useMusicEnrichment } from '@/features/music/enrich';
import { useArtistDetails, useSpotifyUrl } from '@/features/music/hooks';
import { ProviderLinks } from '@/features/music/ProviderLinks';
import { spotifyArtistSearchUrl } from '@/lib/spotify/links';
import { useTheme } from '@/theme/ThemeContext';
import { contentWidth, spacing } from '@/theme/tokens';

export default function ArtistDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const mbid = params.id ?? '';
  const { colors } = useTheme();

  const details = useArtistDetails(mbid || undefined);
  const artist = details.data;
  useMusicEnrichment(artist ? { kind: 'artist', details: artist } : undefined);
  const spotifyFallback = artist ? spotifyArtistSearchUrl(artist.name) : '';
  const spotifyUrl = useSpotifyUrl('artist', artist?.name ?? '', undefined, spotifyFallback).data;

  if (!mbid) {
    return (
      <Screen padTop>
        <ErrorState title="Artist not found" message="This link doesn’t point to a valid artist." />
      </Screen>
    );
  }

  const meta = artist
    ? [artist.disambiguation, artist.country].filter(Boolean).join(' · ')
    : '';

  return (
    <Screen>
      <Stack.Screen options={{ title: artist ? `${artist.name} — Video Club` : 'Artist — Video Club' }} />
      {details.isLoading ? (
        <View style={styles.loadingBody}>
          <Skeleton width={120} height={120} radius={60} />
          <Skeleton width="55%" height={28} />
          <Skeleton height={180} />
        </View>
      ) : details.isError || !artist ? (
        <ErrorState
          title="Couldn’t load this artist"
          message="MusicBrainz may be unreachable, or this artist may not exist."
          onRetry={() => details.refetch()}
        />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <View style={styles.hero}>
            <View style={[styles.avatar, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
              <Ionicons name="mic-outline" size={52} color={colors.textMuted} />
            </View>
            <Text variant="display" align="center" style={styles.name}>
              {artist.name}
            </Text>
            {meta ? (
              <Text variant="footnote" color="muted" align="center">
                {meta}
              </Text>
            ) : null}
            <View style={styles.links}>
              <ProviderLinks
                links={[
                  { label: 'Open in Spotify', url: spotifyUrl ?? spotifyFallback, icon: 'musical-notes' },
                ]}
              />
            </View>
          </View>

          <View style={styles.rails}>
            {artist.topAlbums.length > 0 ? (
              <MusicRow heading="Albums" items={artist.releaseGroups.albums} />
            ) : null}
            {artist.releaseGroups.eps.length > 0 ? (
              <MusicRow heading="EPs" items={artist.releaseGroups.eps} />
            ) : null}
            {artist.releaseGroups.singles.length > 0 ? (
              <MusicRow heading="Singles" items={artist.releaseGroups.singles} />
            ) : null}
            {artist.releaseGroups.compilations.length > 0 ? (
              <MusicRow heading="Compilations" items={artist.releaseGroups.compilations} />
            ) : null}
            {artist.topAlbums.length === 0 &&
            artist.releaseGroups.eps.length === 0 &&
            artist.releaseGroups.singles.length === 0 ? (
              <Text variant="callout" color="muted" style={styles.empty}>
                No releases indexed for this artist yet.
              </Text>
            ) : null}
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: spacing['6xl'],
  },
  loadingBody: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    gap: spacing.md,
    alignItems: 'center',
  },
  hero: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    maxWidth: contentWidth.prose,
    alignSelf: 'center',
    width: '100%',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  name: {
    marginTop: spacing.md,
  },
  links: {
    marginTop: spacing.sm,
  },
  rails: {
    gap: spacing['3xl'],
    paddingTop: spacing.lg,
  },
  empty: {
    paddingHorizontal: spacing.lg,
  },
});

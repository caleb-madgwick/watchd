import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';

import { ErrorState } from '@/components/primitives/ErrorState';
import { Screen } from '@/components/primitives/Screen';
import { Skeleton } from '@/components/primitives/Skeleton';
import { Text } from '@/components/primitives/Text';
import { useMusicEnrichment } from '@/features/music/enrich';
import { useSongDetails, useSpotifyUrl } from '@/features/music/hooks';
import { MusicActionBar } from '@/features/music/MusicActionBar';
import { ProviderLinks } from '@/features/music/ProviderLinks';
import { useMusicCommunitySummary } from '@/features/music/tracking';
import { spotifySongSearchUrl } from '@/lib/spotify/links';
import { useTheme } from '@/theme/ThemeContext';
import { contentWidth, radius, spacing } from '@/theme/tokens';
import { albumHref, formatDurationMs } from '@/utils/titles';

export default function SongDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const mbid = params.id ?? '';
  const { colors } = useTheme();
  const { width } = useWindowDimensions();

  const details = useSongDetails(mbid || undefined);
  const song = details.data;
  const community = useMusicCommunitySummary(song);
  useMusicEnrichment(song ? { kind: 'song', details: song } : undefined);
  const songArtist = song?.artistCredit ?? song?.artistNames?.[0];
  const spotifyFallback = song ? spotifySongSearchUrl(song.title, songArtist) : '';
  const spotifyUrl = useSpotifyUrl('track', song?.title ?? '', songArtist, spotifyFallback).data;

  if (!mbid) {
    return (
      <Screen padTop>
        <ErrorState title="Song not found" message="This link doesn’t point to a valid song." />
      </Screen>
    );
  }

  const coverSize = Math.min(width - spacing.lg * 2, 220);
  const duration = formatDurationMs(song?.durationMs);

  return (
    <Screen>
      <Stack.Screen options={{ title: song ? `${song.title} — Video Club` : 'Song — Video Club' }} />
      {details.isLoading ? (
        <View style={styles.loadingBody}>
          <Skeleton width={180} height={180} radius={6} />
          <Skeleton width="55%" height={24} />
          <Skeleton height={90} />
        </View>
      ) : details.isError || !song ? (
        <ErrorState
          title="Couldn’t load this song"
          message="MusicBrainz may be unreachable, or this song may not exist."
          onRetry={() => details.refetch()}
        />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <View style={styles.hero}>
            <View
              style={[
                styles.cover,
                { width: coverSize, height: coverSize, backgroundColor: colors.surfaceRaised, borderColor: colors.border },
              ]}
            >
              {song.coverUrl ? (
                <Image source={{ uri: song.coverUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
              ) : (
                <Ionicons name="musical-note" size={coverSize * 0.3} color={colors.textMuted} />
              )}
            </View>
            <Text variant="title1" align="center" style={styles.title}>
              {song.title}
            </Text>
            {song.artistCredit ? (
              <Text variant="headline" color="secondary" align="center">
                {song.artistCredit}
              </Text>
            ) : null}
            {song.album ? (
              <Pressable accessibilityRole="link" onPress={() => router.push(albumHref(song.album!.musicBrainzId))}>
                <Text variant="footnote" color="accent" align="center">
                  {song.album.title}
                </Text>
              </Pressable>
            ) : null}
            {duration ? (
              <Text variant="footnote" color="muted" align="center">
                {duration}
              </Text>
            ) : null}
            {community.data && community.data.rating_count > 0 ? (
              <View style={styles.ratingStrip}>
                <Ionicons name="star" size={14} color={colors.star} />
                <Text variant="subhead">{community.data.avg_rating?.toFixed(1)}</Text>
                <Text variant="footnote" color="muted">
                  {community.data.rating_count} rating{community.data.rating_count === 1 ? '' : 's'}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.body}>
            <MusicActionBar item={song} />
            <ProviderLinks
              links={[
                {
                  label: 'Open in Spotify',
                  url: spotifyUrl ?? spotifyFallback,
                  icon: 'musical-notes',
                },
              ]}
            />
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
  },
  cover: {
    borderRadius: radius.sm,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  title: {
    marginTop: spacing.md,
  },
  ratingStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  body: {
    width: '100%',
    maxWidth: contentWidth.page,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },
});

import { Ionicons } from '@expo/vector-icons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';

import { RecordSleeve } from '@/components/media/RecordSleeve';
import { ErrorState } from '@/components/primitives/ErrorState';
import { Screen } from '@/components/primitives/Screen';
import { SegmentedControl } from '@/components/primitives/SegmentedControl';
import { Skeleton } from '@/components/primitives/Skeleton';
import { Text } from '@/components/primitives/Text';
import { useMusicEnrichment } from '@/features/music/enrich';
import { useAlbumDetails, useSpotifyUrl } from '@/features/music/hooks';
import { MusicActionBar } from '@/features/music/MusicActionBar';
import { MusicReviewsSection } from '@/features/music/MusicReviewsSection';
import { ProviderLinks } from '@/features/music/ProviderLinks';
import { TrackList } from '@/features/music/TrackList';
import { useMusicCommunitySummary } from '@/features/music/tracking';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { spotifyAlbumSearchUrl } from '@/lib/spotify/links';
import { useTheme } from '@/theme/ThemeContext';
import { contentWidth, spacing } from '@/theme/tokens';
import { artistHref, mediaTypeLabel } from '@/utils/titles';

type AlbumTab = 'overview' | 'tracklist' | 'reviews';

function albumTypeLabel(type?: string): string | undefined {
  if (!type) return undefined;
  return type === 'ep' ? 'EP' : type.charAt(0).toUpperCase() + type.slice(1);
}

function totalLength(ms?: number): string | undefined {
  if (!ms || ms <= 0) return undefined;
  const minutes = Math.round(ms / 60000);
  return `${minutes} min`;
}

export default function AlbumDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const mbid = params.id ?? '';
  const { colors } = useTheme();
  const { isDesktop } = useBreakpoint();
  const { width } = useWindowDimensions();
  const [tab, setTab] = useState<AlbumTab>('overview');

  const details = useAlbumDetails(mbid || undefined);
  const album = details.data;
  const community = useMusicCommunitySummary(album);
  useMusicEnrichment(album ? { kind: 'album', details: album } : undefined);
  const albumArtist = album?.artistCredit ?? album?.artistNames?.[0];
  const spotifyFallback = album ? spotifyAlbumSearchUrl(album.title, albumArtist) : '';
  const spotifyUrl = useSpotifyUrl('album', album?.title ?? '', albumArtist, spotifyFallback).data;

  if (!mbid) {
    return (
      <Screen padTop>
        <ErrorState title="Album not found" message="This link doesn’t point to a valid album." />
      </Screen>
    );
  }

  const coverSize = Math.min(width - spacing.lg * 2, 300);
  const primaryArtist = album?.artists[0];
  const facts: { label: string; value?: string }[] = album
    ? [
        { label: 'Released', value: album.releaseDate ?? undefined },
        { label: 'Type', value: albumTypeLabel(album.albumType) },
        { label: 'Tracks', value: album.trackCount ? String(album.trackCount) : undefined },
        { label: 'Length', value: totalLength(album.totalDurationMs) },
        {
          label: 'Also',
          value: album.secondaryTypes && album.secondaryTypes.length ? album.secondaryTypes.join(', ') : undefined,
        },
      ]
    : [];

  const tabs: { value: AlbumTab; label: string }[] = [
    { value: 'overview', label: 'Overview' },
    ...(album && album.tracks.length > 0 ? [{ value: 'tracklist' as const, label: 'Tracklist' }] : []),
    { value: 'reviews', label: 'Reviews' },
  ];

  return (
    <Screen>
      <Stack.Screen options={{ title: album ? `${album.title} — Video Club` : 'Album — Video Club' }} />
      {details.isLoading ? (
        <View style={styles.loadingBody}>
          <Skeleton width={220} height={220} radius={6} />
          <Skeleton width="60%" height={28} />
          <Skeleton width="40%" height={16} />
          <Skeleton height={90} />
        </View>
      ) : details.isError || !album ? (
        <ErrorState
          title="Couldn’t load this album"
          message="MusicBrainz may be unreachable, or this album may not exist."
          onRetry={() => details.refetch()}
        />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <View style={styles.hero}>
            <View style={{ width: coverSize }}>
              <RecordSleeve posterUrl={album.coverUrl} title={album.title} width={coverSize} still />
            </View>
            <Text variant="title1" align="center" style={styles.title}>
              {album.title}
            </Text>
            {album.artistCredit ? (
              primaryArtist ? (
                <Pressable
                  accessibilityRole="link"
                  onPress={() => router.push(artistHref(primaryArtist.musicBrainzId))}
                >
                  <Text variant="headline" color="accent" align="center">
                    {album.artistCredit}
                  </Text>
                </Pressable>
              ) : (
                <Text variant="headline" color="secondary" align="center">
                  {album.artistCredit}
                </Text>
              )
            ) : null}
            <Text variant="footnote" color="muted" align="center">
              {[
                mediaTypeLabel('album'),
                album.releaseYear?.toString(),
                albumTypeLabel(album.albumType),
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
            {community.data && community.data.rating_count > 0 ? (
              <View style={styles.ratingStrip}>
                <Ionicons name="star" size={14} color={colors.star} />
                <Text variant="subhead">{community.data.avg_rating?.toFixed(1)}</Text>
                <Text variant="footnote" color="muted">
                  {community.data.rating_count} rating{community.data.rating_count === 1 ? '' : 's'} ·{' '}
                  {community.data.watched_count} listened
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.body}>
            <MusicActionBar item={album} />
            <SegmentedControl options={tabs} value={tab} onChange={setTab} scrollable={!isDesktop} />
          </View>

          {tab === 'overview' ? (
            <View style={[styles.body, styles.pane]}>
              <View style={styles.facts}>
                {facts
                  .filter((f) => f.value)
                  .map((f) => (
                    <View key={f.label} style={styles.factRow}>
                      <Text variant="footnote" color="muted" style={styles.factLabel}>
                        {f.label}
                      </Text>
                      <Text variant="callout" style={styles.factValue}>
                        {f.value}
                      </Text>
                    </View>
                  ))}
              </View>
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
          ) : null}

          {tab === 'tracklist' ? (
            <View style={[styles.body, styles.pane]}>
              <TrackList tracks={album.tracks} />
            </View>
          ) : null}

          {tab === 'reviews' ? (
            <View style={styles.paneFull}>
              <MusicReviewsSection mbid={album.musicBrainzId} mediaType="album" />
            </View>
          ) : null}
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
  pane: {
    paddingTop: spacing.xl,
    gap: spacing.xl,
  },
  paneFull: {
    width: '100%',
    maxWidth: contentWidth.page,
    alignSelf: 'center',
    paddingTop: spacing.xl,
  },
  facts: {
    gap: spacing.sm,
  },
  factRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  factLabel: {
    width: 90,
  },
  factValue: {
    flex: 1,
  },
});

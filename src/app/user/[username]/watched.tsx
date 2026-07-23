import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { PosterCard } from '@/components/media/PosterCard';
import { EmptyState } from '@/components/primitives/EmptyState';
import { ResponsiveGrid } from '@/components/primitives/ResponsiveGrid';
import { SegmentedControl } from '@/components/primitives/SegmentedControl';
import { PosterRowSkeleton } from '@/components/primitives/Skeleton';
import { useProfileByUsername, useUserTitles } from '@/features/profile/hooks';
import { ProfileSubpageShell } from '@/features/profile/ProfileSubpageShell';
import { contentWidth, spacing } from '@/theme/tokens';
import type { MediaType } from '@/types/domain';
import { titleHref } from '@/utils/titles';

export default function UserWatchedScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const { width } = useWindowDimensions();
  const [mediaType, setMediaType] = useState<MediaType>('movie');
  const profile = useProfileByUsername(username);
  const watched = useUserTitles(profile.data?.id, { mediaType, status: 'watched', limit: 200 });

  return (
    <ProfileSubpageShell title="Watched" subtitle={username ? `@${username}` : undefined}>
      <Stack.Screen options={{ title: `Watched by @${username ?? ''} — Video Club` }} />
      <View style={styles.controls}>
        <SegmentedControl
          options={[
            { value: 'movie', label: 'Movies' },
            { value: 'tv', label: 'TV shows' },
          ]}
          value={mediaType}
          onChange={setMediaType}
        />
      </View>
      {profile.isLoading || watched.isLoading ? (
        <View style={styles.loading}>
          <PosterRowSkeleton count={3} />
        </View>
      ) : !watched.data || watched.data.length === 0 ? (
        <EmptyState
          icon="eye-outline"
          title={`No ${mediaType === 'movie' ? 'movies' : 'shows'} yet`}
          message="Watched titles will fill this grid."
        />
      ) : (
        <ResponsiveGrid
          containerWidth={Math.min(width, contentWidth.page)}
          data={watched.data}
          keyExtractor={(item) => `${item.title.mediaType}-${item.title.tmdbId}`}
          minItemWidth={108}
          renderItem={(item, itemWidth) => (
            <PosterCard
              title={item.title.title}
              posterUrl={item.title.posterUrl}
              year={item.title.releaseYear}
              rating={item.rating ?? undefined}
              href={titleHref(item.title.mediaType, item.title.tmdbId)}
              width={itemWidth}
              summary={item.title}
            />
          )}
        />
      )}
    </ProfileSubpageShell>
  );
}

const styles = StyleSheet.create({
  controls: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
  },
  loading: {
    paddingVertical: spacing.lg,
  },
});

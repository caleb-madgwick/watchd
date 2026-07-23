import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PosterCard } from '@/components/media/PosterCard';
import { Button } from '@/components/primitives/Button';
import { ErrorState } from '@/components/primitives/ErrorState';
import { IconButton } from '@/components/primitives/IconButton';
import { ResponsiveGrid } from '@/components/primitives/ResponsiveGrid';
import { Screen } from '@/components/primitives/Screen';
import { Skeleton } from '@/components/primitives/Skeleton';
import { Text } from '@/components/primitives/Text';
import { FollowPersonButton } from '@/features/social/FollowPersonButton';
import { usePersonDetails } from '@/features/titles/hooks';
import { useTheme } from '@/theme/ThemeContext';
import { contentWidth, radius, spacing } from '@/theme/tokens';
import { titleHref } from '@/utils/titles';

export default function PersonDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const personId = Number.parseInt(params.id ?? '', 10);
  const valid = Number.isFinite(personId) && personId > 0;
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [bioExpanded, setBioExpanded] = useState(false);

  const person = usePersonDetails(valid ? personId : undefined);

  if (!valid) {
    return (
      <Screen padTop>
        <ErrorState title="Person not found" message="This link doesn’t point to a valid person." />
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen
        options={{ title: person.data ? `${person.data.name} — Video Club` : 'Person — Video Club' }}
      />
      <IconButton
        icon="chevron-back"
        accessibilityLabel="Go back"
        variant="filled"
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home'))}
        style={[styles.back, { top: insets.top + spacing.sm }]}
      />
      {person.isLoading ? (
        <View style={[styles.loading, { paddingTop: insets.top + spacing['5xl'] }]}>
          <Skeleton width={120} height={120} radius={999} />
          <Skeleton width="50%" height={24} />
          <Skeleton height={80} />
        </View>
      ) : person.isError || !person.data ? (
        <ErrorState
          title="Couldn’t load this person"
          message="TMDB may be unreachable right now."
          onRetry={() => person.refetch()}
        />
      ) : (
        <ResponsiveGrid
          containerWidth={Math.min(width, contentWidth.page)}
          data={person.data.credits}
          keyExtractor={(item) => `${item.mediaType}-${item.tmdbId}`}
          minItemWidth={112}
          renderItem={(item, itemWidth) => (
            <PosterCard
              title={item.title}
              posterUrl={item.posterUrl}
              year={item.releaseYear}
              subtitle={item.mediaType === 'movie' ? 'Movie' : 'TV'}
              href={titleHref(item.mediaType, item.tmdbId)}
              width={itemWidth}
              summary={item}
            />
          )}
          ListHeaderComponent={
            <View style={[styles.header, { paddingTop: insets.top + spacing['4xl'] }]}>
              {person.data.profileUrl ? (
                <Image
                  source={{ uri: person.data.profileUrl }}
                  style={[styles.photo, { backgroundColor: colors.surfaceRaised }]}
                  contentFit="cover"
                  accessibilityLabel={`${person.data.name} photo`}
                />
              ) : null}
              <Text variant="title1" align="center">
                {person.data.name}
              </Text>
              {person.data.knownForDepartment ? (
                <Text variant="subhead" color="muted">
                  {person.data.knownForDepartment}
                </Text>
              ) : null}
              <FollowPersonButton
                personTmdbId={person.data.id}
                name={person.data.name}
                knownForDepartment={person.data.knownForDepartment}
              />
              {person.data.biography ? (
                <View style={styles.bio}>
                  <Text variant="callout" color="secondary" numberOfLines={bioExpanded ? undefined : 4}>
                    {person.data.biography}
                  </Text>
                  {person.data.biography.length > 240 ? (
                    <Button
                      title={bioExpanded ? 'Show less' : 'Read more'}
                      variant="ghost"
                      size="sm"
                      onPress={() => setBioExpanded((v) => !v)}
                    />
                  ) : null}
                </View>
              ) : null}
              <Text variant="title3" style={styles.creditsHeading}>
                Known for
              </Text>
            </View>
          }
          ListEmptyComponent={
            <Text variant="callout" color="muted" align="center">
              No credits available.
            </Text>
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: {
    position: 'absolute',
    left: spacing.md,
    zIndex: 10,
  },
  loading: {
    alignItems: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  header: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: radius.full,
    marginBottom: spacing.sm,
  },
  bio: {
    maxWidth: contentWidth.prose,
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  creditsHeading: {
    alignSelf: 'flex-start',
    marginTop: spacing.lg,
  },
});

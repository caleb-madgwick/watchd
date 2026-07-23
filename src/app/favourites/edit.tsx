import { Image } from 'expo-image';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/primitives/EmptyState';
import { Text } from '@/components/primitives/Text';
import { config } from '@/constants/config';
import { useFavourites, useSetFavouriteRank, type FavouriteEntry } from '@/features/profile/hooks';
import { ProfileSubpageShell } from '@/features/profile/ProfileSubpageShell';
import { useCurrentUserId } from '@/providers/AuthProvider';
import { toast } from '@/stores/toastStore';
import { useTheme } from '@/theme/ThemeContext';
import { aspect, contentWidth, radius, spacing } from '@/theme/tokens';

const TILE_WIDTH = 104;

function PosterTile({
  entry,
  badge,
  onPress,
}: {
  entry: FavouriteEntry;
  badge?: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.tile, { opacity: pressed ? 0.7 : 1 }]}
    >
      <View style={[styles.poster, { backgroundColor: colors.surfaceHigh }]}>
        {entry.title.posterUrl ? (
          <Image source={{ uri: entry.title.posterUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <View style={styles.posterFallback}>
            <Text variant="caption" color="muted" numberOfLines={3}>
              {entry.title.title}
            </Text>
          </View>
        )}
        {badge ? (
          <View style={[styles.badge, { backgroundColor: colors.accent, borderColor: colors.bg }]}>
            <Text variant="micro" style={{ color: colors.onAccent, fontWeight: '700' }}>
              {badge}
            </Text>
          </View>
        ) : null}
      </View>
      <Text variant="caption" numberOfLines={1} style={styles.tileTitle}>
        {entry.title.title}
      </Text>
    </Pressable>
  );
}

function EmptySlot({ rank }: { rank: number }) {
  const { colors } = useTheme();
  return (
    <View style={styles.tile}>
      <View style={[styles.poster, styles.emptySlot, { borderColor: colors.border }]}>
        <Text variant="title2" color="muted">
          {rank}
        </Text>
      </View>
      <Text variant="caption" color="muted" numberOfLines={1} style={styles.tileTitle}>
        Empty
      </Text>
    </View>
  );
}

export default function EditFavouritesScreen() {
  const userId = useCurrentUserId();
  const favourites = useFavourites(userId ?? undefined);
  const setRank = useSetFavouriteRank();

  const entries = favourites.data ?? [];
  const ranked = new Map<number, FavouriteEntry>();
  entries.forEach((e) => {
    if (e.rank != null) ranked.set(e.rank, e);
  });
  const unranked = entries.filter((e) => e.rank == null);
  const nextFree = [1, 2, 3, 4].find((r) => !ranked.has(r));

  const assign = (entry: FavouriteEntry) => {
    if (nextFree === undefined) {
      toast.error('Your Top 4 is full — remove one first.');
      return;
    }
    setRank.mutate({ titleId: entry.titleId, rank: nextFree });
  };

  if (config.demoMode || !userId) {
    return (
      <ProfileSubpageShell title="Edit favourites">
        <EmptyState
          icon="heart-outline"
          title="Sign in to pick favourites"
          message="Your Top 4 favourites show on your profile."
        />
      </ProfileSubpageShell>
    );
  }

  return (
    <ProfileSubpageShell title="Edit favourites" subtitle="Your Top 4, shown on your profile">
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <View style={styles.slots}>
          {[1, 2, 3, 4].map((rank) => {
            const entry = ranked.get(rank);
            return entry ? (
              <PosterTile
                key={rank}
                entry={entry}
                badge={String(rank)}
                onPress={() => setRank.mutate({ titleId: entry.titleId, rank: null })}
              />
            ) : (
              <EmptySlot key={rank} rank={rank} />
            );
          })}
        </View>
        <Text variant="caption" color="muted" style={styles.hint}>
          Tap a slot to remove it. Tap a favourite below to add it to the next open slot.
        </Text>

        {entries.length === 0 ? (
          <EmptyState
            icon="heart-outline"
            title="No favourites yet"
            message="Tap the heart on any film or show, then come back to arrange your Top 4."
          />
        ) : unranked.length > 0 ? (
          <View style={styles.section}>
            <Text variant="headline" style={styles.sectionTitle}>
              Your favourites
            </Text>
            <View style={styles.grid}>
              {unranked.map((entry) => (
                <PosterTile key={entry.titleId} entry={entry} onPress={() => assign(entry)} />
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </ProfileSubpageShell>
  );
}

const styles = StyleSheet.create({
  page: {
    width: '100%',
    maxWidth: contentWidth.prose,
    alignSelf: 'center',
    padding: spacing.lg,
    paddingBottom: spacing['6xl'],
  },
  slots: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  hint: {
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    marginBottom: spacing.xs,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  tile: {
    width: TILE_WIDTH,
    gap: 4,
  },
  poster: {
    width: '100%',
    aspectRatio: aspect.poster,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  posterFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
  },
  emptySlot: {
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 6,
    left: 6,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: radius.full,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileTitle: {
    width: '100%',
  },
});

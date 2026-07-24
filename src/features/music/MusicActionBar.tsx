import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { LogMusicSheet } from './LogMusicSheet';
import {
  useMusicStatus,
  useSetListened,
  useSetMusicFavourite,
  useSetMusicRating,
  useToggleBacklog,
  type MusicTrackable,
} from './tracking';
import { Button } from '@/components/primitives/Button';
import { RatingInput } from '@/components/primitives/RatingStars';
import { Text } from '@/components/primitives/Text';
import { AddToListSheet } from '@/features/lists/AddToListSheet';
import { config } from '@/constants/config';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme/tokens';

function ActionButton({
  icon,
  activeIcon,
  label,
  active,
  onPress,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
  label: string;
  active: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active, disabled: disabled ?? false }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.actionButton,
        {
          backgroundColor: active ? colors.accentSoft : pressed ? colors.surfaceHigh : 'transparent',
          borderColor: active ? colors.accent : colors.border,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
    >
      <Ionicons name={active ? activeIcon : icon} size={17} color={active ? colors.accent : colors.textSecondary} />
      <Text variant="caption" numberOfLines={1} style={{ color: active ? colors.accent : colors.textSecondary }}>
        {label}
      </Text>
    </Pressable>
  );
}

/** The tracking surface on album/song pages: listen state, favourite, rating, log. */
export function MusicActionBar({ item }: { item: MusicTrackable }) {
  const { session } = useAuth();
  const { colors } = useTheme();
  const status = useMusicStatus(item);
  const toggleBacklog = useToggleBacklog(item);
  const setListened = useSetListened(item);
  const setRating = useSetMusicRating(item);
  const setFavourite = useSetMusicFavourite(item);
  const [logOpen, setLogOpen] = useState(false);
  const [listSheetOpen, setListSheetOpen] = useState(false);

  if (config.demoMode || !session) {
    return (
      <View style={[styles.signedOut, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text variant="callout" color="secondary" align="center">
          Sign in to track, rate and log music.
        </Text>
        <Button title="Sign in" size="sm" onPress={() => router.push('/(auth)/sign-in')} style={styles.signedOutButton} />
      </View>
    );
  }

  const current = status.data;
  const isAlbum = item.mediaType === 'album';
  const listened = current?.status === 'watched';
  const backlogged = current?.status === 'watchlist';

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.actionsRow}>
        <ActionButton
          icon="musical-note-outline"
          activeIcon="musical-note"
          label={listened ? (isAlbum ? 'Listened' : 'Heard') : isAlbum ? 'Listen' : 'Hear'}
          active={listened}
          onPress={() => setListened.mutate(!listened)}
          disabled={status.isLoading}
        />
        {isAlbum ? (
          <ActionButton
            icon="bookmark-outline"
            activeIcon="bookmark"
            label="Want to listen"
            active={backlogged}
            onPress={() => toggleBacklog.mutate(!backlogged)}
            disabled={status.isLoading}
          />
        ) : null}
        <ActionButton
          icon="heart-outline"
          activeIcon="heart"
          label="Favourite"
          active={current?.isFavourite ?? false}
          onPress={() => setFavourite.mutate(!(current?.isFavourite ?? false))}
          disabled={status.isLoading}
        />
      </View>

      <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />

      <View style={styles.bottomRow}>
        <View style={styles.ratingCluster}>
          <Text variant="caption" color="muted" style={styles.ratingLabel}>
            Your rating
          </Text>
          <RatingInput
            value={current?.rating ?? 0}
            onChange={(value) => setRating.mutate(value > 0 ? value : null)}
            size={26}
            disabled={status.isLoading}
          />
        </View>
        <View style={styles.primaryButtons}>
          <Button
            title={isAlbum ? 'Log or review' : 'Log listen'}
            icon="create-outline"
            size="sm"
            onPress={() => setLogOpen(true)}
          />
          <Button
            title="Add to list"
            icon="albums-outline"
            variant="secondary"
            size="sm"
            onPress={() => setListSheetOpen(true)}
          />
        </View>
      </View>

      {logOpen ? (
        <LogMusicSheet
          item={item}
          visible={logOpen}
          onClose={() => setLogOpen(false)}
          initialRating={current?.rating ?? null}
        />
      ) : null}

      {listSheetOpen ? (
        <AddToListSheet title={item} visible={listSheetOpen} onClose={() => setListSheetOpen(false)} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.md,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actionButton: {
    flexGrow: 1,
    flexBasis: 130,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    height: 38,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
  },
  bottomRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  ratingCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  ratingLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  primaryButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  signedOut: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
  },
  signedOutButton: {
    alignSelf: 'center',
  },
});

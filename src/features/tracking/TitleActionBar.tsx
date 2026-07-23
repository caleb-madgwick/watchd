import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { LogSheet } from './LogSheet';
import {
  useSetFavourite,
  useSetRating,
  useSetStatus,
  useTitleStatus,
  useToggleWatchlist,
} from './queries';
import { Button } from '@/components/primitives/Button';
import { Modal } from '@/components/primitives/Modal';
import { RatingInput } from '@/components/primitives/RatingStars';
import { Text } from '@/components/primitives/Text';
import { AddToListSheet } from '@/features/lists/AddToListSheet';
import { config } from '@/constants/config';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme/tokens';
import type { TitleSummary, WatchStatus } from '@/types/domain';

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
          backgroundColor: pressed ? colors.surfaceHigh : colors.surface,
          borderColor: active ? colors.accent : colors.border,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
    >
      <Ionicons
        name={active ? activeIcon : icon}
        size={20}
        color={active ? colors.accent : colors.textSecondary}
      />
      <Text variant="caption" style={{ color: active ? colors.accent : colors.textSecondary }}>
        {label}
      </Text>
    </Pressable>
  );
}

const MORE_STATUSES: { status: WatchStatus; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { status: 'watching', label: 'Currently watching', icon: 'play-circle-outline' },
  { status: 'paused', label: 'Paused', icon: 'pause-circle-outline' },
  { status: 'dropped', label: 'Dropped', icon: 'stop-circle-outline' },
];

/**
 * The tracking surface on every title page: watched, watchlist, favourite,
 * quiet star rating, full log/review flow, and additional statuses.
 */
export function TitleActionBar({ title }: { title: TitleSummary }) {
  const { session } = useAuth();
  const { colors } = useTheme();
  const status = useTitleStatus(title);
  const toggleWatchlist = useToggleWatchlist(title);
  const setStatus = useSetStatus(title);
  const setRating = useSetRating(title);
  const setFavourite = useSetFavourite(title);
  const [logOpen, setLogOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [listSheetOpen, setListSheetOpen] = useState(false);

  if (config.demoMode || !session) {
    return (
      <View style={[styles.signedOut, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text variant="callout" color="secondary" align="center">
          Sign in to track, rate and review.
        </Text>
        <Button
          title="Sign in"
          size="sm"
          onPress={() => router.push('/(auth)/sign-in')}
          style={styles.signedOutButton}
        />
      </View>
    );
  }

  const current = status.data;
  const isWatched = current?.status === 'watched';
  const isWatchlisted = current?.status === 'watchlist';
  const otherStatus = MORE_STATUSES.find((s) => s.status === current?.status);

  return (
    <View style={styles.container}>
      <View style={styles.actionsRow}>
        <ActionButton
          icon="eye-outline"
          activeIcon="eye"
          label={isWatched ? 'Watched' : 'Watch'}
          active={isWatched}
          onPress={() => setStatus.mutate(isWatched ? null : 'watched')}
          disabled={status.isLoading}
        />
        <ActionButton
          icon="bookmark-outline"
          activeIcon="bookmark"
          label="Watchlist"
          active={isWatchlisted}
          onPress={() => toggleWatchlist.mutate(!isWatchlisted)}
          disabled={status.isLoading}
        />
        <ActionButton
          icon="heart-outline"
          activeIcon="heart"
          label="Favourite"
          active={current?.isFavourite ?? false}
          onPress={() => setFavourite.mutate(!(current?.isFavourite ?? false))}
          disabled={status.isLoading}
        />
        <ActionButton
          icon="ellipsis-horizontal"
          activeIcon="ellipsis-horizontal"
          label={otherStatus ? otherStatus.label.split(' ')[0] : 'More'}
          active={!!otherStatus}
          onPress={() => setMoreOpen(true)}
          disabled={status.isLoading}
        />
      </View>

      <View style={[styles.ratingRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text variant="subhead" color="secondary">
          Your rating
        </Text>
        <RatingInput
          value={current?.rating ?? 0}
          onChange={(value) => setRating.mutate(value > 0 ? value : null)}
          size={30}
          disabled={status.isLoading}
        />
      </View>

      <View style={styles.primaryButtons}>
        <Button
          title="Log or review"
          icon="create-outline"
          size="lg"
          onPress={() => setLogOpen(true)}
          style={styles.logButton}
        />
        <Button
          title="Add to list"
          icon="albums-outline"
          variant="secondary"
          size="lg"
          onPress={() => setListSheetOpen(true)}
        />
      </View>

      {listSheetOpen ? (
        <AddToListSheet title={title} visible={listSheetOpen} onClose={() => setListSheetOpen(false)} />
      ) : null}

      {logOpen ? (
        <LogSheet
          title={title}
          visible={logOpen}
          onClose={() => setLogOpen(false)}
          currentStatus={current}
        />
      ) : null}

      <Modal visible={moreOpen} onClose={() => setMoreOpen(false)} title="Set status">
        <View style={styles.moreList}>
          {MORE_STATUSES.map((item) => {
            const selected = current?.status === item.status;
            return (
              <Pressable
                key={item.status}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => {
                  setStatus.mutate(selected ? null : item.status);
                  setMoreOpen(false);
                }}
                style={({ pressed }) => [
                  styles.moreRow,
                  {
                    backgroundColor: selected
                      ? colors.accentSoft
                      : pressed
                        ? colors.surfaceHigh
                        : 'transparent',
                  },
                ]}
              >
                <Ionicons
                  name={item.icon}
                  size={20}
                  color={selected ? colors.accent : colors.textSecondary}
                />
                <Text variant="callout" style={{ color: selected ? colors.accent : colors.text }}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
          {current?.status ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setStatus.mutate(null);
                setMoreOpen(false);
              }}
              style={({ pressed }) => [
                styles.moreRow,
                { backgroundColor: pressed ? colors.surfaceHigh : 'transparent' },
              ]}
            >
              <Ionicons name="close-circle-outline" size={20} color={colors.danger} />
              <Text variant="callout" color="danger">
                Clear status
              </Text>
            </Pressable>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    minHeight: 62,
    justifyContent: 'center',
  },
  ratingRow: {
    borderRadius: radius.sm,
    borderWidth: 1,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
  },
  primaryButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  logButton: {
    flex: 1,
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
  moreList: {
    gap: spacing.xs,
  },
  moreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.sm,
    minHeight: 48,
  },
});

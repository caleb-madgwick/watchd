import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import {
  useBookStatus,
  useLogBook,
  useSetBookFavourite,
  useSetBookRating,
  useSetBookStatus,
} from './tracking';
import { Button } from '@/components/primitives/Button';
import { Modal } from '@/components/primitives/Modal';
import { RatingInput } from '@/components/primitives/RatingStars';
import { Text } from '@/components/primitives/Text';
import { TextInput } from '@/components/primitives/TextInput';
import { config } from '@/constants/config';
import { AddToListSheet } from '@/features/lists/AddToListSheet';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme/tokens';
import type { BookSummary, WatchStatus } from '@/types/domain';

const SHELVES: { status: WatchStatus; label: string; icon: keyof typeof Ionicons.glyphMap; activeIcon: keyof typeof Ionicons.glyphMap }[] = [
  { status: 'watchlist', label: 'Want to read', icon: 'bookmark-outline', activeIcon: 'bookmark' },
  { status: 'watching', label: 'Reading', icon: 'book-outline', activeIcon: 'book' },
  { status: 'watched', label: 'Read', icon: 'checkmark-circle-outline', activeIcon: 'checkmark-circle' },
];

const MORE: { status: WatchStatus; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { status: 'paused', label: 'Paused', icon: 'pause-circle-outline' },
  { status: 'dropped', label: 'Did not finish', icon: 'stop-circle-outline' },
];

function ShelfButton({
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
        styles.shelfButton,
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

/** Reading shelves + favourite + rating + review, for the book detail page. */
export function BookActionBar({ book }: { book: BookSummary }) {
  const { session } = useAuth();
  const { colors } = useTheme();
  const status = useBookStatus(book);
  const setStatus = useSetBookStatus(book);
  const setRating = useSetBookRating(book);
  const setFavourite = useSetBookFavourite(book);
  const logBook = useLogBook(book);
  const [moreOpen, setMoreOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewBody, setReviewBody] = useState('');
  const [spoilers, setSpoilers] = useState(false);
  const [listSheetOpen, setListSheetOpen] = useState(false);

  if (config.demoMode || !session) {
    return (
      <View style={[styles.signedOut, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text variant="callout" color="secondary" align="center">
          Sign in to shelve, rate and review books.
        </Text>
        <Button title="Sign in" size="sm" onPress={() => router.push('/(auth)/sign-in')} style={styles.signedOutButton} />
      </View>
    );
  }

  const current = status.data;
  const otherStatus = MORE.find((s) => s.status === current?.status);

  const submitReview = () => {
    if (!reviewBody.trim()) return;
    logBook.mutate(
      {
        status: 'watched',
        rating: current?.rating ?? undefined,
        reviewBody: reviewBody.trim(),
        containsSpoilers: spoilers,
        createDiaryEntry: true,
      },
      {
        onSuccess: () => {
          setReviewOpen(false);
          setReviewBody('');
          setSpoilers(false);
        },
      },
    );
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.shelfRow}>
        {SHELVES.map((shelf) => {
          const active = current?.status === shelf.status;
          return (
            <ShelfButton
              key={shelf.status}
              icon={shelf.icon}
              activeIcon={shelf.activeIcon}
              label={shelf.label}
              active={active}
              onPress={() => setStatus.mutate(active ? null : shelf.status)}
              disabled={status.isLoading}
            />
          );
        })}
        <ShelfButton
          icon="heart-outline"
          activeIcon="heart"
          label="Favourite"
          active={current?.isFavourite ?? false}
          onPress={() => setFavourite.mutate(!(current?.isFavourite ?? false))}
          disabled={status.isLoading}
        />
        <ShelfButton
          icon="ellipsis-horizontal"
          activeIcon="ellipsis-horizontal"
          label={otherStatus ? otherStatus.label : 'More'}
          active={!!otherStatus}
          onPress={() => setMoreOpen(true)}
          disabled={status.isLoading}
        />
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

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
        <View style={styles.actionButtons}>
          <Button title="Write review" icon="create-outline" size="sm" onPress={() => setReviewOpen(true)} />
          <Button
            title="Add to list"
            icon="albums-outline"
            variant="secondary"
            size="sm"
            onPress={() => setListSheetOpen(true)}
          />
        </View>
      </View>

      <Modal visible={moreOpen} onClose={() => setMoreOpen(false)} title="Set shelf">
        <View style={styles.moreList}>
          {MORE.map((item) => {
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
                  { backgroundColor: selected ? colors.accentSoft : pressed ? colors.surfaceHigh : 'transparent' },
                ]}
              >
                <Ionicons name={item.icon} size={20} color={selected ? colors.accent : colors.textSecondary} />
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
              style={({ pressed }) => [styles.moreRow, { backgroundColor: pressed ? colors.surfaceHigh : 'transparent' }]}
            >
              <Ionicons name="close-circle-outline" size={20} color={colors.danger} />
              <Text variant="callout" color="danger">
                Clear shelf
              </Text>
            </Pressable>
          ) : null}
        </View>
      </Modal>

      <Modal visible={reviewOpen} onClose={() => setReviewOpen(false)} title="Review this book">
        <View style={styles.reviewBody}>
          <TextInput
            value={reviewBody}
            onChangeText={setReviewBody}
            placeholder="What did you think?"
            multiline
            maxLength={10000}
          />
          <View style={styles.spoilerRow}>
            <Text variant="callout">Contains spoilers</Text>
            <Switch
              value={spoilers}
              onValueChange={setSpoilers}
              trackColor={{ false: colors.surfaceHigh, true: colors.accent }}
              thumbColor="#FFFFFF"
            />
          </View>
          <Button title="Post review" fullWidth loading={logBook.isPending} disabled={!reviewBody.trim()} onPress={submitReview} />
        </View>
      </Modal>

      {listSheetOpen ? (
        <AddToListSheet title={book} visible={listSheetOpen} onClose={() => setListSheetOpen(false)} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.md, borderWidth: 1, padding: spacing.md, gap: spacing.md },
  shelfRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  shelfButton: {
    flexGrow: 1,
    flexBasis: 120,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    height: 38,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  divider: { height: StyleSheet.hairlineWidth },
  bottomRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  ratingCluster: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  actionButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  ratingLabel: { textTransform: 'uppercase', letterSpacing: 0.8 },
  signedOut: { borderRadius: radius.md, borderWidth: 1, padding: spacing.lg, alignItems: 'center', gap: spacing.md },
  signedOutButton: { alignSelf: 'center' },
  moreList: { gap: spacing.xs },
  moreRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.sm, minHeight: 48 },
  reviewBody: { gap: spacing.md },
  spoilerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});

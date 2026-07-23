import { Stack, useLocalSearchParams } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/primitives/EmptyState';
import { LinkPressable } from '@/components/primitives/LinkPressable';
import { RatingStars } from '@/components/primitives/RatingStars';
import { CardListSkeleton } from '@/components/primitives/Skeleton';
import { Text } from '@/components/primitives/Text';
import { useDiary, useProfileByUsername } from '@/features/profile/hooks';
import { ProfileSubpageShell } from '@/features/profile/ProfileSubpageShell';
import { useTheme } from '@/theme/ThemeContext';
import { contentWidth, radius, spacing } from '@/theme/tokens';
import { formatDate } from '@/utils/dates';
import { titleHref } from '@/utils/titles';

export default function UserDiaryScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const { colors } = useTheme();
  const profile = useProfileByUsername(username);
  const diary = useDiary(profile.data?.id);

  return (
    <ProfileSubpageShell title="Diary" subtitle={username ? `@${username}` : undefined}>
      <Stack.Screen options={{ title: `Diary of @${username ?? ''} — Watchd` }} />
      {profile.isLoading || diary.isLoading ? (
        <View style={styles.loading}>
          <CardListSkeleton count={6} />
        </View>
      ) : !diary.data || diary.data.length === 0 ? (
        <EmptyState
          icon="calendar-outline"
          title="Empty diary"
          message="Logged movie watches (with dates) appear here."
        />
      ) : (
        <FlatList
          data={diary.data}
          keyExtractor={(entry) => entry.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          renderItem={({ item: entry }) => (
            <LinkPressable
              href={titleHref(entry.title.mediaType, entry.title.tmdbId)}
              style={({ pressed, hovered }) => [
                styles.row,
                {
                  backgroundColor: pressed || hovered ? colors.surfaceHigh : colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
                <Text variant="caption" color="muted" style={styles.date}>
                  {formatDate(entry.watchedAt)}
                </Text>
                <View style={styles.titleWrap}>
                  <Text variant="headline" numberOfLines={1}>
                    {entry.title.title}
                  </Text>
                  {entry.isRewatch ? (
                    <Text variant="caption" color="muted">
                      Rewatch
                    </Text>
                  ) : null}
                </View>
                {entry.rating ? <RatingStars value={entry.rating} size={12} /> : null}
            </LinkPressable>
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </ProfileSubpageShell>
  );
}

const styles = StyleSheet.create({
  loading: {
    padding: spacing.lg,
  },
  list: {
    padding: spacing.lg,
    paddingBottom: spacing['6xl'],
    width: '100%',
    maxWidth: contentWidth.prose,
    alignSelf: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  date: {
    width: 90,
  },
  titleWrap: {
    flex: 1,
    gap: 1,
  },
});

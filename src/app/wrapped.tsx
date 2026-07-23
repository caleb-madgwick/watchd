import { Stack, useLocalSearchParams } from 'expo-router';
import { Share, StyleSheet, View } from 'react-native';

import { Button } from '@/components/primitives/Button';
import { EmptyState } from '@/components/primitives/EmptyState';
import { CardListSkeleton } from '@/components/primitives/Skeleton';
import { Text } from '@/components/primitives/Text';
import { genreName } from '@/constants/genres';
import { config } from '@/constants/config';
import { ProfileSubpageShell } from '@/features/profile/ProfileSubpageShell';
import { useUserStats } from '@/features/stats/hooks';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/theme/ThemeContext';
import { contentWidth, radius, spacing } from '@/theme/tokens';
import type { UserStats } from '@/types/database';

function currentYear(): number {
  return new Date().getFullYear();
}

function buildShareText(year: number, stats: UserStats): string {
  const lines = [`My ${year} in film & TV 🎬`];
  lines.push(`${stats.films_watched} films · ${stats.shows_watched} shows · ${stats.hours_watched}h`);
  if (stats.average_rating != null) {
    lines.push(`Rated ${stats.ratings_count}, averaging ${stats.average_rating}★`);
  }
  const genre = stats.top_genres[0];
  if (genre) lines.push(`Top genre: ${genreName(genre.genre_id) ?? 'mixed'}`);
  const director = stats.top_directors[0];
  if (director) lines.push(`Most-watched director: ${director.name}`);
  lines.push('— via Video Club');
  return lines.join('\n');
}

function BigStat({ value, label, tint }: { value: string; label: string; tint?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.bigStat, { backgroundColor: tint ? colors.accentSoft : colors.surface, borderColor: colors.border }]}>
      <Text variant="display" style={{ color: colors.accent }}>
        {value}
      </Text>
      <Text variant="subhead" color="muted">
        {label}
      </Text>
    </View>
  );
}

function Highlight({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.highlight, { borderColor: colors.border }]}>
      <Text variant="caption" color="muted">
        {label}
      </Text>
      <Text variant="headline" numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

export default function WrappedScreen() {
  const { profile } = useAuth();
  const params = useLocalSearchParams<{ year?: string }>();
  const year = Number.parseInt(params.year ?? '', 10) || currentYear();
  const stats = useUserStats(profile?.id, year);

  const share = async (data: UserStats) => {
    try {
      await Share.share({ message: buildShareText(year, data) });
    } catch {
      // user dismissed the sheet
    }
  };

  const data = stats.data;
  const hasContent = !!data && data.films_watched + data.shows_watched > 0;

  return (
    <ProfileSubpageShell title={`${year} in review`} subtitle={profile ? `@${profile.username}` : undefined}>
      <Stack.Screen options={{ title: `Your ${year} — Video Club` }} />
      <View style={styles.page}>
        {config.demoMode || !profile ? (
          <EmptyState
            icon="sparkles-outline"
            title="Sign in for your year in review"
            message="Log your watches and Video Club builds your annual recap."
          />
        ) : stats.isLoading ? (
          <CardListSkeleton count={3} />
        ) : !hasContent ? (
          <EmptyState
            icon="sparkles-outline"
            title={`Nothing logged in ${year}`}
            message="Log some watches this year and your recap will appear here."
          />
        ) : (
          <>
            <Text variant="title2" style={styles.lede}>
              Here’s your {year}.
            </Text>

            <View style={styles.bigRow}>
              <BigStat value={String(data.films_watched)} label="films" tint />
              <BigStat value={String(data.shows_watched)} label="shows" />
            </View>
            <View style={styles.bigRow}>
              <BigStat value={String(data.hours_watched)} label="hours watched" />
              <BigStat
                value={data.average_rating != null ? `${data.average_rating}★` : '—'}
                label={`across ${data.ratings_count} ratings`}
                tint
              />
            </View>

            <View style={styles.highlights}>
              {data.top_genres[0] ? (
                <Highlight
                  label="Top genre"
                  value={genreName(data.top_genres[0].genre_id) ?? 'Mixed'}
                />
              ) : null}
              {data.top_decades[0] ? (
                <Highlight label="Favourite decade" value={`${data.top_decades[0].decade}s`} />
              ) : null}
              {data.top_directors[0] ? (
                <Highlight label="Most-watched director" value={data.top_directors[0].name} />
              ) : null}
              {data.top_actors[0] ? (
                <Highlight label="Most-watched actor" value={data.top_actors[0].name} />
              ) : null}
              {data.rewatches > 0 ? (
                <Highlight label="Rewatches" value={String(data.rewatches)} />
              ) : null}
            </View>

            <Button
              title="Share your year"
              icon="share-outline"
              onPress={() => share(data)}
              style={styles.share}
            />
            <Text variant="micro" color="muted" style={styles.footnote}>
              via Video Club
            </Text>
          </>
        )}
      </View>
    </ProfileSubpageShell>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    width: '100%',
    maxWidth: contentWidth.prose,
    alignSelf: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  lede: {
    marginBottom: spacing.xs,
  },
  bigRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  bigStat: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    gap: 2,
  },
  highlights: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  highlight: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.sm,
    gap: 2,
  },
  share: {
    marginTop: spacing.lg,
  },
  footnote: {
    textAlign: 'center',
  },
});

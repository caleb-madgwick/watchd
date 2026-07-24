import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/primitives/Button';
import { EmptyState } from '@/components/primitives/EmptyState';
import { ErrorState } from '@/components/primitives/ErrorState';
import { SegmentedControl } from '@/components/primitives/SegmentedControl';
import { CardListSkeleton } from '@/components/primitives/Skeleton';
import { Text } from '@/components/primitives/Text';
import { genreName } from '@/constants/genres';
import { config } from '@/constants/config';
import { useProfileByUsername } from '@/features/profile/hooks';
import { ProfileSubpageShell } from '@/features/profile/ProfileSubpageShell';
import { useUserStats } from '@/features/stats/hooks';
import { useCurrentUserId } from '@/providers/AuthProvider';
import { useTheme } from '@/theme/ThemeContext';
import { contentWidth, radius, spacing } from '@/theme/tokens';
import type { UserStats } from '@/types/database';

const RATING_ORDER = [5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1, 0.5];
const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function formatMonth(month: string): string {
  const [year, mm] = month.split('-');
  const idx = Number.parseInt(mm ?? '', 10) - 1;
  return idx >= 0 && idx < 12 ? `${MONTHS[idx]} ${year}` : month;
}

function StatTile({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.tile, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text variant="title1" style={{ color: colors.accent }}>
        {value}
      </Text>
      <Text variant="caption" color="muted">
        {label}
      </Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="headline" style={styles.sectionTitle}>
        {title}
      </Text>
      {children}
    </View>
  );
}

function BarRow({ label, count, max }: { label: string; count: number; max: number }) {
  const { colors } = useTheme();
  const pct = max > 0 ? Math.max(6, Math.round((count / max) * 100)) : 0;
  return (
    <View style={styles.barRow}>
      <Text variant="caption" style={styles.barLabel} numberOfLines={1}>
        {label}
      </Text>
      <View style={[styles.barTrack, { backgroundColor: colors.surfaceRaised }]}>
        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: colors.accent }]} />
      </View>
      <Text variant="caption" color="muted" style={styles.barCount}>
        {count}
      </Text>
    </View>
  );
}

function StatsBody({ stats }: { stats: UserStats }) {
  const { colors } = useTheme();
  // Postgres serialises numeric(2,1) keys as "5.0"/"4.0"; normalise so whole
  // stars match RATING_ORDER's "5"/"4" lookups.
  const ratingDistribution: Record<string, number> = {};
  for (const [key, count] of Object.entries(stats.rating_distribution ?? {})) {
    const normalised = String(Number(key));
    ratingDistribution[normalised] = (ratingDistribution[normalised] ?? 0) + count;
  }
  const ratingMax = Math.max(1, ...Object.values(ratingDistribution));
  const decadeMax = Math.max(1, ...stats.top_decades.map((d) => d.count));
  const hasAny = stats.films_watched + stats.shows_watched > 0;

  if (!hasAny) {
    return (
      <EmptyState
        icon="stats-chart-outline"
        title="No stats yet"
        message="Log some watches — counts, hours, favourite genres, decades and most-watched people will appear here."
      />
    );
  }

  return (
    <>
      <View style={styles.tiles}>
        <StatTile label="Films" value={String(stats.films_watched)} />
        <StatTile label="Shows" value={String(stats.shows_watched)} />
        <StatTile label="Books" value={String(stats.books_read)} />
        <StatTile label="Hours" value={String(stats.hours_watched)} />
        {stats.pages_read > 0 ? <StatTile label="Pages" value={String(stats.pages_read)} /> : null}
        <StatTile label="Rewatches" value={String(stats.rewatches)} />
        <StatTile
          label="Avg rating"
          value={stats.average_rating != null ? `${stats.average_rating}★` : '—'}
        />
        <StatTile label="Ratings" value={String(stats.ratings_count)} />
      </View>

      {stats.busiest_month ? (
        <Text variant="subhead" color="muted" style={styles.note}>
          Busiest month: {formatMonth(stats.busiest_month.month)} ({stats.busiest_month.count})
        </Text>
      ) : null}

      {Object.keys(ratingDistribution).length > 0 ? (
        <Section title="Ratings">
          {RATING_ORDER.map((r) => (
            <BarRow
              key={r}
              label={`${r}★`}
              count={ratingDistribution[r.toString()] ?? 0}
              max={ratingMax}
            />
          ))}
        </Section>
      ) : null}

      {stats.top_genres.length > 0 ? (
        <Section title="Top genres">
          <View style={styles.chips}>
            {stats.top_genres.map((g) => (
              <View key={g.genre_id} style={[styles.chip, { backgroundColor: colors.surfaceRaised }]}>
                <Text variant="caption">
                  {genreName(g.genre_id) ?? `#${g.genre_id}`} · {g.count}
                </Text>
              </View>
            ))}
          </View>
        </Section>
      ) : null}

      {stats.top_decades.length > 0 ? (
        <Section title="By decade">
          {stats.top_decades.map((d) => (
            <BarRow key={d.decade} label={`${d.decade}s`} count={d.count} max={decadeMax} />
          ))}
        </Section>
      ) : null}

      {stats.top_directors.length > 0 ? (
        <Section title="Most-watched directors">
          {stats.top_directors.map((p) => (
            <View key={p.tmdb_id} style={styles.personRow}>
              <Text variant="body" numberOfLines={1} style={styles.personName}>
                {p.name}
              </Text>
              <Text variant="caption" color="muted">
                {p.count}
              </Text>
            </View>
          ))}
        </Section>
      ) : null}

      {stats.top_actors.length > 0 ? (
        <Section title="Most-watched actors">
          {stats.top_actors.map((p) => (
            <View key={p.tmdb_id} style={styles.personRow}>
              <Text variant="body" numberOfLines={1} style={styles.personName}>
                {p.name}
              </Text>
              <Text variant="caption" color="muted">
                {p.count}
              </Text>
            </View>
          ))}
        </Section>
      ) : null}

      {stats.top_authors.length > 0 ? (
        <Section title="Most-read authors">
          {stats.top_authors.map((a) => (
            <View key={a.name} style={styles.personRow}>
              <Text variant="body" numberOfLines={1} style={styles.personName}>
                {a.name}
              </Text>
              <Text variant="caption" color="muted">
                {a.count}
              </Text>
            </View>
          ))}
        </Section>
      ) : null}

      {stats.top_categories.length > 0 ? (
        <Section title="Top book categories">
          <View style={styles.chips}>
            {stats.top_categories.map((c) => (
              <View key={c.name} style={[styles.chip, { backgroundColor: colors.surfaceRaised }]}>
                <Text variant="caption">
                  {c.name} · {c.count}
                </Text>
              </View>
            ))}
          </View>
        </Section>
      ) : null}
    </>
  );
}

export default function UserStatsScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const profile = useProfileByUsername(username);
  const currentUserId = useCurrentUserId();
  const isSelf = !!profile.data?.id && profile.data.id === currentUserId;
  const [year, setYear] = useState<number | null>(null);
  const stats = useUserStats(profile.data?.id, year);

  const yearOptions = useMemo(() => {
    const years = stats.data?.available_years ?? [];
    const opts: { value: string; label: string }[] = [{ value: 'all', label: 'All time' }];
    years.slice(0, 5).forEach((y) => opts.push({ value: String(y), label: String(y) }));
    return opts;
  }, [stats.data?.available_years]);

  if (config.demoMode) {
    return (
      <ProfileSubpageShell title="Stats">
        <EmptyState
          icon="stats-chart-outline"
          title="Stats need an account"
          message="Connect Supabase and log watches to see viewing stats."
        />
      </ProfileSubpageShell>
    );
  }

  return (
    <ProfileSubpageShell title="Stats" subtitle={username ? `@${username}` : undefined}>
      <Stack.Screen options={{ title: `@${username ?? ''}'s stats — Video Club` }} />
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        {yearOptions.length > 1 ? (
          <View style={styles.yearPicker}>
            <SegmentedControl
              options={yearOptions}
              value={year === null ? 'all' : String(year)}
              onChange={(v) => setYear(v === 'all' ? null : Number.parseInt(v, 10))}
            />
          </View>
        ) : null}

        {isSelf && year !== null ? (
          <Button
            title={`See your ${year} in review`}
            variant="secondary"
            icon="sparkles-outline"
            onPress={() => router.push(`/wrapped?year=${year}`)}
            style={styles.wrappedButton}
          />
        ) : null}

        {profile.isLoading || stats.isLoading ? (
          <CardListSkeleton count={4} />
        ) : stats.isError ? (
          <ErrorState
            title="Couldn’t load stats"
            message="Check your connection and try again."
            onRetry={() => stats.refetch()}
          />
        ) : stats.data?.blocked ? (
          <EmptyState icon="lock-closed-outline" title="Stats unavailable" message="" />
        ) : stats.data ? (
          <StatsBody stats={stats.data} />
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
    gap: spacing.md,
  },
  yearPicker: {
    marginBottom: spacing.sm,
  },
  wrappedButton: {
    marginBottom: spacing.sm,
  },
  tiles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tile: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 96,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: 2,
  },
  note: {
    marginTop: spacing.xs,
  },
  section: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  sectionTitle: {
    marginBottom: spacing.xs,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  barLabel: {
    width: 52,
  },
  barTrack: {
    flex: 1,
    height: 10,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  barCount: {
    width: 32,
    textAlign: 'right',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: 4,
  },
  personName: {
    flex: 1,
  },
});

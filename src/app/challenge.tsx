import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/primitives/Button';
import { EmptyState } from '@/components/primitives/EmptyState';
import { SegmentedControl } from '@/components/primitives/SegmentedControl';
import { Text } from '@/components/primitives/Text';
import { config } from '@/constants/config';
import { useSetWatchGoal, useWatchChallenge, type ChallengeKind } from '@/features/challenges/hooks';
import { ProfileSubpageShell } from '@/features/profile/ProfileSubpageShell';
import { useCurrentUserId } from '@/providers/AuthProvider';
import { useTheme } from '@/theme/ThemeContext';
import { contentWidth, radius, spacing } from '@/theme/tokens';

const PRESETS = [12, 24, 52, 100];

const KIND_COPY: Record<ChallengeKind, { noun: string; verbed: string }> = {
  watch: { noun: 'films and shows', verbed: 'watched' },
  read: { noun: 'books', verbed: 'read' },
};

function currentYear(): number {
  return new Date().getFullYear();
}

export default function ChallengeScreen() {
  const { colors } = useTheme();
  const userId = useCurrentUserId();
  const year = currentYear();
  const [kind, setKind] = useState<ChallengeKind>('watch');
  const challenge = useWatchChallenge(userId, year, kind);
  const setGoal = useSetWatchGoal();

  // Show the saved goal until the user edits it (no effect → no cascading render).
  const [draft, setDraft] = useState<number | null>(null);
  const goal = draft ?? challenge.data?.goal ?? 52;

  const watched = challenge.data?.watched ?? 0;
  const activeGoal = challenge.data?.goal ?? null;
  const completed = challenge.data?.completed ?? false;
  const pct = activeGoal ? Math.min(100, Math.round((watched / activeGoal) * 100)) : 0;
  const copy = KIND_COPY[kind];

  if (config.demoMode || !userId) {
    return (
      <ProfileSubpageShell title="Challenges">
        <EmptyState
          icon="flag-outline"
          title="Sign in to set a challenge"
          message="Set a yearly goal and track how many films, shows and books you get through."
        />
      </ProfileSubpageShell>
    );
  }

  return (
    <ProfileSubpageShell title="Challenges" subtitle={String(year)}>
      <View style={styles.page}>
        <SegmentedControl
          options={[
            { value: 'watch' as ChallengeKind, label: 'Films & TV' },
            { value: 'read' as ChallengeKind, label: 'Books' },
          ]}
          value={kind}
          onChange={(k) => {
            setKind(k);
            setDraft(null);
          }}
        />

        {activeGoal ? (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text variant="display" style={{ color: colors.accent }}>
              {watched}
              <Text variant="title2" color="muted">
                {' '}/ {activeGoal}
              </Text>
            </Text>
            <Text variant="subhead" color="muted">
              {completed ? `Challenge complete! 🎉` : `${copy.verbed} in ${year}`}
            </Text>
            <View style={[styles.track, { backgroundColor: colors.surfaceRaised }]}>
              <View style={[styles.fill, { width: `${pct}%`, backgroundColor: colors.accent }]} />
            </View>
            <Text variant="caption" color="muted">
              {pct}%{completed ? '' : ` · ${Math.max(0, activeGoal - watched)} to go`}
            </Text>
          </View>
        ) : (
          <Text variant="subhead" color="muted" style={styles.lede}>
            Set a goal for how many {copy.noun} you want to get through in {year}.
          </Text>
        )}

        <Text variant="headline" style={styles.sectionTitle}>
          {activeGoal ? 'Change your goal' : 'Choose a goal'}
        </Text>

        <View style={styles.presets}>
          {PRESETS.map((p) => {
            const active = goal === p;
            return (
              <Pressable
                key={p}
                onPress={() => setDraft(p)}
                style={[
                  styles.preset,
                  {
                    backgroundColor: active ? colors.accentSoft : colors.surface,
                    borderColor: active ? colors.accent : colors.border,
                  },
                ]}
              >
                <Text variant="headline" style={{ color: active ? colors.accent : colors.text }}>
                  {p}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.stepper}>
          <Pressable
            accessibilityLabel="Decrease goal"
            onPress={() => setDraft(Math.max(1, goal - 1))}
            style={[styles.stepBtn, { borderColor: colors.border }]}
          >
            <Text variant="title3">−</Text>
          </Pressable>
          <Text variant="title2" style={styles.stepValue}>
            {goal}
          </Text>
          <Pressable
            accessibilityLabel="Increase goal"
            onPress={() => setDraft(Math.min(10000, goal + 1))}
            style={[styles.stepBtn, { borderColor: colors.border }]}
          >
            <Text variant="title3">+</Text>
          </Pressable>
        </View>

        <Button
          title={activeGoal === goal ? 'Goal saved' : 'Save goal'}
          disabled={setGoal.isPending || activeGoal === goal}
          onPress={() => setGoal.mutate({ year, goal, kind })}
          style={styles.save}
        />
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
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  track: {
    height: 12,
    borderRadius: radius.full,
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  fill: {
    height: '100%',
    borderRadius: radius.full,
  },
  lede: {
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    marginTop: spacing.sm,
  },
  presets: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  preset: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    marginTop: spacing.xs,
  },
  stepBtn: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: {
    minWidth: 64,
    textAlign: 'center',
  },
  save: {
    marginTop: spacing.sm,
  },
});

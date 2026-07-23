import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { FilterChip } from '@/components/primitives/FilterChip';
import { Text } from '@/components/primitives/Text';
import { ONBOARDING_GENRES } from '@/constants/genres';
import { OnboardingShell } from '@/features/onboarding/OnboardingShell';
import { updateProfile } from '@/features/profile/api';
import { useAuth } from '@/providers/AuthProvider';
import { toast } from '@/stores/toastStore';
import { spacing } from '@/theme/tokens';

const MAX_GENRES = 6;

export default function GenresStep() {
  const { session, profile, refreshProfile } = useAuth();
  const [selected, setSelected] = useState<number[]>(profile?.favouriteGenres ?? []);
  const [saving, setSaving] = useState(false);

  const toggle = (id: number) => {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((g) => g !== id)
        : current.length >= MAX_GENRES
          ? current
          : [...current, id],
    );
  };

  const onContinue = async () => {
    if (!session) return;
    setSaving(true);
    try {
      await updateProfile(session.user.id, { favourite_genres: selected });
      await refreshProfile();
      router.push('/onboarding/rate-titles');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save genres.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <OnboardingShell
      step={3}
      title="What do you love watching?"
      subtitle={`Pick up to ${MAX_GENRES} genres — they shape your suggestions.`}
      actionTitle={selected.length > 0 ? `Continue with ${selected.length} selected` : 'Continue'}
      onAction={onContinue}
      actionLoading={saving}
      onSkip={() => router.push('/onboarding/rate-titles')}
    >
      <View style={styles.chips} accessibilityRole="list">
        {ONBOARDING_GENRES.map((genre) => (
          <FilterChip
            key={genre.id}
            label={genre.name}
            selected={selected.includes(genre.id)}
            onPress={() => toggle(genre.id)}
          />
        ))}
      </View>
      {selected.length >= MAX_GENRES ? (
        <Text variant="footnote" color="muted" style={styles.limit}>
          That’s the limit — deselect one to swap it.
        </Text>
      ) : null}
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  limit: {
    marginTop: spacing.lg,
  },
});

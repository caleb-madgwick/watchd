import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator } from 'react-native';

import { TextInput } from '@/components/primitives/TextInput';
import { OnboardingShell } from '@/features/onboarding/OnboardingShell';
import { usernameSchema } from '@/features/auth/validation';
import { checkUsernameAvailable, updateProfile } from '@/features/profile/api';
import { useAuth } from '@/providers/AuthProvider';
import { toast } from '@/stores/toastStore';
import { useTheme } from '@/theme/ThemeContext';

type Availability = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

export default function UsernameStep() {
  const { session, profile, refreshProfile } = useAuth();
  const { colors } = useTheme();
  // Pre-fill when returning to this step (placeholder usernames start "user_").
  const hasChosenName = !!profile && !profile.username.startsWith('user_');
  const [username, setUsername] = useState(hasChosenName ? profile.username : '');
  const [availability, setAvailability] = useState<Availability>(
    hasChosenName ? 'available' : 'idle',
  );
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onChange = (value: string) => {
    setUsername(value);
    setError(undefined);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const parsed = usernameSchema.safeParse(value);
    if (!parsed.success) {
      setAvailability(value.length === 0 ? 'idle' : 'invalid');
      if (value.length > 0) setError(parsed.error.issues[0]?.message);
      return;
    }
    if (profile && value.toLowerCase() === profile.username.toLowerCase()) {
      setAvailability('available');
      return;
    }
    setAvailability('checking');
    debounceRef.current = setTimeout(async () => {
      try {
        const available = await checkUsernameAvailable(parsed.data);
        setAvailability(available ? 'available' : 'taken');
        if (!available) setError('That username is already taken.');
      } catch {
        setAvailability('idle');
        setError('Could not check availability. Try again.');
      }
    }, 400);
  };

  const onContinue = async () => {
    if (!session) return;
    const parsed = usernameSchema.safeParse(username);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    setSaving(true);
    try {
      await updateProfile(session.user.id, { username: parsed.data });
      await refreshProfile();
      router.push('/onboarding/profile');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not save username.';
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const trailing =
    availability === 'checking' ? (
      <ActivityIndicator size="small" color={colors.textMuted} />
    ) : availability === 'available' ? (
      <Ionicons name="checkmark-circle" size={20} color={colors.success} />
    ) : availability === 'taken' || availability === 'invalid' ? (
      <Ionicons name="close-circle" size={20} color={colors.danger} />
    ) : null;

  return (
    <OnboardingShell
      step={1}
      title="Pick your username"
      subtitle="This is how other members find and mention you. You can change it later."
      actionTitle="Continue"
      onAction={onContinue}
      actionLoading={saving}
      actionDisabled={availability !== 'available'}
    >
      <TextInput
        label="Username"
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus
        maxLength={20}
        value={username}
        onChangeText={onChange}
        error={error}
        hint="3–20 characters. Letters, numbers and underscores."
        trailing={trailing}
      />
    </OnboardingShell>
  );
}

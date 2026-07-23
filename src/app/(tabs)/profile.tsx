import { router } from 'expo-router';

import { Button } from '@/components/primitives/Button';
import { EmptyState } from '@/components/primitives/EmptyState';
import { Screen } from '@/components/primitives/Screen';
import { ProfileView } from '@/features/profile/ProfileView';
import { config } from '@/constants/config';
import { useAuth } from '@/providers/AuthProvider';

/** The signed-in user's own profile tab. */
export default function ProfileTab() {
  const { profile } = useAuth();

  if (config.demoMode || !profile) {
    return (
      <Screen padTop>
        <EmptyState
          icon="person-circle-outline"
          title="No profile in demo mode"
          message="Connect Supabase and create an account to build your profile."
        />
        {!config.demoMode ? (
          <Button title="Sign in" onPress={() => router.push('/(auth)/sign-in')} style={{ alignSelf: 'center' }} />
        ) : null}
      </Screen>
    );
  }

  return (
    <Screen>
      <ProfileView profile={profile} isSelf />
    </Screen>
  );
}

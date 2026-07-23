import { Redirect, Stack } from 'expo-router';

import { Screen } from '@/components/primitives/Screen';
import { config } from '@/constants/config';
import { useAuth } from '@/providers/AuthProvider';

export default function OnboardingLayout() {
  const { session, initializing } = useAuth();

  if (config.demoMode) {
    return <Redirect href="/(tabs)/home" />;
  }
  if (!initializing && !session) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <Screen>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: 'transparent' },
          animation: 'slide_from_right',
        }}
      />
    </Screen>
  );
}

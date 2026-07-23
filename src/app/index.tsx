import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { config } from '@/constants/config';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/theme/ThemeContext';

/** Entry gate: restore session, then route to the right starting point. */
export default function Index() {
  const { session, profile, initializing } = useAuth();
  const { colors } = useTheme();

  // Without a configured backend the app runs in browse-only demo mode.
  if (config.demoMode) {
    return <Redirect href="/(tabs)/home" />;
  }

  if (initializing) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  if (!profile || !profile.onboardingCompleted) {
    return <Redirect href="/onboarding/username" />;
  }

  return <Redirect href="/(tabs)/home" />;
}

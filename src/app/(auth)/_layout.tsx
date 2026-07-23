import { Redirect, Slot } from 'expo-router';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Screen } from '@/components/primitives/Screen';
import { TmdbAttribution } from '@/components/TmdbAttribution';
import { Wordmark } from '@/components/Wordmark';
import { config } from '@/constants/config';
import { useAuth } from '@/providers/AuthProvider';
import { spacing } from '@/theme/tokens';

export default function AuthLayout() {
  const { session, initializing } = useAuth();
  const insets = useSafeAreaInsets();

  // Signed-in users never see auth screens.
  if (!config.demoMode && !initializing && session) {
    return <Redirect href="/" />;
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + spacing['4xl'], paddingBottom: insets.bottom + spacing.xl },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <View style={styles.brand}>
              <Wordmark size={40} />
            </View>
            <Slot />
          </View>
          <TmdbAttribution compact />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: spacing['3xl'],
  },
  brand: {
    alignItems: 'center',
    marginBottom: spacing['3xl'],
  },
});

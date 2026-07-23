import '@/global.css';

import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { SpaceGrotesk_500Medium, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { useFonts } from 'expo-font';
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavThemeProvider,
  Stack,
  usePathname,
} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { Sidebar } from '@/components/navigation/Sidebar';
import { ToastHost } from '@/components/primitives/Toast';
import { config } from '@/constants/config';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { AuthProvider, useAuth } from '@/providers/AuthProvider';
import { QueryProvider } from '@/providers/QueryProvider';
import { ThemeProvider, useTheme } from '@/theme/ThemeContext';

SplashScreen.preventAutoHideAsync();

/** Routes that manage their own full-screen chrome (no sidebar). */
const FULLSCREEN_PREFIXES = ['/sign-in', '/sign-up', '/forgot-password', '/reset-password', '/onboarding'];

function AppShell() {
  const { colors, scheme } = useTheme();
  const { session } = useAuth();
  const { isWide } = useBreakpoint();
  const pathname = usePathname();

  const baseNavTheme = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...baseNavTheme,
    colors: {
      ...baseNavTheme.colors,
      background: colors.bg,
      card: colors.bg,
      text: colors.text,
      primary: colors.accent,
      border: colors.border,
      notification: colors.accent,
    },
  };

  const isFullscreenRoute = FULLSCREEN_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const showSidebar = isWide && !isFullscreenRoute && (!!session || config.demoMode);

  return (
    <NavThemeProvider value={navTheme}>
      <View style={styles.shell}>
        {showSidebar ? <Sidebar /> : null}
        <View style={styles.content}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.bg },
            }}
          />
        </View>
      </View>
      <ToastHost />
    </NavThemeProvider>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    flexDirection: 'row',
  },
  content: {
    flex: 1,
  },
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <ThemeProvider>
      <QueryProvider>
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}

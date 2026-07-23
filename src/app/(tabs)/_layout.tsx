import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';

import { config } from '@/constants/config';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/theme/ThemeContext';

const TAB_CONFIG: {
  name: 'home' | 'search' | 'log' | 'activity' | 'profile';
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
}[] = [
  { name: 'home', title: 'Home', icon: 'film-outline', iconActive: 'film' },
  { name: 'search', title: 'Search', icon: 'search-outline', iconActive: 'search' },
  { name: 'log', title: 'Log', icon: 'add-circle-outline', iconActive: 'add-circle' },
  { name: 'activity', title: 'Activity', icon: 'pulse-outline', iconActive: 'pulse' },
  { name: 'profile', title: 'Profile', icon: 'person-circle-outline', iconActive: 'person-circle' },
];

export default function TabsLayout() {
  const { colors } = useTheme();
  const { session, profile, initializing } = useAuth();
  // On wide screens the root layout renders the persistent sidebar instead.
  const { isWide, width } = useBreakpoint();
  // Between phone and sidebar widths, lay tab labels beside icons, not under.
  const besideIcon = width >= 600;

  if (!config.demoMode) {
    if (!initializing && !session) {
      return <Redirect href="/(auth)/sign-in" />;
    }
    if (!initializing && session && profile && !profile.onboardingCompleted) {
      return <Redirect href="/onboarding/username" />;
    }
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.bg },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: isWide
          ? { display: 'none' }
          : {
              backgroundColor: colors.tabBar,
              borderTopColor: colors.border,
              borderTopWidth: StyleSheet.hairlineWidth,
              ...(besideIcon ? { height: 58 } : null),
            },
        tabBarLabelPosition: besideIcon ? 'beside-icon' : 'below-icon',
        tabBarLabelStyle: besideIcon
          ? { fontSize: 14.5, fontWeight: '600', marginLeft: 6 }
          : { fontSize: 12, fontWeight: '600' },
      }}
    >
      {TAB_CONFIG.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? tab.iconActive : tab.icon} size={23} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

import { Ionicons } from '@expo/vector-icons';
import { Link, Redirect, Tabs, usePathname } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/primitives/Avatar';
import { Text } from '@/components/primitives/Text';
import { Wordmark } from '@/components/Wordmark';
import { config } from '@/constants/config';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme/tokens';

type TabName = 'home' | 'search' | 'log' | 'activity' | 'profile';

const TAB_CONFIG: {
  name: TabName;
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

const SIDE_LINKS: { title: string; href: '/watchlist' | '/settings'; icon: keyof typeof Ionicons.glyphMap }[] = [
  { title: 'Watchlist', href: '/watchlist', icon: 'bookmark-outline' },
  { title: 'Settings', href: '/settings', icon: 'settings-outline' },
];

function Sidebar() {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.sidebar,
        {
          backgroundColor: colors.bg,
          borderRightColor: colors.border,
          paddingTop: insets.top + spacing['2xl'],
          paddingBottom: insets.bottom + spacing.xl,
        },
      ]}
      accessibilityRole="menu"
    >
      <View style={styles.sidebarBrand}>
        <Wordmark size={26} />
      </View>

      <View style={styles.sidebarNav}>
        {TAB_CONFIG.map((tab) => {
          const href = `/${tab.name}` as const;
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link key={tab.name} href={href} asChild>
              <Pressable
                accessibilityRole="link"
                accessibilityState={{ selected: active }}
                style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                  styles.sidebarItem,
                  {
                    backgroundColor: active
                      ? colors.accentSoft
                      : pressed || hovered
                        ? colors.surface
                        : 'transparent',
                  },
                ]}
              >
                <Ionicons
                  name={active ? tab.iconActive : tab.icon}
                  size={20}
                  color={active ? colors.accent : colors.textSecondary}
                />
                <Text
                  variant="headline"
                  style={{ color: active ? colors.accent : colors.textSecondary }}
                >
                  {tab.title}
                </Text>
              </Pressable>
            </Link>
          );
        })}

        <View style={[styles.sidebarDivider, { backgroundColor: colors.border }]} />

        {SIDE_LINKS.map((link) => {
          const active = pathname.startsWith(link.href);
          return (
            <Link key={link.href} href={link.href} asChild>
              <Pressable
                accessibilityRole="link"
                style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                  styles.sidebarItem,
                  {
                    backgroundColor: active
                      ? colors.accentSoft
                      : pressed || hovered
                        ? colors.surface
                        : 'transparent',
                  },
                ]}
              >
                <Ionicons
                  name={link.icon}
                  size={20}
                  color={active ? colors.accent : colors.textSecondary}
                />
                <Text
                  variant="headline"
                  style={{ color: active ? colors.accent : colors.textSecondary }}
                >
                  {link.title}
                </Text>
              </Pressable>
            </Link>
          );
        })}
      </View>

      {profile ? (
        <Link href="/profile" asChild>
          <Pressable accessibilityRole="link" style={styles.sidebarUser}>
            <Avatar url={profile.avatarUrl} name={profile.displayName} size={32} />
            <View style={styles.sidebarUserText}>
              <Text variant="subhead" numberOfLines={1}>
                {profile.displayName}
              </Text>
              <Text variant="caption" color="muted" numberOfLines={1}>
                @{profile.username}
              </Text>
            </View>
          </Pressable>
        </Link>
      ) : null}
    </View>
  );
}

export default function TabsLayout() {
  const { colors } = useTheme();
  const { session, profile, initializing } = useAuth();
  const { isWide } = useBreakpoint();

  if (!config.demoMode) {
    if (!initializing && !session) {
      return <Redirect href="/(auth)/sign-in" />;
    }
    if (!initializing && session && profile && !profile.onboardingCompleted) {
      return <Redirect href="/onboarding/username" />;
    }
  }

  const tabs = (
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
            },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
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

  if (!isWide) return tabs;

  return (
    <View style={styles.wideRoot}>
      <Sidebar />
      <View style={styles.wideContent}>{tabs}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wideRoot: {
    flex: 1,
    flexDirection: 'row',
  },
  wideContent: {
    flex: 1,
  },
  sidebar: {
    width: 240,
    borderRightWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
  },
  sidebarBrand: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing['3xl'],
  },
  sidebarNav: {
    flex: 1,
    gap: spacing.xs,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    height: 44,
    borderRadius: radius.sm,
  },
  sidebarDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.lg,
    marginHorizontal: spacing.md,
  },
  sidebarUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  sidebarUserText: {
    flex: 1,
  },
});

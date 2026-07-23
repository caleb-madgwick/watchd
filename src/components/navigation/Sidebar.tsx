import { Ionicons } from '@expo/vector-icons';
import { Link, usePathname } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/primitives/Avatar';
import { Text } from '@/components/primitives/Text';
import { Wordmark } from '@/components/Wordmark';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme/tokens';

type NavHref = '/home' | '/search' | '/log' | '/activity' | '/profile' | '/watchlist' | '/settings';

interface NavItem {
  href: NavHref;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
}

const PRIMARY_NAV: NavItem[] = [
  { href: '/home', title: 'Home', icon: 'film-outline', iconActive: 'film' },
  { href: '/search', title: 'Search', icon: 'search-outline', iconActive: 'search' },
  { href: '/log', title: 'Log', icon: 'add-circle-outline', iconActive: 'add-circle' },
  { href: '/activity', title: 'Activity', icon: 'pulse-outline', iconActive: 'pulse' },
  { href: '/profile', title: 'Profile', icon: 'person-circle-outline', iconActive: 'person-circle' },
];

const SECONDARY_NAV: NavItem[] = [
  { href: '/watchlist', title: 'Watchlist', icon: 'bookmark-outline', iconActive: 'bookmark' },
  { href: '/settings', title: 'Settings', icon: 'settings-outline', iconActive: 'settings' },
];

function NavRow({ item, active }: { item: NavItem; active: boolean }) {
  const { colors } = useTheme();
  return (
    <Link href={item.href} asChild>
      <Pressable
        accessibilityRole="link"
        accessibilityState={{ selected: active }}
        style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
          styles.item,
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
          name={active ? item.iconActive : item.icon}
          size={19}
          color={active ? colors.accent : colors.textSecondary}
        />
        <Text
          variant="subhead"
          style={[styles.itemLabel, { color: active ? colors.accent : colors.textSecondary }]}
        >
          {item.title}
        </Text>
      </Pressable>
    </Link>
  );
}

/**
 * Persistent desktop navigation rail. Rendered by the root layout on wide
 * screens for every signed-in route, so navigation never disappears when
 * drilling into titles, lists or settings.
 */
export function Sidebar() {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <View
      style={[
        styles.sidebar,
        {
          backgroundColor: colors.bg,
          borderRightColor: colors.border,
          paddingTop: insets.top + spacing['2xl'],
          paddingBottom: insets.bottom + spacing.lg,
        },
      ]}
    >
      <Link href="/home" asChild>
        <Pressable accessibilityRole="link" accessibilityLabel="Watchd home" style={styles.brand}>
          <Wordmark size={24} />
        </Pressable>
      </Link>

      <View style={styles.nav}>
        {PRIMARY_NAV.map((item) => (
          <NavRow key={item.href} item={item} active={isActive(item.href)} />
        ))}

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {SECONDARY_NAV.map((item) => (
          <NavRow key={item.href} item={item} active={isActive(item.href)} />
        ))}
      </View>

      {profile ? (
        <Link href="/profile" asChild>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Your profile"
            style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
              styles.user,
              {
                backgroundColor: pressed || hovered ? colors.surfaceRaised : colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Avatar url={profile.avatarUrl} name={profile.displayName} size={30} />
            <View style={styles.userText}>
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

const styles = StyleSheet.create({
  sidebar: {
    width: 232,
    borderRightWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
  },
  brand: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing['2xl'],
    alignSelf: 'flex-start',
  },
  nav: {
    flex: 1,
    gap: 2,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    height: 40,
    borderRadius: radius.sm,
  },
  itemLabel: {
    fontSize: 14.5,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.md,
    marginHorizontal: spacing.md,
  },
  user: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    padding: spacing.sm + 2,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  userText: {
    flex: 1,
  },
});

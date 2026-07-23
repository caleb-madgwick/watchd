import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, router, usePathname } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/primitives/Avatar';
import { Text } from '@/components/primitives/Text';
import { Wordmark } from '@/components/Wordmark';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme/tokens';

type NavHref = '/home' | '/search' | '/activity' | '/profile' | '/watchlist' | '/settings';

interface NavItem {
  href: NavHref;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
}

const BROWSE_NAV: NavItem[] = [
  { href: '/home', title: 'Home', icon: 'film-outline', iconActive: 'film' },
  { href: '/search', title: 'Search', icon: 'search-outline', iconActive: 'search' },
  { href: '/activity', title: 'Activity', icon: 'pulse-outline', iconActive: 'pulse' },
];

const LIBRARY_NAV: NavItem[] = [
  { href: '/profile', title: 'Profile', icon: 'person-circle-outline', iconActive: 'person-circle' },
  { href: '/watchlist', title: 'Watchlist', icon: 'bookmark-outline', iconActive: 'bookmark' },
  { href: '/settings', title: 'Settings', icon: 'settings-outline', iconActive: 'settings' },
];

function SectionLabel({ children }: { children: string }) {
  return (
    <Text variant="micro" color="muted" style={styles.sectionLabel}>
      {children.toUpperCase()}
    </Text>
  );
}

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
              : pressed
                ? colors.surfaceRaised
                : hovered
                  ? colors.surface
                  : 'transparent',
          },
        ]}
      >
        {active ? <View style={[styles.activeBar, { backgroundColor: colors.accent }]} /> : null}
        <View style={styles.iconSlot}>
          <Ionicons
            name={active ? item.iconActive : item.icon}
            size={20}
            color={active ? colors.accent : colors.textSecondary}
          />
        </View>
        <Text
          variant="callout"
          style={{
            color: active ? colors.accent : colors.text,
            fontWeight: active ? '600' : '400',
          }}
        >
          {item.title}
        </Text>
      </Pressable>
    </Link>
  );
}

/**
 * Persistent desktop navigation rail: gradient-elevated, marquee-gold CTA and
 * active indicators, grouped sections, profile anchored at the bottom.
 */
export function Sidebar() {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <View style={[styles.sidebar, { borderRightColor: colors.border }]}>
      <LinearGradient
        colors={[colors.surface, colors.bg]}
        locations={[0, 0.6]}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          styles.inner,
          { paddingTop: insets.top + spacing['3xl'], paddingBottom: insets.bottom + spacing.xl },
        ]}
      >
        <Link href="/home" asChild>
          <Pressable accessibilityRole="link" accessibilityLabel="Watchd home" style={styles.brand}>
            <Wordmark size={26} />
          </Pressable>
        </Link>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Log a watch"
          onPress={() => router.push('/log')}
          style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
            styles.cta,
            {
              backgroundColor:
                pressed || isActive('/log')
                  ? colors.accentPressed
                  : hovered
                    ? colors.accentPressed
                    : colors.accent,
            },
          ]}
        >
          <Ionicons name="add" size={19} color={colors.onAccent} />
          <Text variant="headline" style={{ color: colors.onAccent, fontSize: 15 }}>
            Log a watch
          </Text>
        </Pressable>

        <View style={styles.nav}>
          <SectionLabel>Browse</SectionLabel>
          {BROWSE_NAV.map((item) => (
            <NavRow key={item.href} item={item} active={isActive(item.href)} />
          ))}

          <View style={styles.sectionGap} />

          <SectionLabel>Your library</SectionLabel>
          {LIBRARY_NAV.map((item) => (
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
                  backgroundColor:
                    pressed || hovered ? colors.surfaceHigh : colors.surfaceRaised,
                },
              ]}
            >
              <Avatar url={profile.avatarUrl} name={profile.displayName} size={34} />
              <View style={styles.userText}>
                <Text variant="subhead" numberOfLines={1}>
                  {profile.displayName}
                </Text>
                <Text variant="caption" color="muted" numberOfLines={1}>
                  @{profile.username}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
            </Pressable>
          </Link>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 260,
    borderRightWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  inner: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  brand: {
    paddingHorizontal: spacing.sm,
    marginBottom: spacing['2xl'],
    alignSelf: 'flex-start',
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 44,
    borderRadius: radius.full,
    marginBottom: spacing['3xl'],
  },
  nav: {
    flex: 1,
    gap: 2,
  },
  sectionLabel: {
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
    letterSpacing: 1.2,
  },
  sectionGap: {
    height: spacing['2xl'],
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
  },
  activeBar: {
    position: 'absolute',
    left: 0,
    width: 3,
    height: 18,
    borderRadius: radius.full,
  },
  iconSlot: {
    width: 34,
    alignItems: 'center',
    marginRight: spacing.xs,
  },
  user: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  userText: {
    flex: 1,
  },
});

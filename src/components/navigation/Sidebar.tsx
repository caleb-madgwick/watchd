import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, router, usePathname } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/primitives/Avatar';
import { LinkPressable } from '@/components/primitives/LinkPressable';
import { Text } from '@/components/primitives/Text';
import { Wordmark } from '@/components/Wordmark';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme/tokens';

type NavHref =
  | '/home'
  | '/movies'
  | '/tv'
  | '/search'
  | '/activity'
  | '/profile'
  | '/watchlist'
  | '/friends'
  | '/shared'
  | '/settings';

interface NavItem {
  href: NavHref;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
  /** Extra path prefixes that should light this item up (e.g. detail pages). */
  alsoMatch?: string[];
}

const BROWSE_NAV: NavItem[] = [
  { href: '/home', title: 'Home', icon: 'home-outline', iconActive: 'home' },
  { href: '/movies', title: 'Movies', icon: 'film-outline', iconActive: 'film', alsoMatch: ['/movie'] },
  { href: '/tv', title: 'TV shows', icon: 'tv-outline', iconActive: 'tv' },
  { href: '/search', title: 'Search', icon: 'search-outline', iconActive: 'search' },
  { href: '/activity', title: 'Activity', icon: 'pulse-outline', iconActive: 'pulse' },
];

const LIBRARY_NAV: NavItem[] = [
  { href: '/watchlist', title: 'Watchlist', icon: 'bookmark-outline', iconActive: 'bookmark' },
  { href: '/friends', title: 'Friends', icon: 'people-outline', iconActive: 'people' },
  { href: '/shared', title: 'Shared', icon: 'albums-outline', iconActive: 'albums', alsoMatch: ['/shared'] },
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
    <LinkPressable
      href={item.href}
      accessibilityState={{ selected: active }}
      style={({ pressed, hovered }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        height: 48,
        borderRadius: radius.sm,
        paddingHorizontal: spacing.sm,
        backgroundColor: active
          ? colors.accentSoft
          : pressed
            ? colors.surfaceRaised
            : hovered
              ? colors.surface
              : 'transparent',
      })}
    >
        {active ? <View style={[styles.activeBar, { backgroundColor: colors.accent }]} /> : null}
        <View
          style={{ width: 38, alignItems: 'center', marginRight: spacing.xs, flexShrink: 0 }}
        >
          <Ionicons
            name={active ? item.iconActive : item.icon}
            size={22}
            color={active ? colors.accent : colors.textSecondary}
          />
        </View>
        <Text
          variant="body"
          numberOfLines={1}
          style={{
            flexShrink: 1,
            color: active ? colors.accent : colors.text,
            fontSize: 16.5,
            fontWeight: active ? '600' : '500',
          }}
        >
          {item.title}
        </Text>
    </LinkPressable>
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

  const isActive = (item: NavItem | string) => {
    const prefixes =
      typeof item === 'string' ? [item] : [item.href, ...(item.alsoMatch ?? [])];
    return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  };

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
          <Pressable accessibilityRole="link" accessibilityLabel="Video Club home" style={styles.brand}>
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
            <NavRow key={item.href} item={item} active={isActive(item)} />
          ))}

          <View style={styles.sectionGap} />

          <SectionLabel>Your library</SectionLabel>
          {LIBRARY_NAV.map((item) => (
            <NavRow key={item.href} item={item} active={isActive(item)} />
          ))}
        </View>

        {profile ? (
          <LinkPressable
            href="/profile"
            accessibilityLabel="Your profile"
            style={({ pressed, hovered }) => [
              styles.user,
              {
                backgroundColor: pressed || hovered ? colors.surfaceHigh : colors.surfaceRaised,
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
          </LinkPressable>
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
    height: 48,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
  },
  activeBar: {
    position: 'absolute',
    left: 0,
    width: 3,
    height: 20,
    borderRadius: radius.full,
  },
  iconSlot: {
    width: 38,
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

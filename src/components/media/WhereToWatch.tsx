import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Modal } from '@/components/primitives/Modal';
import { Text } from '@/components/primitives/Text';
import { useTheme } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme/tokens';
import type { RegionWatchOffers, WatchAvailability, WatchOfferKind, WatchProvider } from '@/types/domain';
import { useRegion } from '@/stores/regionStore';

/** Display order + labels for the offer groups. */
const GROUPS: { kind: WatchOfferKind; label: string }[] = [
  { kind: 'stream', label: 'Stream' },
  { kind: 'free', label: 'Free' },
  { kind: 'ads', label: 'With ads' },
  { kind: 'rent', label: 'Rent' },
  { kind: 'buy', label: 'Buy' },
];

let regionNames: Intl.DisplayNames | undefined;
/** Human-readable country name, falling back to the raw code where unsupported. */
function regionName(code: string): string {
  try {
    if (regionNames === undefined) {
      regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
    }
    return regionNames.of(code) ?? code;
  } catch {
    return code;
  }
}

export function WhereToWatch({ availability }: { availability?: WatchAvailability }) {
  const { colors } = useTheme();
  const { region, setRegion } = useRegion();
  const [pickerOpen, setPickerOpen] = useState(false);

  const regionCodes = useMemo(
    () =>
      availability
        ? Object.keys(availability).sort((a, b) => regionName(a).localeCompare(regionName(b)))
        : [],
    [availability],
  );

  if (!availability || regionCodes.length === 0) return null;

  const current: RegionWatchOffers | undefined = availability[region];

  const openLink = (provider: WatchProvider) => {
    // Tier 2 will populate deepLink; until then every provider shares the
    // region's JustWatch-powered "where to watch" page.
    const url = provider.deepLink ?? current?.link;
    if (url) void WebBrowser.openBrowserAsync(url);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="title3" style={styles.heading}>
          Where to watch
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Region: ${regionName(region)}. Change region`}
          onPress={() => setPickerOpen(true)}
          style={({ pressed }) => [
            styles.regionChip,
            { borderColor: colors.border, backgroundColor: pressed ? colors.surfaceRaised : colors.surface },
          ]}
        >
          <Ionicons name="globe-outline" size={15} color={colors.textSecondary} />
          <Text variant="subhead" color="secondary">
            {region}
          </Text>
          <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
        </Pressable>
      </View>

      {current ? (
        <View style={styles.groups}>
          {GROUPS.map(({ kind, label }) => {
            const providers = current.offers[kind];
            if (!providers || providers.length === 0) return null;
            return (
              <View key={kind} style={styles.group}>
                <Text variant="footnote" color="muted" style={styles.groupLabel}>
                  {label}
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.logoRow}
                >
                  {providers.map((provider) => (
                    <Pressable
                      key={provider.id}
                      accessibilityRole="link"
                      accessibilityLabel={`${provider.name} — ${label.toLowerCase()}`}
                      onPress={() => openLink(provider)}
                      style={({ pressed }) => [styles.logoTile, { opacity: pressed ? 0.75 : 1 }]}
                    >
                      {provider.logoUrl ? (
                        <Image
                          source={{ uri: provider.logoUrl }}
                          style={[styles.logo, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}
                          contentFit="cover"
                          transition={150}
                        />
                      ) : (
                        <View
                          style={[
                            styles.logo,
                            styles.logoFallback,
                            { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
                          ]}
                        >
                          <Text variant="footnote" color="muted">
                            {provider.name.slice(0, 2)}
                          </Text>
                        </View>
                      )}
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            );
          })}
        </View>
      ) : (
        <Text variant="subhead" color="muted" style={styles.emptyNote}>
          Not available to stream in {regionName(region)}. Try another region.
        </Text>
      )}

      <Text variant="caption" color="muted" style={styles.attribution}>
        Streaming availability powered by JustWatch.
      </Text>

      <Modal visible={pickerOpen} onClose={() => setPickerOpen(false)} title="Choose region">
        {regionCodes.map((code) => {
          const selected = code === region;
          return (
            <Pressable
              key={code}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => {
                setRegion(code);
                setPickerOpen(false);
              }}
              style={({ pressed }) => [
                styles.regionRow,
                { borderBottomColor: colors.border, backgroundColor: pressed ? colors.surfaceRaised : 'transparent' },
              ]}
            >
              <Text variant="body" color={selected ? 'accent' : 'primary'}>
                {regionName(code)}
              </Text>
              {selected ? <Ionicons name="checkmark" size={18} color={colors.accent} /> : null}
            </Pressable>
          );
        })}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  heading: {
    flexShrink: 1,
  },
  regionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    height: 34,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  groups: {
    gap: spacing.lg,
  },
  group: {
    gap: spacing.sm,
  },
  groupLabel: {
    paddingHorizontal: spacing.lg,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  logoRow: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  logoTile: {
    width: 56,
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  logoFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyNote: {
    paddingHorizontal: spacing.lg,
  },
  attribution: {
    paddingHorizontal: spacing.lg,
  },
  regionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});

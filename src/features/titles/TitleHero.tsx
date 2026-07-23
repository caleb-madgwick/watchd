import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackdropHero } from '@/components/media/BackdropHero';
import { IconButton } from '@/components/primitives/IconButton';
import { Text } from '@/components/primitives/Text';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useTheme } from '@/theme/ThemeContext';
import { aspect, radius, spacing } from '@/theme/tokens';

export interface TitleHeroProps {
  title: string;
  tagline?: string;
  backdropUrl?: string;
  posterUrl?: string;
  /** "2010 · 2h 28m · Action, Thriller" style meta line parts. */
  metaParts: (string | undefined)[];
}

/** Cinematic page header: backdrop fading into the background, poster + headline. */
export function TitleHero({ title, tagline, backdropUrl, posterUrl, metaParts }: TitleHeroProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { isWide, width } = useBreakpoint();

  const heroHeight = Math.min(isWide ? 380 : width / aspect.backdrop + 100, 440);
  const posterWidth = isWide ? 150 : 110;

  return (
    <View>
      <BackdropHero backdropUrl={backdropUrl} height={heroHeight}>
        <View style={[styles.headline, { paddingBottom: spacing.lg }]}>
          <View style={styles.headlineRow}>
            {posterUrl ? (
              <Image
                source={{ uri: posterUrl }}
                style={[
                  styles.poster,
                  {
                    width: posterWidth,
                    height: posterWidth / aspect.poster,
                    backgroundColor: colors.surfaceRaised,
                    borderColor: colors.border,
                  },
                ]}
                contentFit="cover"
                transition={200}
                accessibilityLabel={`${title} poster`}
              />
            ) : null}
            <View style={styles.headlineText}>
              <Text variant={isWide ? 'display' : 'title1'} accessibilityRole="header">
                {title}
              </Text>
              <Text variant="subhead" color="secondary">
                {metaParts.filter(Boolean).join(' · ')}
              </Text>
              {tagline ? (
                <Text variant="footnote" color="muted" style={styles.tagline}>
                  “{tagline}”
                </Text>
              ) : null}
            </View>
          </View>
        </View>
      </BackdropHero>
      <IconButton
        icon="chevron-back"
        accessibilityLabel="Go back"
        variant="filled"
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home'))}
        style={[styles.back, { top: insets.top + spacing.sm }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headline: {
    width: '100%',
    maxWidth: 1120,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
  },
  headlineRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.lg,
  },
  poster: {
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  headlineText: {
    flex: 1,
    gap: spacing.xs,
    paddingBottom: spacing.xs,
  },
  tagline: {
    fontStyle: 'italic',
  },
  back: {
    position: 'absolute',
    left: spacing.md,
  },
});

import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/primitives/Text';
import { radius, spacing } from '@/theme/tokens';

/**
 * Required TMDB attribution (per TMDB API terms). The stylised "TMDB" mark
 * links to themoviedb.org; drawn with the brand's teal so the source is
 * unmistakable without bundling their image asset.
 */
export function TmdbAttribution({ compact = false }: { compact?: boolean }) {
  return (
    <View style={[styles.container, compact && styles.compact]}>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel="The Movie Database"
        onPress={() => Linking.openURL('https://www.themoviedb.org/')}
        style={styles.badge}
      >
        <View style={styles.logo}>
          <Text style={styles.logoText}>TMDB</Text>
        </View>
      </Pressable>
      <Text variant="caption" color="muted" style={styles.text}>
        This product uses the TMDB API but is not endorsed or certified by TMDB.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  compact: {
    paddingVertical: spacing.sm,
  },
  badge: {
    minHeight: 24,
    justifyContent: 'center',
  },
  logo: {
    backgroundColor: '#0d253f',
    borderRadius: radius.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#01b4e4',
  },
  logoText: {
    color: '#01b4e4',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
  },
  text: {
    textAlign: 'center',
    maxWidth: 340,
  },
});

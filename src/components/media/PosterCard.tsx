import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Link, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/primitives/Text';
import { useTheme } from '@/theme/ThemeContext';
import { aspect, radius, spacing } from '@/theme/tokens';

export interface PosterCardProps {
  title: string;
  posterUrl?: string;
  year?: number;
  href: Href;
  width: number;
  /** Personal or community rating shown under the title, 0–5. */
  rating?: number;
  /** Extra line under the title (e.g. "Movie" / "TV"). */
  subtitle?: string;
}

/** Tappable poster with title/metadata below — the core discovery unit. */
export function PosterCard({ title, posterUrl, year, href, width, rating, subtitle }: PosterCardProps) {
  const { colors } = useTheme();
  const height = width / aspect.poster;

  return (
    <Link href={href} asChild>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`${title}${year ? `, ${year}` : ''}`}
        style={({ pressed }) => [{ width, opacity: pressed ? 0.85 : 1 }]}
      >
        {posterUrl ? (
          <Image
            source={{ uri: posterUrl }}
            style={[styles.poster, { width, height, backgroundColor: colors.surfaceRaised }]}
            contentFit="cover"
            transition={200}
            accessibilityLabel={`${title} poster`}
          />
        ) : (
          <View
            style={[
              styles.poster,
              styles.fallback,
              { width, height, backgroundColor: colors.surfaceRaised, borderColor: colors.border },
            ]}
          >
            <Ionicons name="film-outline" size={width * 0.22} color={colors.textMuted} />
            <Text variant="caption" color="muted" align="center" numberOfLines={3} style={styles.fallbackTitle}>
              {title}
            </Text>
          </View>
        )}
        <View style={styles.meta}>
          <Text variant="subhead" numberOfLines={1}>
            {title}
          </Text>
          <View style={styles.metaRow}>
            {year ? (
              <Text variant="caption" color="muted">
                {year}
              </Text>
            ) : null}
            {subtitle ? (
              <Text variant="caption" color="muted">
                {subtitle}
              </Text>
            ) : null}
            {rating !== undefined && rating > 0 ? (
              <View style={styles.rating}>
                <Ionicons name="star" size={10} color={colors.star} />
                <Text variant="caption" color="muted">
                  {rating.toFixed(1)}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  poster: {
    borderRadius: radius.sm,
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
    padding: spacing.sm,
  },
  fallbackTitle: {
    paddingHorizontal: spacing.xs,
  },
  meta: {
    marginTop: spacing.sm,
    gap: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
});

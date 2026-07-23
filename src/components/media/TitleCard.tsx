import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Link, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/primitives/Text';
import { useTheme } from '@/theme/ThemeContext';
import { aspect, radius, spacing } from '@/theme/tokens';

export interface TitleCardProps {
  title: string;
  posterUrl?: string;
  year?: number;
  mediaTypeLabel?: string;
  overview?: string;
  href: Href;
  /** Right-aligned accessory (actions, rating, etc.). */
  trailing?: React.ReactNode;
  posterWidth?: number;
}

/** Horizontal list row: poster thumbnail + metadata. Used in search, watchlist, lists. */
export function TitleCard({
  title,
  posterUrl,
  year,
  mediaTypeLabel,
  overview,
  href,
  trailing,
  posterWidth = 56,
}: TitleCardProps) {
  const { colors } = useTheme();
  const posterHeight = posterWidth / aspect.poster;

  return (
    <Link href={href} asChild>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`${title}${year ? `, ${year}` : ''}${mediaTypeLabel ? `, ${mediaTypeLabel}` : ''}`}
        style={({ pressed }) => [
          styles.row,
          { backgroundColor: pressed ? colors.surfaceRaised : 'transparent' },
        ]}
      >
        {posterUrl ? (
          <Image
            source={{ uri: posterUrl }}
            style={[styles.poster, { width: posterWidth, height: posterHeight, backgroundColor: colors.surfaceRaised }]}
            contentFit="cover"
            transition={150}
          />
        ) : (
          <View
            style={[
              styles.poster,
              styles.posterFallback,
              { width: posterWidth, height: posterHeight, backgroundColor: colors.surfaceRaised, borderColor: colors.border },
            ]}
          >
            <Ionicons name="film-outline" size={20} color={colors.textMuted} />
          </View>
        )}
        <View style={styles.body}>
          <Text variant="headline" numberOfLines={1}>
            {title}
          </Text>
          <View style={styles.metaRow}>
            {year ? (
              <Text variant="footnote" color="muted">
                {year}
              </Text>
            ) : null}
            {mediaTypeLabel ? (
              <View style={[styles.typeBadge, { backgroundColor: colors.surfaceHigh }]}>
                <Text variant="micro" color="secondary">
                  {mediaTypeLabel.toUpperCase()}
                </Text>
              </View>
            ) : null}
          </View>
          {overview ? (
            <Text variant="footnote" color="secondary" numberOfLines={2}>
              {overview}
            </Text>
          ) : null}
        </View>
        {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.sm,
  },
  poster: {
    borderRadius: radius.xs,
  },
  posterFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  body: {
    flex: 1,
    gap: 3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  typeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  trailing: {
    marginLeft: spacing.xs,
  },
});

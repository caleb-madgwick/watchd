import { Ionicons } from '@expo/vector-icons';
import { type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { DvdCase } from './DvdCase';
import { LinkPressable } from '@/components/primitives/LinkPressable';
import { Text } from '@/components/primitives/Text';
import { useTheme } from '@/theme/ThemeContext';
import { spacing } from '@/theme/tokens';

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

/** A DVD case on the shelf — hover/press picks it up. The core discovery unit. */
export function PosterCard({ title, posterUrl, year, href, width, rating, subtitle }: PosterCardProps) {
  const { colors } = useTheme();
  const [lifted, setLifted] = useState(false);
  const [grabbed, setGrabbed] = useState(false);

  return (
    <LinkPressable
      href={href}
      accessibilityLabel={`${title}${year ? `, ${year}` : ''}`}
      onHoverIn={() => setLifted(true)}
      onHoverOut={() => setLifted(false)}
      onPressIn={() => setGrabbed(true)}
      onPressOut={() => setGrabbed(false)}
      style={{ width }}
    >
      <DvdCase posterUrl={posterUrl} title={title} width={width} lifted={lifted} pressed={grabbed} />
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
    </LinkPressable>
  );
}

const styles = StyleSheet.create({
  meta: {
    marginTop: spacing.sm + 2,
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

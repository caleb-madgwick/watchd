import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { LinkPressable } from '@/components/primitives/LinkPressable';
import { Text } from '@/components/primitives/Text';
import type { ListSummary } from '@/features/lists/hooks';
import { useTheme } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme/tokens';

/** List row with a fanned poster preview. */
export function ListCard({ list }: { list: ListSummary }) {
  const { colors } = useTheme();

  return (
    <LinkPressable
      href={`/list/${list.id}`}
      accessibilityLabel={`${list.name}, ${list.itemCount} titles${list.visibility === 'private' ? ', private' : ''}`}
      style={({ pressed, hovered }) => [
        styles.card,
        {
          backgroundColor: pressed || hovered ? colors.surfaceHigh : colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
        <View style={styles.fan}>
          {list.previewPosters.length > 0 ? (
            list.previewPosters.map((url, index) => (
              <Image
                key={url}
                source={{ uri: url }}
                style={[
                  styles.fanPoster,
                  {
                    left: index * 16,
                    zIndex: 4 - index,
                    backgroundColor: colors.surfaceRaised,
                    borderColor: colors.bg,
                  },
                ]}
                contentFit="cover"
              />
            ))
          ) : (
            <View style={[styles.fanPoster, styles.fanEmpty, { backgroundColor: colors.surfaceRaised }]}>
              <Ionicons name="albums-outline" size={18} color={colors.textMuted} />
            </View>
          )}
        </View>
        <View style={styles.body}>
          <View style={styles.nameRow}>
            <Text variant="headline" numberOfLines={1} style={styles.name}>
              {list.name}
            </Text>
            {list.visibility === 'private' ? (
              <Ionicons name="lock-closed" size={13} color={colors.textMuted} />
            ) : null}
          </View>
          {list.description ? (
            <Text variant="footnote" color="secondary" numberOfLines={1}>
              {list.description}
            </Text>
          ) : null}
          <Text variant="caption" color="muted">
            {list.itemCount} title{list.itemCount === 1 ? '' : 's'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </LinkPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  fan: {
    width: 40 + 3 * 16,
    height: 60,
  },
  fanPoster: {
    position: 'absolute',
    width: 40,
    height: 60,
    borderRadius: 6,
    borderWidth: 1.5,
  },
  fanEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    left: 0,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  name: {
    flexShrink: 1,
  },
});

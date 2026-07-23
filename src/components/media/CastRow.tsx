import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { LinkPressable } from '@/components/primitives/LinkPressable';
import { ReelScroller } from '@/components/primitives/ReelScroller';
import { Text } from '@/components/primitives/Text';
import { useTheme } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme/tokens';
import type { CastMember } from '@/types/domain';

const PHOTO_SIZE = 84;

export function CastRow({ cast }: { cast: CastMember[] }) {
  const { colors } = useTheme();
  if (cast.length === 0) return null;

  return (
    <ReelScroller contentContainerStyle={styles.row} paddleCenter={PHOTO_SIZE / 2}>
      {cast.map((member) => (
        <LinkPressable
          key={member.id}
          href={`/person/${member.id}`}
          accessibilityLabel={`${member.name}${member.character ? ` as ${member.character}` : ''}`}
          style={({ pressed }) => [styles.card, { opacity: pressed ? 0.8 : 1 }]}
        >
          {member.profileUrl ? (
            <Image
              source={{ uri: member.profileUrl }}
              style={[styles.photo, { backgroundColor: colors.surfaceRaised }]}
              contentFit="cover"
              transition={150}
            />
          ) : (
            <View style={[styles.photo, styles.photoFallback, { backgroundColor: colors.surfaceRaised }]}>
              <Text variant="title3" color="muted">
                {member.name[0]}
              </Text>
            </View>
          )}
          <Text variant="caption" numberOfLines={1} style={styles.name}>
            {member.name}
          </Text>
          {member.character ? (
            <Text variant="caption" color="muted" numberOfLines={1} style={styles.name}>
              {member.character}
            </Text>
          ) : null}
        </LinkPressable>
      ))}
    </ReelScroller>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  card: {
    width: PHOTO_SIZE,
  },
  photo: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: radius.full,
  },
  photoFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});

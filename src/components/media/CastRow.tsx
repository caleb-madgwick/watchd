import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/primitives/Text';
import { useTheme } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme/tokens';
import type { CastMember } from '@/types/domain';

export function CastRow({ cast }: { cast: CastMember[] }) {
  const { colors } = useTheme();
  if (cast.length === 0) return null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {cast.map((member) => (
        <Link key={member.id} href={`/person/${member.id}`} asChild>
          <Pressable
            accessibilityRole="link"
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
          </Pressable>
        </Link>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  card: {
    width: 84,
  },
  photo: {
    width: 84,
    height: 84,
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

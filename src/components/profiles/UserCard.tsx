import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/primitives/Avatar';
import { LinkPressable } from '@/components/primitives/LinkPressable';
import { Text } from '@/components/primitives/Text';
import { useTheme } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme/tokens';

export interface UserCardProps {
  username: string;
  displayName: string;
  avatarUrl?: string;
  subtitle?: string;
  /** Right accessory, e.g. a follow button. */
  trailing?: React.ReactNode;
}

export function UserCard({ username, displayName, avatarUrl, subtitle, trailing }: UserCardProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.wrapper}>
      <LinkPressable
        href={`/user/${username}`}
        accessibilityLabel={`${displayName}, @${username}`}
        style={({ pressed, hovered }) => [
          styles.row,
          { backgroundColor: pressed || hovered ? colors.surfaceRaised : 'transparent' },
        ]}
      >
        <Avatar url={avatarUrl} name={displayName} size={44} />
        <View style={styles.body}>
          <Text variant="headline" numberOfLines={1}>
            {displayName}
          </Text>
          <Text variant="footnote" color="muted" numberOfLines={1}>
            @{username}
            {subtitle ? ` · ${subtitle}` : ''}
          </Text>
        </View>
      </LinkPressable>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: spacing.lg,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.sm,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  trailing: {
    marginLeft: spacing.sm,
  },
});

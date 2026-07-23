import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { IconButton } from '@/components/primitives/IconButton';
import { Text } from '@/components/primitives/Text';
import { useUnreadNotificationCount } from '@/features/notifications/hooks';
import { useTheme } from '@/theme/ThemeContext';
import { radius } from '@/theme/tokens';

/** Bell button with an unread-count badge; routes to the notification inbox. */
export function NotificationBell() {
  const { colors } = useTheme();
  const { data: count = 0 } = useUnreadNotificationCount();

  return (
    <View>
      <IconButton
        icon="notifications-outline"
        accessibilityLabel={count > 0 ? `Notifications, ${count} unread` : 'Notifications'}
        onPress={() => router.push('/notifications')}
      />
      {count > 0 ? (
        <View
          pointerEvents="none"
          style={[styles.badge, { backgroundColor: colors.accent, borderColor: colors.bg }]}
        >
          <Text variant="micro" style={{ color: colors.onAccent, fontWeight: '700' }}>
            {count > 9 ? '9+' : count}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: radius.full,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

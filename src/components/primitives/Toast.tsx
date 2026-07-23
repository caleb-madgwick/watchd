import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from './Text';
import { useToastStore, type ToastItem } from '@/stores/toastStore';
import { useTheme } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme/tokens';

function ToastCard({ item }: { item: ToastItem }) {
  const { colors } = useTheme();
  const dismiss = useToastStore((s) => s.dismiss);

  const icon =
    item.type === 'success' ? 'checkmark-circle' : item.type === 'error' ? 'alert-circle' : 'information-circle';
  const iconColor =
    item.type === 'success' ? colors.success : item.type === 'error' ? colors.danger : colors.info;

  return (
    <Pressable
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      onPress={() => dismiss(item.id)}
      style={[styles.card, { backgroundColor: colors.surfaceHigh, borderColor: colors.border }]}
    >
      <Ionicons name={icon} size={18} color={iconColor} />
      <Text variant="subhead" style={styles.message} numberOfLines={2}>
        {item.message}
      </Text>
    </Pressable>
  );
}

/** Mount once at the root; renders the active toast stack above everything. */
export function ToastHost() {
  const toasts = useToastStore((s) => s.toasts);
  const insets = useSafeAreaInsets();

  if (toasts.length === 0) return null;

  return (
    <View pointerEvents="box-none" style={[styles.host, { top: insets.top + spacing.md }]}>
      {toasts.map((item) => (
        <ToastCard key={item.id} item={item} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: spacing.sm,
    zIndex: 1000,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: 420,
    marginHorizontal: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  message: {
    flexShrink: 1,
  },
});

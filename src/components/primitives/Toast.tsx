import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from './Text';
import { useToastStore, type ToastItem } from '@/stores/toastStore';
import { useTheme } from '@/theme/ThemeContext';
import { fontFamily, spacing } from '@/theme/tokens';
import { prefersReducedMotion } from '@/utils/motion';

/** Receipt ink + paper — deliberately the same in both themes. */
const PAPER = '#FBF8F0';
const INK = '#221A16';

function ToastCard({ item }: { item: ToastItem }) {
  const { colors } = useTheme();
  const dismiss = useToastStore((s) => s.dismiss);
  const [entrance] = useState(() => new Animated.Value(prefersReducedMotion() ? 1 : 0));

  useEffect(() => {
    if (prefersReducedMotion()) return;
    Animated.spring(entrance, { toValue: 1, useNativeDriver: true, speed: 16, bounciness: 6 }).start();
  }, [entrance]);

  const icon =
    item.type === 'success' ? 'checkmark-circle' : item.type === 'error' ? 'alert-circle' : 'information-circle';
  const iconColor =
    item.type === 'success' ? colors.success : item.type === 'error' ? colors.danger : colors.info;

  return (
    <Animated.View
      style={{
        opacity: entrance,
        transform: [
          { translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
        ],
      }}
    >
      <Pressable
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        onPress={() => dismiss(item.id)}
        style={styles.receipt}
      >
        <Text style={styles.kicker} numberOfLines={1}>
          ····· VIDEO CLUB ·····
        </Text>
        <View style={styles.body}>
          <Ionicons name={icon} size={17} color={iconColor} />
          <Text variant="subhead" style={styles.message} numberOfLines={2}>
            {item.message}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
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
  receipt: {
    backgroundColor: PAPER,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    maxWidth: 420,
    marginHorizontal: spacing.lg,
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(34,26,22,0.35)',
    boxShadow: '0px 8px 18px rgba(0,0,0,0.30)',
  },
  kicker: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 9,
    lineHeight: 13,
    letterSpacing: 2,
    color: 'rgba(34,26,22,0.55)',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  message: {
    flexShrink: 1,
    color: INK,
  },
});

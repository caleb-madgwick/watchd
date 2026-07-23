import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Text } from './Text';
import { useTheme } from '@/theme/ThemeContext';
import { fontFamily, spacing } from '@/theme/tokens';

export interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  /** Intrinsic-width chips in a horizontal scroller instead of an even split. */
  scrollable?: boolean;
}

/**
 * Tab row in the shelf-talker idiom: tilted block chips in display caps.
 * The selected tab is a solid accent block with a sticker shadow.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  scrollable = false,
}: SegmentedControlProps<T>) {
  const { colors } = useTheme();

  const chips = (
    <View accessibilityRole="tablist" style={styles.track}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityLabel={option.label}
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
              styles.segment,
              scrollable ? styles.segmentFixed : styles.segmentFlex,
              {
                backgroundColor: selected
                  ? colors.accent
                  : pressed || hovered
                    ? colors.surfaceRaised
                    : colors.surface,
                borderColor: selected ? 'rgba(0,0,0,0.35)' : colors.border,
                boxShadow: selected ? '2px 2px 0px rgba(0,0,0,0.30)' : undefined,
                transform: [
                  { skewX: '-6deg' },
                  ...(pressed && selected ? [{ translateX: 1 }, { translateY: 1 }] : []),
                ],
              },
            ]}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.label,
                { color: selected ? colors.onAccent : colors.textSecondary },
              ]}
            >
              {option.label.toUpperCase()}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  if (scrollable) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {chips}
      </ScrollView>
    );
  }
  return chips;
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  segment: {
    height: 38,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentFlex: {
    flex: 1,
    paddingHorizontal: spacing.sm,
  },
  segmentFixed: {
    paddingHorizontal: spacing.lg,
  },
  label: {
    fontFamily: fontFamily.display,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 1,
  },
});

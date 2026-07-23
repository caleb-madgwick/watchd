import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from './Text';
import { useTheme } from '@/theme/ThemeContext';
import { spacing } from '@/theme/tokens';

/** Clamp any number to the valid rating scale: 0.5–5 in half steps (0 = cleared). */
export function clampRating(value: number): number {
  if (value <= 0) return 0;
  const half = Math.round(value * 2) / 2;
  return Math.min(5, Math.max(0.5, half));
}

function StarRow({ value, size, color, emptyColor }: { value: number; size: number; color: string; emptyColor: string }) {
  return (
    <View style={styles.row} pointerEvents="none">
      {[1, 2, 3, 4, 5].map((position) => {
        const name =
          value >= position ? 'star' : value >= position - 0.5 ? 'star-half' : 'star-outline';
        return (
          <Ionicons
            key={position}
            name={name}
            size={size}
            color={name === 'star-outline' ? emptyColor : color}
          />
        );
      })}
    </View>
  );
}

export interface RatingStarsProps {
  /** 0 (unrated) to 5 in half steps. */
  value: number;
  size?: number;
}

/** Read-only star display. */
export function RatingStars({ value, size = 14 }: RatingStarsProps) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityLabel={value > 0 ? `Rated ${value} out of 5 stars` : 'Not rated'}
      accessible
    >
      <StarRow value={value} size={size} color={colors.star} emptyColor={colors.borderStrong} />
    </View>
  );
}

export interface RatingInputProps {
  value: number;
  onChange: (value: number) => void;
  size?: number;
  disabled?: boolean;
}

/**
 * Interactive half-star rating input.
 * Each star is two discrete tap zones (left = half, right = full), so it
 * works identically with touch, mouse, keyboard and screen readers —
 * react-native-web provides no tap coordinates, so zones, not geometry.
 * Tapping the current value again clears the rating.
 */
export function RatingInput({ value, onChange, size = 34, disabled }: RatingInputProps) {
  const { colors } = useTheme();

  const select = (next: number) => {
    if (disabled) return;
    onChange(next === value ? 0 : next);
  };

  return (
    <View style={[styles.inputWrap, { opacity: disabled ? 0.5 : 1 }]}>
      <View style={styles.row}>
        {[1, 2, 3, 4, 5].map((position) => {
          const name =
            value >= position ? 'star' : value >= position - 0.5 ? 'star-half' : 'star-outline';
          return (
            <View key={position} style={{ width: size + spacing.xs, height: size }}>
              <Ionicons
                name={name}
                size={size}
                color={name === 'star-outline' ? colors.borderStrong : colors.star}
              />
              <View style={[StyleSheet.absoluteFill, styles.zoneRow]}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Rate ${position - 0.5} stars`}
                  accessibilityState={{ selected: value === position - 0.5, disabled: disabled ?? false }}
                  disabled={disabled}
                  onPress={() => select(position - 0.5)}
                  hitSlop={{ top: 10, bottom: 10 }}
                  style={styles.zone}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Rate ${position} star${position === 1 ? '' : 's'}`}
                  accessibilityState={{ selected: value === position, disabled: disabled ?? false }}
                  disabled={disabled}
                  onPress={() => select(position)}
                  hitSlop={{ top: 10, bottom: 10 }}
                  style={styles.zone}
                />
              </View>
            </View>
          );
        })}
      </View>
      <Text
        variant="caption"
        color={value > 0 ? 'accent' : 'muted'}
        accessibilityLiveRegion="polite"
      >
        {value > 0 ? `${value} / 5` : 'Tap to rate'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.xxs,
  },
  inputWrap: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  zoneRow: {
    flexDirection: 'row',
  },
  zone: {
    flex: 1,
    height: '100%',
  },
});

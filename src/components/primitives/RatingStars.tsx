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
 * Tap or drag across the stars; tap the current value again to clear.
 * Screen readers get an adjustable control with increment/decrement.
 */
export function RatingInput({ value, onChange, size = 34, disabled }: RatingInputProps) {
  const { colors } = useTheme();
  const gap = spacing.xs;
  const rowWidth = size * 5 + gap * 4;

  const valueFromX = (x: number) => {
    if (rowWidth <= 0) return 0;
    const ratio = Math.min(1, Math.max(0, x / rowWidth));
    return clampRating(Math.ceil(ratio * 10) / 2);
  };

  const handlePress = (x: number) => {
    if (disabled) return;
    const next = valueFromX(x);
    // Tapping the same value clears the rating.
    onChange(next === value ? 0 : next);
  };

  return (
    <View style={styles.inputWrap}>
      <Pressable
        accessibilityRole="adjustable"
        accessibilityLabel="Star rating"
        accessibilityValue={{ text: value > 0 ? `${value} of 5 stars` : 'Not rated' }}
        accessibilityActions={[
          { name: 'increment', label: 'Increase rating' },
          { name: 'decrement', label: 'Decrease rating' },
        ]}
        onAccessibilityAction={(event) => {
          if (disabled) return;
          if (event.nativeEvent.actionName === 'increment') onChange(clampRating(value + 0.5));
          if (event.nativeEvent.actionName === 'decrement') onChange(value <= 0.5 ? 0 : clampRating(value - 0.5));
        }}
        disabled={disabled}
        onPress={(e) => handlePress(e.nativeEvent.locationX)}
        style={[styles.pressable, { width: rowWidth, opacity: disabled ? 0.5 : 1 }]}
        hitSlop={{ top: 10, bottom: 10, left: 4, right: 4 }}
      >
        <View style={[styles.row, { gap }]} pointerEvents="none">
          {[1, 2, 3, 4, 5].map((position) => {
            const name =
              value >= position ? 'star' : value >= position - 0.5 ? 'star-half' : 'star-outline';
            return (
              <Ionicons
                key={position}
                name={name}
                size={size}
                color={name === 'star-outline' ? colors.borderStrong : colors.star}
              />
            );
          })}
        </View>
      </Pressable>
      <Text variant="caption" color={value > 0 ? 'accent' : 'muted'}>
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
  pressable: {
    paddingVertical: spacing.xs,
  },
});

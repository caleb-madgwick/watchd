import { Ionicons } from '@expo/vector-icons';
import { forwardRef } from 'react';
import {
  Pressable,
  TextInput as RNTextInput,
  StyleSheet,
  View,
  type TextInputProps,
} from 'react-native';

import { useTheme } from '@/theme/ThemeContext';
import { fontFamily, minTouchTarget, radius, spacing } from '@/theme/tokens';

export interface SearchInputProps extends TextInputProps {
  onClear?: () => void;
}

export const SearchInput = forwardRef<RNTextInput, SearchInputProps>(function SearchInput(
  { value, onClear, style, ...rest },
  ref,
) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Ionicons name="search" size={18} color={colors.textMuted} />
      <RNTextInput
        ref={ref}
        accessibilityRole="search"
        accessibilityLabel={rest.placeholder ?? 'Search'}
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        value={value}
        {...rest}
        style={[styles.input, { color: colors.text }, style]}
      />
      {value && onClear ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          onPress={onClear}
          hitSlop={8}
          style={styles.clear}
        >
          <Ionicons name="close-circle" size={18} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    height: minTouchTarget + 2,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: fontFamily.body,
    height: '100%',
  },
  clear: {
    padding: spacing.xxs,
  },
});

import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { contentWidth, spacing } from '@/theme/tokens';

export interface ResponsiveContainerProps {
  children: React.ReactNode;
  /** Max content width preset. */
  width?: keyof typeof contentWidth;
  /** Horizontal gutter; defaults to lg (16). */
  gutter?: number;
  style?: StyleProp<ViewStyle>;
}

/** Centers content and constrains reading width on large screens. */
export function ResponsiveContainer({
  children,
  width = 'page',
  gutter = spacing.lg,
  style,
}: ResponsiveContainerProps) {
  return (
    <View
      style={[styles.container, { maxWidth: contentWidth[width], paddingHorizontal: gutter }, style]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignSelf: 'center',
  },
});

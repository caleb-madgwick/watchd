import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeContext';

export interface ScreenProps {
  children: React.ReactNode;
  /** Apply top safe-area padding (off when a header/hero handles it). */
  padTop?: boolean;
  padBottom?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Full-bleed themed background wrapper for every route. */
export function Screen({ children, padTop = false, padBottom = false, style }: ScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: colors.bg,
          paddingTop: padTop ? insets.top : 0,
          paddingBottom: padBottom ? insets.bottom : 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

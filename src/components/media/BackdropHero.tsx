import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/ThemeContext';

export interface BackdropHeroProps {
  backdropUrl?: string;
  height: number;
  children?: React.ReactNode;
}

/** Cinematic backdrop with a gradient fade into the page background. */
export function BackdropHero({ backdropUrl, height, children }: BackdropHeroProps) {
  const { colors } = useTheme();

  return (
    <View style={{ height, backgroundColor: colors.surface }}>
      {backdropUrl ? (
        <Image
          source={{ uri: backdropUrl }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={300}
          accessibilityLabel="Backdrop artwork"
        />
      ) : null}
      <LinearGradient
        colors={colors.heroScrim}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
      {children ? <View style={styles.content}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'flex-end',
  },
});

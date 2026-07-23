import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useTheme } from '@/theme/ThemeContext';
import { spacing } from '@/theme/tokens';

export interface ReelScrollerProps {
  children: React.ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Vertical centre of the paddle buttons, from the reel's top. */
  paddleCenter: number;
  /** Pixels scrolled per paddle press; defaults to most of the viewport. */
  step?: number;
}

/**
 * Horizontal reel with the shared row UX: edge fades into the page
 * background, and page-at-a-time paddle buttons on wide screens.
 */
export function ReelScroller({ children, contentContainerStyle, paddleCenter, step }: ReelScrollerProps) {
  const { colors } = useTheme();
  const { isWide } = useBreakpoint();
  const scrollRef = useRef<ScrollView>(null);
  const scrollXRef = useRef(0);
  const layoutWidthRef = useRef(0);
  const contentWidthRef = useRef(0);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const updatePaddles = () => {
    setCanLeft(scrollXRef.current > 8);
    setCanRight(scrollXRef.current + layoutWidthRef.current < contentWidthRef.current - 8);
  };

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollXRef.current = event.nativeEvent.contentOffset.x;
    updatePaddles();
  };

  const page = (direction: 1 | -1) => {
    const delta = step ?? Math.max(layoutWidthRef.current - 120, 240);
    const next = Math.max(0, scrollXRef.current + direction * delta);
    scrollRef.current?.scrollTo({ x: next, animated: true });
  };

  const paddleTop = paddleCenter - 22;

  return (
    <View>
      <ScrollView
        ref={scrollRef}
        horizontal
        onScroll={onScroll}
        scrollEventThrottle={32}
        onLayout={(event) => {
          layoutWidthRef.current = event.nativeEvent.layout.width;
          updatePaddles();
        }}
        onContentSizeChange={(width) => {
          contentWidthRef.current = width;
          updatePaddles();
        }}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={contentContainerStyle}
      >
        {children}
      </ScrollView>

      {canLeft ? (
        <LinearGradient
          colors={[colors.bg, 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[styles.edgeFade, { left: 0 }]}
          pointerEvents="none"
        />
      ) : null}
      {canRight ? (
        <LinearGradient
          colors={['transparent', colors.bg]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[styles.edgeFade, { right: 0 }]}
          pointerEvents="none"
        />
      ) : null}

      {isWide && canLeft ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Scroll left"
          onPress={() => page(-1)}
          style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
            styles.paddle,
            { left: spacing.sm, top: paddleTop },
            {
              backgroundColor: pressed || hovered ? colors.surfaceHigh : colors.surfaceRaised,
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
      ) : null}
      {isWide && canRight ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Scroll right"
          onPress={() => page(1)}
          style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
            styles.paddle,
            { right: spacing.sm, top: paddleTop },
            {
              backgroundColor: pressed || hovered ? colors.surfaceHigh : colors.surfaceRaised,
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons name="chevron-forward" size={22} color={colors.text} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  edgeFade: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 56,
    zIndex: 4,
  },
  paddle: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 6px 14px rgba(0,0,0,0.35)',
    zIndex: 5,
  },
});

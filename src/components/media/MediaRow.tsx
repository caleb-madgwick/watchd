import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, type Href } from 'expo-router';
import { useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { PosterCard } from './PosterCard';
import { ShelfTalker } from './ShelfRail';
import { PosterRowSkeleton } from '@/components/primitives/Skeleton';
import { SettleIn } from '@/components/primitives/SettleIn';
import { Text } from '@/components/primitives/Text';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useTheme } from '@/theme/ThemeContext';
import { aspect, spacing } from '@/theme/tokens';
import type { TitleSummary } from '@/types/domain';
import { titleHref } from '@/utils/titles';

export interface MediaRowProps {
  heading: string;
  titles: TitleSummary[] | undefined;
  loading?: boolean;
  seeAllHref?: Href;
  posterWidth?: number;
  emptyMessage?: string;
}

/** Edge paddle for wide screens — scrolls the row a page at a time. */
function Paddle({
  direction,
  top,
  onPress,
}: {
  direction: 'left' | 'right';
  top: number;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={direction === 'left' ? 'Scroll row left' : 'Scroll row right'}
      onPress={onPress}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.paddle,
        direction === 'left' ? styles.paddleLeft : styles.paddleRight,
        {
          top,
          backgroundColor: pressed || hovered ? colors.surfaceHigh : colors.surfaceRaised,
          borderColor: colors.border,
        },
      ]}
    >
      <Ionicons
        name={direction === 'left' ? 'chevron-back' : 'chevron-forward'}
        size={22}
        color={colors.text}
      />
    </Pressable>
  );
}

/** A shelf row of DVD cases with staggered settle-in and desktop paddles. */
export function MediaRow({
  heading,
  titles,
  loading = false,
  seeAllHref,
  posterWidth = 120,
  emptyMessage,
}: MediaRowProps) {
  const { colors } = useTheme();
  const { isWide } = useBreakpoint();
  const listRef = useRef<FlatList<TitleSummary>>(null);
  const scrollXRef = useRef(0);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const layoutWidthRef = useRef(0);
  const contentWidthRef = useRef(0);

  const caseHeight = posterWidth / aspect.poster;
  const paddleTop = spacing.lg + caseHeight / 2 - 22;

  const updatePaddles = () => {
    setCanLeft(scrollXRef.current > 8);
    setCanRight(scrollXRef.current + layoutWidthRef.current < contentWidthRef.current - 8);
  };

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollXRef.current = event.nativeEvent.contentOffset.x;
    updatePaddles();
  };

  const page = (direction: 1 | -1) => {
    const step = Math.max(layoutWidthRef.current - posterWidth, posterWidth * 2);
    const next = Math.max(0, scrollXRef.current + direction * step);
    listRef.current?.scrollToOffset({ offset: next, animated: true });
  };

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <ShelfTalker label={heading} />
        {seeAllHref ? (
          <Link href={seeAllHref} asChild>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={`See all: ${heading}`}
              style={styles.seeAll}
              hitSlop={8}
            >
              <Text variant="subhead" color="accent">
                See all
              </Text>
              <Ionicons name="chevron-forward" size={14} color={colors.accent} />
            </Pressable>
          </Link>
        ) : null}
      </View>

      {loading ? (
        <PosterRowSkeleton posterWidth={posterWidth} />
      ) : !titles || titles.length === 0 ? (
        emptyMessage ? (
          <Text variant="callout" color="muted" style={styles.empty}>
            {emptyMessage}
          </Text>
        ) : null
      ) : (
        <View>
          <FlatList
            ref={listRef}
            horizontal
            data={titles}
            keyExtractor={(item) => `${item.mediaType}-${item.tmdbId}`}
            renderItem={({ item, index }) => (
              <SettleIn index={index}>
                <PosterCard
                  title={item.title}
                  posterUrl={item.posterUrl}
                  year={item.releaseYear}
                  rating={item.tmdbRating ? item.tmdbRating / 2 : undefined}
                  href={titleHref(item.mediaType, item.tmdbId)}
                  width={posterWidth}
                  summary={item}
                />
              </SettleIn>
            )}
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
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={{ width: spacing.md }} />}
            showsHorizontalScrollIndicator={false}
          />
          {/* Edge fades: rows dissolve into the page instead of hard-cutting */}
          {canLeft ? (
            <LinearGradient
              colors={[colors.bg, 'transparent']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={[styles.edgeFade, styles.edgeFadeLeft]}
              pointerEvents="none"
            />
          ) : null}
          {canRight ? (
            <LinearGradient
              colors={['transparent', colors.bg]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={[styles.edgeFade, styles.edgeFadeRight]}
              pointerEvents="none"
            />
          ) : null}
          {isWide && canLeft ? <Paddle direction="left" top={paddleTop} onPress={() => page(-1)} /> : null}
          {isWide && canRight ? <Paddle direction="right" top={paddleTop} onPress={() => page(1)} /> : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  seeAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minHeight: 32,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    // Headroom so the DVD-case pickup animation isn't clipped by the scroller.
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  empty: {
    paddingHorizontal: spacing.lg,
  },
  edgeFade: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 56,
    zIndex: 4,
  },
  edgeFadeLeft: {
    left: 0,
  },
  edgeFadeRight: {
    right: 0,
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
  paddleLeft: {
    left: spacing.sm,
  },
  paddleRight: {
    right: spacing.sm,
  },
});

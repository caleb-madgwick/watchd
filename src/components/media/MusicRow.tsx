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

import { MusicCard } from './MusicCard';
import { ShelfTalker } from './ShelfRail';
import { PosterRowSkeleton } from '@/components/primitives/Skeleton';
import { SettleIn } from '@/components/primitives/SettleIn';
import { Text } from '@/components/primitives/Text';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useTheme } from '@/theme/ThemeContext';
import { spacing } from '@/theme/tokens';
import type { AlbumSummary, SongSummary } from '@/types/domain';

type MusicRowItem = AlbumSummary | SongSummary;

export interface MusicRowProps {
  heading: string;
  items: MusicRowItem[] | undefined;
  loading?: boolean;
  seeAllHref?: Href;
  posterWidth?: number;
  emptyMessage?: string;
}

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
      <Ionicons name={direction === 'left' ? 'chevron-back' : 'chevron-forward'} size={22} color={colors.text} />
    </Pressable>
  );
}

/** A shelf row of records (square sleeves) — the music sibling of MediaRow. */
export function MusicRow({
  heading,
  items,
  loading = false,
  seeAllHref,
  posterWidth = 132,
  emptyMessage,
}: MusicRowProps) {
  const { colors } = useTheme();
  const { isWide } = useBreakpoint();
  const listRef = useRef<FlatList<MusicRowItem>>(null);
  const scrollXRef = useRef(0);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const layoutWidthRef = useRef(0);
  const contentWidthRef = useRef(0);

  // Square sleeves: height ≈ width. The vinyl slides out to the right by up to
  // ~0.42× the sleeve width, so the gap must clear that to avoid overlapping the
  // next record.
  const gap = Math.round(posterWidth * 0.46);
  const paddleTop = spacing.lg + posterWidth / 2 - 22;

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
            <Pressable accessibilityRole="link" accessibilityLabel={`See all: ${heading}`} style={styles.seeAll} hitSlop={8}>
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
      ) : !items || items.length === 0 ? (
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
            data={items}
            keyExtractor={(item) => `${item.mediaType}-${item.musicBrainzId}`}
            renderItem={({ item, index }) => (
              <SettleIn index={index}>
                <MusicCard item={item} width={posterWidth} />
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
            contentContainerStyle={[styles.listContent, { paddingRight: spacing.lg + gap }]}
            ItemSeparatorComponent={() => <View style={{ width: gap }} />}
            showsHorizontalScrollIndicator={false}
          />
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

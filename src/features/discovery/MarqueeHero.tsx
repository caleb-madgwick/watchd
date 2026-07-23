import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { Animated, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { LinkPressable } from '@/components/primitives/LinkPressable';
import { Text } from '@/components/primitives/Text';
import { useTheme } from '@/theme/ThemeContext';
import { fontFamily, palette, radius, spacing } from '@/theme/tokens';
import type { TitleSummary } from '@/types/domain';
import { prefersReducedMotion } from '@/utils/motion';
import { mediaTypeLabel, titleHref } from '@/utils/titles';

const BULB_COUNT = 14;
const ROTATE_MS = 6000;
const STAGE_HEIGHT = 230;

/** One row of marquee bulbs; three phase groups chase each other. */
function BulbRow({ phases }: { phases: [Animated.Value, Animated.Value, Animated.Value] }) {
  return (
    <View style={styles.bulbRow} pointerEvents="none">
      {Array.from({ length: BULB_COUNT }).map((_, i) => (
        <Animated.View
          key={i}
          style={[
            styles.bulb,
            {
              opacity: phases[i % 3].interpolate({
                inputRange: [0, 1],
                outputRange: [0.25, 1],
              }),
            },
          ]}
        />
      ))}
    </View>
  );
}

function Slide({ title, width }: { title: TitleSummary; width: number }) {
  return (
    <LinkPressable
      href={titleHref(title.mediaType, title.tmdbId)}
      accessibilityLabel={`Now showing: ${title.title}`}
      style={({ pressed }) => ({
        width,
        height: STAGE_HEIGHT,
        opacity: pressed ? 0.92 : 1,
      })}
    >
      <View style={styles.slide}>
        {title.backdropUrl ? (
          <Image
            source={{ uri: title.backdropUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={250}
            accessibilityLabel={`${title.title} backdrop`}
          />
        ) : null}
        <LinearGradient
          colors={['rgba(5,6,8,0.05)', 'rgba(5,6,8,0.45)', 'rgba(5,6,8,0.92)']}
          locations={[0, 0.55, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.slideContent}>
          <View style={[styles.nowShowing, { backgroundColor: palette.marigold400 }]}>
            <Text
              style={{
                fontFamily: fontFamily.display,
                fontSize: 12,
                lineHeight: 17,
                color: '#2B1F04',
                letterSpacing: 2,
              }}
            >
              NOW SHOWING
            </Text>
          </View>
          <Text
            numberOfLines={2}
            style={{
              fontFamily: fontFamily.display,
              fontSize: 30,
              lineHeight: 38,
              color: palette.cream,
              letterSpacing: 0.6,
            }}
          >
            {title.title.toUpperCase()}
          </Text>
          <Text variant="subhead" style={{ color: 'rgba(244,241,234,0.8)' }}>
            {[title.releaseYear, mediaTypeLabel(title.mediaType), 'Tap for tonight’s pick']
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </View>
      </View>
    </LinkPressable>
  );
}

/**
 * "NOW SHOWING" marquee carousel: a swipeable paged slider of featured
 * titles in a bulb-lit frame. Auto-advances, pausing on hover and touch.
 */
export function MarqueeHero({ titles }: { titles: TitleSummary[] }) {
  const { scheme } = useTheme();
  const [index, setIndex] = useState(0);
  const [stageWidth, setStageWidth] = useState(0);
  const listRef = useRef<FlatList<TitleSummary>>(null);
  const pausedRef = useRef(false);
  const indexRef = useRef(0);
  indexRef.current = index;
  const [phases] = useState<[Animated.Value, Animated.Value, Animated.Value]>(() => [
    new Animated.Value(1),
    new Animated.Value(0.4),
    new Animated.Value(0.1),
  ]);

  // Chasing lights around the frame.
  useEffect(() => {
    if (prefersReducedMotion()) {
      phases.forEach((phase) => phase.setValue(1));
      return;
    }
    const loops = phases.map((phase, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 220),
          Animated.timing(phase, { toValue: 1, duration: 220, useNativeDriver: true }),
          Animated.timing(phase, { toValue: 0.15, duration: 440, useNativeDriver: true }),
        ]),
      ),
    );
    loops.forEach((loop) => loop.start());
    return () => loops.forEach((loop) => loop.stop());
  }, [phases]);

  const goTo = (next: number) => {
    if (titles.length === 0 || stageWidth === 0) return;
    const target = ((next % titles.length) + titles.length) % titles.length;
    listRef.current?.scrollToOffset({
      offset: target * stageWidth,
      animated: !prefersReducedMotion(),
    });
    setIndex(target);
  };

  const goToRef = useRef(goTo);
  useEffect(() => {
    goToRef.current = goTo;
  });

  // Auto-rotate; paused on hover/touch, off entirely under reduced motion.
  useEffect(() => {
    if (prefersReducedMotion() || titles.length < 2 || stageWidth === 0) return;
    const timer = setInterval(() => {
      if (!pausedRef.current) goToRef.current(indexRef.current + 1);
    }, ROTATE_MS);
    return () => clearInterval(timer);
  }, [titles.length, stageWidth]);

  if (titles.length === 0) return null;

  const frame = scheme === 'dark' ? '#241C15' : '#4A3423';

  return (
    <View style={styles.wrapper}>
      <View
        style={[styles.frame, { backgroundColor: frame }]}
        onPointerEnter={() => {
          pausedRef.current = true;
        }}
        onPointerLeave={() => {
          pausedRef.current = false;
        }}
      >
        <BulbRow phases={phases} />
        <View
          style={styles.stage}
          onLayout={(event) => setStageWidth(event.nativeEvent.layout.width)}
        >
          {stageWidth > 0 ? (
            <FlatList
              ref={listRef}
              data={titles}
              keyExtractor={(item) => `${item.mediaType}-${item.tmdbId}`}
              renderItem={({ item }) => <Slide title={item} width={stageWidth} />}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              getItemLayout={(_, i) => ({ length: stageWidth, offset: stageWidth * i, index: i })}
              onScrollBeginDrag={() => {
                pausedRef.current = true;
              }}
              onMomentumScrollEnd={(event) => {
                pausedRef.current = false;
                const newIndex = Math.round(event.nativeEvent.contentOffset.x / stageWidth);
                setIndex(Math.max(0, Math.min(newIndex, titles.length - 1)));
              }}
            />
          ) : null}

          {titles.length > 1 ? (
            <View style={styles.dots}>
              {titles.map((item, i) => (
                <Pressable
                  key={`${item.mediaType}-${item.tmdbId}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Show feature ${i + 1} of ${titles.length}: ${item.title}`}
                  accessibilityState={{ selected: i === index }}
                  onPress={() => goTo(i)}
                  hitSlop={8}
                  style={[
                    styles.dot,
                    {
                      backgroundColor: i === index ? palette.marigold400 : 'rgba(244,241,234,0.35)',
                      width: i === index ? 18 : 7,
                    },
                  ]}
                />
              ))}
            </View>
          ) : null}
        </View>
        <BulbRow phases={phases} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: spacing.lg,
  },
  frame: {
    borderRadius: radius.lg,
    padding: spacing.sm,
    gap: spacing.sm,
    boxShadow: '0px 10px 22px rgba(0,0,0,0.35)',
  },
  bulbRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    height: 12,
  },
  bulb: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: palette.marigold400,
    boxShadow: '0px 0px 6px rgba(245,178,26,0.8)',
  },
  stage: {
    height: STAGE_HEIGHT,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: '#0B0D10',
  },
  slide: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  slideContent: {
    padding: spacing.xl,
    paddingBottom: spacing['2xl'] + spacing.sm,
    gap: spacing.sm,
  },
  nowShowing: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 3,
    transform: [{ skewX: '-6deg' }],
  },
  dots: {
    position: 'absolute',
    bottom: spacing.md,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dot: {
    height: 7,
    borderRadius: 4,
  },
});

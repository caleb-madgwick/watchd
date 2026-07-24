import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Text } from '@/components/primitives/Text';
import { useBookTransition, type BookTransitionRequest } from '@/stores/bookTransitionStore';
import { aspect, fontFamily, palette } from '@/theme/tokens';
import { prefersReducedMotion } from '@/utils/motion';

const ENTER_MS = 620;
const MIN_HOLD_MS = 1100;
const EXIT_MS = 360;
const LEAF_COUNT = 6;
// One full recycle of the page stack. A SINGLE looping value drives every leaf
// (exactly like the DVD disc's single spin loop), so the riffle can never
// desync, snap, or stall — it turns continuously until the overlay unmounts.
const CYCLE_MS = 2200;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Build an interpolation from unsorted keyframe points. Guarantees a strictly
 * ascending inputRange (RN throws otherwise) by sorting + nudging duplicates.
 */
function interp(value: Animated.Value, points: { x: number; y: number | string }[]) {
  const sorted = [...points].sort((a, b) => a.x - b.x);
  const inputRange: number[] = [];
  const outputRange: (number | string)[] = [];
  let last = -1;
  for (const p of sorted) {
    let x = Math.min(1, Math.max(0, p.x));
    if (x <= last) x = last + 0.0001;
    inputRange.push(x);
    outputRange.push(p.y);
    last = x;
  }
  // Runtime accepts number[] or string[]; the union confuses the .d.ts only.
  return value.interpolate({ inputRange, outputRange: outputRange as number[] });
}

/** Faint ruled lines so a cream rectangle reads as a printed page. */
function PageLines({ color }: { color: string }) {
  return (
    <View style={styles.pageLines} pointerEvents="none">
      {Array.from({ length: 8 }).map((_, i) => (
        <View key={i} style={[styles.pageLine, { backgroundColor: color, width: i === 7 ? '52%' : '100%' }]} />
      ))}
    </View>
  );
}

/** An open book riffling its pages — the "loading" indicator (no cover). */
function OpeningBook({ pageWidth }: { pageWidth: number }) {
  const pageHeight = pageWidth / aspect.book;
  const [t] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (prefersReducedMotion()) return;
    // ONE looping value, mirroring the disc's single spin loop. Every leaf's
    // interpolation returns the SAME frame at t=0 and t=1, so the loop's reset
    // is seamless (no snap). `isInteraction: false` stops the router.push screen
    // transition from cancelling it — so it keeps riffling until this overlay
    // unmounts, i.e. until the book has actually loaded.
    const loop = Animated.loop(
      Animated.timing(t, {
        toValue: 1,
        duration: CYCLE_MS,
        easing: Easing.linear,
        useNativeDriver: true,
        isInteraction: false,
      }),
      { resetBeforeIteration: true },
    );
    loop.start();
    return () => loop.stop();
  }, [t]);

  // Each leaf is phase-offset around the cycle so the stack is always mid-riffle.
  // A leaf turns 0°→-180° across the spine, then recycles at t=w (its opacity
  // dips to hide that instant) — the sawtooth is expressed as keyframe points.
  const leaves = useMemo(
    () =>
      Array.from({ length: LEAF_COUNT }, (_, i) => {
        const o = (i + 0.5) / LEAF_COUNT; // phase (0..1)
        const w = 1 - o; // t at which this leaf recycles
        const rest = `${(-180 * o).toFixed(2)}deg`;
        const tEdge = o <= 0.5 ? 0.5 - o : 1.5 - o; // t where the leaf is edge-on
        return {
          key: i,
          tone: i % 2 === 0 ? palette.paper50 : palette.paper100,
          rotate: interp(t, [
            { x: 0, y: rest },
            { x: w - 0.002, y: '-180deg' },
            { x: w, y: '0deg' },
            { x: 1, y: rest },
          ]),
          opacity: interp(t, [
            { x: 0, y: 1 },
            { x: w - 0.06, y: 1 },
            { x: w - 0.03, y: 0 },
            { x: w + 0.03, y: 0 },
            { x: w + 0.06, y: 1 },
            { x: 1, y: 1 },
          ]),
          shade: interp(t, [
            { x: 0, y: 0.05 },
            { x: tEdge, y: 0.32 },
            { x: w - 0.002, y: 0.06 },
            { x: w, y: 0 },
            { x: 1, y: 0.05 },
          ]),
        };
      }),
    [t],
  );

  return (
    <View style={{ width: pageWidth * 2, height: pageHeight }}>
      {/* The open spread: two facing pages */}
      <View style={[styles.page, styles.leftPage, { width: pageWidth, height: pageHeight, backgroundColor: palette.paper100 }]}>
        <PageLines color={palette.paper300} />
      </View>
      <View style={[styles.page, styles.rightPage, { left: pageWidth, width: pageWidth, height: pageHeight, backgroundColor: palette.paper50 }]}>
        <PageLines color={palette.paper300} />
      </View>

      {/* Leaves turning across the spine (hinged on their left = centre edge). */}
      {leaves.map((leaf) => (
        <Animated.View
          key={leaf.key}
          style={[
            styles.page,
            styles.flipLeaf,
            {
              left: pageWidth,
              width: pageWidth,
              height: pageHeight,
              backgroundColor: leaf.tone,
              opacity: leaf.opacity,
              transform: [
                { perspective: 1600 },
                { translateX: -pageWidth / 2 },
                { rotateY: leaf.rotate },
                { translateX: pageWidth / 2 },
              ],
            },
          ]}
        >
          <PageLines color={palette.paper300} />
          {/* Darkens as the leaf turns edge-on, then lightens — gives it volume. */}
          <Animated.View
            style={[StyleSheet.absoluteFill, styles.leafShade, { opacity: leaf.shade }]}
            pointerEvents="none"
          />
        </Animated.View>
      ))}

      {/* Spine gutter shadow down the centre */}
      <LinearGradient
        colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0)']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[styles.gutter, { left: pageWidth - 10, height: pageHeight }]}
        pointerEvents="none"
      />
    </View>
  );
}

function Overlay({ request, onDone }: { request: BookTransitionRequest; onDone: () => void }) {
  const { width: screenW, height: screenH } = useWindowDimensions();
  const [progress] = useState(() => new Animated.Value(0));
  const [exit] = useState(() => new Animated.Value(0));

  const pageWidth = Math.min(screenW * 0.3, 128);
  const originCenterX = request.origin.x + request.origin.width / 2;
  const originCenterY = request.origin.y + request.origin.height / 2;
  const deltaX = originCenterX - screenW / 2;
  const deltaY = originCenterY - screenH / 2;
  // Grow from the tapped card (≈ one closed page wide) into the open spread.
  const startScale = Math.max(0.08, request.origin.width / pageWidth);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (prefersReducedMotion()) {
        await request.ready;
        if (cancelled) return;
        router.push(request.href as never);
        onDone();
        return;
      }

      Animated.timing(progress, {
        toValue: 1,
        duration: ENTER_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();

      await Promise.all([request.ready, delay(MIN_HOLD_MS)]);
      if (cancelled) return;

      router.push(request.href as never);
      await delay(90);
      if (cancelled) return;

      Animated.timing(exit, {
        toValue: 1,
        duration: EXIT_MS,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }).start(() => {
        if (!cancelled) onDone();
      });
    };

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request.id]);

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        styles.overlay,
        { opacity: exit.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) },
      ]}
      pointerEvents="auto"
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          styles.scrim,
          { opacity: progress.interpolate({ inputRange: [0, 0.6], outputRange: [0, 0.9], extrapolate: 'clamp' }) },
        ]}
      />

      <View style={styles.center} pointerEvents="none">
        <Animated.View
          style={{
            transform: [
              { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [deltaX, 0] }) },
              { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [deltaY, 0] }) },
              {
                scale: Animated.multiply(
                  progress.interpolate({ inputRange: [0, 1], outputRange: [startScale, 1] }),
                  exit.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] }),
                ),
              },
            ],
          }}
        >
          <OpeningBook pageWidth={pageWidth} />
        </Animated.View>

        <Animated.View
          style={[
            styles.caption,
            { opacity: progress.interpolate({ inputRange: [0.5, 1], outputRange: [0, 1], extrapolate: 'clamp' }) },
          ]}
        >
          <Text
            style={{ fontFamily: fontFamily.display, fontSize: 13, lineHeight: 18, color: palette.marigold400, letterSpacing: 3 }}
          >
            NOW LOADING
          </Text>
          <Text
            numberOfLines={1}
            style={{ fontFamily: fontFamily.display, fontSize: 18, lineHeight: 25, color: palette.cream, letterSpacing: 1 }}
          >
            {request.book.title.toUpperCase()}
          </Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

/** Mount once at the root, above the navigator (sibling to DiscTransitionHost). */
export function BookTransitionHost() {
  const request = useBookTransition((s) => s.request);
  const clear = useBookTransition((s) => s.clear);

  if (!request) return null;
  return <Overlay key={request.id} request={request} onDone={clear} />;
}

const styles = StyleSheet.create({
  overlay: { zIndex: 900 },
  scrim: { backgroundColor: '#05060A' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  page: {
    position: 'absolute',
    top: 0,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.10)',
  },
  leftPage: { left: 0, borderTopLeftRadius: 5, borderBottomLeftRadius: 5 },
  rightPage: { borderTopRightRadius: 5, borderBottomRightRadius: 5 },
  flipLeaf: { borderTopRightRadius: 5, borderBottomRightRadius: 5 },
  leafShade: { backgroundColor: '#000000' },
  gutter: { position: 'absolute', top: 0, width: 20 },
  pageLines: {
    position: 'absolute',
    top: '15%',
    left: '13%',
    right: '11%',
    bottom: '15%',
    justifyContent: 'space-between',
  },
  pageLine: { height: 1.5, borderRadius: 1 },
  caption: {
    position: 'absolute',
    bottom: '14%',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 24,
  },
});

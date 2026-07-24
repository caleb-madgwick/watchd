import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Disc } from '@/components/media/Disc';
import { Record } from '@/components/media/Record';
import { Text } from '@/components/primitives/Text';
import { useDiscTransition, type DiscTransitionRequest } from '@/stores/discTransitionStore';
import { fontFamily, palette } from '@/theme/tokens';
import { prefersReducedMotion } from '@/utils/motion';

const ENTER_MS = 700;
const MIN_HOLD_MS = 780;
const EXIT_MS = 380;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * The "feed the disc into the player" choreography: the disc lifts out of the
 * tapped case, flies to centre screen while spinning up, holds until the
 * destination's data is prefetched, then the loaded title page is revealed.
 */
function Overlay({ request, onDone }: { request: DiscTransitionRequest; onDone: () => void }) {
  const { width: screenW, height: screenH } = useWindowDimensions();
  const [progress] = useState(() => new Animated.Value(0));
  // Starts at the angle the medium rests at in its case (24° for a DVD in an
  // open tray; ~0 for a record in its sleeve) so the hand-off is seamless.
  const [spin] = useState(() => new Animated.Value(request.variant === 'vinyl' ? 0 : 24 / 360));
  const [exit] = useState(() => new Animated.Value(0));

  const isVinyl = request.variant === 'vinyl';
  const discSize = Math.min(Math.min(screenW, screenH) * 0.55, 340);
  // origin is the tray disc's / record's rect — the overlay spawns over it.
  const originCenterX = request.origin.x + request.origin.width / 2;
  const originCenterY = request.origin.y + request.origin.height / 2;
  const deltaX = originCenterX - screenW / 2;
  const deltaY = originCenterY - screenH / 2;
  const startScale = Math.max(0.08, request.origin.width / discSize);

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

      // Fly in + spin up (spin keeps extending past 1 turn via extrapolation).
      Animated.timing(progress, {
        toValue: 1,
        duration: ENTER_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      Animated.timing(spin, {
        toValue: 2,
        duration: ENTER_MS + 100,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }).start(() => {
        Animated.loop(
          Animated.timing(spin, {
            toValue: 3,
            duration: 620,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          { resetBeforeIteration: true },
        ).start();
      });

      // Hold until data is warm (with a floor so the moment always lands).
      await Promise.all([request.ready, delay(MIN_HOLD_MS)]);
      if (cancelled) return;

      router.push(request.href as never);
      // Give the destination a beat to mount beneath the overlay.
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
          { opacity: progress.interpolate({ inputRange: [0, 0.6], outputRange: [0, 0.88], extrapolate: 'clamp' }) },
        ]}
      />

      <View style={styles.center} pointerEvents="none">
        <Animated.View
          style={{
            transform: [
              {
                translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [deltaX, 0] }),
              },
              {
                translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [deltaY, 0] }),
              },
              {
                scale: Animated.multiply(
                  progress.interpolate({ inputRange: [0, 1], outputRange: [startScale, 1] }),
                  exit.interpolate({ inputRange: [0, 1], outputRange: [1, 1.8] }),
                ),
              },
            ],
          }}
        >
          {isVinyl ? (
            <Record
              posterUrl={request.art}
              size={discSize}
              rotate={spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })}
              labelColor={palette.marigold400}
            />
          ) : (
            <Disc
              posterUrl={request.art}
              size={discSize}
              rotate={spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })}
            />
          )}
        </Animated.View>

        <Animated.View
          style={[
            styles.caption,
            { opacity: progress.interpolate({ inputRange: [0.5, 1], outputRange: [0, 1], extrapolate: 'clamp' }) },
          ]}
        >
          <Text
            style={{
              fontFamily: fontFamily.display,
              fontSize: 13,
              lineHeight: 18,
              color: palette.marigold400,
              letterSpacing: 3,
            }}
          >
            NOW LOADING
          </Text>
          <Text
            numberOfLines={1}
            style={{
              fontFamily: fontFamily.display,
              fontSize: 18,
              lineHeight: 25,
              color: palette.cream,
              letterSpacing: 1,
            }}
          >
            {request.label.toUpperCase()}
          </Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

/** Mount once at the root, above the navigator. */
export function DiscTransitionHost() {
  const request = useDiscTransition((s) => s.request);
  const clear = useDiscTransition((s) => s.clear);

  if (!request) return null;
  return <Overlay key={request.id} request={request} onDone={clear} />;
}

const styles = StyleSheet.create({
  overlay: {
    zIndex: 900,
  },
  scrim: {
    backgroundColor: '#05060A',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caption: {
    position: 'absolute',
    bottom: '14%',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 24,
  },
});

import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Animated, StyleSheet, View } from 'react-native';

export interface DiscProps {
  posterUrl?: string;
  size: number;
  /** Rotation transform value, e.g. an Animated interpolation to "…deg". */
  rotate: Animated.AnimatedInterpolation<string> | string;
}

/** A printed DVD: label art, foil sheens, data rings, star push-hub. */
export function Disc({ posterUrl, size, rotate }: DiscProps) {
  const hub = size * 0.26;
  const hole = size * 0.1;

  return (
    <Animated.View
      style={[
        styles.disc,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          transform: [{ rotate }],
        },
      ]}
      pointerEvents="none"
    >
      {posterUrl ? (
        <Image source={{ uri: posterUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <LinearGradient
          colors={['#B9C2CC', '#8E98A4', '#C9CFD6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      <LinearGradient
        colors={['rgba(255,255,255,0.40)', 'rgba(255,255,255,0)', 'rgba(140,240,255,0.18)']}
        start={{ x: 0, y: 0.1 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(255,150,220,0.14)', 'rgba(255,255,255,0)', 'rgba(160,255,190,0.12)']}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 0.9 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.dataRing, { inset: size * 0.045, borderRadius: size / 2 }]} />
      <View style={[styles.dataRing, { inset: size * 0.28, borderRadius: size / 2, opacity: 0.5 }]} />

      {/* Star push-hub */}
      <View
        style={[
          styles.hub,
          { width: hub, height: hub, borderRadius: hub / 2, top: (size - hub) / 2, left: (size - hub) / 2 },
        ]}
      >
        {[0, 45, 90, 135].map((deg) => (
          <View
            key={deg}
            style={[
              styles.hubSpoke,
              { width: hub * 0.82, height: Math.max(2, hub * 0.09), transform: [{ rotate: `${deg}deg` }] },
            ]}
          />
        ))}
        <View style={[styles.hole, { width: hole, height: hole, borderRadius: hole / 2 }]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  disc: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.30)',
  },
  dataRing: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  hub: {
    position: 'absolute',
    backgroundColor: 'rgba(20,22,27,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  hubSpoke: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 2,
  },
  hole: {
    backgroundColor: '#05060A',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
});

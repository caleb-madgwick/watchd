import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Animated, StyleSheet, View } from 'react-native';

export interface RecordProps {
  /** Cover art printed on the centre label. */
  posterUrl?: string;
  size: number;
  /** Rotation transform value, e.g. an Animated interpolation to "…deg". */
  rotate: Animated.AnimatedInterpolation<string> | string;
  labelColor?: string;
}

/**
 * A black vinyl LP: matte disc, concentric groove rings, a diagonal light
 * sheen, and a printed centre label (cover art) with a spindle hole. Sized to
 * sit inside a RecordSleeve and slide out on hover.
 */
export function Record({ posterUrl, size, rotate, labelColor = '#C4302B' }: RecordProps) {
  const label = size * 0.4;
  const hole = size * 0.045;
  // Groove rings step inward from the edge toward the label.
  const grooves = [0.055, 0.12, 0.19, 0.27, 0.35];

  return (
    <Animated.View
      style={[
        styles.disc,
        { width: size, height: size, borderRadius: size / 2, transform: [{ rotate }] },
      ]}
      pointerEvents="none"
    >
      {grooves.map((inset) => (
        <View
          key={inset}
          style={[
            styles.groove,
            { inset: size * inset, borderRadius: size / 2, borderWidth: Math.max(1, size * 0.004) },
          ]}
        />
      ))}

      {/* Raking light across the grooves */}
      <LinearGradient
        colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0)', 'rgba(255,255,255,0.10)']}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Centre label — cover art if present */}
      <View
        style={[
          styles.label,
          {
            width: label,
            height: label,
            borderRadius: label / 2,
            top: (size - label) / 2,
            left: (size - label) / 2,
            backgroundColor: labelColor,
          },
        ]}
      >
        {posterUrl ? (
          <Image source={{ uri: posterUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : null}
        <View style={[styles.hole, { width: hole, height: hole, borderRadius: hole / 2 }]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  disc: {
    overflow: 'hidden',
    backgroundColor: '#0B0C0F',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  groove: {
    position: 'absolute',
    borderColor: 'rgba(255,255,255,0.06)',
  },
  label: {
    position: 'absolute',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.35)',
  },
  hole: {
    backgroundColor: '#05060A',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
});

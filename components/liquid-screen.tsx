/**
 * OrganicBackground — green blob canvas (dark: black+green, light: white+green)
 * Replaces LiquidScreen. Drop-in: same props, same export name LiquidScreen.
 */
import { LinearGradient } from 'expo-linear-gradient';
import { type ReactNode, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { BlobColors } from '@/constants/theme';

interface LiquidScreenProps {
  children: ReactNode;
  style?: object;
}

export function LiquidScreen({ children, style }: LiquidScreenProps) {
  const { animationsEnabled } = useReduceMotion();
  const cs = useColorScheme() ?? 'dark';
  const blobs = BlobColors[cs];

  // Blob 1 — slow drift top-left
  const b1x = useSharedValue(0);
  const b1y = useSharedValue(0);
  // Blob 2 — counter-drift bottom-right
  const b2x = useSharedValue(0);
  const b2y = useSharedValue(0);
  // Blob 3 — gentle pulse center
  const b3s = useSharedValue(1);

  useEffect(() => {
    if (!animationsEnabled) return;

    b1x.value = withRepeat(
      withSequence(withTiming(35, { duration: 9000 }), withTiming(-25, { duration: 9000 }), withTiming(0, { duration: 9000 })),
      -1, true,
    );
    b1y.value = withRepeat(
      withSequence(withTiming(25, { duration: 11000 }), withTiming(-20, { duration: 11000 }), withTiming(0, { duration: 11000 })),
      -1, true,
    );
    b2x.value = withRepeat(
      withSequence(withTiming(-30, { duration: 10000 }), withTiming(20, { duration: 10000 }), withTiming(0, { duration: 10000 })),
      -1, true,
    );
    b2y.value = withRepeat(
      withSequence(withTiming(-20, { duration: 12000 }), withTiming(30, { duration: 12000 }), withTiming(0, { duration: 12000 })),
      -1, true,
    );
    b3s.value = withRepeat(
      withSequence(withTiming(1.15, { duration: 7000 }), withTiming(0.9, { duration: 7000 })),
      -1, true,
    );

    return () => {
      cancelAnimation(b1x); cancelAnimation(b1y);
      cancelAnimation(b2x); cancelAnimation(b2y);
      cancelAnimation(b3s);
    };
  }, [animationsEnabled]);

  const blob1Style = useAnimatedStyle(() => ({
    transform: [{ translateX: b1x.value }, { translateY: b1y.value }],
  }));
  const blob2Style = useAnimatedStyle(() => ({
    transform: [{ translateX: b2x.value }, { translateY: b2y.value }],
  }));
  const blob3Style = useAnimatedStyle(() => ({
    transform: [{ scale: b3s.value }],
  }));

  return (
    <View style={[styles.root, { backgroundColor: blobs.background }, style]}>
      {/* Blob 1 — top-left, large primary green */}
      <Animated.View style={[styles.blob1, blob1Style]} pointerEvents="none">
        <LinearGradient
          colors={blobs.blob1}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 1, y: 1 }}
        />
      </Animated.View>

      {/* Blob 2 — bottom-right, secondary green */}
      <Animated.View style={[styles.blob2, blob2Style]} pointerEvents="none">
        <LinearGradient
          colors={blobs.blob2}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 0, y: 0 }}
        />
      </Animated.View>

      {/* Blob 3 — center, vivid green accent, subtle */}
      <Animated.View style={[styles.blob3, blob3Style]} pointerEvents="none">
        <LinearGradient
          colors={blobs.blob3}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 1, y: 0 }}
        />
      </Animated.View>

      {/* Content */}
      <Animated.View
        style={styles.content}
        entering={animationsEnabled ? FadeIn.springify().damping(20).stiffness(130) : undefined}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  blob1: {
    position: 'absolute',
    top: -120,
    left: -80,
    width: 400,
    height: 400,
    borderRadius: 999,
    overflow: 'hidden',
  },
  blob2: {
    position: 'absolute',
    bottom: -100,
    right: -60,
    width: 360,
    height: 360,
    borderRadius: 999,
    overflow: 'hidden',
  },
  blob3: {
    position: 'absolute',
    top: '38%',
    left: '15%',
    width: 280,
    height: 280,
    borderRadius: 999,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
  },
});

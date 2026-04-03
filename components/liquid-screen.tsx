/**
 * LiquidScreen — shared screen wrapper
 * OLED background + slow-drifting radial orb + FadeIn mount animation
 * NO SafeAreaView — screens are edge-to-edge
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

interface LiquidScreenProps {
  children: ReactNode;
  style?: object;
}

export function LiquidScreen({ children, style }: LiquidScreenProps) {
  const { animationsEnabled } = useReduceMotion();
  const orbX = useSharedValue(0);
  const orbY = useSharedValue(0);

  useEffect(() => {
    if (!animationsEnabled) return;
    orbX.value = withRepeat(
      withSequence(
        withTiming(40,  { duration: 8000 }),
        withTiming(-30, { duration: 8000 }),
        withTiming(0,   { duration: 8000 }),
      ),
      -1,
      true,
    );
    orbY.value = withRepeat(
      withSequence(
        withTiming(30,  { duration: 10000 }),
        withTiming(-20, { duration: 10000 }),
        withTiming(0,   { duration: 10000 }),
      ),
      -1,
      true,
    );
    return () => {
      cancelAnimation(orbX);
      cancelAnimation(orbY);
    };
  }, [animationsEnabled]);

  const orbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: orbX.value }, { translateY: orbY.value }],
  }));

  return (
    <View style={[styles.root, style]}>
      {/* Slow-drifting radial orb — extremely subtle OLED depth */}
      <Animated.View style={[styles.orbWrap, orbStyle]} pointerEvents="none">
        <LinearGradient
          colors={['rgba(255,255,255,0.012)', 'rgba(255,255,255,0.000)']}
          style={styles.orb}
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 1, y: 1 }}
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
    backgroundColor: '#08080D',
  },
  orbWrap: {
    position: 'absolute',
    top: '10%',
    left: '20%',
    width: 320,
    height: 320,
  },
  orb: {
    flex: 1,
    borderRadius: 999,
  },
  content: {
    flex: 1,
  },
});

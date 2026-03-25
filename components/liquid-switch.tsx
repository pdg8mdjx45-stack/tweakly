/**
 * LiquidSwitch — iOS liquid glass-style toggle switch with spring animation
 */

import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { Palette } from '@/constants/theme';

const TRACK_W = 51;
const TRACK_H = 31;
const THUMB_SIZE = 27;
const THUMB_TRAVEL = TRACK_W - THUMB_SIZE - 4; // 2px padding each side

const SPRING = { damping: 18, stiffness: 300, mass: 0.6 } as const;

interface Props {
  value: boolean;
  onChange: (next: boolean) => void;
  isDark: boolean;
}

export function LiquidSwitch({ value, onChange, isDark }: Props) {
  const progress = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(value ? 1 : 0, SPRING);
  }, [value]);

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      isDark
        ? ['rgba(60,60,70,0.50)', Palette.primary]
        : ['rgba(120,120,128,0.28)', Palette.primary],
    ),
  }));

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * THUMB_TRAVEL }],
  }));

  return (
    <Pressable onPress={() => onChange(!value)} accessibilityRole="switch" accessibilityState={{ checked: value }}>
      <Animated.View style={[styles.track, trackStyle]}>
        <Animated.View
          style={[
            styles.thumb,
            isDark ? styles.thumbDark : styles.thumbLight,
            thumbStyle,
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: TRACK_W,
    height: TRACK_H,
    borderRadius: TRACK_H / 2,
    padding: 2,
    justifyContent: 'center',
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
  },
  thumbLight: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  thumbDark: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
});

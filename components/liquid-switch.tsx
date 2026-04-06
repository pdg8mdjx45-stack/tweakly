import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
  withSpring,
} from 'react-native-reanimated';

const TRACK_W = 51;
const TRACK_H = 31;
const PAD = 3;
const THUMB = TRACK_H - PAD * 2;
const OFF_X = PAD;
const ON_X = TRACK_W - THUMB - PAD;

interface LiquidSwitchProps {
  value: boolean;
  onChange: (v: boolean) => void;
  isDark: boolean;
  disabled?: boolean;
}

export function LiquidSwitch({ value, onChange, isDark, disabled }: LiquidSwitchProps) {
  const progress = useDerivedValue(() =>
    withSpring(value ? 1 : 0, { damping: 18, stiffness: 260, mass: 0.9 })
  );

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [isDark ? 'rgba(72,72,74,0.90)' : 'rgba(120,120,128,0.24)', 'rgb(52,199,89)']
    ),
    opacity: disabled ? 0.45 : 1,
  }));

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: OFF_X + (ON_X - OFF_X) * progress.value }],
  }));

  return (
    <Pressable
      onPress={() => {
        if (!disabled) onChange(!value);
      }}
      hitSlop={8}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
    >
      <Animated.View style={[styles.track, trackStyle]}>
        <Animated.View style={[styles.thumbWrap, thumbStyle]}>
          <View style={styles.thumb} />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: TRACK_W,
    height: TRACK_H,
    borderRadius: TRACK_H / 2,
    justifyContent: 'center',
  },
  thumbWrap: {
    position: 'absolute',
    top: PAD,
    left: 0,
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.16,
    shadowRadius: 2,
    elevation: 2,
  },
});

/**
 * ScrollAwareHeader — blur + title that fades in as the user scrolls down.
 * Position it absolutely at the top of the screen. BackButton renders on top (zIndex 100).
 */
import { BlurView } from 'expo-blur';
import { Platform, StyleSheet } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

interface ScrollAwareHeaderProps {
  title: string;
  scrollY: SharedValue<number>;
  insetTop: number;
  isDark?: boolean;
}

export function ScrollAwareHeader({ title, scrollY, insetTop, isDark = false }: ScrollAwareHeaderProps) {
  const FADE_START = 1;
  const FADE_END = 40;

  const containerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [FADE_START, FADE_END], [0, 1], 'clamp'),
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [FADE_START, FADE_END], [0, 1], 'clamp'),
    transform: [
      {
        translateY: interpolate(scrollY.value, [FADE_START, FADE_END], [4, 0], 'clamp'),
      },
    ],
  }));

  const height = insetTop + 52;

  return (
    <Animated.View
      style={[styles.container, { height }, containerStyle]}
      pointerEvents="none"
    >
      {Platform.OS === 'ios' && (
        <BlurView
          intensity={24}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
      )}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: isDark
              ? 'rgba(10,10,10,0.75)'
              : 'rgba(255,255,255,0.75)',
          },
        ]}
      />
      <Animated.Text
        style={[
          styles.title,
          { color: isDark ? '#FFFFFF' : '#0A0A0A', marginTop: insetTop },
          titleStyle,
        ]}
        numberOfLines={1}
      >
        {title}
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 10,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
});

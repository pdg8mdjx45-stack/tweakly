/**
 * LiquidGlassTabBar — iOS-style floating pill tab bar with liquid glass effect
 *
 * Design: floating pill above content, frosted glass background,
 * spring-animated sliding indicator, icon scale feedback on press.
 */

import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import {
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Palette } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SPRING = { damping: 22, stiffness: 320, mass: 0.7 } as const;
const FAST_SPRING = { damping: 18, stiffness: 500, mass: 0.5 } as const;

const TAB_HEIGHT = 62;
const BOTTOM_OFFSET = Platform.OS === 'ios' ? 28 : 16;
const H_MARGIN = 20;
const INDICATOR_INSET = 6;

const TAB_ICONS: Record<string, { filled: string; outline: string; label: string }> = {
  index:   { filled: 'house.fill',       outline: 'house',       label: 'Home'         },
  nieuws:  { filled: 'newspaper.fill',   outline: 'newspaper',   label: 'Nieuws'       },
  reviews: { filled: 'star.fill',        outline: 'star',        label: 'Reviews'      },
  prijzen: { filled: 'tag.fill',         outline: 'tag',         label: 'Prijzen'      },
  profiel: { filled: 'gearshape.fill',   outline: 'gearshape',   label: 'Instellingen' },
};

// ─── Individual tab item with its own spring animation ───────────────────────

interface TabItemProps {
  route: BottomTabBarProps['state']['routes'][number];
  index: number;
  isFocused: boolean;
  tabWidth: number;
  isDark: boolean;
  onPress: () => void;
}

function TabItem({ route, isFocused, tabWidth, isDark, onPress }: TabItemProps) {
  const meta = TAB_ICONS[route.name];
  if (!meta) return null;

  const scale = useSharedValue(1);
  const iconOpacity = useSharedValue(isFocused ? 1 : 0.5);

  useEffect(() => {
    iconOpacity.value = withTiming(isFocused ? 1 : 0.5, { duration: 220 });
  }, [isFocused]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: iconOpacity.value,
  }));

  const handlePress = () => {
    if (process.env.EXPO_OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    scale.value = withSequence(
      withSpring(0.72, FAST_SPRING),
      withSpring(1.0, SPRING),
    );
    onPress();
  };

  const color = isFocused
    ? isDark ? '#FFFFFF' : Palette.primary
    : isDark ? '#888898' : '#9A9AA8';

  return (
    <Pressable
      onPress={handlePress}
      style={[styles.tab, { width: tabWidth }]}
      accessibilityRole="button"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={meta.label}
    >
      <Animated.View style={[styles.tabInner, animStyle]}>
        <IconSymbol
          size={24}
          name={isFocused ? meta.filled : meta.outline}
          color={color}
        />
      </Animated.View>
    </Pressable>
  );
}

// ─── Main floating tab bar ────────────────────────────────────────────────────

export function LiquidGlassTabBar({ state, navigation }: BottomTabBarProps) {
  let colorScheme = 'light';
  try {
    colorScheme = useColorScheme() ?? 'light';
  } catch {
    colorScheme = 'light';
  }
  const isDark = colorScheme === 'dark';

  // Only render the 5 visible tabs (skip hidden ones with href: null)
  const visibleRoutes = state.routes.filter((r) => TAB_ICONS[r.name]);
  const tabCount = visibleRoutes.length;
  const pillWidth = SCREEN_WIDTH - H_MARGIN * 2;
  const tabWidth = pillWidth / tabCount;

  // Sliding indicator
  const indicatorX = useSharedValue(state.index * tabWidth);

  useEffect(() => {
    indicatorX.value = withSpring(state.index * tabWidth, SPRING);
  }, [state.index, tabWidth]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
  }));

  // Gradient colours
  const gradLight = [
    'rgba(255,255,255,0.82)',
    'rgba(248,248,254,0.76)',
  ] as const;
  const gradDark = [
    'rgba(32,32,42,0.90)',
    'rgba(20,20,28,0.94)',
  ] as const;

  return (
    <View style={styles.outerWrapper} pointerEvents="box-none">
      {/* Pill container */}
      <View
        style={[
          styles.pill,
          isDark ? styles.pillDark : styles.pillLight,
          { width: pillWidth },
        ]}
      >
        {/* Gradient fill */}
        <LinearGradient
          colors={isDark ? gradDark : gradLight}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
          // Clip to pill corners
        />

        {/* Top highlight line — the "liquid glass" sheen */}
        <View
          style={[
            styles.topHighlight,
            { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.9)' },
          ]}
        />

        {/* Sliding active pill indicator */}
        <Animated.View style={[styles.indicatorTrack, indicatorStyle]}>
          <View
            style={[
              styles.indicator,
              {
                width: tabWidth - INDICATOR_INSET * 2,
                backgroundColor: isDark
                  ? 'rgba(255,255,255,0.10)'
                  : 'rgba(26,58,32,0.09)',
              },
            ]}
          />
        </Animated.View>

        {/* Tab buttons */}
        <View style={styles.tabRow}>
          {visibleRoutes.map((route, idx) => {
            const globalIdx = state.routes.findIndex((r) => r.key === route.key);
            return (
              <TabItem
                key={route.key}
                route={route}
                index={idx}
                isFocused={state.index === globalIdx}
                tabWidth={tabWidth}
                isDark={isDark}
                onPress={() => {
                  const isFocused = state.index === globalIdx;
                  const event = navigation.emit({
                    type: 'tabPress',
                    target: route.key,
                    canPreventDefault: true,
                  });
                  if (!isFocused && !event.defaultPrevented) {
                    navigation.navigate(route.name, route.params);
                  }
                }}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const PILL_RADIUS = TAB_HEIGHT / 2;

const styles = StyleSheet.create({
  outerWrapper: {
    position: 'absolute',
    bottom: BOTTOM_OFFSET,
    left: 0,
    right: 0,
    alignItems: 'center',
    // Allow touches to pass through the transparent area around the pill
    pointerEvents: 'box-none',
  },

  pill: {
    height: TAB_HEIGHT,
    borderRadius: PILL_RADIUS,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
  },

  pillLight: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
    // Multi-layer shadow for floating depth
    shadowColor: '#1A3A20',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 28,
    elevation: 18,
  },

  pillDark: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.55,
    shadowRadius: 32,
    elevation: 24,
  },

  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 12,
    right: 12,
    height: 1,
    borderRadius: 1,
  },

  indicatorTrack: {
    position: 'absolute',
    top: INDICATOR_INSET,
    bottom: INDICATOR_INSET,
    left: INDICATOR_INSET,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },

  indicator: {
    height: '100%',
    borderRadius: PILL_RADIUS - INDICATOR_INSET,
  },

  tabRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    height: TAB_HEIGHT,
  },

  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { isLiquidGlassSupported } from '@callstack/liquid-glass';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  LayoutRectangle,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { BlurView } from 'expo-blur';
import { IconSymbol } from './ui/icon-symbol';
import { useColorScheme } from '../hooks/use-color-scheme';
import { Palette } from '../constants/theme';

// ─── Layout constants ─────────────────────────────────────────────────────────

const HIDDEN_TABS = new Set([
  'zoeken', 'meldingen', 'bladwijzers', 'categorieen',
  'instellingen-meldingen', 'instellingen-categorieen',
]);

const TAB_CONFIG: Record<string, { active: string; inactive: string; label: string }> = {
  index:   { active: 'house.fill',     inactive: 'house',     label: 'Home'         },
  nieuws:  { active: 'newspaper.fill', inactive: 'newspaper', label: 'Nieuws'       },
  reviews: { active: 'star.fill',      inactive: 'star',      label: 'Reviews'      },
  prijzen: { active: 'tag.fill',       inactive: 'tag',       label: 'Prijzen'      },
  profiel: { active: 'gearshape.fill', inactive: 'gearshape', label: 'Instellingen' },
};

const BAR_H      = 70;
const SIDE_PAD   = 20;
const BOTTOM_PAD = 28;

const PILL_INSET   = 8;
const PILL_H       = BAR_H - PILL_INSET * 2;        // 54
const PILL_H_DRAG  = BAR_H - 2;                      // 68 — subtle swell on drag
const PILL_W_EXTRA = 14;

const EXTRA_TOP        = PILL_H_DRAG - PILL_H;
const PILL_TOP_RESTING = EXTRA_TOP + PILL_INSET;

const ICON_SIZE = 25;

const PILL_COLOR  = Palette.primaryVivid; // #34C759 iOS green pill
const COL_ACTIVE  = '#FFFFFF';            // white icon on green pill
const COL_IDLE_L  = 'rgba(0,0,0,0.40)';  // readable on frosted light bg
const COL_IDLE_D  = 'rgba(255,255,255,0.45)';

const SP      = { damping: 26, stiffness: 340, mass: 0.75 } as const;
const SP_DRAG = { damping: 14, stiffness: 280 } as const;


// ─── TabIcon ──────────────────────────────────────────────────────────────────

function TabIcon({
  routeName, isFocused, isDark, onLayout, onPress, index, bounceKey,
}: {
  routeName: string; isFocused: boolean; isDark: boolean;
  onLayout: (r: LayoutRectangle, i: number) => void;
  onPress: () => void; index: number; bounceKey: number;
}) {
  const cfg = TAB_CONFIG[routeName] ?? { active: 'circle.fill', inactive: 'circle', label: '' };
  const ty  = useSharedValue(0);
  const sc  = useSharedValue(1);

  useEffect(() => {
    if (!isFocused) return;
    ty.value = withSpring(-4, { damping: 10, stiffness: 400 }, () => {
      ty.value = withSpring(0, { damping: 14, stiffness: 260 });
    });
  }, [bounceKey]);

  const anim = useAnimatedStyle(() => ({
    transform: [{ translateY: ty.value }, { scale: sc.value }],
  }));

  const color = isFocused
    ? COL_ACTIVE
    : (isDark ? COL_IDLE_D : COL_IDLE_L);

  return (
    <Pressable
      style={styles.tabSlot}
      onLayout={(e) => onLayout(e.nativeEvent.layout, index)}
      onPress={onPress}
      onPressIn={() =>  { sc.value = withSpring(0.76, { damping: 12, stiffness: 420 }); }}
      onPressOut={() => { sc.value = withSpring(1,    { damping: 14, stiffness: 300 }); }}
      accessibilityRole="button"
      accessibilityLabel={cfg.label}
      accessibilityState={{ selected: isFocused }}
    >
      <Animated.View style={anim}>
        <IconSymbol
          name={(isFocused ? cfg.active : cfg.inactive) as any}
          size={ICON_SIZE}
          color={color}
        />
      </Animated.View>
    </Pressable>
  );
}

// ─── FloatingTabBar ───────────────────────────────────────────────────────────

export function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const cs     = useColorScheme() ?? 'light';
  const isDark = cs === 'dark';
  const useNativeGlass = Platform.OS === 'ios' && isLiquidGlassSupported;

  const visible = useMemo(
    () => state.routes.filter((r) => !HIDDEN_TABS.has(r.name)),
    [state.routes],
  );

  const live = useRef({ visible, state, navigation, activeIdx: 0 });
  live.current.visible    = visible;
  live.current.state      = state;
  live.current.navigation = navigation;

  const activeIdx = visible.findIndex((r) => state.routes.indexOf(r) === state.index);
  live.current.activeIdx = activeIdx;

  const [bounceKey, setBounceKey] = useState(0);

  const slots = useRef<(LayoutRectangle | null)[]>(new Array(visible.length).fill(null));
  useEffect(() => {
    if (slots.current.length !== visible.length)
      slots.current = new Array(visible.length).fill(null);
  }, [visible.length]);

  // Pill spring values
  const pillLeft = useSharedValue(0);
  const pillY    = useSharedValue(PILL_TOP_RESTING);
  const pillW    = useSharedValue(72);
  const pillH    = useSharedValue(PILL_H);

  const pillStyle = useAnimatedStyle(() => ({
    left:         pillLeft.value,
    top:          pillY.value,
    width:        pillW.value,
    height:       pillH.value,
    borderRadius: pillH.value / 2,
  }));

  const slotPillW = useCallback((idx: number, drag = false) => {
    const l = slots.current[idx];
    if (!l) return 72;
    return drag ? l.width + PILL_W_EXTRA * 2 : l.width - PILL_INSET * 2 + PILL_W_EXTRA;
  }, []);

  const slotLeft = useCallback((idx: number, w?: number) => {
    const l = slots.current[idx];
    if (!l) return 0;
    const pw = w ?? slotPillW(idx);
    return l.x + (l.width - pw) / 2;
  }, [slotPillW]);

  const slotAtX = useCallback((x: number): number | null => {
    for (let i = 0; i < slots.current.length; i++) {
      const l = slots.current[i];
      if (l && x >= l.x && x <= l.x + l.width) return i;
    }
    return null;
  }, []);

  const snapPill = useCallback((idx: number) => {
    const pw = slotPillW(idx);
    pillLeft.value = withSpring(slotLeft(idx, pw), SP);
    pillY.value    = withSpring(PILL_TOP_RESTING, SP);
    pillW.value    = withSpring(pw, SP);
    pillH.value    = withSpring(PILL_H, SP);
  }, [slotPillW, slotLeft]);

  const storeLayout = useCallback((r: LayoutRectangle, i: number) => {
    slots.current[i] = r;
    if (slots.current.every(Boolean)) {
      const ai = live.current.activeIdx;
      const pw = slotPillW(ai);
      pillW.value    = pw;
      pillLeft.value = slotLeft(ai, pw);
      pillH.value    = PILL_H;
      pillY.value    = PILL_TOP_RESTING;
    }
  }, []);

  const doNavigate = useCallback((idx: number) => {
    const { visible: v, state: s, navigation: n } = live.current;
    const route = v[idx];
    if (!route) return;
    const focused = s.routes.indexOf(route) === s.index;
    const evt     = n.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (!focused && !evt.defaultPrevented) {
      if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      n.navigate(route.name);
    }
  }, []);

  useEffect(() => {
    snapPill(activeIdx);
    setBounceKey((k) => k + 1);
  }, [activeIdx]);

  const touchStartX   = useRef(0);
  const lastHapticIdx = useRef<number | null>(null);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt) => {
        touchStartX.current = evt.nativeEvent.locationX;
        return false;
      },
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 4,

      onPanResponderGrant: () => {
        lastHapticIdx.current = null;
        const idx = slotAtX(touchStartX.current);
        const pw  = slotPillW(idx ?? live.current.activeIdx, true);
        pillW.value    = withSpring(pw, SP_DRAG);
        pillLeft.value = withSpring(slotLeft(idx ?? live.current.activeIdx, pw), SP_DRAG);
        pillH.value    = withSpring(PILL_H_DRAG, SP_DRAG);
        pillY.value    = withSpring(PILL_TOP_RESTING - (PILL_H_DRAG - PILL_H), SP_DRAG);
        if (idx !== null) {
          lastHapticIdx.current = idx;
          if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
      },

      onPanResponderMove: (evt) => {
        const x   = evt.nativeEvent.locationX;
        const idx = slotAtX(x);
        if (idx !== null) {
          const pw = slotPillW(idx, true);
          pillLeft.value = withSpring(slotLeft(idx, pw), SP_DRAG);
          pillW.value    = withSpring(pw, SP_DRAG);
          if (idx !== lastHapticIdx.current) {
            lastHapticIdx.current = idx;
            if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
        }
      },

      onPanResponderRelease: (evt) => {
        const x   = evt.nativeEvent.locationX;
        const idx = slotAtX(x);
        lastHapticIdx.current = null;
        if (idx !== null) doNavigate(idx);
        else snapPill(live.current.activeIdx);
      },

      onPanResponderTerminate: () => {
        lastHapticIdx.current = null;
        snapPill(live.current.activeIdx);
      },
    })
  ).current;

  const barShell = (
    <View style={[styles.barShell, isDark && styles.barShellDark]} pointerEvents="none">
      {Platform.OS === 'ios' && !isDark && (
        <BlurView intensity={20} tint="light" style={StyleSheet.absoluteFill} />
      )}
    </View>
  );

  // ── Native liquid glass (@callstack/liquid-glass) ─────────────────────────
  if (useNativeGlass) {
    return (
      <View
        style={[styles.wrapper, { bottom: BOTTOM_PAD, left: SIDE_PAD, right: SIDE_PAD }]}
        pointerEvents="box-none"
      >
        {barShell}
        {/* Pill */}
        <Animated.View style={[styles.pillShell, pillStyle]} pointerEvents="none">
          <View style={[StyleSheet.absoluteFill, { backgroundColor: PILL_COLOR, borderRadius: 999 }]} />
        </Animated.View>

        {/* Icons on top */}
        <View style={styles.iconRow} {...pan.panHandlers}>
          {visible.map((route, idx) => (
            <TabIcon
              key={route.key}
              routeName={route.name}
              isFocused={idx === activeIdx}
              isDark={isDark}
              index={idx}
              onLayout={storeLayout}
              onPress={() => doNavigate(idx)}
              bounceKey={bounceKey}
            />
          ))}
        </View>
      </View>
    );
  }

  // ── Fallback: solid pill, transparent bar ────────────────────────────────
  return (
    <View
      style={[styles.wrapper, { bottom: BOTTOM_PAD, left: SIDE_PAD, right: SIDE_PAD }]}
      pointerEvents="box-none"
    >
      {barShell}
      <Animated.View style={[styles.pillShell, pillStyle]} pointerEvents="none">
        <View style={[StyleSheet.absoluteFill, { backgroundColor: PILL_COLOR, borderRadius: 999 }]} />
      </Animated.View>

      <View style={styles.iconRow} {...pan.panHandlers}>
        {visible.map((route, idx) => (
          <TabIcon
            key={route.key}
            routeName={route.name}
            isFocused={idx === activeIdx}
            isDark={isDark}
            index={idx}
            onLayout={storeLayout}
            onPress={() => doNavigate(idx)}
            bounceKey={bounceKey}
          />
        ))}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    height:   BAR_H + EXTRA_TOP,
  },

  barShell: {
    position: 'absolute',
    top: EXTRA_TOP,
    left: 0,
    right: 0,
    height: BAR_H,
    borderRadius: 34,
    backgroundColor: 'rgba(242,242,247,0.88)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.09,
    shadowRadius: 24,
    elevation: 12,
  },
  barShellDark: {
    backgroundColor: 'rgba(28,28,30,0.88)',
  },

  // Pill
  pillShell: {
    position: 'absolute',
    zIndex:   4,
    overflow: 'hidden',
  },

  iconRow: {
    position:      'absolute',
    top:           EXTRA_TOP,
    left:          0,
    right:         0,
    height:        BAR_H,
    flexDirection: 'row',
    zIndex:        5,
  },
  tabSlot: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
  },
});

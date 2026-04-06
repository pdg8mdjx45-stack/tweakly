import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { LiquidGlassView, isLiquidGlassSupported } from '@callstack/liquid-glass';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassBlur } from './glass-blur';
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

const COL_ACTIVE_L = Palette.primary;
const COL_ACTIVE_D = '#FFFFFF';
const COL_IDLE_L   = 'rgba(60,60,67,0.42)';
const COL_IDLE_D   = 'rgba(255,255,255,0.40)';

const SP      = { damping: 26, stiffness: 340, mass: 0.75 } as const;
const SP_DRAG = { damping: 14, stiffness: 280 } as const;

// iOS 26 Liquid Glass tokens for the floating tab bar
const GLASS = {
  light: {
    barBlurIntensity:  95,
    barBlurTint:       'light' as const,
    barTint:           'rgba(215,215,230,0.42)',
    barSpecTop:        'rgba(255,255,255,0.92)',
    barSpecBot:        'rgba(255,255,255,0.00)',
    barEdgeTop:        'rgba(255,255,255,1.00)',
    barEdgeBot:        'rgba(0,0,0,0.04)',
    barBorder:         'rgba(255,255,255,0.70)',
    shadowOpacity:     0.10,
    shadowRadius:      32,
    pillBlurIntensity: 50,
    pillBlurTint:      'light' as const,
    pillFill:          'rgba(255,255,255,0.35)',
    pillRimTop:        'rgba(255,255,255,1.00)',
    pillRimSide:       'rgba(255,255,255,0.65)',
    pillRimBot:        'rgba(255,255,255,0.18)',
    causticTop:        'rgba(255,255,255,0.92)',
    causticBot:        'rgba(255,255,255,0.00)',
    glint:             'rgba(255,255,255,1.00)',
    reflect:           'rgba(255,255,255,0.55)',
  },
  dark: {
    barBlurIntensity:  80,
    barBlurTint:       'dark' as const,
    barTint:           'rgba(28,28,30,0.88)',
    barSpecTop:        'rgba(255,255,255,0.10)',
    barSpecBot:        'rgba(255,255,255,0.00)',
    barEdgeTop:        'rgba(255,255,255,0.14)',
    barEdgeBot:        'rgba(0,0,0,0.38)',
    barBorder:         'rgba(255,255,255,0.10)',
    shadowOpacity:     0.62,
    shadowRadius:      40,
    pillBlurIntensity: 28,
    pillBlurTint:      'dark' as const,
    pillFill:          'rgba(255,255,255,0.08)',
    pillRimTop:        'rgba(255,255,255,0.65)',
    pillRimSide:       'rgba(255,255,255,0.28)',
    pillRimBot:        'rgba(255,255,255,0.07)',
    causticTop:        'rgba(255,255,255,0.38)',
    causticBot:        'rgba(255,255,255,0.00)',
    glint:             'rgba(255,255,255,0.70)',
    reflect:           'rgba(255,255,255,0.15)',
  },
};

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
    ? (isDark ? COL_ACTIVE_D : COL_ACTIVE_L)
    : (isDark ? COL_IDLE_D   : COL_IDLE_L);

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
  const G      = isDark ? GLASS.dark : GLASS.light;
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

  // ── Native liquid glass (@callstack/liquid-glass) ─────────────────────────
  if (useNativeGlass) {
    return (
      <View
        style={[styles.wrapper, { bottom: BOTTOM_PAD, left: SIDE_PAD, right: SIDE_PAD }]}
        pointerEvents="box-none"
      >
        {/* Bar */}
        <LiquidGlassView
          style={styles.nativeBar}
          effect="regular"
          interactive={false}
        />

        {/* Pill */}
        <Animated.View style={[styles.pillShell, pillStyle]} pointerEvents="none">
          <LiquidGlassView
            style={StyleSheet.absoluteFill}
            effect="regular"
            interactive={true}
          />
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

  // ── Fallback: manual glass (expo-blur + gradients) ────────────────────────
  return (
    <View
      style={[styles.wrapper, { bottom: BOTTOM_PAD, left: SIDE_PAD, right: SIDE_PAD }]}
      pointerEvents="box-none"
    >
      <View style={styles.barContainer}>
        <View style={[
          styles.shadowShell,
          { shadowOpacity: G.shadowOpacity, shadowRadius: G.shadowRadius },
        ]} />
        <GlassBlur
          isDark={isDark}
          blur={isDark ? 28 : 32}
          borderRadius={999}
          tintColor={G.barTint}
          style={styles.barBlur}
        >
          <LinearGradient
            colors={[G.barSpecTop, G.barSpecBot]}
            style={[StyleSheet.absoluteFill, styles.fill999]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 0.55 }}
            pointerEvents="none"
          />
          <View style={[styles.edgeTop, { backgroundColor: G.barEdgeTop }]} />
          <View style={[styles.edgeBot, { backgroundColor: G.barEdgeBot }]} />
        </GlassBlur>
        <View style={[styles.borderRing, { borderColor: G.barBorder }]} />
      </View>

      <Animated.View style={[styles.pillShell, pillStyle]} pointerEvents="none">
        <LinearGradient
          colors={[G.pillRimTop, G.pillRimSide, G.pillRimSide, G.pillRimBot]}
          locations={[0, 0.35, 0.65, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.pillInner}>
          <GlassBlur
            isDark={isDark}
            blur={isDark ? 16 : 20}
            borderRadius={999}
            tintColor={G.pillFill}
            style={styles.pillBlur}
          >
            <LinearGradient
              colors={[G.causticTop, G.causticBot]}
              style={styles.caustic}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
            />
            <View style={styles.glintWrap}>
              <LinearGradient
                colors={['transparent', G.glint, 'transparent']}
                locations={[0, 0.35, 1]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
              />
            </View>
            <View style={styles.reflectWrap}>
              <LinearGradient
                colors={['transparent', G.reflect, 'transparent']}
                locations={[0, 0.5, 1]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
              />
            </View>
          </GlassBlur>
        </View>
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

const PILL_BORDER_W = 1.5;

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    height:   BAR_H + EXTRA_TOP,
  },

  // Native glass bar (full fill of barContainer area)
  nativeBar: {
    position:     'absolute',
    top:          EXTRA_TOP,
    left:         0,
    right:        0,
    height:       BAR_H,
    borderRadius: 999,
  },

  // Fallback bar
  barContainer: {
    position: 'absolute',
    top:      EXTRA_TOP,
    left:     0,
    right:    0,
    height:   BAR_H,
    zIndex:   2,
  },

  shadowShell: {
    ...StyleSheet.absoluteFillObject,
    borderRadius:  999,
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius:  26,
    elevation:     14,
  },

  barBlur: {
    flex:         1,
    borderRadius: 999,
    overflow:     'hidden',
  },

  fill999: {
    borderRadius: 999,
  },

  edgeTop: {
    position:           'absolute',
    top:                0,
    left:               0,
    right:              0,
    height:             1.5,
    borderTopLeftRadius:  999,
    borderTopRightRadius: 999,
  },
  edgeBot: {
    position:              'absolute',
    bottom:                0,
    left:                  0,
    right:                 0,
    height:                1,
    borderBottomLeftRadius:  999,
    borderBottomRightRadius: 999,
  },

  borderRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    borderWidth:  StyleSheet.hairlineWidth,
  },

  // Pill (shared between native + fallback)
  pillShell: {
    position: 'absolute',
    zIndex:   4,
    overflow: 'hidden',
  },

  pillInner: {
    position:     'absolute',
    top:          PILL_BORDER_W,
    left:         PILL_BORDER_W,
    right:        PILL_BORDER_W,
    bottom:       PILL_BORDER_W,
    borderRadius: 999,
    overflow:     'hidden',
  },

  pillBlur: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    overflow:     'hidden',
  },

  caustic: {
    position:     'absolute',
    top:          0,
    left:         0,
    right:        0,
    bottom:       '45%',
    borderRadius: 999,
  },

  glintWrap: {
    position:     'absolute',
    top:          2,
    left:         10,
    right:        10,
    height:       2.5,
    borderRadius: 999,
    overflow:     'hidden',
  },

  reflectWrap: {
    position:     'absolute',
    bottom:       2,
    left:         16,
    right:        16,
    height:       1.5,
    borderRadius: 999,
    overflow:     'hidden',
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

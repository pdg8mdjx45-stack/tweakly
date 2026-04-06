/**
 * GlassBlur — cross-platform backdrop blur primitive
 *
 * iOS:      expo-blur BlurView (or @callstack/liquid-glass via ClearLiquidGlass)
 * Android:  Skia BackdropBlur — real GPU blur, works on Android 8+
 * Web:      expo-blur (CSS backdrop-filter)
 *
 * Usage:
 *   <GlassBlur isDark blur={20} borderRadius={16} style={...}>
 *     {children}
 *   </GlassBlur>
 */

import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import {
  BackdropBlur,
  Canvas,
  Fill,
  RoundedRect,
} from '@shopify/react-native-skia';

interface GlassBlurProps {
  /** Blur sigma radius in dp */
  blur?: number;
  isDark?: boolean;
  /** Corner radius of the clipping/visual area */
  borderRadius?: number;
  /** Extra tint overlay color (rgba string). Falls back to dark/light defaults. */
  tintColor?: string;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  pointerEvents?: 'none' | 'auto' | 'box-none' | 'box-only';
}

export function GlassBlur({
  blur = 24,
  isDark = false,
  borderRadius = 0,
  tintColor,
  style,
  children,
  pointerEvents,
}: GlassBlurProps) {
  const resolvedTint = tintColor ?? (isDark
    ? 'rgba(28,28,30,0.52)'
    : 'rgba(255,255,255,0.72)');

  // ── Android: Skia BackdropBlur ─────────────────────────────────────────────
  if (Platform.OS === 'android') {
    return (
      <AndroidGlassBlur
        blur={blur}
        isDark={isDark}
        borderRadius={borderRadius}
        tintColor={resolvedTint}
        style={style}
        pointerEvents={pointerEvents}
      >
        {children}
      </AndroidGlassBlur>
    );
  }

  // ── iOS / Web: expo-blur ───────────────────────────────────────────────────
  const intensity = isDark ? 62 : 80;
  const tint = isDark ? 'dark' : 'light';
  const specularColor = isDark ? 'rgba(255,255,255,0.13)' : 'rgba(255,255,255,0.90)';

  return (
    <View style={[styles.shell, { borderRadius }, style]} pointerEvents={pointerEvents}>
      <BlurView
        intensity={intensity}
        tint={tint}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View
        style={[StyleSheet.absoluteFill, { backgroundColor: resolvedTint, borderRadius }]}
        pointerEvents="none"
      />
      <LinearGradient
        colors={isDark
          ? ['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.00)']
          : ['rgba(255,255,255,0.78)', 'rgba(255,255,255,0.00)']}
        style={[StyleSheet.absoluteFill, { bottom: '55%', borderRadius }]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        pointerEvents="none"
      />
      <View
        style={[styles.specular, { backgroundColor: specularColor }]}
        pointerEvents="none"
      />
      {children}
    </View>
  );
}

// ── AndroidGlassBlur ───────────────────────────────────────────────────────────

function AndroidGlassBlur({
  blur,
  isDark,
  borderRadius,
  tintColor,
  style,
  children,
  pointerEvents,
}: Required<Pick<GlassBlurProps, 'blur' | 'isDark' | 'borderRadius' | 'tintColor'>> & {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  pointerEvents?: GlassBlurProps['pointerEvents'];
}) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const ready = size.width > 0 && size.height > 0;

  const specularColor = isDark ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.95)';
  const causticColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.65)';

  const clip = ready ? {
    x: 0,
    y: 0,
    width: size.width,
    height: size.height,
  } : null;

  return (
    <View
      style={[styles.shell, { borderRadius }, style]}
      pointerEvents={pointerEvents}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        if (width !== size.width || height !== size.height) {
          setSize({ width, height });
        }
      }}
    >
      {/* Skia canvas for backdrop blur — pointer-events none */}
      {ready && (
        <Canvas
          style={[StyleSheet.absoluteFill, { borderRadius }]}
          pointerEvents="none"
        >
          {/* Backdrop blur fills the clipped area */}
          <BackdropBlur blur={blur} clip={clip!}>
            <Fill color={tintColor} />
          </BackdropBlur>

          {/* Caustic shimmer — top ~40% */}
          <BackdropBlur blur={0} clip={{ x: 0, y: 0, width: size.width, height: size.height * 0.4 }}>
            <Fill color={causticColor} />
          </BackdropBlur>

          {/* Top specular rim */}
          <RoundedRect
            x={0}
            y={0}
            width={size.width}
            height={1.5}
            r={borderRadius}
            color={specularColor}
          />
        </Canvas>
      )}

      {/* Fallback solid tint before layout is measured */}
      {!ready && (
        <View
          style={[StyleSheet.absoluteFill, { backgroundColor: tintColor, borderRadius }]}
          pointerEvents="none"
        />
      )}

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    overflow: 'hidden',
  },
  specular: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1.5,
    borderRadius: 999,
  },
});

import { Glass } from '@/constants/theme';
import { LiquidGlassView, isLiquidGlassSupported } from '@callstack/liquid-glass';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { GlassBlur } from './glass-blur';

interface ClearLiquidGlassProps {
  isDark: boolean;
  borderRadius: number;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  intensityLight?: number;
  intensityDark?: number;
  effect?: 'regular' | 'thin' | 'thick';
}

export function ClearLiquidGlass({
  isDark,
  borderRadius,
  style,
  children,
  effect = 'regular',
}: ClearLiquidGlassProps) {
  // ── iOS 26 native liquid glass ──────────────────────────────────────────────
  if (Platform.OS === 'ios' && isLiquidGlassSupported) {
    return (
      <LiquidGlassView
        style={[styles.shell, { borderRadius }, style]}
        effect={effect}
        interactive={false}
      >
        {children}
      </LiquidGlassView>
    );
  }

  // ── iOS (older) + Android + Web: GlassBlur + manual layers ─────────────────
  return (
    <GlassBlur
      isDark={isDark}
      borderRadius={borderRadius}
      tintColor={isDark ? 'rgba(44,44,46,0.45)' : 'rgba(255,255,255,0.32)'}
      style={[styles.shell, style]}
    >
      {/* Caustic shimmer — top half */}
      <LinearGradient
        colors={isDark ? Glass.lens.caustic.dark : Glass.lens.caustic.light}
        style={[styles.caustic, { borderRadius }]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        pointerEvents="none"
      />

      {/* Bottom edge darkening */}
      <View
        style={[
          styles.bottomEdge,
          { backgroundColor: isDark ? 'rgba(0,0,0,0.34)' : 'rgba(0,0,0,0.08)' },
        ]}
        pointerEvents="none"
      />

      {children}
    </GlassBlur>
  );
}

const styles = StyleSheet.create({
  shell: {
    overflow: 'hidden',
  },
  caustic: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: '44%',
  },
  bottomEdge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
  },
});

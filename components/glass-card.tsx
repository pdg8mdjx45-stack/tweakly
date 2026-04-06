/**
 * GlassCard — frosted glassmorphism container
 * Use this everywhere a card/surface appears (article rows, product cards, sections).
 */
import { BlurView } from 'expo-blur';
import { type ReactNode } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { GlassTokens, Radius } from '@/constants/theme';

interface GlassCardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  radius?: number;
  /** Override blur intensity */
  blur?: number;
}

export function GlassCard({ children, style, radius = Radius.xl, blur }: GlassCardProps) {
  const cs = useColorScheme() ?? 'dark';
  const isDark = cs === 'dark';
  const tokens = GlassTokens[cs];
  const blurAmount = blur ?? tokens.blur;

  return (
    <View style={[styles.shell, { borderRadius: radius }, style]}>
      {/* Frosted blur layer */}
      <BlurView
        intensity={blurAmount}
        tint={isDark ? 'dark' : 'light'}
        style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
        pointerEvents="none"
      />

      {/* Tint fill */}
      <View
        style={[StyleSheet.absoluteFill, { backgroundColor: tokens.tint, borderRadius: radius }]}
        pointerEvents="none"
      />

      {/* Specular top rim */}
      <View
        style={[
          styles.specular,
          {
            backgroundColor: tokens.specular,
            borderTopLeftRadius: radius,
            borderTopRightRadius: radius,
          },
        ]}
        pointerEvents="none"
      />

      {/* Hairline border */}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: radius,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: tokens.border,
          },
        ]}
        pointerEvents="none"
      />

      {/* Content */}
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
    height: 1,
  },
});

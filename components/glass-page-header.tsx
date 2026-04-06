import { Colors, Glass, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { LiquidGlassView, isLiquidGlassSupported } from '@callstack/liquid-glass';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { GlassBlur } from './glass-blur';

const ENTER = FadeInDown.springify().damping(20).stiffness(130);

interface GlassPageHeaderProps {
  title: string;
  subtitle: string;
}

export function GlassPageHeader({ title, subtitle }: GlassPageHeaderProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();

  const paddingTop = insets.top + Spacing.sm;
  const useNativeGlass = Platform.OS === 'ios' && isLiquidGlassSupported;

  return (
    <Animated.View entering={ENTER} style={styles.outer}>
      {useNativeGlass ? (
        <LiquidGlassView
          style={[styles.header, isDark ? Glass.header.dark : Glass.header.light, { paddingTop }]}
          effect="regular"
          interactive={false}
        >
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
        </LiquidGlassView>
      ) : (
        <GlassBlur
          isDark={isDark}
          blur={isDark ? 28 : 24}
          borderRadius={0}
          tintColor={isDark ? 'rgba(28,28,30,0.60)' : 'rgba(255,255,255,0.78)'}
          style={[
            styles.header,
            isDark ? Glass.header.dark : Glass.header.light,
            { paddingTop },
          ]}
        >
          {/* Caustic shimmer from top */}
          <LinearGradient
            colors={isDark ? Glass.lens.caustic.dark : Glass.lens.caustic.light}
            style={styles.caustic}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            pointerEvents="none"
          />

          {/* Lens blob */}
          <View style={[styles.lensBlob, {
            backgroundColor: isDark ? Glass.lens.blob.dark : Glass.lens.blob.light,
          }]} pointerEvents="none" />

          {/* Bottom inner shadow */}
          <LinearGradient
            colors={isDark ? Glass.lens.innerShadow.dark : Glass.lens.innerShadow.light}
            style={styles.innerShadow}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            pointerEvents="none"
          />

          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
        </GlassBlur>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outer: {
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm + 4,
    gap: 4,
    overflow: 'hidden',
  },
  caustic: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '60%',
  },
  specularRim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
  },
  lensBlob: {
    position: 'absolute',
    top: 8,
    left: 24,
    width: 110,
    height: 12,
    borderRadius: 999,
    opacity: 0.55,
  },
  innerShadow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '25%',
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    letterSpacing: 0.05,
    opacity: 0.7,
  },
});

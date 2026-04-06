/**
 * BackButton — standalone floating glass back button
 * Replaces header-based back navigation on detail screens.
 */
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassCard } from '@/components/glass-card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

export function BackButton() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cs = useColorScheme() ?? 'dark';
  const colors = Colors[cs];

  return (
    <Pressable
      onPress={() => router.back()}
      style={[styles.wrapper, { top: insets.top + 8 }]}
      hitSlop={12}
    >
      <GlassCard style={styles.btn} radius={999}>
        <IconSymbol name="chevron.left" size={18} color={colors.text} />
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    zIndex: 100,
  },
  btn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

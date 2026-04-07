/**
 * Filter Chip Component
 * Reusable chip for category filtering
 */

import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { GlassCard } from '@/components/glass-card';
import { Pressable, StyleSheet, Text } from 'react-native';

interface FilterChipProps {
  label: string;
  selected?: boolean;
  onPress: () => void;
}

export function FilterChip({ label, selected = false, onPress }: FilterChipProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  if (selected) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.chip,
          { backgroundColor: colors.tint },
          pressed && { opacity: 0.8 },
        ]}
      >
        <Text style={[styles.label, { color: '#FFFFFF' }]}>{label}</Text>
      </Pressable>
    );
  }

  return (
    <GlassCard radius={Radius.full} style={styles.glassChip}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.chipPressable,
          pressed && { opacity: 0.8 },
        ]}
      >
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      </Pressable>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    marginRight: Spacing.sm,
  },
  glassChip: {
    marginRight: Spacing.sm,
  },
  chipPressable: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
});

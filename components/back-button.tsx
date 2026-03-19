import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';

type BackButtonProps = {
  color: string;
  label?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

export function BackButton({ color, label, size = 22, style }: BackButtonProps) {
  const router = useRouter();

  return (
    <Pressable onPress={() => router.back()} hitSlop={12} style={[styles.button, style]}>
      <IconSymbol name="chevron.left" size={size} color={color} />
      {label ? <Text style={[styles.label, { color }]}>{label}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
  },
});

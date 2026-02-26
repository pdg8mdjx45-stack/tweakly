import { StyleSheet, TextInput, View, Pressable } from 'react-native';
import { Palette, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/ui/icon-symbol';

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onClear?: () => void;
};

export function SearchBar({ value, onChangeText, placeholder = 'Zoek producten...', onClear }: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';

  // iOS-stijl zoekbalk: grijs pill, geen rand
  const bgColor = isDark ? Palette.dark2 : Palette.grey5;
  const textColor = isDark ? '#FFFFFF' : '#000000';
  const placeholderColor = isDark ? Palette.dark5 : Palette.grey1;
  const iconColor = isDark ? Palette.dark5 : Palette.grey1;

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <IconSymbol name="magnifyingglass" size={17} color={iconColor} />
      <TextInput
        style={[styles.input, { color: textColor }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={placeholderColor}
        returnKeyType="search"
        clearButtonMode="never"
      />
      {value.length > 0 && (
        <Pressable onPress={onClear} hitSlop={8}>
          <View style={[styles.clearButton, { backgroundColor: isDark ? Palette.dark4 : Palette.grey2 }]}>
            <IconSymbol name="xmark" size={10} color={isDark ? '#000' : '#fff'} />
          </View>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 9,
    borderRadius: Radius.full,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  clearButton: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

/**
 * Shared category grid screen
 * mode=browse  → navigates to /prijzen?category=X
 * mode=select  → navigates to /recommender/X
 */
import { ClearLiquidGlass } from '@/components/clear-liquid-glass';
import { GlassPageHeader } from '@/components/glass-page-header';
import { LiquidScreen } from '@/components/liquid-screen';
import { MOCK_CATEGORIES, type Category } from '@/constants/mock-data';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

const CATEGORY_COLORS = [
  '#007AFF', '#FF9500', '#34C759', '#AF52DE', '#FF2D55',
  '#5AC8FA', '#FF6B00', '#30B0C7', '#64D2FF', '#FF375F',
];

const enterItem = (i: number) =>
  FadeInDown.delay(Math.min(i, 8) * 45).springify().damping(18).stiffness(110);

function CategoryTile({
  category,
  color,
  index,
  onPress,
  isDark,
  colors,
  animationsEnabled,
}: {
  category: Category;
  color: string;
  index: number;
  onPress: () => void;
  isDark: boolean;
  colors: typeof Colors.light;
  animationsEnabled: boolean;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View
      entering={animationsEnabled ? enterItem(index) : undefined}
      style={[styles.tileWrap, animStyle]}
    >
      <Pressable
        onPressIn={() => { scale.value = withSpring(0.97, { damping: 15, stiffness: 300 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 300 }); }}
        onPress={onPress}
        style={styles.tilePressable}
      >
        <ClearLiquidGlass isDark={isDark} borderRadius={Radius.xl} style={styles.tile}>
          <View style={[styles.tileIcon, { backgroundColor: color + '22' }]}>
            <MaterialIcons name={(category.icon ?? 'devices') as any} size={26} color={color} />
          </View>
          <Text style={[styles.tileName, { color: colors.text }]} numberOfLines={2}>
            {category.name}
          </Text>
          {category.count > 0 && (
            <Text style={[styles.tileCount, { color: colors.textSecondary }]}>
              {category.count} producten
            </Text>
          )}
        </ClearLiquidGlass>
      </Pressable>
    </Animated.View>
  );
}

export default function CategorieenScreen() {
  const { mode = 'browse' } = useLocalSearchParams<{ mode?: 'browse' | 'select' }>();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';
  const { animationsEnabled } = useReduceMotion();

  const handlePress = (id: string) => {
    if (mode === 'select') {
      router.push(`/recommender/${id}` as any);
    } else {
      router.push(`/prijzen?category=${id}` as any);
    }
  };

  return (
    <LiquidScreen>
      <GlassPageHeader
        title="Categorieën"
        subtitle={mode === 'select' ? 'Kies een categorie' : 'Blader per categorie'}
      />
      <FlatList
        data={MOCK_CATEGORIES}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.list}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <CategoryTile
            category={item}
            color={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
            index={index}
            onPress={() => handlePress(item.id)}
            isDark={isDark}
            colors={colors}
            animationsEnabled={animationsEnabled}
          />
        )}
      />
    </LiquidScreen>
  );
}

const styles = StyleSheet.create({
  list: { padding: Spacing.md, paddingBottom: 120 },
  row: { gap: Spacing.sm },
  tileWrap: { flex: 1 },
  tilePressable: { flex: 1 },
  tile: {
    padding: Spacing.md,
    gap: 6,
    minHeight: 110,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  tileIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileName: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: -0.1,
  },
  tileCount: {
    fontSize: 10,
    textAlign: 'center',
    opacity: 0.6,
  },
});

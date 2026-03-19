import { BackButton } from '@/components/back-button';
import { MOCK_CATEGORIES, type Category } from '@/constants/mock-data';
import { Colors, Palette, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { fetchManifest } from '@/services/product-db';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { CATEGORY_CONFIGS, type CategoryId } from '@/services/product-recommender';

const CATEGORY_COLORS = [
  '#C0001B',
  '#2C2C2E',
  '#6C6C70',
  '#8B0013',
  '#48484A',
  '#E0001F',
  '#3A3A3C',
  '#9B0016',
  '#636366',
  '#1C1C1E',
];

export default function CategorieenScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>(() => MOCK_CATEGORIES);
  const [loading, setLoading] = useState(categories.length === 0);

  useEffect(() => {
    fetchManifest().then(manifest => {
      if (manifest) {
        const cats = MOCK_CATEGORIES;
        if (cats.length > 0) setCategories(cats);
      }
      setLoading(false);
    });
  }, []);

  return (
    <View style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <BackButton color={colors.tint} />
        <Text style={[styles.title, { color: colors.text }]}>Categorieën</Text>
      </View>

      {loading && (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={Palette.primary} />
        </View>
      )}

      <FlatList
        data={categories}
        keyExtractor={item => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.grid}
        ListHeaderComponent={
          <Pressable
            onPress={() => router.push('/categorie-wizard' as any)}
            style={({ pressed }) => [
              styles.smartCard,
              { backgroundColor: Palette.primary + '12' },
              pressed && { opacity: 0.8 },
            ]}
          >
            <View style={[styles.smartIcon, { backgroundColor: Palette.primary }]}>
              <MaterialIcons name="auto-awesome" size={28} color="#fff" />
            </View>
            <View style={styles.smartTextWrap}>
              <Text style={[styles.smartTitle, { color: colors.text }]}>
                âœ¨ Weet je niet wat je moet kiezen?
              </Text>
              <Text style={[styles.smartSub, { color: colors.textSecondary }]}>
                Beantwoord een paar vragen en wij helpen je
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={26} color={Palette.primary} />
          </Pressable>
        }
        renderItem={({ item, index }) => {
          const color = CATEGORY_COLORS[index % CATEGORY_COLORS.length];
          return (
            <Pressable
              style={({ pressed }) => [
                styles.card,
                { backgroundColor: colors.surface },
                pressed && { opacity: 0.88 },
              ]}
              onPress={() => router.push({ pathname: '/(tabs)/prijzen', params: { category: item.name } })}>
              <View style={[styles.iconWrapper, { backgroundColor: color + '15' }]}>
                <MaterialIcons name={item.icon as any} size={28} color={color} />
              </View>
              <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={2}>{item.name}</Text>
              <Text style={[styles.cardCount, { color: colors.textSecondary }]} numberOfLines={1}>
                {item.count.toLocaleString('nl-NL')} producten
              </Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: 0.35,
  },
  smartCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  smartIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smartTextWrap: {
    flex: 1,
  },
  smartTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  smartSub: {
    fontSize: 12,
    marginTop: 2,
  },
  grid: {
    padding: Spacing.sm,
    paddingBottom: Spacing.xxl,
  },
  row: {
    gap: Spacing.sm,
  },
  card: {
    flex: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
    alignItems: 'flex-start',
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  iconWrapper: {
    width: 52,
    height: 52,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  cardName: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  cardCount: {
    fontSize: 12,
  },
});

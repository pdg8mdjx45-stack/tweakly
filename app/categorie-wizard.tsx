/**
 * Category Wizard Screen
 * Laat gebruikers een categorie kiezen voor productaanbevelingen
 */

import { Colors, Palette, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CategoryId } from '@/services/product-recommender';

const CATEGORIES = [
  { id: 'smartphones' as CategoryId, label: 'Smartphones', icon: 'smartphone' as const, color: '#007AFF', bg: '#007AFF15' },
  { id: 'laptops' as CategoryId, label: 'Laptops', icon: 'laptop' as const, color: '#5856D6', bg: '#5856D615' },
  { id: 'audio' as CategoryId, label: 'Audio', icon: 'headphones' as const, color: '#FF2D55', bg: '#FF2D5515' },
  { id: 'televisies' as CategoryId, label: "TV's", icon: 'tv' as const, color: '#FF9500', bg: '#FF950015' },
  { id: 'gaming' as CategoryId, label: 'Gaming', icon: 'sports-esports' as const, color: '#34C759', bg: '#34C75915' },
  { id: 'wearables' as CategoryId, label: 'Wearables', icon: 'watch' as const, color: '#AF52DE', bg: '#AF52DE15' },
];

export default function CategoryWizardScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const handleSelectCategory = (categoryId: CategoryId) => {
    router.push(`/recommender/${categoryId}` as any);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <MaterialIcons name="chevron-left" size={28} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={[styles.heroIcon, { backgroundColor: Palette.primary + '20' }]}>
            <MaterialIcons name="auto-awesome" size={40} color={Palette.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>
            ✨ Kies een categorie
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Beantwoord een paar vragen en wij helpen je het perfecte product te vinden
          </Text>
        </View>

        <View style={styles.grid}>
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat.id}
              onPress={() => handleSelectCategory(cat.id)}
              style={({ pressed }) => [
                styles.categoryCard,
                { backgroundColor: colors.surface },
                pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
              ]}
            >
              <View style={[styles.categoryIcon, { backgroundColor: cat.color + '18' }]}>
                <MaterialIcons name={cat.icon} size={28} color={cat.color} />
              </View>
              <Text style={[styles.categoryLabel, { color: colors.text }]}>
                {cat.label}
              </Text>
              <MaterialIcons name="chevron-right" size={20} color={colors.border} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
paddingTop: Spacing.xl * 2 + Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  content: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  hero: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  grid: {
    gap: Spacing.sm,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.md,
    gap: Spacing.md,
  },
  categoryIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
});

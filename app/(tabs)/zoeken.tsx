/**
 * Search Screen (Zoeken)
 * Product search with filters and sorting
 */

import { ProductCard } from '@/components/product-card';
import { ProfileHeader } from '@/components/profile-header';
import { SearchBar } from '@/components/search-bar';
import { Colors, Palette, Radius, Spacing } from '@/constants/theme';
import { getAllProducts, searchProducts, type Product } from '@/services/product-db';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const SORT_OPTIONS = ['Relevantie', 'Laagste prijs', 'Hoogste prijs', 'Beste beoordeling'];
const CATEGORIES = ['Alle', 'Smartphones', 'Laptops', 'Audio', 'Televisies', 'Gaming', 'Huishoudelijk'];

function sortResults(products: Product[], sortBy: string): Product[] {
  switch (sortBy) {
    case 'Laagste prijs':
      return [...products].sort((a, b) => a.currentPrice - b.currentPrice);
    case 'Hoogste prijs':
      return [...products].sort((a, b) => b.currentPrice - a.currentPrice);
    case 'Beste beoordeling':
      return [...products].sort((a, b) => b.rating - a.rating);
    default:
      return products;
  }
}

export default function ZoekenScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const params = useLocalSearchParams<{ q?: string }>();
  const router = useRouter();

  const [query, setQuery] = useState(params.q ?? '');
  const [sortBy, setSortBy] = useState('Relevantie');
  const [selectedCategory, setSelectedCategory] = useState('Alle');
  const [showSort, setShowSort] = useState(false);
  const [results, setResults] = useState<Product[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (params.q) setQuery(params.q);
  }, [params.q]);

  // Debounced async search
  const doSearch = useCallback(async (q: string, cat: string, sort: string) => {
    if (!q.trim() && cat === 'Alle') {
      setResults([]);
      return;
    }

    try {
      let products: Product[];
      if (q.trim()) {
        products = await searchProducts(q);
      } else {
        products = await getAllProducts();
      }

      if (cat !== 'Alle') {
        products = products.filter(p => p.category === cat);
      }

      setResults(sortResults(products, sort));
    } catch {
      setResults([]);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      doSearch(query, selectedCategory, sortBy);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, selectedCategory, sortBy, doSearch]);

  return (
    <View style={[styles.safe, { backgroundColor: colors.background }]}>
      <ProfileHeader title="Zoeken" showBackButton onBackPress={() => router.back()} />
      
      <View style={[styles.searchHeader, { backgroundColor: colors.background }]}>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          onClear={() => setQuery('')}
          placeholder="Zoek producten, merken..."
        />
      </View>

      <View style={[styles.filterBar, { backgroundColor: colors.background }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterList}>
          {CATEGORIES.map(cat => (
            <Pressable
              key={cat}
              style={[
                styles.filterChip,
                {
                  backgroundColor: selectedCategory === cat ? Palette.primary : colors.surface,
                },
              ]}
              onPress={() => setSelectedCategory(cat)}>
              <Text
                style={[
                  styles.filterChipText,
                  { color: selectedCategory === cat ? '#fff' : colors.text },
                ]}>
                {cat}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        <Pressable
          style={[styles.sortButton, { backgroundColor: Palette.primary }]}
          onPress={() => setShowSort(!showSort)}>
          <Text style={[styles.sortButtonText, { color: '#fff' }]}>Sorteren</Text>
        </Pressable>
      </View>

      {showSort && (
        <View style={[styles.sortDropdown, { backgroundColor: colors.surface, shadowColor: '#000' }]}>
          {SORT_OPTIONS.map((opt, index, arr) => (
            <Pressable
              key={opt}
              style={({ pressed }) => [
                styles.sortOption,
                pressed && { backgroundColor: colors.background },
              ]}
              onPress={() => { setSortBy(opt); setShowSort(false); }}>
              <Text style={[styles.sortOptionText, { color: sortBy === opt ? Palette.primary : colors.text }]}>
                {opt}
              </Text>
              {sortBy === opt && <Text style={{ color: Palette.primary, fontWeight: '600' }}>✓</Text>}
              {index < arr.length - 1 && (
                <View style={[styles.dropdownSep, { backgroundColor: colors.border }]} />
              )}
            </Pressable>
          ))}
        </View>
      )}

      {results.length === 0 ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Geen resultaten</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Probeer een andere zoekterm of categorie
          </Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={item => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.grid}
          ListHeaderComponent={
            <Text style={[styles.resultCount, { color: colors.textSecondary }]}>
              {results.length} resultaten
            </Text>
          }
          renderItem={({ item }) => (
            <View style={styles.gridItem}>
              <ProductCard product={item} />
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  searchHeader: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: Spacing.md,
  },
  filterList: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
    flexGrow: 1,
  },
  filterChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  sortButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    marginRight: Spacing.md,
    flexShrink: 0,
  },
  sortButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sortDropdown: {
    position: 'absolute',
    top: 108,
    right: Spacing.md,
    zIndex: 100,
    borderRadius: Radius.md,
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    minWidth: 190,
    overflow: 'hidden',
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 13,
    position: 'relative',
  },
  dropdownSep: {
    position: 'absolute',
    bottom: 0,
    left: Spacing.md,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
  sortOptionText: {
    fontSize: 15,
  },
  grid: {
    padding: Spacing.sm,
  },
  row: {
    gap: Spacing.sm,
  },
  gridItem: {
    flex: 1,
  },
  resultCount: {
    fontSize: 12,
    paddingHorizontal: Spacing.xs,
    paddingBottom: Spacing.xs,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.xl,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
});

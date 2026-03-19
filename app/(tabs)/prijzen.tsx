/**
 * Pricewatch Screen (Prijzen)
 * Category picker -> product grid with dynamic, data-driven filters
 */

import { AdCard } from '@/components/ad-card';
import { CompareBar } from '@/components/compare-bar';
import { ProductCard } from '@/components/product-card';
import { ProductFilters } from '@/components/product-filters';
import { Colors, Palette, Radius, Shadow, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useProductFilters } from '@/hooks/use-product-filters';
import { type Product } from '@/services/product-db';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
  Smartphones:          { bg: '#007AFF15', color: '#007AFF' },
  Tablets:              { bg: '#5856D615', color: '#5856D6' },
  Laptops:              { bg: '#5856D615', color: '#5856D6' },
  Desktops:            { bg: '#2C2C2E15', color: '#2C2C2E' },
  Monitoren:            { bg: '#FF950015', color: '#FF9500' },
  Televisies:           { bg: '#FF950015', color: '#FF9500' },
  Audio:                { bg: '#FF2D5515', color: '#FF2D55' },
  Gameconsoles:         { bg: '#34C75915', color: '#34C759' },
  Gaming:               { bg: '#34C75915', color: '#34C759' },
  Netwerk:              { bg: '#007AFF15', color: '#007AFF' },
  Fotografie:           { bg: '#AF52DE15', color: '#AF52DE' },
  Huishoudelijk:        { bg: '#FF950015', color: '#FF9500' },
  Wearables:            { bg: '#AF52DE15', color: '#AF52DE' },
  'Grafische kaarten':  { bg: '#34C75915', color: '#34C759' },
  Processors:           { bg: '#FF2D5515', color: '#FF2D55' },
  Moerborden:           { bg: '#5856D615', color: '#5856D6' },
  Geheugen:             { bg: '#FF2D5515', color: '#FF2D55' },
  'Opslag (SSD)':       { bg: '#34C75915', color: '#34C759' },
  'Opslag (HDD)':       { bg: '#34C75915', color: '#34C759' },
  Voedingen:            { bg: '#FF950015', color: '#FF9500' },
  Computerbehuizingen:  { bg: '#6C6C7015', color: '#6C6C70' },
  'CPU-koelers':        { bg: '#007AFF15', color: '#007AFF' },
  Ventilatoren:         { bg: '#007AFF15', color: '#007AFF' },
  Toetsenborden:        { bg: '#2C2C2E15', color: '#2C2C2E' },
  Muizen:               { bg: '#2C2C2E15', color: '#2C2C2E' },
  Webcams:              { bg: '#AF52DE15', color: '#AF52DE' },
  Luidsprekers:         { bg: '#FF2D5515', color: '#FF2D55' },
};

const PRICE_CATEGORIES = [
  { id: 'Smartphones',          name: 'Smartphones',          icon: 'smartphone',        subtitle: "GSM's & meer" },
  { id: 'Tablets',              name: 'Tablets',              icon: 'tablet-mac',        subtitle: 'iPad & Android' },
  { id: 'Laptops',              name: 'Laptops',              icon: 'laptop',           subtitle: 'Werk & studie' },
  { id: 'Desktops',             name: 'Desktops',             icon: 'desktop-windows',  subtitle: 'PC & workstation' },
  { id: 'Monitoren',            name: 'Monitoren',            icon: 'monitor',          subtitle: 'Gaming & kantoor' },
  { id: 'Televisies',           name: 'Televisies',           icon: 'tv',               subtitle: 'OLED & QLED' },
  { id: 'Audio',                name: 'Audio',                icon: 'headphones',       subtitle: 'Koptelefoons & oordopjes' },
  { id: 'Gameconsoles',         name: 'Gameconsoles',         icon: 'gamepad',          subtitle: 'PS5, Xbox & Switch' },
  { id: 'Gaming',               name: 'Gaming',               icon: 'sports-esports',  subtitle: 'Headsets & accessoires' },
  { id: 'Netwerk',              name: 'Netwerk',              icon: 'router',           subtitle: 'Routers & mesh' },
  { id: 'Fotografie',           name: 'Fotografie',           icon: 'photo-camera',    subtitle: "Camera's & lenzen" },
  { id: 'Huishoudelijk',        name: 'Huishoudelijk',        icon: 'home',             subtitle: 'Stofzuigers & meer' },
  { id: 'Wearables',            name: 'Wearables',            icon: 'watch',            subtitle: 'Smartwatches & trackers' },
  { id: 'Grafische kaarten',    name: 'Grafische kaarten',    icon: 'memory',          subtitle: "GPU's" },
  { id: 'Processors',           name: 'Processors',           icon: 'developer-board',  subtitle: "CPU's" },
  { id: 'Moerborden',           name: 'Moerborden',           icon: 'developer-board',  subtitle: 'ATX, mATX & ITX' },
  { id: 'Geheugen',             name: 'Geheugen',             icon: 'memory',           subtitle: 'DDR4 & DDR5 RAM' },
  { id: 'Opslag (SSD)',         name: 'Opslag (SSD)',         icon: 'sd-storage',       subtitle: 'NVMe & SATA' },
  { id: 'Opslag (HDD)',         name: 'Opslag (HDD)',         icon: 'album',            subtitle: 'NAS & desktop' },
  { id: 'Voedingen',            name: 'Voedingen',            icon: 'power',            subtitle: 'PSU & voeding' },
  { id: 'Computerbehuizingen',  name: 'Behuizingen',          icon: 'desktop-windows',  subtitle: 'Cases & towers' },
  { id: 'CPU-koelers',          name: 'CPU-koelers',          icon: 'ac-unit',          subtitle: 'Lucht & AIO' },
  { id: 'Ventilatoren',         name: 'Ventilatoren',         icon: 'air',              subtitle: 'Case fans' },
  { id: 'Toetsenborden',        name: 'Toetsenborden',        icon: 'keyboard',         subtitle: 'Mechanisch & meer' },
  { id: 'Muizen',               name: 'Muizen',               icon: 'mouse',            subtitle: 'Gaming & kantoor' },
  { id: 'Webcams',              name: 'Webcams',              icon: 'videocam',         subtitle: 'Streaming & videobellen' },
  { id: 'Luidsprekers',         name: 'Luidsprekers',         icon: 'speaker',          subtitle: 'Speakers & soundbars' },
] as const;

type CategoryId = (typeof PRICE_CATEGORIES)[number]['id'];

// Category Grid
function CategoryGrid({
  colors,
  isDark,
  onSelect,
}: {
  colors: (typeof Colors)['light'];
  isDark: boolean;
  onSelect: (id: CategoryId) => void;
}) {
  const { width } = useWindowDimensions();
  const cardWidth = (width - Spacing.md * 3) / 2;

  return (
    <FlatList
      data={PRICE_CATEGORIES as unknown as typeof PRICE_CATEGORIES[number][]}
      keyExtractor={(item) => item.id}
      numColumns={2}
      contentContainerStyle={styles.categoryGrid}
      columnWrapperStyle={styles.categoryRow}
      showsVerticalScrollIndicator={false}
      renderItem={({ item }) => {
          const catColors = CATEGORY_COLORS[item.id] || { bg: Palette.primary + '15', color: Palette.primary };
          return (
        <Pressable
          style={({ pressed }) => [
            styles.categoryCard,
            {
              backgroundColor: colors.surface,
              width: cardWidth,
            },
            !isDark && Shadow.sm,
            isDark && { borderWidth: 1, borderColor: colors.border },
            pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
          ]}
          onPress={() => onSelect(item.id as CategoryId)}
        >
          <View style={[styles.iconContainer, { backgroundColor: catColors.bg }]}>
            <MaterialIcons name={item.icon as any} size={28} color={catColors.color} />
          </View>
          <Text style={[styles.categoryName, { color: colors.text }]} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={[styles.categorySubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.subtitle}
          </Text>
        </Pressable>
          );
        }}
    />
  );
}

// Product List (after category selected)
function ProductList({
  categoryId,
  colors,
  isDark,
  onBack,
  onCategoryChange,
}: {
  categoryId: CategoryId;
  colors: (typeof Colors)['light'];
  isDark: boolean;
  onBack: () => void;
  onCategoryChange?: (categoryId: string) => void;
}) {
  const {
    filterConfigs,
    sortOption,
    setSortOption,
    badgeFilter,
    setBadgeFilter,
    priceRangeId,
    setPriceRangeId,
    activeFilters,
    toggleFilterValue,
    filteredProducts,
    activeFilterCount,
    resetFilters,
  } = useProductFilters(categoryId);

  const categoryLabel = PRICE_CATEGORIES.find((c) => c.id === categoryId)?.name ?? categoryId;

  const sections = useMemo(() => {
    const result: Array<{ type: 'row'; products: [Product, Product?] } | { type: 'ad' }> = [];
    const ROWS_PER_AD = 3;
    let productIndex = 0;
    let rowCount = 0;

    while (productIndex < filteredProducts.length) {
      const shouldInsertAd =
        rowCount > 0 &&
        rowCount % ROWS_PER_AD === 0 &&
        productIndex < filteredProducts.length - 1;

      if (shouldInsertAd) {
        result.push({ type: 'ad' });
      }

      const p1 = filteredProducts[productIndex];
      const p2 = filteredProducts[productIndex + 1];

      result.push({
        type: 'row',
        products: p2 ? [p1, p2] : [p1],
      });

      productIndex += 2;
      rowCount++;
    }

    return result;
  }, [filteredProducts]);

  const renderSection = ({ item }: { item: (typeof sections)[0] }) => {
    if (item.type === 'ad') {
      return (
        <View style={styles.adFullWidthWrapper}>
          <AdCard size="large" />
        </View>
      );
    }

    const hasTwoProducts = item.products.length === 2;

    return (
      <View style={styles.productRow}>
        <View style={styles.productCardWrapper}>
          <ProductCard product={item.products[0]} />
        </View>
        {hasTwoProducts && (
          <View style={styles.productCardWrapper}>
            <ProductCard product={item.products[1]!} />
          </View>
        )}
        {!hasTwoProducts && <View style={styles.productCardWrapper} />}
      </View>
    );
  };

  return (
    <View style={styles.productListContainer}>
      {/* Back header */}
      <View style={[styles.backHeader, { backgroundColor: colors.background }]}>
        <Pressable onPress={onBack} style={styles.backBtn} hitSlop={12}>
          <Text style={[styles.backArrow, { color: colors.tint }]}>‹</Text>
          <Text style={[styles.backLabel, { color: colors.tint }]}>Terug</Text>
        </Pressable>
        <Text style={[styles.categoryTitle, { color: colors.text }]} numberOfLines={1}>
          {categoryLabel}
        </Text>
        <View style={styles.backBtnSpacer} />
      </View>

      {/* Dynamic filter panel */}
      <ProductFilters
        filterConfigs={filterConfigs}
        activeFilters={activeFilters}
        onToggleFilterValue={toggleFilterValue}
        sortOption={sortOption}
        onSortChange={setSortOption}
        badgeFilter={badgeFilter}
        onBadgeFilterChange={setBadgeFilter}
        priceRangeId={priceRangeId}
        onPriceRangeChange={setPriceRangeId}
        activeFilterCount={activeFilterCount}
        onReset={resetFilters}
        resultCount={filteredProducts.length}
        currentCategoryId={categoryId}
        onCategoryChange={onCategoryChange}
      />

      {/* Products or empty state */}
      {filteredProducts.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyEmoji}>🔍</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Geen producten gevonden</Text>
          <Text style={[styles.emptyMsg, { color: colors.textSecondary }]}>
            Pas je filters aan of kies een andere categorie.
          </Text>
          {activeFilterCount > 0 && (
            <Pressable
              onPress={resetFilters}
              style={[styles.emptyResetBtn, { backgroundColor: Palette.primary }]}>
              <Text style={styles.emptyResetText}>Filters wissen</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <FlatList
          data={sections}
          keyExtractor={(_, index) => `section-${index}`}
          renderItem={renderSection}
          contentContainerStyle={styles.productGrid}
          showsVerticalScrollIndicator={false}
        />
      )}
      <CompareBar />
    </View>
  );
}

// Main screen
export default function PrijzenScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const { category } = useLocalSearchParams<{ category?: string }>();
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | null>(null);

  useEffect(() => {
    if (category) {
      const match = PRICE_CATEGORIES.find(c => c.id === category || c.name === category);
      if (match) setSelectedCategory(match.id as CategoryId);
    }
  }, [category]);

  if (selectedCategory !== null) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ProductList
          categoryId={selectedCategory}
          colors={colors}
          isDark={isDark}
          onBack={() => setSelectedCategory(null)}
          onCategoryChange={(newCategoryId: string) => setSelectedCategory(newCategoryId as CategoryId)}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.pageHeader, { backgroundColor: colors.background }]}>
        <Text style={[styles.pageTitle, { color: colors.text }]}>Prijzen</Text>
        <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>
          Vind de beste prijs per categorie
        </Text>
      </View>

      {/* PC Builder banner */}
      <Pressable
        style={({ pressed }) => [
          styles.pcBuilderBanner,
          { backgroundColor: Palette.primary },
          ...(!isDark ? [Shadow.lg] : []),
          pressed && { opacity: 0.88, transform: [{ scale: 0.99 }] },
        ]}
        onPress={() => router.push('/pc-builder')}
      >
        <View style={styles.pcBuilderLeft}>
          <View style={styles.pcBuilderIconWrap}>
            <Text style={styles.pcBuilderEmoji}>🖥️</Text>
          </View>
          <View style={styles.pcBuilderTextWrap}>
            <Text style={styles.pcBuilderTitle}>PC Samenstellen</Text>
            <Text style={styles.pcBuilderSubtitle}>De beste configuratie voor jouw budget</Text>
          </View>
        </View>
        <Text style={styles.pcBuilderArrow}>→</Text>
      </Pressable>

      <CategoryGrid colors={colors} isDark={isDark} onSelect={setSelectedCategory} />
    </View>
  );
}

// Styles
const styles = StyleSheet.create({
  container: { flex: 1 },

  pageHeader: {
    paddingTop: Spacing.xl + Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: 4,
  },
  pageTitle: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  pageSubtitle: {
    fontSize: 14,
    opacity: 0.7,
  },

  categoryGrid: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xxl,
    gap: Spacing.sm,
  },
  categoryRow: {
    gap: Spacing.sm,
  },
  categoryCard: {
    borderRadius: Radius.lg,
    padding: Spacing.md,
    paddingVertical: Spacing.md + 2,
    gap: Spacing.xs + 1,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
    letterSpacing: -0.1,
  },
  categorySubtitle: {
    fontSize: 12,
    opacity: 0.7,
  },

  productListContainer: { flex: 1 },
  backHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Spacing.xl + Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 80,
  },
  backBtnSpacer: {
    minWidth: 80,
  },
  backArrow: {
    fontSize: 28,
    fontWeight: '300',
    lineHeight: 32,
    marginRight: 2,
  },
  backLabel: {
    fontSize: 17,
  },
  categoryTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },

  productGrid: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xxl,
    gap: Spacing.sm,
  },
  productRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  productCardWrapper: {
    flex: 1,
  },

  adFullWidthWrapper: {
    width: '100%',
    minHeight: 120,
    marginVertical: Spacing.sm,
  },

  pcBuilderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  pcBuilderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
    flex: 1,
  },
  pcBuilderIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pcBuilderEmoji: {
    fontSize: 22,
  },
  pcBuilderTextWrap: {
    flex: 1,
    gap: 2,
  },
  pcBuilderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  pcBuilderSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
  },
  pcBuilderArrow: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.80)',
    marginLeft: Spacing.sm,
  },

  emptyBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.xl,
  },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 17, fontWeight: '600' },
  emptyMsg: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  emptyResetBtn: {
    marginTop: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.sm,
  },
  emptyResetText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});

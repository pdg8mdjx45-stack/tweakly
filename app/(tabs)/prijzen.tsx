/**
 * Pricewatch Screen (Prijzen)
 * Category picker -> product grid with dynamic, data-driven filters
 */

import { AdCard } from '@/components/ad-card';
import { ClearLiquidGlass } from '@/components/clear-liquid-glass';
import { CompareBar } from '@/components/compare-bar';
import { GlassPageHeader } from '@/components/glass-page-header';
import { LiquidScreen } from '@/components/liquid-screen';
import { MAIN_CATEGORIES, type MainCategory } from '@/constants/categories';
import { LinearGradient } from 'expo-linear-gradient';
import { ProductCard } from '@/components/product-card';
import { ProductFilters } from '@/components/product-filters';
import { Colors, Palette, Radius, Shadow, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useProductFilters } from '@/hooks/use-product-filters';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { type Product } from '@/services/product-db';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
  // Elektronica
  Smartphones:         { bg: '#007AFF15', color: '#007AFF' },
  Tablets:             { bg: '#5856D615', color: '#5856D6' },
  Laptops:             { bg: '#5856D615', color: '#5856D6' },
  Desktops:            { bg: '#2C2C2E15', color: '#2C2C2E' },
  Monitoren:           { bg: '#FF950015', color: '#FF9500' },
  Televisies:          { bg: '#FF950015', color: '#FF9500' },
  Audio:               { bg: '#FF2D5515', color: '#FF2D55' },
  Gameconsoles:        { bg: '#34C75915', color: '#34C759' },
  Gaming:              { bg: '#34C75915', color: '#34C759' },
  Netwerk:             { bg: '#007AFF15', color: '#007AFF' },
  Fotografie:          { bg: '#AF52DE15', color: '#AF52DE' },
  Huishoudelijk:       { bg: '#FF950015', color: '#FF9500' },
  Wearables:           { bg: '#AF52DE15', color: '#AF52DE' },
  'Grafische kaarten': { bg: '#34C75915', color: '#34C759' },
  Processors:          { bg: '#FF2D5515', color: '#FF2D55' },
  Moederborden:        { bg: '#5856D615', color: '#5856D6' },
  Geheugen:            { bg: '#FF2D5515', color: '#FF2D55' },
  'Opslag (SSD)':      { bg: '#34C75915', color: '#34C759' },
  'Opslag (HDD)':      { bg: '#34C75915', color: '#34C759' },
  Voedingen:           { bg: '#FF950015', color: '#FF9500' },
  Computerbehuizingen: { bg: '#6C6C7015', color: '#6C6C70' },
  'CPU-koelers':       { bg: '#007AFF15', color: '#007AFF' },
  Ventilatoren:        { bg: '#007AFF15', color: '#007AFF' },
  Toetsenborden:       { bg: '#2C2C2E15', color: '#2C2C2E' },
  Muizen:              { bg: '#2C2C2E15', color: '#2C2C2E' },
  Webcams:             { bg: '#AF52DE15', color: '#AF52DE' },
  Luidsprekers:        { bg: '#FF2D5515', color: '#FF2D55' },
  // Kleding
  Heren:               { bg: '#FF2D5515', color: '#FF2D55' },
  Dames:               { bg: '#FF2D5515', color: '#FF2D55' },
  Kinderen:            { bg: '#FF2D5515', color: '#FF2D55' },
  Sportkleding:        { bg: '#FF2D5515', color: '#FF2D55' },
  // Schoenen
  Sneakers:            { bg: '#FF950015', color: '#FF9500' },
  Laarzen:             { bg: '#FF950015', color: '#FF9500' },
  Sandalen:            { bg: '#FF950015', color: '#FF9500' },
  Sportschoenen:       { bg: '#FF950015', color: '#FF9500' },
  // Sport
  Fitness:             { bg: '#34C75915', color: '#34C759' },
  Wielrennen:          { bg: '#34C75915', color: '#34C759' },
  Hardlopen:           { bg: '#34C75915', color: '#34C759' },
  Kamperen:            { bg: '#34C75915', color: '#34C759' },
  // Wonen
  Meubels:             { bg: '#5856D615', color: '#5856D6' },
  Verlichting:         { bg: '#5856D615', color: '#5856D6' },
  Keuken:              { bg: '#5856D615', color: '#5856D6' },
  Tuin:                { bg: '#5856D615', color: '#5856D6' },
  // Beauty
  Huidverzorging:      { bg: '#AF52DE15', color: '#AF52DE' },
  Haarverzorging:      { bg: '#AF52DE15', color: '#AF52DE' },
  Parfum:              { bg: '#AF52DE15', color: '#AF52DE' },
  // Speelgoed
  Speelgoed:           { bg: '#FF6B3515', color: '#FF6B35' },
  Baby:                { bg: '#FF6B3515', color: '#FF6B35' },
  // Boeken
  Boeken:              { bg: '#8E8E9315', color: '#8E8E93' },
  Films:               { bg: '#8E8E9315', color: '#8E8E93' },
  Muziek:              { bg: '#8E8E9315', color: '#8E8E93' },
};

type CategoryId = string;

// ─── SubCategory Chip (stap 2: subcategorieën binnen hoofdcategorie) ──────────

type SubCategoryItem = { id: string; name: string; icon: string; color: string };

function CategoryChip({
  item,
  isDark,
  colors,
  index,
  onPress,
  animationsEnabled,
  cardWidth,
}: {
  item: SubCategoryItem;
  isDark: boolean;
  colors: (typeof Colors)['light'];
  index: number;
  onPress: () => void;
  animationsEnabled: boolean;
  cardWidth: number;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const catColors = CATEGORY_COLORS[item.id] || { bg: Palette.primary + '15', color: Palette.primary };

  return (
    <Animated.View
      entering={animationsEnabled
        ? FadeInDown.delay(Math.min(index, 8) * 45).springify().damping(18).stiffness(110)
        : undefined}
      style={[animStyle, { width: cardWidth }]}
    >
      <Pressable
        onPressIn={() => { scale.value = withSpring(0.97, { damping: 15, stiffness: 300 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 300 }); }}
        onPress={onPress}
      >
        <ClearLiquidGlass isDark={isDark} borderRadius={Radius.lg} style={styles.categoryCard}>
          <View style={[styles.iconContainer, { backgroundColor: catColors.bg }]}>
            <MaterialIcons name={item.icon as any} size={28} color={catColors.color} />
          </View>
          <Text style={[styles.categoryName, { color: colors.text }]} numberOfLines={2}>
            {item.name}
          </Text>
        </ClearLiquidGlass>
      </Pressable>
    </Animated.View>
  );
}

// ─── MainCategoryCard (stap 1: hoofdcategorieën) ─────────────────────────────

function MainCategoryCard({
  item,
  isDark,
  onPress,
  cardWidth,
  animationsEnabled,
  index,
}: {
  item: MainCategory;
  isDark: boolean;
  onPress: () => void;
  cardWidth: number;
  animationsEnabled: boolean;
  index: number;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View
      entering={animationsEnabled
        ? FadeInDown.delay(Math.min(index, 8) * 45).springify().damping(18).stiffness(110)
        : undefined}
      style={[animStyle, { width: cardWidth }]}
    >
      <Pressable
        onPressIn={() => { scale.value = withSpring(0.97, { damping: 15, stiffness: 300 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 300 }); }}
        onPress={onPress}
      >
        <LinearGradient
          colors={[item.gradient[0] + '22', item.gradient[1] + '11']}
          style={[styles.mainCatCard, { borderColor: item.color + '30' }]}
        >
          <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
            <MaterialIcons name={item.icon as any} size={32} color={item.color} />
          </View>
          <Text style={[styles.categoryName, { color: isDark ? '#fff' : '#000' }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[styles.categorySubtitle, { color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)' }]} numberOfLines={1}>
            {item.subcategories.length} categorieën
          </Text>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

// ─── MainCategoryGrid (stap 1) ────────────────────────────────────────────────

function MainCategoryGrid({
  isDark,
  onSelect,
}: {
  isDark: boolean;
  onSelect: (main: MainCategory) => void;
}) {
  const { width } = useWindowDimensions();
  const { animationsEnabled } = useReduceMotion();
  const cardWidth = (width - Spacing.md * 3) / 2;

  return (
    <FlatList
      data={MAIN_CATEGORIES}
      keyExtractor={(item) => item.id}
      numColumns={2}
      contentContainerStyle={styles.categoryGrid}
      columnWrapperStyle={styles.categoryRow}
      showsVerticalScrollIndicator={false}
      renderItem={({ item, index }) => (
        <MainCategoryCard
          item={item}
          isDark={isDark}
          index={index}
          onPress={() => onSelect(item)}
          cardWidth={cardWidth}
          animationsEnabled={animationsEnabled}
        />
      )}
    />
  );
}

// ─── SubCategoryGrid (stap 2) ─────────────────────────────────────────────────

function SubCategoryGrid({
  main,
  colors,
  isDark,
  onSelect,
}: {
  main: MainCategory;
  colors: (typeof Colors)['light'];
  isDark: boolean;
  onSelect: (id: CategoryId) => void;
}) {
  const { width } = useWindowDimensions();
  const { animationsEnabled } = useReduceMotion();
  const cardWidth = (width - Spacing.md * 3) / 2;

  return (
    <FlatList
      data={main.subcategories}
      keyExtractor={(item) => item.id}
      numColumns={2}
      contentContainerStyle={styles.categoryGrid}
      columnWrapperStyle={styles.categoryRow}
      showsVerticalScrollIndicator={false}
      renderItem={({ item, index }) => (
        <CategoryChip
          item={item}
          isDark={isDark}
          colors={colors}
          index={index}
          onPress={() => onSelect(item.id)}
          animationsEnabled={animationsEnabled}
          cardWidth={cardWidth}
        />
      )}
    />
  );
}

// Product List (after subcategory selected)
function ProductList({
  categoryId,
  colors,
  isDark,
  onBack,
  onCategoryChange,
  backLabel,
}: {
  categoryId: CategoryId;
  colors: (typeof Colors)['light'];
  isDark: boolean;
  onBack: () => void;
  onCategoryChange?: (categoryId: string) => void;
  backLabel?: string;
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

  const categoryLabel = categoryId;

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
      <View style={styles.backHeader}>
        <Pressable onPress={onBack} style={styles.backBtn} hitSlop={12}>
          <Text style={[styles.backArrow, { color: colors.tint }]}>‹</Text>
          <Text style={[styles.backLabel, { color: colors.tint }]}>{backLabel ?? 'Terug'}</Text>
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
  const { category, main } = useLocalSearchParams<{ category?: string; main?: string }>();

  const [selectedMain, setSelectedMain] = useState<MainCategory | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | null>(null);

  useEffect(() => {
    // Deep-link via ?main=elektronica
    if (main) {
      const m = MAIN_CATEGORIES.find(c => c.id === main);
      if (m) { setSelectedMain(m); return; }
    }
    // Deep-link via ?category=Smartphones (legacy subcategorie)
    if (category) {
      const parentMain = MAIN_CATEGORIES.find(m =>
        m.subcategories.some(s => s.id === category || s.name === category)
      );
      if (parentMain) {
        setSelectedMain(parentMain);
        setSelectedCategory(category);
      }
    }
  }, [category, main]);

  // Stap 3: producten (subcategorie geselecteerd)
  if (selectedMain !== null && selectedCategory !== null) {
    return (
      <LiquidScreen style={styles.container}>
        <ProductList
          categoryId={selectedCategory}
          colors={colors}
          isDark={isDark}
          backLabel={selectedMain.name}
          onBack={() => setSelectedCategory(null)}
          onCategoryChange={(newId: string) => setSelectedCategory(newId)}
        />
      </LiquidScreen>
    );
  }

  // Stap 2: subcategorieën van geselecteerde hoofdcategorie
  if (selectedMain !== null) {
    return (
      <LiquidScreen style={styles.container}>
        <View style={styles.backHeader}>
          <Pressable onPress={() => setSelectedMain(null)} style={styles.backBtn} hitSlop={12}>
            <Text style={[styles.backArrow, { color: colors.tint }]}>‹</Text>
            <Text style={[styles.backLabel, { color: colors.tint }]}>Categorieën</Text>
          </Pressable>
          <Text style={[styles.categoryTitle, { color: colors.text }]} numberOfLines={1}>
            {selectedMain.name}
          </Text>
          <View style={styles.backBtnSpacer} />
        </View>
        <SubCategoryGrid
          main={selectedMain}
          colors={colors}
          isDark={isDark}
          onSelect={(id) => setSelectedCategory(id)}
        />
      </LiquidScreen>
    );
  }

  // Stap 1: hoofdcategorie grid
  return (
    <LiquidScreen style={styles.container}>
      <GlassPageHeader title="Prijzen" subtitle="Kies een categorie" />
      <MainCategoryGrid isDark={isDark} onSelect={(m) => { setSelectedMain(m); setSelectedCategory(null); }} />
    </LiquidScreen>
  );
}

// Styles
const styles = StyleSheet.create({
  container: { flex: 1 },



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
    borderRadius: Radius.lg,
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
  mainCatCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.xs,
    minHeight: 110,
    justifyContent: 'center',
  },
});


/**
 * Home Screen — Visual, engaging dashboard
 */

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, useRouter } from 'expo-router';
import { Dimensions, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { PRICE_DISCLAIMER } from '@/constants/mock-data';
import { Colors, Glass, Palette, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useProductImage } from '@/hooks/use-product-image';
import { getAllProducts, getBestDeal, getNewProducts, getPriceDrops, type Product } from '@/services/product-db';
import { useEffect, useRef, useState } from 'react';
import { useTour } from '@/hooks/use-tour';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const USER_NAME = 'Alex';

// Use MaterialIcons names directly (not SF Symbols) for categories
const CATEGORIES = [
  { id: 'smartphones',  label: 'Smartphones',  icon: 'smartphone'       as const, color: '#007AFF', bg: '#007AFF15' },
  { id: 'laptops',      label: 'Laptops',       icon: 'laptop'           as const, color: '#5856D6', bg: '#5856D615' },
  { id: 'audio',        label: 'Audio',          icon: 'headphones'       as const, color: '#FF2D55', bg: '#FF2D5515' },
  { id: 'televisies',   label: 'TV\'s',          icon: 'tv'               as const, color: '#FF9500', bg: '#FF950015' },
  { id: 'gaming',       label: 'Gaming',         icon: 'sports-esports'   as const, color: '#34C759', bg: '#34C75915' },
  { id: 'wearables',    label: 'Wearables',      icon: 'watch'            as const, color: '#AF52DE', bg: '#AF52DE15' },
];

function ProductThumb({ product, style, fallbackStyle }: { product: Product; style: any; fallbackStyle?: any }) {
  const imageUrl = useProductImage(product.name, product.imageUrl);
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <View style={[style, fallbackStyle, { alignItems: 'center', justifyContent: 'center' }]}>
        <MaterialIcons name="shopping-bag" size={32} color="#C0C0C8" />
        <Text style={{ fontSize: 9, color: '#A0A0A8', marginTop: 3, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>{product.brand}</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri: imageUrl }}
      style={style}
      contentFit="contain"
      transition={200}
      onError={() => setFailed(true)}
    />
  );
}

function HeroDeal({ deal, isDark, colors }: { deal: Product; isDark: boolean; colors: typeof Colors.light }) {
  const pct = Math.round(((deal.originalPrice - deal.currentPrice) / deal.originalPrice) * 100);

  return (
    <View style={styles.heroSection}>
      <Link href={`/product/${deal.id}`} asChild>
        <Pressable
          style={({ pressed }) => [
            styles.heroCard,
            pressed && { opacity: 0.95, transform: [{ scale: 0.985 }] },
          ]}
        >
          <LinearGradient
            colors={isDark ? ['rgba(26,10,12,0.8)', 'rgba(45,16,21,0.6)', 'rgba(26,10,12,0.8)'] : ['rgba(255,245,245,0.75)', 'rgba(255,232,234,0.6)', 'rgba(255,240,240,0.75)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            {/* Badge row */}
            <View style={styles.heroBadgeRow}>
              <View style={styles.heroDealBadge}>
                <Text style={styles.heroDealBadgeText}>DEAL VAN DE DAG</Text>
              </View>
              <View style={styles.heroDiscountBadge}>
                <Text style={styles.heroDiscountText}>-{pct}%</Text>
              </View>
            </View>

            {/* Product info — compact layout without large image gap */}
            <View style={styles.heroContent}>
              <View style={[styles.heroImageBox, isDark ? { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' } : { backgroundColor: 'rgba(255,255,255,0.65)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' }]}>
                <ProductThumb product={deal} style={styles.heroImage} fallbackStyle={styles.heroImageFallback} />
              </View>
              <View style={styles.heroInfo}>
                <Text style={[styles.heroBrand, { color: isDark ? '#999' : '#888' }]}>{deal.brand}</Text>
                <Text style={[styles.heroName, { color: isDark ? '#fff' : '#111' }]} numberOfLines={2}>
                  {deal.name}
                </Text>
                <View style={styles.heroPriceRow}>
                  <Text style={[styles.heroPrice, { color: Palette.primary }]}>
                    €{deal.currentPrice.toLocaleString('nl-NL')}
                  </Text>
                  <Text style={[styles.heroOriginal, { color: isDark ? '#666' : '#999' }]}>
                    €{deal.originalPrice.toLocaleString('nl-NL')}
                  </Text>
                </View>
                <Text style={[styles.heroShops, { color: isDark ? '#777' : '#999' }]}>
                  {deal.shops.length} winkels vergelijken
                </Text>
              </View>
            </View>

            {/* CTA */}
            <View style={styles.heroCta}>
              <LinearGradient
                colors={[Palette.primary, Palette.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.heroCtaGradient}
              >
                <Text style={styles.heroCtaText}>Bekijk deal</Text>
                <IconSymbol size={16} name="chevron.right" color="#fff" />
              </LinearGradient>
            </View>
          </LinearGradient>
        </Pressable>
      </Link>
    </View>
  );
}

function ProductCard({ product, isDark, colors, width }: { product: Product; isDark: boolean; colors: typeof Colors.light; width: number }) {
  const pct = Math.round(((product.originalPrice - product.currentPrice) / product.originalPrice) * 100);
  const hasDrop = product.currentPrice < product.originalPrice;

  return (
    <Link href={`/product/${product.id}`} asChild>
      <Pressable
        style={({ pressed }) => [
          styles.productCard,
          { width },
          isDark ? Glass.card : Glass.cardLight,
          pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] },
        ]}
      >
        <View style={[styles.productImageWrap, { backgroundColor: isDark ? Palette.dark3 : '#F5F5F7' }]}>
          <ProductThumb product={product} style={styles.productImage} fallbackStyle={styles.productImageFallback} />
          {hasDrop && (
            <View style={styles.productBadge}>
              <Text style={styles.productBadgeText}>-{pct}%</Text>
            </View>
          )}
        </View>
        <View style={styles.productInfo}>
          <Text style={[styles.productBrand, { color: colors.textSecondary }]}>{product.brand}</Text>
          <Text style={[styles.productName, { color: colors.text }]} numberOfLines={2}>
            {product.name}
          </Text>
          <View style={styles.productPriceRow}>
            <Text style={[styles.productPrice, { color: colors.text }]}>
              €{product.currentPrice.toLocaleString('nl-NL')}
            </Text>
            {hasDrop && (
              <Text style={[styles.productOriginal, { color: colors.textSecondary }]}>
                €{product.originalPrice.toLocaleString('nl-NL')}
              </Text>
            )}
          </View>
          <View style={styles.productRatingRow}>
            <MaterialIcons name="star" size={13} color={Palette.star} />
            <Text style={[styles.productRating, { color: colors.textSecondary }]}>
              {product.rating.toFixed(1)} ({product.reviewCount})
            </Text>
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

export default function HomeScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const { registerRef } = useTour();
  const searchBarRef = useRef<View>(null);

  const [priceDrops, setPriceDrops] = useState<Product[]>([]);
  const [newProducts, setNewProducts] = useState<Product[]>([]);
  const [bestDeal, setBestDeal] = useState<Product | undefined>(undefined);
  const [trendingProducts, setTrendingProducts] = useState<Product[]>([]);

  useEffect(() => {
    getPriceDrops(8).then(setPriceDrops);
    getNewProducts().then(setNewProducts);
    getBestDeal().then(setBestDeal);
    getAllProducts().then(all => {
      const sorted = [...all].sort((a, b) => b.rating - a.rating).slice(0, 10);
      setTrendingProducts(sorted);
    });
  }, []);

  const CARD_WIDTH = SCREEN_WIDTH * 0.42;

  return (
    <View style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, isDark ? Glass.liquid.dark : Glass.liquid.light]}>
        <View style={styles.headerRow}>
          <Image
            source={require('@/assets/images/icon.png')}
            style={styles.logo}
            contentFit="contain"
          />

          <View style={styles.headerTextWrap}>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>Welkom terug</Text>
            <Text style={[styles.userName, { color: colors.text }]}>{USER_NAME}</Text>
          </View>
        </View>

        {/* Search bar */}
        <Pressable
          ref={(r) => { searchBarRef.current = r as any; registerRef('searchBar', r as any); }}
          onPress={() => router.push('/(tabs)/zoeken' as any)}
          style={[
            styles.searchBar,
            isDark ? Glass.card : Glass.surfaceLight,
          ]}
        >
          <IconSymbol size={18} name="magnifyingglass" color={colors.textSecondary} />
          <Text style={[styles.searchPlaceholder, { color: colors.textSecondary }]}>
            Zoek producten, merken...
          </Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Hero deal */}
        {bestDeal && <HeroDeal deal={bestDeal} isDark={isDark} colors={colors} />}

        {/* Categories */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, styles.sectionTitleStandalone, { color: colors.text }]}>Categorieën</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            {CATEGORIES.map(cat => (
              <Pressable
                key={cat.id}
                onPress={() => router.push('/(tabs)/categorieen' as any)}
                style={({ pressed }) => [
                  styles.categoryChip,
                  isDark ? Glass.card : { backgroundColor: 'rgba(255,255,255,0.6)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
                  pressed && { opacity: 0.7, transform: [{ scale: 0.96 }] },
                ]}
              >
                <View style={[styles.categoryIconWrap, { backgroundColor: cat.color + '22' }]}>
                  <MaterialIcons name={cat.icon as any} size={22} color={cat.color} />
                </View>
                <Text style={[styles.categoryLabel, { color: isDark ? '#ddd' : '#333' }]}>{cat.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
          
          {/* Smart recommendation button */}
          <Pressable
            onPress={() => router.push('/(tabs)/categorieen' as any)}
            style={({ pressed }) => [
              styles.recommendBanner,
              { backgroundColor: Palette.primary + '15' },
              pressed && { opacity: 0.8 },
            ]}
          >
            <View style={[styles.recommendIcon, { backgroundColor: Palette.primary }]}>
              <MaterialIcons name="auto-awesome" size={20} color="#fff" />
            </View>
            <View style={styles.recommendTextWrap}>
              <Text style={[styles.recommendTitle, { color: colors.text }]}>
                ✨ Weet je niet wat je moet kiezen?
              </Text>
              <Text style={[styles.recommendSub, { color: colors.textSecondary }]}>
                Laat ons je helpen met het juiste product
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={Palette.primary} />
          </Pressable>
        </View>

        {/* Price drops */}
        {priceDrops.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <View style={[styles.sectionDot, { backgroundColor: Palette.accent }]} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Prijsdalingen</Text>
              </View>
              <Pressable onPress={() => router.push('/(tabs)/prijzen')} hitSlop={8}>
                <Text style={[styles.seeAll, { color: Palette.primary }]}>Bekijk alle</Text>
              </Pressable>
            </View>
            <FlatList
              horizontal
              data={priceDrops}
              keyExtractor={item => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
              renderItem={({ item }) => (
                <ProductCard product={item} isDark={isDark} colors={colors} width={CARD_WIDTH} />
              )}
            />
          </View>
        )}

        {/* Trending / Popular */}
        {trendingProducts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <View style={[styles.sectionDot, { backgroundColor: '#FF9500' }]} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Populair</Text>
              </View>
              <Pressable onPress={() => router.push('/(tabs)/prijzen')} hitSlop={8}>
                <Text style={[styles.seeAll, { color: Palette.primary }]}>Bekijk alle</Text>
              </Pressable>
            </View>
            <FlatList
              horizontal
              data={trendingProducts}
              keyExtractor={item => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
              renderItem={({ item }) => (
                <ProductCard product={item} isDark={isDark} colors={colors} width={CARD_WIDTH} />
              )}
            />
          </View>
        )}

        {/* New products */}
        {newProducts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <View style={[styles.sectionDot, { backgroundColor: Palette.primary }]} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Nieuw toegevoegd</Text>
              </View>
            </View>
            <FlatList
              horizontal
              data={newProducts}
              keyExtractor={item => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
              renderItem={({ item }) => (
                <ProductCard product={item} isDark={isDark} colors={colors} width={CARD_WIDTH} />
              )}
            />
          </View>
        )}

        {/* Disclaimer */}
        <View style={styles.disclaimerContainer}>
          <Text style={[styles.disclaimerText, { color: colors.textSecondary }]}>
            {PRICE_DISCLAIMER}
          </Text>
          
          {/* Legal links */}
          <View style={styles.legalLinks}>
            <Link href="/privacy" asChild>
              <Text style={[styles.legalLink, { color: colors.textSecondary }]}>Privacy</Text>
            </Link>
            <Text style={[styles.legalDot, { color: colors.textSecondary }]}>•</Text>
            <Link href="/terms" asChild>
              <Text style={[styles.legalLink, { color: colors.textSecondary }]}>Voorwaarden</Text>
            </Link>
            <Text style={[styles.legalDot, { color: colors.textSecondary }]}>•</Text>
            <Link href="/cookies" asChild>
              <Text style={[styles.legalLink, { color: colors.textSecondary }]}>Cookies</Text>
            </Link>
          </View>
          
          <Text style={[styles.copyright, { color: colors.textSecondary }]}>
            © 2026 Tweakly. Alle rechten voorbehouden.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scrollContent: { paddingBottom: Spacing.xxl },

  // Header
  header: {
    paddingTop: Spacing.xl + Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    borderRadius: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 4,
  },
  logo: {
    width: 52,
    height: 52,
  },
  headerTextWrap: {
    flex: 1,
    marginLeft: 2,
  },
  greeting: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 1,
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 13,
    borderRadius: Radius.lg,
  },
  searchPlaceholder: {
    fontSize: 15,
    fontWeight: '400',
  },

  // Hero deal
  heroSection: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md + 4,
  },
  heroCard: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  heroGradient: {
    padding: Spacing.md,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  heroDealBadge: {
    backgroundColor: Palette.primary,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  heroDealBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  heroDiscountBadge: {
    backgroundColor: 'rgba(52,199,89,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(52,199,89,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  heroDiscountText: {
    color: Palette.accent,
    fontSize: 14,
    fontWeight: '800',
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  heroImageBox: {
    width: 110,
    height: 110,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  heroImage: {
    width: 90,
    height: 90,
  },
  heroImageFallback: {
    width: 110,
    height: 110,
    backgroundColor: 'transparent',
  },
  heroInfo: {
    flex: 1,
    gap: 4,
  },
  heroBrand: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  heroName: {
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 22,
  },
  heroPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.sm,
    marginTop: 4,
  },
  heroPrice: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  heroOriginal: {
    fontSize: 14,
    textDecorationLine: 'line-through',
  },
  heroShops: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  heroCta: {
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  heroCtaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: Spacing.xs,
  },
  heroCtaText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },

  // Sections
  section: {
    paddingTop: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm + 4,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  sectionTitleStandalone: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm + 2,
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Category chips
  categoryScroll: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm + 2,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.lg,
    gap: Spacing.sm + 2,
  },
  categoryIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '700',
  },

  // Recommendation banner
  recommendBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    gap: Spacing.sm,
  },
  recommendIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recommendTextWrap: {
    flex: 1,
  },
  recommendTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  recommendSub: {
    fontSize: 12,
    marginTop: 2,
  },

  // Horizontal product cards
  horizontalList: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm + 4,
  },
  productCard: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  productImageWrap: {
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    position: 'relative',
  },
  productImage: {
    width: '65%',
    height: '70%',
  },
  productImageFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
  productBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: Palette.accent,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  productBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  productInfo: {
    padding: Spacing.sm + 2,
    gap: 3,
  },
  productBrand: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  productName: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 17,
    minHeight: 34,
  },
  productPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 2,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  productOriginal: {
    fontSize: 11,
    textDecorationLine: 'line-through',
  },
  productRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  productRating: {
    fontSize: 11,
    fontWeight: '500',
  },

  // Disclaimer
  disclaimerContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
    paddingTop: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  disclaimerText: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
  legalLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  legalLink: {
    fontSize: 12,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  legalDot: {
    fontSize: 12,
  },
  copyright: {
    fontSize: 11,
    marginTop: Spacing.xs,
  },
});

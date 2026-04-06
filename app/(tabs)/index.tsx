/**
 * Home Screen
 */

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, useRouter } from 'expo-router';
import { Dimensions, FlatList, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ClearLiquidGlass } from '@/components/clear-liquid-glass';
import { LiquidScreen } from '@/components/liquid-screen';
import { useReduceMotion } from '@/hooks/use-reduce-motion';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { PRICE_DISCLAIMER } from '@/constants/mock-data';
import { Colors, Glass, Palette, Radius, Shadow, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useProductImage } from '@/hooks/use-product-image';
import { getAllProducts, getBestDeal, getNewProducts, getPriceDrops, type Product } from '@/services/product-db';
import { useEffect, useRef, useState } from 'react';
import { useTour } from '@/hooks/use-tour';
import { MAIN_CATEGORIES } from '@/constants/categories';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.44;

const CATEGORIES = MAIN_CATEGORIES.slice(0, 6).map(m => ({
  id: m.id,
  label: m.name,
  icon: m.icon as any,
  color: m.color,
}));

// ─── Product thumbnail ────────────────────────────────────────────────────────

function ProductThumb({ product, style }: { product: Product; style: any }) {
  const imageUrl = useProductImage(product.name, product.imageUrl);
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <View style={[style, { alignItems: 'center', justifyContent: 'center' }]}>
        <MaterialIcons name="shopping-bag" size={28} color="#C0C0C8" />
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

// ─── Hero deal card ───────────────────────────────────────────────────────────

function HeroDeal({ deal, isDark }: { deal: Product; isDark: boolean }) {
  const pct = Math.round(((deal.originalPrice - deal.currentPrice) / deal.originalPrice) * 100);

  return (
    <Link href={`/product/${deal.id}`} asChild>
      <Pressable
        style={({ pressed }) => [
          styles.heroCardShadow,
          pressed && { opacity: 0.95, transform: [{ scale: 0.985 }] },
        ]}
      >
        <LinearGradient
          colors={isDark ? [Palette.primaryDark, '#0A1F0E'] : [Palette.primary, Palette.primaryLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroGradient}
        >
          {/* Label + discount */}
          <View style={styles.heroBadgeRow}>
            <View style={styles.heroDealBadge}>
              <Text style={styles.heroDealBadgeText}>DEAL VAN DE DAG</Text>
            </View>
            <View style={styles.heroDiscountBadge}>
              <Text style={styles.heroDiscountText}>-{pct}%</Text>
            </View>
          </View>

          {/* Image + info */}
          <View style={styles.heroBody}>
            <View style={styles.heroImageBox}>
              <ProductThumb product={deal} style={styles.heroImage} />
            </View>
            <View style={styles.heroInfo}>
              <Text style={styles.heroBrand}>{deal.brand}</Text>
              <Text style={styles.heroName} numberOfLines={2}>{deal.name}</Text>
              <View style={styles.heroPriceRow}>
                <Text style={styles.heroPrice}>
                  €{deal.currentPrice.toLocaleString('nl-NL')}
                </Text>
                <Text style={styles.heroOriginal}>
                  €{deal.originalPrice.toLocaleString('nl-NL')}
                </Text>
              </View>
              <Text style={styles.heroShops}>{deal.shops.length} winkels</Text>
            </View>
          </View>

          {/* CTA — liquid glass frosted pill */}
          <View style={styles.heroCta}>
            {/* Caustic shimmer */}
            <LinearGradient
              colors={['rgba(255,255,255,0.32)', 'rgba(255,255,255,0.00)']}
              style={styles.heroCtaCaustic}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              pointerEvents="none"
            />
            {/* Specular rim */}
            <View style={styles.heroCtaGloss} pointerEvents="none" />
            {/* Lens blob */}
            <View style={styles.heroCtaBlob} pointerEvents="none" />
            {/* Bottom inner shadow */}
            <LinearGradient
              colors={['rgba(0,0,0,0.00)', 'rgba(0,0,0,0.22)']}
              style={styles.heroCtaInnerShadow}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              pointerEvents="none"
            />
            <Text style={styles.heroCtaText}>Bekijk deal</Text>
            <IconSymbol size={15} name="chevron.right" color="#fff" />
          </View>
        </LinearGradient>
      </Pressable>
    </Link>
  );
}

// ─── Product card ─────────────────────────────────────────────────────────────

function ProductCard({ product, isDark, colors }: { product: Product; isDark: boolean; colors: typeof Colors.light }) {
  const hasDrop = product.currentPrice < product.originalPrice;
  const pct = hasDrop
    ? Math.round(((product.originalPrice - product.currentPrice) / product.originalPrice) * 100)
    : 0;

  return (
    <Link href={`/product/${product.id}`} asChild>
      <Pressable
        style={({ pressed }) => [
          styles.productCard,
          { width: CARD_WIDTH },
          pressed && { opacity: 0.92, transform: [{ scale: 0.97 }] },
        ]}
      >
        <View
          style={[
            styles.productCardInner,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >

          {/* Image */}
          <View style={styles.productImageWrap}>
            <ProductThumb product={product} style={styles.productImage} />
            {pct >= 10 && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountBadgeText}>-{pct}%</Text>
              </View>
            )}
          </View>

          {/* Info */}
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
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({
  title,
  linkLabel,
  onLink,
  colors,
  sectionIndex = 0,
  animationsEnabled = true,
}: {
  title: string;
  linkLabel?: string;
  onLink?: () => void;
  colors: typeof Colors.light;
  sectionIndex?: number;
  animationsEnabled?: boolean;
}) {
  return (
    <Animated.View
      entering={animationsEnabled ? FadeInDown.delay(sectionIndex * 80).springify().damping(20).stiffness(130) : undefined}
      style={styles.sectionHeader}
    >
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      {linkLabel && onLink && (
        <Pressable onPress={onLink} hitSlop={8}>
          <Text style={[styles.seeAll, { color: colors.tint }]}>{linkLabel}</Text>
        </Pressable>
      )}
    </Animated.View>
  );
}

// ─── Home screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const { registerRef } = useTour();
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const searchBarRef = useRef<View>(null);
  const userName = profile?.displayName?.split(' ')[0] || 'Tweakly';

  const { animationsEnabled } = useReduceMotion();
  const [priceDrops, setPriceDrops] = useState<Product[]>([]);
  const [newProducts, setNewProducts] = useState<Product[]>([]);
  const [bestDeal, setBestDeal] = useState<Product | undefined>(undefined);

  useEffect(() => {
    getPriceDrops(8).then(setPriceDrops);
    getNewProducts().then(p => setNewProducts(p.slice(0, 8)));
    getBestDeal().then(setBestDeal);
  }, []);

  return (
    <LiquidScreen style={styles.safe}>
      {/* ── Header — liquid glass ── */}
      <BlurView
        intensity={isDark ? 72 : 60}
        tint={isDark ? 'dark' : 'light'}
        style={[
          styles.header,
          isDark ? Glass.header.dark : Glass.header.light,
          { paddingTop: insets.top + Spacing.sm },
        ]}
      >
        <View style={styles.headerRow}>
          <Image
            source={require('@/assets/images/logo-display.png')}
            style={styles.logo}
            contentFit="contain"
          />
          <View style={styles.headerTextWrap}>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>Welkom terug</Text>
            <Text style={[styles.userName, { color: colors.text }]}>{userName}</Text>
          </View>
          <Pressable
            onPress={() => router.push('/(tabs)/meldingen' as any)}
            style={styles.headerIconBtn}
            hitSlop={6}
          >
            <BlurView
              intensity={isDark ? 55 : 70}
              tint={isDark ? 'dark' : 'light'}
              style={styles.headerIconBlur}
            >
              <View style={[styles.headerIconTint, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.45)' }]} />
              <IconSymbol name="bell.fill" size={19} color={isDark ? 'rgba(255,255,255,0.90)' : 'rgba(0,0,0,0.75)'} />
            </BlurView>
          </Pressable>
        </View>

        {/* Search bar */}
        <Pressable
          ref={(r) => { searchBarRef.current = r as any; registerRef('searchBar', r as any); }}
          onPress={() => router.push('/(tabs)/zoeken' as any)}
          style={[styles.searchBar, { borderColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.80)' }]}
        >
          <BlurView
            intensity={isDark ? 52 : 62}
            tint={isDark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
          <View style={[StyleSheet.absoluteFill, {
            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.52)',
            borderRadius: Radius.xl,
          }]} pointerEvents="none" />
          <LinearGradient
            colors={isDark
              ? ['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.00)']
              : ['rgba(255,255,255,0.70)', 'rgba(255,255,255,0.00)']}
            style={styles.searchCaustic}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            pointerEvents="none"
          />
          <View style={[styles.searchSpecular, {
            backgroundColor: isDark ? 'rgba(255,255,255,0.50)' : 'rgba(255,255,255,1.00)',
          }]} pointerEvents="none" />
          <View style={[styles.searchBlob, {
            backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.55)',
          }]} pointerEvents="none" />
          <IconSymbol size={16} name="magnifyingglass" color={colors.textSecondary} />
          <Text style={[styles.searchPlaceholder, { color: colors.textSecondary }]}>
            Zoek producten, merken...
          </Text>
        </Pressable>
        {/* Link Scanner pill */}
        <Pressable onPress={() => router.push('/link-scanner' as any)} style={styles.scannerPill}>
          <ClearLiquidGlass isDark={isDark} borderRadius={999} style={styles.scannerPillGlass}>
            <Text style={styles.scannerPillText}>🔗  Plak productlink</Text>
          </ClearLiquidGlass>
        </Pressable>
      </BlurView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* ── Hero deal ── */}
        {bestDeal && (
          <View style={styles.heroPad}>
            <HeroDeal deal={bestDeal} isDark={isDark} />
          </View>
        )}

        {/* ── Categorieën ── */}
        <View style={styles.section}>
          <SectionHeader
            title="Categorieën"
            linkLabel="Alle"
            onLink={() => router.push('/categorieen?mode=browse' as any)}
            colors={colors}
            sectionIndex={0}
            animationsEnabled={animationsEnabled}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            {CATEGORIES.map(cat => (
              <Pressable
                key={cat.id}
                onPress={() => router.push(`/(tabs)/prijzen?main=${cat.id}` as any)}
                style={({ pressed }) => [
                  styles.categoryPill,
                  { borderColor: cat.color + (isDark ? '50' : '40') },
                  pressed && { opacity: 0.7, transform: [{ scale: 0.96 }] },
                ]}
              >
                {/* Blur base */}
                <BlurView
                  intensity={isDark ? 45 : 55}
                  tint={isDark ? 'dark' : 'light'}
                  style={StyleSheet.absoluteFill}
                />
                {/* Colored tint */}
                <View style={[StyleSheet.absoluteFill, {
                  backgroundColor: isDark ? cat.color + '28' : cat.color + '18',
                  borderRadius: Radius.full,
                }]} pointerEvents="none" />
                {/* Caustic shimmer */}
                <LinearGradient
                  colors={isDark
                    ? ['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.00)']
                    : ['rgba(255,255,255,0.65)', 'rgba(255,255,255,0.00)']}
                  style={styles.pillCaustic}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  pointerEvents="none"
                />
                {/* Specular rim */}
                <View style={[styles.categoryPillSpecular, {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.90)',
                }]} pointerEvents="none" />
                {/* Lens blob */}
                <View style={[styles.pillBlob, {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.55)',
                }]} pointerEvents="none" />
                <MaterialIcons name={cat.icon as any} size={16} color={cat.color} />
                <Text style={[styles.categoryLabel, { color: cat.color }]}>{cat.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* ── Productadviseur banner ── */}
        <View style={[styles.section, { paddingHorizontal: Spacing.md }]}>
          <Pressable
            onPress={() => router.push('/categorieen?mode=select' as any)}
            style={({ pressed }) => [
              styles.recommenderBanner,
              pressed && { opacity: 0.88, transform: [{ scale: 0.985 }] },
            ]}
          >
            <LinearGradient
              colors={isDark ? ['#1A3A20', '#0D2010'] : [Palette.primary, '#2D6A3A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.recommenderGradient}
            >
              <View style={styles.recommenderIcon}>
                <MaterialIcons name="auto-awesome" size={28} color="#FFD700" />
              </View>
              <View style={styles.recommenderText}>
                <Text style={styles.recommenderTitle}>Productadviseur</Text>
                <Text style={styles.recommenderSub}>Vind het perfecte product in 4 vragen</Text>
              </View>
              <View style={styles.recommenderArrow}>
                <IconSymbol name="arrow.right" size={18} color="rgba(255,255,255,0.9)" />
              </View>
            </LinearGradient>
          </Pressable>
        </View>

        {/* ── Prijsdalingen ── */}
        {priceDrops.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              title="Prijsdalingen"
              linkLabel="Bekijk alle"
              onLink={() => router.push('/(tabs)/prijzen')}
              colors={colors}
              sectionIndex={1}
              animationsEnabled={animationsEnabled}
            />
            <FlatList
              horizontal
              data={priceDrops}
              keyExtractor={item => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
              renderItem={({ item }) => (
                <ProductCard product={item} isDark={isDark} colors={colors} />
              )}
            />
          </View>
        )}

        {/* ── Nieuw ── */}
        {newProducts.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              title="Nieuw toegevoegd"
              linkLabel="Bekijk alle"
              onLink={() => router.push('/(tabs)/prijzen')}
              colors={colors}
              sectionIndex={2}
              animationsEnabled={animationsEnabled}
            />
            <FlatList
              horizontal
              data={newProducts}
              keyExtractor={item => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
              renderItem={({ item }) => (
                <ProductCard product={item} isDark={isDark} colors={colors} />
              )}
            />
          </View>
        )}

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <Text style={[styles.disclaimerText, { color: colors.textSecondary }]}>
            {PRICE_DISCLAIMER}
          </Text>
          <View style={styles.legalLinks}>
            <Link href="/privacy" asChild>
              <Text style={[styles.legalLink, { color: colors.textSecondary }]}>Privacy</Text>
            </Link>
            <Text style={[styles.legalDot, { color: colors.textSecondary }]}>·</Text>
            <Link href="/terms" asChild>
              <Text style={[styles.legalLink, { color: colors.textSecondary }]}>Voorwaarden</Text>
            </Link>
            <Text style={[styles.legalDot, { color: colors.textSecondary }]}>·</Text>
            <Link href="/affiliate" asChild>
              <Text style={[styles.legalLink, { color: colors.textSecondary }]}>Affiliate</Text>
            </Link>
          </View>
        </View>
      </ScrollView>
    </LiquidScreen>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scannerPill: { marginHorizontal: Spacing.md, marginTop: Spacing.sm, marginBottom: 2 },
  scannerPillGlass: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, alignItems: 'center', justifyContent: 'center' },
  scannerPillText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.75)', letterSpacing: 0.1 },
  scrollContent: { paddingBottom: Spacing.xxl + Spacing.lg },

  header: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm + 2,
    ...Shadow.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
    marginBottom: Spacing.sm + 2,
  },
  logo: {
    width: 46,
    height: 46,
  },
  headerTextWrap: {
    flex: 1,
  },
  greeting: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  headerIconBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    overflow: 'hidden',
    ...Shadow.md,
  },
  headerIconBlur: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  headerIconTint: {
    ...StyleSheet.absoluteFillObject,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderRadius: Radius.xl,
    borderWidth: 0.5,
    overflow: 'hidden',
  },
  searchCaustic: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '60%',
    borderRadius: Radius.xl,
  },
  searchSpecular: {
    position: 'absolute',
    top: 0,
    left: 12,
    right: 12,
    height: 1,
    borderRadius: 999,
  },
  searchBlob: {
    position: 'absolute',
    top: 4,
    left: 22,
    width: 55,
    height: 8,
    borderRadius: 999,
    opacity: 0.60,
  },
  searchPlaceholder: {
    fontSize: 15,
  },

  // Hero — iOS 26 prominent card with deep shadow
  heroPad: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md + 2,
  },
  heroCardShadow: {
    borderRadius: Radius.xxl,
    shadowColor: Palette.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 32,
    elevation: 12,
  },
  heroGradient: {
    borderRadius: Radius.xxl,
    overflow: 'hidden',
    padding: Spacing.md + 2,
    gap: Spacing.md,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroDealBadge: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  heroDealBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  heroDiscountBadge: {
    backgroundColor: Palette.accent,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  heroDiscountText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  heroBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  heroImageBox: {
    width: 124,
    height: 124,
    borderRadius: Radius.xl,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  heroImage: {
    width: 104,
    height: 104,
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
    color: 'rgba(255,255,255,0.65)',
  },
  heroName: {
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 22,
    color: '#fff',
  },
  heroPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.sm,
    marginTop: 2,
  },
  heroPrice: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
    color: '#fff',
  },
  heroOriginal: {
    fontSize: 14,
    textDecorationLine: 'line-through',
    color: 'rgba(255,255,255,0.5)',
  },
  heroShops: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '500',
  },
  heroCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: Spacing.xs + 1,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.20)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.48)',
    // liquid glass specular glow
    shadowColor: 'rgba(255,255,255,0.3)',
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 1,
    shadowRadius: 0,
    overflow: 'hidden',
  },
  heroCtaText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  heroCtaCaustic: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '65%',
    borderRadius: Radius.full,
  },
  heroCtaGloss: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderRadius: 999,
  },
  heroCtaBlob: {
    position: 'absolute',
    top: 4,
    left: 28,
    width: 70,
    height: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.30)',
    opacity: 0.70,
  },
  heroCtaInnerShadow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '35%',
    borderRadius: Radius.full,
  },

  // Sections — iOS 26 rhythm: generous vertical spacing
  section: {
    paddingTop: Spacing.lg + 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm + 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.05,
  },

  // Category pills
  categoryScroll: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  recommenderBanner: {
    borderRadius: Radius.xxl,
    overflow: 'hidden',
    shadowColor: Palette.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  recommenderGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: Spacing.md + 2,
    gap: Spacing.sm + 2,
  },
  recommenderIcon: {
    width: 50,
    height: 50,
    borderRadius: Radius.lg,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  recommenderText: {
    flex: 1,
    gap: 4,
  },
  recommenderTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.05,
  },
  recommenderSub: {
    color: 'rgba(255,255,255,0.70)',
    fontSize: 13,
    letterSpacing: 0.05,
  },
  recommenderArrow: {
    width: 34,
    height: 34,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.20)',
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.full,
    borderWidth: 0.5,
    overflow: 'hidden',
    ...Shadow.md,
  },
  pillCaustic: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '60%',
    borderRadius: Radius.full,
  },
  categoryPillSpecular: {
    position: 'absolute',
    top: 0,
    left: 8,
    right: 8,
    height: 1,
    borderRadius: 999,
  },
  pillBlob: {
    position: 'absolute',
    top: 3,
    left: 12,
    width: 32,
    height: 6,
    borderRadius: 999,
    opacity: 0.65,
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.05,
  },

  // Product cards — iOS 26 liquid glass cards
  horizontalList: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm + 2,
  },
  productCard: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
    ...Shadow.lg,
  },
  productCardInner: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  productCardCaustic: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    zIndex: 2,
  },
  productCardSpecular: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    zIndex: 10,
  },
  productCardBlob: {
    position: 'absolute',
    top: 5,
    left: 14,
    width: 48,
    height: 9,
    borderRadius: 999,
    opacity: 0.60,
    zIndex: 3,
  },
  productCardInnerShadow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '25%',
    borderBottomLeftRadius: Radius.xl,
    borderBottomRightRadius: Radius.xl,
    zIndex: 2,
  },
  productImageWrap: {
    height: 136,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  productImage: {
    width: '70%',
    height: '82%',
  },
  discountBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: Palette.accent,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  discountBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  productInfo: {
    padding: Spacing.sm + 4,
    gap: 3,
  },
  productBrand: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
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
    gap: 5,
    marginTop: 6,
  },
  productPrice: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  productOriginal: {
    fontSize: 11,
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },

  // Footer — subtle, receding
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl + Spacing.sm,
    paddingBottom: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm + 2,
  },
  disclaimerText: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16.5,
    opacity: 0.8,
  },
  legalLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
  },
  legalLink: {
    fontSize: 12,
    fontWeight: '500',
  },
  legalDot: {
    fontSize: 12,
    opacity: 0.4,
  },
});

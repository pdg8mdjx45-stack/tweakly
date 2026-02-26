
/**
 * Home Screen — Modern dashboard
 */

import { Image } from 'expo-image';
import { Link, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { PRICE_DISCLAIMER } from '@/constants/mock-data';
import { Colors, Palette, Radius, Shadow, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useProductImage } from '@/hooks/use-product-image';
import { getBestDeal, getNewProducts, getPriceDrops, type Product } from '@/services/product-db';
import { useEffect, useState } from 'react';

const USER_NAME = 'Alex';

const QUICK_ACTIONS = [
  { id: 'nieuws',  label: 'Nieuws',   icon: 'newspaper'     as const, href: '/(tabs)/nieuws' },
  { id: 'reviews', label: 'Reviews',  icon: 'star.fill'     as const, href: '/(tabs)/reviews' },
  { id: 'prijzen', label: 'Prijzen',  icon: 'tag.fill'      as const, href: '/(tabs)/prijzen' },
];

function ProductThumb({ product, style }: { product: Product; style: any }) {
  const imageUrl = useProductImage(product.name, product.imageUrl);
  return (
    <Image
      source={{ uri: imageUrl }}
      style={style}
      contentFit="contain"
      transition={200}
    />
  );
}

export default function HomeScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  const [priceDrops, setPriceDrops] = useState<Product[]>([]);
  const [newProducts, setNewProducts] = useState<Product[]>([]);
  const [bestDeal, setBestDeal] = useState<Product | undefined>(undefined);

  useEffect(() => {
    getPriceDrops(5).then(setPriceDrops);
    getNewProducts().then(setNewProducts);
    getBestDeal().then(setBestDeal);
  }, []);

  return (
    <View style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <View style={styles.headerRow}>
          <Image
            source={require('@/assets/images/ChatGPT_Image_27_feb_2026__17_10_15-removebg-preview (2).png')}
            style={styles.chatGptLogo}
            resizeMode="contain"
          />
          <View style={styles.headerTextWrap}>
            <Text style={[styles.welcomeText, { color: colors.text }]}>
              Welkom terug, <Text style={{ color: Palette.primary, fontWeight: '700' }}>{USER_NAME}</Text>
            </Text>
          </View>
          <Pressable
            onPress={() => router.push('/(tabs)/profiel')}
            style={[styles.avatarBtn, { backgroundColor: isDark ? Palette.dark3 : Palette.grey5 }]}
          >
            <IconSymbol size={22} name="person.fill" color={colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Quick actions */}
        <View style={styles.quickRow}>
          {QUICK_ACTIONS.map(action => (
            <Link key={action.id} href={action.href as any} asChild>
              <Pressable style={({ pressed }) => [styles.quickItem, pressed && { opacity: 0.7 }]}>
                <View style={[styles.quickIcon, { backgroundColor: isDark ? Palette.dark3 : Palette.primarySoft }]}>
                  <IconSymbol size={22} name={action.icon} color={Palette.primary} />
                </View>
                <Text style={[styles.quickLabel, { color: colors.textSecondary }]}>{action.label}</Text>
              </Pressable>
            </Link>
          ))}
        </View>

        {/* Spotlight deal */}
        {bestDeal && (
          <View style={styles.spotlightSection}>
            <Link href={`/product/${bestDeal.id}`} asChild>
              <Pressable
                style={({ pressed }) => [
                  styles.dealCard,
                  { backgroundColor: isDark ? Palette.dark2 : Palette.white },
                  !isDark && Shadow.lg,
                  isDark && { borderWidth: 1, borderColor: Palette.dark4 },
                  pressed && { opacity: 0.95, transform: [{ scale: 0.99 }] },
                ]}
              >
                <View style={styles.dealHeader}>
                  <View style={styles.dealLabelRow}>
                    <View style={[styles.dealLabelDot, { backgroundColor: Palette.accent }]} />
                    <Text style={[styles.dealLabel, { color: colors.textSecondary }]}>Deal van de dag</Text>
                  </View>
                  <View style={styles.dealDiscountBadge}>
                    <Text style={styles.dealDiscountText}>
                      -{Math.round(((bestDeal.originalPrice - bestDeal.currentPrice) / bestDeal.originalPrice) * 100)}%
                    </Text>
                  </View>
                </View>

                <View style={styles.dealBody}>
                  <View style={[styles.dealImageWrap, { backgroundColor: isDark ? Palette.dark3 : '#F5F5F7' }]}>
                    <ProductThumb product={bestDeal} style={styles.dealImage} />
                  </View>
                  <View style={styles.dealInfo}>
                    <Text style={[styles.dealBrand, { color: colors.textSecondary }]}>{bestDeal.brand}</Text>
                    <Text style={[styles.dealName, { color: colors.text }]} numberOfLines={2}>
                      {bestDeal.name}
                    </Text>
                    <View style={styles.dealPriceRow}>
                      <Text style={[styles.dealPrice, { color: colors.text }]}>
                        €{bestDeal.currentPrice.toLocaleString('nl-NL')}
                      </Text>
                      <Text style={[styles.dealOriginal, { color: colors.textSecondary }]}>
                        €{bestDeal.originalPrice.toLocaleString('nl-NL')}
                      </Text>
                    </View>
                    <Text style={[styles.dealShops, { color: colors.textSecondary }]}>
                      {bestDeal.shops.length} winkels beschikbaar
                    </Text>
                  </View>
                </View>

                <View style={[styles.dealCta, { backgroundColor: Palette.primary }]}>
                  <Text style={styles.dealCtaText}>Bekijk deal</Text>
                  <Text style={styles.dealCtaArrow}>→</Text>
                </View>
              </Pressable>
            </Link>
          </View>
        )}

        {/* Price drops */}
        {priceDrops.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <View style={styles.sectionLabelRow}>
                <View style={[styles.sectionIndicator, { backgroundColor: Palette.accent }]} />
                <Text style={[styles.sectionLabel, { color: colors.text }]}>Prijsdalingen</Text>
              </View>
              <Pressable onPress={() => router.push('/(tabs)/prijzen')} hitSlop={8}>
                <Text style={[styles.sectionMore, { color: Palette.primary }]}>Bekijk alle →</Text>
              </Pressable>
            </View>
            <View style={[
              styles.listCard,
              { backgroundColor: isDark ? Palette.dark2 : Palette.white },
              !isDark && Shadow.md,
              isDark && { borderWidth: 1, borderColor: Palette.dark4 },
            ]}>
              {priceDrops.map((product, index, arr) => {
                const pct = Math.round(((product.originalPrice - product.currentPrice) / product.originalPrice) * 100);
                return (
                  <Link key={product.id} href={`/product/${product.id}`} asChild>
                    <Pressable
                      style={({ pressed }) => [
                        styles.listItem,
                        index < arr.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: isDark ? Palette.dark4 : Palette.grey5 },
                        pressed && { backgroundColor: isDark ? Palette.dark3 : Palette.grey6 },
                      ]}
                    >
                      <View style={[styles.listImageWrap, { backgroundColor: isDark ? Palette.dark3 : '#F5F5F7' }]}>
                        <ProductThumb product={product} style={styles.listImage} />
                      </View>
                      <View style={styles.listInfo}>
                        <Text style={[styles.listName, { color: colors.text }]} numberOfLines={1}>
                          {product.name}
                        </Text>
                        <Text style={[styles.listMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                          {product.brand} · {product.shops.length} winkels
                        </Text>
                      </View>
                      <View style={styles.listPriceCol}>
                        <Text style={[styles.listPrice, { color: colors.text }]}>
                          €{product.currentPrice.toLocaleString('nl-NL')}
                        </Text>
                        <View style={styles.listPctBadge}>
                          <Text style={styles.listPctText}>-{pct}%</Text>
                        </View>
                      </View>
                    </Pressable>
                  </Link>
                );
              })}
            </View>
          </View>
        )}

        {/* New products */}
        {newProducts.length > 0 && (
          <View style={[styles.section, styles.lastSection]}>
            <View style={styles.sectionHead}>
              <View style={styles.sectionLabelRow}>
                <View style={[styles.sectionIndicator, { backgroundColor: Palette.primary }]} />
                <Text style={[styles.sectionLabel, { color: colors.text }]}>Nieuw</Text>
              </View>
            </View>
            <View style={[
              styles.listCard,
              { backgroundColor: isDark ? Palette.dark2 : Palette.white },
              !isDark && Shadow.md,
              isDark && { borderWidth: 1, borderColor: Palette.dark4 },
            ]}>
              {newProducts.map((product, index, arr) => (
                <Link key={product.id} href={`/product/${product.id}`} asChild>
                  <Pressable
                    style={({ pressed }) => [
                      styles.listItem,
                      index < arr.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: isDark ? Palette.dark4 : Palette.grey5 },
                      pressed && { backgroundColor: isDark ? Palette.dark3 : Palette.grey6 },
                    ]}
                  >
                    <View style={[styles.listImageWrap, { backgroundColor: isDark ? Palette.dark3 : '#F5F5F7' }]}>
                      <ProductThumb product={product} style={styles.listImage} />
                    </View>
                    <View style={styles.listInfo}>
                      <Text style={[styles.listName, { color: colors.text }]} numberOfLines={1}>
                        {product.name}
                      </Text>
                      <Text style={[styles.listMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                        {product.brand} · {product.shops.length} winkels
                      </Text>
                    </View>
                    <View style={styles.listPriceCol}>
                      <Text style={[styles.listPrice, { color: colors.text }]}>
                        €{product.currentPrice.toLocaleString('nl-NL')}
                      </Text>
                      <View style={[styles.listNewBadge, { backgroundColor: Palette.primary }]}>
                        <Text style={styles.listNewText}>Nieuw</Text>
                      </View>
                    </View>
                  </Pressable>
                </Link>
              ))}
            </View>
          </View>
        )}

        {/* Disclaimer */}
        <View style={styles.disclaimerContainer}>
          <Text style={[styles.disclaimerText, { color: colors.textSecondary }]}>
            {PRICE_DISCLAIMER}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  // Header
  header: {
    paddingTop: Spacing.xl + Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerTextWrap: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  avatarBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatGptLogo: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },

  // Quick actions
  quickRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  quickItem: {
    alignItems: 'center',
    gap: Spacing.xs + 2,
  },
  quickIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Deal card
  spotlightSection: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  dealCard: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  dealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  dealLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dealLabelDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dealLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dealDiscountBadge: {
    backgroundColor: Palette.accentSoft,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  dealDiscountText: {
    color: Palette.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  dealBody: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
    alignItems: 'center',
  },
  dealImageWrap: {
    width: 90,
    height: 90,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xs,
  },
  dealImage: {
    width: 76,
    height: 76,
  },
  dealInfo: {
    flex: 1,
    gap: 2,
  },
  dealBrand: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dealName: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  dealPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.xs,
    marginTop: 2,
  },
  dealPrice: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  dealOriginal: {
    fontSize: 13,
    textDecorationLine: 'line-through',
  },
  dealShops: {
    fontSize: 11,
    marginTop: 1,
  },
  dealCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: Radius.md,
    gap: Spacing.xs,
  },
  dealCtaText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  dealCtaArrow: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },

  // Sections
  section: { paddingBottom: Spacing.lg },
  lastSection: { paddingBottom: Spacing.xxl },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sectionIndicator: {
    width: 3,
    height: 16,
    borderRadius: 2,
  },
  sectionLabel: {
    fontSize: 17,
    fontWeight: '700',
  },
  sectionMore: {
    fontSize: 13,
    fontWeight: '600',
  },

  // List card
  listCard: {
    marginHorizontal: Spacing.md,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm + 2,
    gap: Spacing.sm + 2,
  },
  listImageWrap: {
    width: 48,
    height: 48,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  listImage: {
    width: 40,
    height: 40,
  },
  listInfo: {
    flex: 1,
    gap: 2,
  },
  listName: {
    fontSize: 14,
    fontWeight: '600',
  },
  listMeta: {
    fontSize: 12,
  },
  listPriceCol: {
    alignItems: 'flex-end',
    gap: 3,
  },
  listPrice: {
    fontSize: 15,
    fontWeight: '700',
  },
  listPctBadge: {
    backgroundColor: Palette.accentSoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  listPctText: {
    color: Palette.accent,
    fontSize: 11,
    fontWeight: '700',
  },
  listNewBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  listNewText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },

  // Disclaimer
  disclaimerContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
    paddingTop: Spacing.sm,
  },
  disclaimerText: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
});

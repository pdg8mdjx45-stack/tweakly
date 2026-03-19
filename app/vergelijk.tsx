/**
 * Vergelijk Screen — side-by-side product comparison with winner indicators
 */

import { IconSymbol } from '@/components/ui/icon-symbol';
import type { Product } from '@/constants/mock-data';
import { Colors, Palette, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useProductImage } from '@/hooks/use-product-image';
import {
  clearCompare,
  getCompareList,
  removeFromCompare,
  subscribeCompare,
} from '@/services/compare-store';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

function ProductThumb({
  product,
  style,
}: {
  product: Product;
  style: any;
}) {
  const imageUrl = useProductImage(product.name, product.imageUrl);
  return <Image source={{ uri: imageUrl }} style={style} contentFit="contain" />;
}

// ── Spec analysis helpers ──────────────────────────────────────────

/** Specs where higher numeric value = better */
const HIGHER_IS_BETTER = [
  'ram', 'opslag', 'camera', 'batterij', 'cores', 'threads',
  'base clock', 'boost clock', 'vram', 'capaciteit', 'snelheid',
  'leessnelheid', 'schrijfsnelheid', 'schermgrootte', 'scherm',
  'verversingssnelheid', 'refresh rate', 'helderheid', 'wattage',
  'vermogen', 'accuduur', 'megapixel', 'resolutie',
];

/** Specs where lower numeric value = better */
const LOWER_IS_BETTER = [
  'tdp', 'gewicht', 'responstijd', 'verbruik', 'geluidsniveau',
  'reactietijd',
];

/** Extract the leading number from a spec value (e.g. "8 GB" -> 8, "6,1\"" -> 6.1) */
function extractNumber(value: string): number | null {
  const cleaned = value.replace(/,/g, '.').replace(/\s/g, '');
  const match = cleaned.match(/^(\d+\.?\d*)/);
  return match ? parseFloat(match[1]) : null;
}

type Winner = 'tie' | number; // index of winning product or 'tie'

/** Determine which product "wins" for a given spec key */
function getSpecWinner(products: Product[], key: string): Winner {
  const values = products.map(p => p.specs[key] ?? '');
  const uniqueValues = new Set(values);
  if (uniqueValues.size <= 1) return 'tie';

  const lowerKey = key.toLowerCase();
  const numbers = values.map(v => extractNumber(v));
  const allNumeric = numbers.every(n => n !== null);

  if (!allNumeric) return 'tie';

  const isHigherBetter = HIGHER_IS_BETTER.some(k => lowerKey.includes(k));
  const isLowerBetter = LOWER_IS_BETTER.some(k => lowerKey.includes(k));

  if (!isHigherBetter && !isLowerBetter) return 'tie';

  const nums = numbers as number[];
  const bestIdx = isHigherBetter
    ? nums.indexOf(Math.max(...nums))
    : nums.indexOf(Math.min(...nums));

  // Check if there's a true winner (not all the same best value)
  const bestVal = nums[bestIdx];
  if (nums.filter(n => n === bestVal).length > 1) return 'tie';

  return bestIdx;
}

/** Collect all unique spec keys across all selected products */
function allSpecKeys(products: Product[]): string[] {
  const keys = new Set<string>();
  products.forEach(p => Object.keys(p.specs).forEach(k => keys.add(k)));
  return Array.from(keys);
}

/** Calculate overall scores for each product */
function calculateScores(products: Product[]): { wins: number[]; bestPrice: number; bestRating: number } {
  const specKeys = allSpecKeys(products);
  const wins = products.map(() => 0);

  for (const key of specKeys) {
    const winner = getSpecWinner(products, key);
    if (winner !== 'tie') wins[winner]++;
  }

  // Find best price (lowest)
  const prices = products.map(p => p.currentPrice);
  const bestPrice = prices.indexOf(Math.min(...prices));

  // Find best rating (highest)
  const ratings = products.map(p => p.rating);
  const bestRating = ratings.indexOf(Math.max(...ratings));

  return { wins, bestPrice, bestRating };
}

export default function VergelijkScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [products, setProducts] = useState<Product[]>(getCompareList());
  const [showOnlyDiffs, setShowOnlyDiffs] = useState(false);

  useEffect(() => {
    return subscribeCompare(() => setProducts(getCompareList()));
  }, []);

  const specKeys = allSpecKeys(products);
  const scores = products.length >= 2 ? calculateScores(products) : null;

  const filteredKeys = showOnlyDiffs
    ? specKeys.filter(key => {
        const values = products.map(p => p.specs[key] ?? '—');
        return new Set(values).size > 1;
      })
    : specKeys;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={20} color={colors.tint} />
          <Text style={[styles.backText, { color: colors.tint }]}>Terug</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Vergelijken {products.length > 0 ? `(${products.length})` : ''}
        </Text>
        {products.length > 0 && (
          <Pressable onPress={clearCompare} hitSlop={12}>
            <Text style={[styles.clearText, { color: colors.tint }]}>Alles wissen</Text>
          </Pressable>
        )}
      </View>

      {products.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>⚖️</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Geen producten geselecteerd</Text>
          <Text style={[styles.emptyMsg, { color: colors.textSecondary }]}>
            Voeg producten toe via de productpagina.
          </Text>
          <Pressable
            style={[styles.emptyButton, { backgroundColor: colors.tint }]}
            onPress={() => router.back()}>
            <Text style={styles.emptyButtonText}>Producten bekijken</Text>
          </Pressable>
        </View>
      ) : products.length === 1 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>⚖️</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Nog 1 product nodig</Text>
          <Text style={[styles.emptyMsg, { color: colors.textSecondary }]}>
            Voeg nog minimaal 1 product toe om te vergelijken.
          </Text>
          <Pressable
            style={[styles.emptyButton, { backgroundColor: colors.tint }]}
            onPress={() => router.back()}>
            <Text style={styles.emptyButtonText}>Meer producten zoeken</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* ── Verdict / summary ── */}
          {scores && (
            <View style={[styles.verdictCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.verdictTitle, { color: colors.text }]}>Samenvatting</Text>
              <View style={styles.verdictGrid}>
                {products.map((product, idx) => {
                  const isOverallBest = scores.wins[idx] === Math.max(...scores.wins) && scores.wins[idx] > 0;
                  return (
                    <View
                      key={product.id}
                      style={[
                        styles.verdictItem,
                        { backgroundColor: colors.background },
                        isOverallBest && { borderColor: Palette.primary, borderWidth: 2 },
                      ]}>
                      {isOverallBest && (
                        <View style={[styles.crownBadge, { backgroundColor: Palette.primary }]}>
                          <Text style={styles.crownText}>Beste keuze</Text>
                        </View>
                      )}
                      <ProductThumb product={product} style={styles.verdictImage} />
                      <Text style={[styles.verdictName, { color: colors.text }]} numberOfLines={2}>
                        {product.name}
                      </Text>
                      <View style={styles.verdictStats}>
                        <View style={styles.verdictStat}>
                          <Text style={[styles.verdictStatNum, { color: Palette.primary }]}>
                            {scores.wins[idx]}
                          </Text>
                          <Text style={[styles.verdictStatLabel, { color: colors.textSecondary }]}>
                            specs beter
                          </Text>
                        </View>
                        <View style={styles.verdictStatDivider} />
                        <View style={styles.verdictStat}>
                          <Text style={[
                            styles.verdictStatNum,
                            { color: scores.bestPrice === idx ? '#00D09C' : colors.text },
                          ]}>
                            €{product.currentPrice.toLocaleString('nl-NL')}
                          </Text>
                          <Text style={[styles.verdictStatLabel, { color: colors.textSecondary }]}>
                            {scores.bestPrice === idx ? 'goedkoopst' : 'prijs'}
                          </Text>
                        </View>
                        <View style={styles.verdictStatDivider} />
                        <View style={styles.verdictStat}>
                          <Text style={[
                            styles.verdictStatNum,
                            { color: scores.bestRating === idx ? Palette.star : colors.text },
                          ]}>
                            {product.rating.toFixed(1)} ★
                          </Text>
                          <Text style={[styles.verdictStatLabel, { color: colors.textSecondary }]}>
                            {scores.bestRating === idx ? 'hoogste' : 'rating'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* ── Filter toggle ── */}
          <View style={styles.filterRow}>
            <Pressable
              onPress={() => setShowOnlyDiffs(!showOnlyDiffs)}
              style={[
                styles.filterChip,
                {
                  backgroundColor: showOnlyDiffs ? colors.tint : colors.surface,
                  borderColor: colors.tint,
                },
              ]}>
              <Text style={[styles.filterChipText, { color: showOnlyDiffs ? '#fff' : colors.tint }]}>
                {showOnlyDiffs ? 'Alleen verschillen ✓' : 'Alleen verschillen'}
              </Text>
            </Pressable>
          </View>

          {/* ── Comparison table ── */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hScroll}>
            <View style={styles.table}>
              {/* Top row: product cards */}
              <View style={styles.row}>
                <View style={styles.labelCell} />
                {products.map(product => (
                  <View
                    key={product.id}
                    style={[styles.productCard, { backgroundColor: colors.surface }]}>
                    <Pressable
                      onPress={() => removeFromCompare(product.id)}
                      style={styles.removeBtn}
                      hitSlop={8}>
                      <IconSymbol name="xmark.circle.fill" size={20} color={colors.textSecondary} />
                    </Pressable>
                    <ProductThumb product={product} style={styles.productImage} />
                    <Text style={[styles.productBrand, { color: colors.textSecondary }]} numberOfLines={1}>
                      {product.brand}
                    </Text>
                    <Text style={[styles.productName, { color: colors.text }]} numberOfLines={2}>
                      {product.name}
                    </Text>
                    <Text style={[styles.productPrice, { color: Palette.primary }]}>
                      €{product.currentPrice.toLocaleString('nl-NL')}
                    </Text>
                    <View style={styles.starsRow}>
                      {[1, 2, 3, 4, 5].map(i => (
                        <Text
                          key={i}
                          style={[
                            styles.star,
                            { color: i <= Math.round(product.rating) ? Palette.star : colors.border },
                          ]}>
                          ★
                        </Text>
                      ))}
                      <Text style={[styles.ratingText, { color: colors.textSecondary }]}>
                        {product.rating.toFixed(1)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* ── Price row ── */}
              <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
                <Text style={[styles.sectionHeaderText, { color: colors.textSecondary }]}>
                  PRIJS
                </Text>
              </View>
              <View style={[styles.row, { backgroundColor: colors.surface }]}>
                <View style={styles.labelCell}>
                  <Text style={[styles.specLabel, { color: colors.textSecondary }]}>Prijs</Text>
                </View>
                {products.map((product, idx) => {
                  const isCheapest = scores?.bestPrice === idx;
                  return (
                    <View key={product.id} style={styles.valueCell}>
                      <View style={styles.valueCellInner}>
                        <Text style={[
                          styles.specValue,
                          { color: isCheapest ? '#00D09C' : colors.text },
                          isCheapest && { fontWeight: '700' },
                        ]}>
                          €{product.currentPrice.toLocaleString('nl-NL')}
                        </Text>
                        {isCheapest && <Text style={styles.winnerBadge}>Goedkoopst</Text>}
                      </View>
                    </View>
                  );
                })}
              </View>
              <View style={[styles.row, { backgroundColor: colors.background }]}>
                <View style={styles.labelCell}>
                  <Text style={[styles.specLabel, { color: colors.textSecondary }]}>Rating</Text>
                </View>
                {products.map((product, idx) => {
                  const isBest = scores?.bestRating === idx;
                  return (
                    <View key={product.id} style={styles.valueCell}>
                      <View style={styles.valueCellInner}>
                        <Text style={[
                          styles.specValue,
                          { color: isBest ? Palette.star : colors.text },
                          isBest && { fontWeight: '700' },
                        ]}>
                          {product.rating.toFixed(1)} ★ ({product.reviewCount})
                        </Text>
                        {isBest && <Text style={[styles.winnerBadge, { backgroundColor: Palette.star }]}>Hoogst</Text>}
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* ── Spec rows ── */}
              <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
                <Text style={[styles.sectionHeaderText, { color: colors.textSecondary }]}>
                  SPECIFICATIES
                </Text>
              </View>

              {filteredKeys.map((key, idx) => {
                const winner = getSpecWinner(products, key);
                const isDiff = new Set(products.map(p => p.specs[key] ?? '—')).size > 1;
                const bg = idx % 2 === 0 ? colors.surface : colors.background;
                return (
                  <View
                    key={key}
                    style={[
                      styles.row,
                      { backgroundColor: bg },
                      isDiff && { backgroundColor: colorScheme === 'dark' ? '#1E1E10' : '#FFFBEA' },
                    ]}>
                    <View style={styles.labelCell}>
                      <Text style={[styles.specLabel, { color: colors.textSecondary }]} numberOfLines={2}>
                        {key}
                      </Text>
                      {isDiff && (
                        <Text style={[styles.diffDot, { color: Palette.primary }]}>●</Text>
                      )}
                    </View>
                    {products.map((product, pIdx) => {
                      const isWinner = winner === pIdx;
                      return (
                        <View key={product.id} style={styles.valueCell}>
                          <View style={styles.valueCellInner}>
                            <Text
                              style={[
                                styles.specValue,
                                { color: isWinner ? '#00D09C' : colors.text },
                                isWinner && { fontWeight: '700' },
                              ]}
                              numberOfLines={3}>
                              {product.specs[key] ?? '—'}
                            </Text>
                            {isWinner && <Text style={styles.winnerBadge}>Beter</Text>}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                );
              })}

              {/* ── Cheapest shop ── */}
              <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
                <Text style={[styles.sectionHeaderText, { color: colors.textSecondary }]}>
                  GOEDKOOPSTE WINKEL
                </Text>
              </View>
              <View style={[styles.row, { backgroundColor: colors.surface }]}>
                <View style={styles.labelCell}>
                  <Text style={[styles.specLabel, { color: colors.textSecondary }]}>Winkel</Text>
                </View>
                {products.map(product => {
                  const cheapest = product.shops.reduce(
                    (best, s) => (s.price < best.price ? s : best),
                    product.shops[0]
                  );
                  return (
                    <View key={product.id} style={styles.valueCell}>
                      <Text style={[styles.specValue, { color: colors.text }]}>
                        {cheapest?.name ?? '—'}
                      </Text>
                      <Text style={[styles.shopPrice, { color: Palette.primary }]}>
                        €{cheapest?.price.toLocaleString('nl-NL') ?? '—'}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          {/* Legend */}
          <View style={styles.legend}>
            <View style={[styles.legendDot, { backgroundColor: '#00D09C' }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>
              Groen = betere specificatie
            </Text>
            <View style={{ width: Spacing.md }} />
            <View style={[styles.legendDot, { backgroundColor: Palette.primary }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>
              Blauw = specificaties verschillen
            </Text>
          </View>

          <View style={{ height: Spacing.xxl * 2 }} />
        </ScrollView>
      )}
    </View>
  );
}

const COL_WIDTH = 160;
const LABEL_WIDTH = 110;

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
paddingTop: Spacing.xl * 2 + Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 2, minWidth: 70 },
  backText: { fontSize: 17 },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  clearText: { fontSize: 14, minWidth: 70, textAlign: 'right' },

  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  emptyIcon: { fontSize: 52 },
  emptyTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  emptyMsg: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  emptyButton: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
  },
  emptyButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  // ── Verdict card ──
  verdictCard: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  verdictTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  verdictGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  verdictItem: {
    flex: 1,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    alignItems: 'center',
    gap: Spacing.xs,
    position: 'relative',
    overflow: 'hidden',
  },
  crownBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    marginBottom: 2,
  },
  crownText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  verdictImage: {
    width: 50,
    height: 50,
  },
  verdictName: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 14,
  },
  verdictStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  verdictStat: {
    alignItems: 'center',
    flex: 1,
  },
  verdictStatDivider: {
    width: StyleSheet.hairlineWidth,
    height: 24,
    backgroundColor: 'rgba(128,128,128,0.3)',
  },
  verdictStatNum: {
    fontSize: 13,
    fontWeight: '700',
  },
  verdictStatLabel: {
    fontSize: 9,
    marginTop: 1,
  },

  // ── Filter row ──
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1.5,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
  },

  hScroll: { flex: 1 },
  table: { flexDirection: 'column' },

  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 48,
  },

  sectionHeader: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    marginTop: Spacing.md,
  },
  sectionHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },

  labelCell: {
    width: LABEL_WIDTH,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    justifyContent: 'center',
    flexDirection: 'column',
    gap: 2,
  },
  specLabel: { fontSize: 12, lineHeight: 16 },
  diffDot: { fontSize: 8, marginTop: 2 },

  valueCell: {
    width: COL_WIDTH,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    justifyContent: 'center',
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: 'rgba(128,128,128,0.15)',
  },
  valueCellInner: {
    gap: 2,
  },
  specValue: { fontSize: 13, lineHeight: 18 },
  shopPrice: { fontSize: 13, fontWeight: '700', marginTop: 2 },

  winnerBadge: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
    backgroundColor: '#00D09C',
    alignSelf: 'flex-start',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },

  productCard: {
    width: COL_WIDTH,
    padding: Spacing.sm,
    alignItems: 'center',
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: 'rgba(128,128,128,0.15)',
    gap: 4,
  },
  removeBtn: { alignSelf: 'flex-end' },
  productImage: { width: 80, height: 80 },
  productBrand: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.4 },
  productName: { fontSize: 12, fontWeight: '600', textAlign: 'center', lineHeight: 16 },
  productPrice: { fontSize: 16, fontWeight: '700' },
  starsRow: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  star: { fontSize: 10 },
  ratingText: { fontSize: 10, marginLeft: 3 },

  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12 },
});

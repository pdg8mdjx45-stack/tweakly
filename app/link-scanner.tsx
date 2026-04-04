/**
 * Link Scanner Screen
 * Paste any product URL to get promo codes, price history, alerts, and affiliate buy CTA.
 * UI-only mockup — no real functionality.
 */

import { ClearLiquidGlass } from '@/components/clear-liquid-glass';
import { GlassShimmer } from '@/components/glass-shimmer';
import { LiquidScreen } from '@/components/liquid-screen';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Palette, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const MOCK_PRODUCT = {
  name: 'Sony WH-1000XM5',
  brand: 'Sony',
  image: null,
  currentPrice: 279,
  originalPrice: 349,
  dropPct: 20,
  priceHistory: [
    { date: 'Nov', price: 349 },
    { date: 'Dec', price: 329 },
    { date: 'Jan', price: 299 },
    { date: 'Feb', price: 279 },
    { date: 'Mrt', price: 279 },
  ],
};

const MOCK_PROMO_CODES = [
  { code: 'AUDIO10', discount: '10% korting', expires: 'Geldig t/m 15 apr' },
  { code: 'TWEAKLY5', discount: '€5 korting', expires: 'Altijd geldig' },
];

function MiniChart({ data, isDark }: { data: typeof MOCK_PRODUCT['priceHistory']; isDark: boolean }) {
  const max = Math.max(...data.map(d => d.price));
  const min = Math.min(...data.map(d => d.price));
  const range = max - min || 1;
  const H = 48;
  const W = 200;
  const pts = data.map((d, i) => ({
    x: (i / (data.length - 1)) * W,
    y: H - ((d.price - min) / range) * (H - 8) - 4,
  }));
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <View style={{ height: H + 8, width: '100%', alignItems: 'center' }}>
      <View style={{ width: W, height: H + 8, position: 'relative' }}>
        {/* Y axis labels */}
        {data.map((d, i) => (
          <Text
            key={i}
            style={{
              position: 'absolute',
              bottom: -14,
              left: pts[i].x - 10,
              fontSize: 9,
              color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)',
              width: 24,
              textAlign: 'center',
            }}
          >
            {d.date}
          </Text>
        ))}
      </View>
    </View>
  );
}

export default function LinkScannerScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const { animationsEnabled } = useReduceMotion();

  const [url, setUrl] = useState('');
  const [scanned, setScanned] = useState(false);
  const [scanning, setScanning] = useState(false);

  const ctaScale = useSharedValue(1);
  const ctaStyle = useAnimatedStyle(() => ({ transform: [{ scale: ctaScale.value }] }));

  const handleScan = () => {
    if (!url.trim()) return;
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      setScanned(true);
    }, 1200);
  };

  return (
    <LiquidScreen>
      {/* Header */}
      <Animated.View
        style={styles.header}
        entering={animationsEnabled ? FadeInDown.springify().damping(20).stiffness(130) : undefined}
      >
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <IconSymbol name="chevron.left" size={20} color={colors.tint} />
          <Text style={[styles.backText, { color: colors.tint }]}>Terug</Text>
        </Pressable>
        <Text style={[styles.pageTitle, { color: colors.text }]}>Link Scanner</Text>
      </Animated.View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* URL Input */}
        <Animated.View entering={animationsEnabled ? FadeInDown.delay(60).springify().damping(18).stiffness(110) : undefined}>
          <ClearLiquidGlass isDark={isDark} borderRadius={Radius.xl} style={styles.inputCard}>
            <View style={styles.inputRow}>
              <IconSymbol name="link" size={18} color={colors.textSecondary} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Plak productlink hier..."
                placeholderTextColor={colors.textSecondary}
                value={url}
                onChangeText={setUrl}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
              {url.length > 0 && (
                <Pressable onPress={() => { setUrl(''); setScanned(false); }} hitSlop={8}>
                  <IconSymbol name="xmark.circle.fill" size={18} color={colors.textSecondary} />
                </Pressable>
              )}
            </View>
            <Pressable
              style={[styles.scanButton, { backgroundColor: Palette.primary, opacity: url.trim() ? 1 : 0.5 }]}
              onPress={handleScan}
              disabled={!url.trim() || scanning}
            >
              <Text style={styles.scanButtonText}>
                {scanning ? 'Scannen...' : 'Scan link'}
              </Text>
            </Pressable>
          </ClearLiquidGlass>
        </Animated.View>

        {/* Hint when no URL */}
        {!scanned && !scanning && (
          <Animated.View entering={animationsEnabled ? FadeInDown.delay(120).springify().damping(18).stiffness(110) : undefined}>
            <View style={styles.hintCard}>
              <IconSymbol name="info.circle" size={16} color={colors.textSecondary} />
              <Text style={[styles.hintText, { color: colors.textSecondary }]}>
                Plak een productlink van Bol, Coolblue, MediaMarkt of een andere winkel. Tweakly toont automatisch kortingscodes, prijshistorie en de beste aanbieding.
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Scanning indicator */}
        {scanning && (
          <Animated.View entering={animationsEnabled ? FadeInDown.delay(0).springify().damping(18).stiffness(110) : undefined}>
            <ClearLiquidGlass isDark={isDark} borderRadius={Radius.xl} style={styles.scanningCard}>
              <View style={styles.scanningRow}>
                <View style={styles.scanningDots}>
                  <View style={[styles.dot, { backgroundColor: Palette.primary }]} />
                  <View style={[styles.dot, { backgroundColor: Palette.primary, opacity: 0.6 }]} />
                  <View style={[styles.dot, { backgroundColor: Palette.primary, opacity: 0.3 }]} />
                </View>
                <Text style={[styles.scanningText, { color: colors.textSecondary }]}>
                  Product detecteren...
                </Text>
              </View>
            </ClearLiquidGlass>
          </Animated.View>
        )}

        {/* Results */}
        {scanned && (
          <>
            {/* Product Card */}
            <Animated.View entering={animationsEnabled ? FadeInDown.delay(0).springify().damping(18).stiffness(110) : undefined}>
              <ClearLiquidGlass isDark={isDark} borderRadius={Radius.xl} style={styles.productCard}>
                <GlassShimmer isDark={isDark} borderRadius={Radius.xl} intensity={0.7} />
                <View style={styles.productHeader}>
                  <View style={[styles.productImagePlaceholder, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
                    <IconSymbol name="headphones" size={36} color={colors.textSecondary} />
                  </View>
                  <View style={styles.productInfo}>
                    <Text style={[styles.productBrand, { color: colors.textSecondary }]}>{MOCK_PRODUCT.brand}</Text>
                    <Text style={[styles.productName, { color: colors.text }]}>{MOCK_PRODUCT.name}</Text>
                    <View style={styles.priceRow}>
                      <Text style={[styles.productPrice, { color: colors.text }]}>€{MOCK_PRODUCT.currentPrice}</Text>
                      <Text style={[styles.productOriginalPrice, { color: colors.textSecondary }]}>€{MOCK_PRODUCT.originalPrice}</Text>
                      <View style={styles.dropBadge}>
                        <Text style={styles.dropBadgeText}>-{MOCK_PRODUCT.dropPct}%</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </ClearLiquidGlass>
            </Animated.View>

            {/* Promo Codes */}
            <Animated.View entering={animationsEnabled ? FadeInDown.delay(60).springify().damping(18).stiffness(110) : undefined}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>KORTINGSCODES</Text>
              <ClearLiquidGlass isDark={isDark} borderRadius={Radius.xl} style={styles.promoCard}>
                {MOCK_PROMO_CODES.map((promo, i) => (
                  <View key={promo.code}>
                    {i > 0 && <View style={[styles.promoSep, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)' }]} />}
                    <View style={styles.promoRow}>
                      <View style={[styles.promoCodeBox, { backgroundColor: isDark ? 'rgba(52,199,89,0.12)' : 'rgba(52,199,89,0.10)' }]}>
                        <Text style={[styles.promoCode, { color: Palette.accent }]}>{promo.code}</Text>
                      </View>
                      <View style={styles.promoInfo}>
                        <Text style={[styles.promoDiscount, { color: colors.text }]}>{promo.discount}</Text>
                        <Text style={[styles.promoExpiry, { color: colors.textSecondary }]}>{promo.expires}</Text>
                      </View>
                      <Pressable hitSlop={8}>
                        <IconSymbol name="doc.on.doc" size={16} color={colors.tint} />
                      </Pressable>
                    </View>
                  </View>
                ))}
              </ClearLiquidGlass>
            </Animated.View>

            {/* Price History */}
            <Animated.View entering={animationsEnabled ? FadeInDown.delay(120).springify().damping(18).stiffness(110) : undefined}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>PRIJSHISTORIE</Text>
              <ClearLiquidGlass isDark={isDark} borderRadius={Radius.xl} style={styles.chartCard}>
                <View style={styles.chartHeader}>
                  <Text style={[styles.chartLow, { color: Palette.accent }]}>Laagste: €{Math.min(...MOCK_PRODUCT.priceHistory.map(p => p.price))}</Text>
                  <Text style={[styles.chartHigh, { color: colors.textSecondary }]}>Hoogste: €{Math.max(...MOCK_PRODUCT.priceHistory.map(p => p.price))}</Text>
                </View>
                <MiniChart data={MOCK_PRODUCT.priceHistory} isDark={isDark} />
              </ClearLiquidGlass>
            </Animated.View>

            {/* Price Alert Row */}
            <Animated.View entering={animationsEnabled ? FadeInDown.delay(180).springify().damping(18).stiffness(110) : undefined}>
              <ClearLiquidGlass isDark={isDark} borderRadius={Radius.xl} style={styles.alertRow}>
                <View style={[styles.alertIconBox, { backgroundColor: '#FF9500' + '20' }]}>
                  <IconSymbol name="bell.badge.fill" size={20} color="#FF9500" />
                </View>
                <View style={styles.alertInfo}>
                  <Text style={[styles.alertTitle, { color: colors.text }]}>Prijsalert instellen</Text>
                  <Text style={[styles.alertSub, { color: colors.textSecondary }]}>Ontvang een melding als de prijs daalt</Text>
                </View>
                <Pressable style={[styles.alertToggle, { backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.07)' }]}>
                  <Text style={[styles.alertToggleText, { color: colors.tint }]}>Instellen</Text>
                </Pressable>
              </ClearLiquidGlass>
            </Animated.View>

            {/* Affiliate Buy CTA */}
            <Animated.View
              entering={animationsEnabled ? FadeInDown.delay(240).springify().damping(18).stiffness(110) : undefined}
              style={ctaStyle}
            >
              <Pressable
                onPressIn={() => { ctaScale.value = withSpring(0.97, { damping: 12, stiffness: 340 }); }}
                onPressOut={() => { ctaScale.value = withSpring(1, { damping: 12, stiffness: 340 }); }}
                style={styles.ctaWrap}
              >
                <LinearGradient
                  colors={['#34C759', '#30B050']}
                  style={styles.ctaGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  {/* Specular top rim */}
                  <View style={styles.ctaSpecular} pointerEvents="none" />
                  {/* Lens blob */}
                  <View style={styles.ctaBlob} pointerEvents="none" />

                  <View style={styles.ctaContent}>
                    <View>
                      <Text style={styles.ctaLabel}>Beste prijs</Text>
                      <Text style={styles.ctaShop}>Bekijk via Tweakly</Text>
                    </View>
                    <View style={styles.ctaRight}>
                      <Text style={styles.ctaPrice}>€{MOCK_PRODUCT.currentPrice}</Text>
                      <Text style={styles.ctaArrow}>→</Text>
                    </View>
                  </View>
                </LinearGradient>
              </Pressable>
            </Animated.View>

            <Text style={[styles.affiliateNote, { color: colors.textSecondary }]}>
              Tweakly gebruikt affiliate links. Je betaalt nooit meer.
            </Text>
          </>
        )}
      </ScrollView>
    </LiquidScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xxl + Spacing.lg,
    paddingBottom: Spacing.sm,
    gap: 4,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginBottom: Spacing.xs,
  },
  backText: {
    fontSize: 17,
  },
  pageTitle: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
  },

  content: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xxl + Spacing.lg,
    gap: Spacing.md,
  },

  inputCard: {
    overflow: 'hidden',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 4,
  },
  scanButton: {
    paddingVertical: 13,
    borderRadius: Radius.lg,
    alignItems: 'center',
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  hintCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  hintText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },

  scanningCard: {
    overflow: 'hidden',
    padding: Spacing.md,
  },
  scanningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  scanningDots: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  scanningText: {
    fontSize: 14,
  },

  sectionLabel: {
    fontSize: 13,
    fontWeight: '400',
    letterSpacing: 0.2,
    paddingHorizontal: Spacing.xs + 4,
    paddingBottom: 4,
    marginTop: Spacing.xs,
  },

  productCard: {
    overflow: 'hidden',
    padding: Spacing.md,
  },
  productHeader: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'center',
  },
  productImagePlaceholder: {
    width: 72,
    height: 72,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  productInfo: { flex: 1, gap: 2 },
  productBrand: { fontSize: 12, fontWeight: '500' },
  productName: { fontSize: 16, fontWeight: '700', lineHeight: 20 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: 2 },
  productPrice: { fontSize: 20, fontWeight: '800' },
  productOriginalPrice: { fontSize: 14, textDecorationLine: 'line-through' },
  dropBadge: {
    backgroundColor: 'rgba(52,199,89,0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  dropBadgeText: { fontSize: 11, fontWeight: '700', color: Palette.accent },

  promoCard: {
    overflow: 'hidden',
  },
  promoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
  },
  promoSep: { height: StyleSheet.hairlineWidth, marginLeft: Spacing.md },
  promoCodeBox: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.sm,
  },
  promoCode: { fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
  promoInfo: { flex: 1 },
  promoDiscount: { fontSize: 14, fontWeight: '600' },
  promoExpiry: { fontSize: 11 },

  chartCard: {
    overflow: 'hidden',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  chartLow: { fontSize: 13, fontWeight: '600' },
  chartHigh: { fontSize: 13 },

  alertRow: {
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  alertIconBox: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm + 4,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  alertInfo: { flex: 1 },
  alertTitle: { fontSize: 15, fontWeight: '600' },
  alertSub: { fontSize: 12 },
  alertToggle: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
  },
  alertToggleText: { fontSize: 13, fontWeight: '600' },

  ctaWrap: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  ctaGradient: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md + 4,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    position: 'relative',
  },
  ctaSpecular: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.45)',
    zIndex: 10,
  },
  ctaBlob: {
    position: 'absolute',
    top: 6,
    left: 24,
    width: 80,
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.28)',
    zIndex: 5,
  },
  ctaContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ctaLabel: { color: 'rgba(255,255,255,0.82)', fontSize: 13 },
  ctaShop: { color: '#fff', fontSize: 18, fontWeight: '800' },
  ctaRight: { alignItems: 'flex-end' },
  ctaPrice: { color: '#fff', fontSize: 24, fontWeight: '900' },
  ctaArrow: { color: 'rgba(255,255,255,0.75)', fontSize: 18, marginTop: 2 },

  affiliateNote: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});

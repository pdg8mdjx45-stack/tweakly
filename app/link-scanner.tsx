/**
 * Link Scanner Screen
 * Paste any product URL to get promo codes, price history, alerts, and affiliate buy CTA.
 * UI-only mockup — no real functionality.
 */

import { ClearLiquidGlass } from '@/components/clear-liquid-glass';
import { GlassShimmer } from '@/components/glass-shimmer';
import { LiquidScreen } from '@/components/liquid-screen';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { getShopBySlug } from '@/constants/affiliate-shops';
import { Colors, Palette, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { addAlert } from '@/services/alerts-store';
import { addPricePoint, upsertScannedProduct } from '@/services/scanned-products';
import { fetchProductMeta, parseShopUrl } from '@/services/url-parser';
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
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type ScanResult = {
  name: string;
  brand: string | null;
  imageUrl: string | null;
  currentPrice: number;
  affiliateUrl: string;
  shopDisplayName: string;
  priceHistory: { date: string; price: number }[];
};

type ScanError = 'invalid_url' | 'product_not_found' | 'network_error';

const ERROR_MESSAGES: Record<ScanError, string> = {
  invalid_url: 'We herkennen deze link niet. Probeer een link van Bol.com, Amazon, Coolblue of een andere winkel.',
  product_not_found: 'Product niet gevonden. Controleer de link en probeer opnieuw.',
  network_error: 'Geen verbinding. Controleer je internet en probeer opnieuw.',
};

function MiniChart({ data, isDark }: { data: { date: string; price: number }[]; isDark: boolean }) {
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
  const [result, setResult] = useState<ScanResult | null>(null);
  const [scanError, setScanError] = useState<ScanError | null>(null);
  const [alertPrice, setAlertPrice] = useState('');
  const [alertSaved, setAlertSaved] = useState(false);
  const [showAlertInput, setShowAlertInput] = useState(false);
  const [alertProductId, setAlertProductId] = useState<string | null>(null);

  const ctaScale = useSharedValue(1);
  const ctaStyle = useAnimatedStyle(() => ({ transform: [{ scale: ctaScale.value }] }));

  const handleReset = () => {
    setUrl('');
    setScanned(false);
    setScanError(null);
    setResult(null);
    setAlertPrice('');
    setAlertSaved(false);
    setShowAlertInput(false);
    setAlertProductId(null);
  };

  const handleScan = async () => {
    if (!url.trim()) return;
    setScanning(true);
    setScanError(null);
    setResult(null);
    setScanned(false);

    try {
      const parsed = parseShopUrl(url.trim());
      if (!parsed) {
        setScanError('invalid_url');
        setScanning(false);
        return;
      }

      const meta = await fetchProductMeta(url.trim());

      const name = meta.name || parsed.productName;
      if (!name) {
        setScanError('product_not_found');
        setScanning(false);
        return;
      }

      const shop = getShopBySlug(parsed.shopSlug);
      let affiliateUrl = parsed.canonicalUrl;
      if (shop && shop.affiliate.active) {
        affiliateUrl = shop.affiliate.buildAffiliateUrl(parsed.canonicalUrl, parsed.productId || undefined);
      }

      const price = meta.price ?? 0;
      const shopProductId = parsed.productId || parsed.productName.toLowerCase().replace(/\s+/g, '-').slice(0, 60);

      const saved = await upsertScannedProduct({
        shop_slug: parsed.shopSlug,
        shop_product_id: shopProductId,
        name,
        brand: meta.brand,
        image_url: meta.imageUrl,
        current_price: price,
        affiliate_url: affiliateUrl,
        original_url: url.trim(),
      });

      if (saved) {
        setAlertProductId(saved.id);
        await addPricePoint(saved.id, price);
      }

      setResult({
        name,
        brand: meta.brand,
        imageUrl: meta.imageUrl,
        currentPrice: price,
        affiliateUrl,
        shopDisplayName: shop?.displayName ?? parsed.shopDisplayName,
        priceHistory: saved ? [{ date: 'Vandaag', price }] : [],
      });
      setScanned(true);
    } catch {
      setScanError('network_error');
    } finally {
      setScanning(false);
    }
  };

  const handleSetAlert = async () => {
    const target = parseFloat(alertPrice.replace(',', '.'));
    if (!alertProductId || isNaN(target) || target <= 0) return;
    await addAlert({
      productId: alertProductId,
      productName: result?.name ?? '',
      targetPrice: target,
      currentPrice: result?.currentPrice ?? 0,
    });
    setAlertSaved(true);
    setShowAlertInput(false);
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
                <Pressable onPress={handleReset} hitSlop={8}>
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
        {!scanned && !scanning && !scanError && (
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

        {/* Error state */}
        {scanError && (
          <Animated.View entering={animationsEnabled ? FadeInDown.delay(0).springify().damping(18).stiffness(110) : undefined}>
            <ClearLiquidGlass isDark={isDark} borderRadius={Radius.xl} style={styles.errorCard}>
              <IconSymbol name="exclamationmark.triangle" size={24} color="#FF3B30" />
              <Text style={[styles.errorText, { color: colors.text }]}>
                {ERROR_MESSAGES[scanError]}
              </Text>
              <Pressable
                style={[styles.retryBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.07)' }]}
                onPress={handleReset}
              >
                <Text style={[styles.retryText, { color: colors.tint }]}>Opnieuw proberen</Text>
              </Pressable>
            </ClearLiquidGlass>
          </Animated.View>
        )}

        {/* Results */}
        {scanned && result && (
          <>
            {/* Product Card */}
            <Animated.View entering={animationsEnabled ? FadeInDown.delay(0).springify().damping(18).stiffness(110) : undefined}>
              <ClearLiquidGlass isDark={isDark} borderRadius={Radius.xl} style={styles.productCard}>
                <GlassShimmer isDark={isDark} borderRadius={Radius.xl} intensity={0.7} />
                <View style={styles.productHeader}>
                  <View style={[styles.productImagePlaceholder, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
                    <IconSymbol name={result.imageUrl ? 'photo' : 'cart'} size={36} color={colors.textSecondary} />
                  </View>
                  <View style={styles.productInfo}>
                    {result.brand && (
                      <Text style={[styles.productBrand, { color: colors.textSecondary }]}>{result.brand}</Text>
                    )}
                    <Text style={[styles.productName, { color: colors.text }]} numberOfLines={3}>{result.name}</Text>
                    <View style={styles.priceRow}>
                      {result.currentPrice > 0 ? (
                        <Text style={[styles.productPrice, { color: colors.text }]}>€{result.currentPrice.toFixed(2)}</Text>
                      ) : (
                        <Text style={[styles.productPrice, { color: colors.textSecondary }]}>Prijs onbekend</Text>
                      )}
                    </View>
                  </View>
                </View>
              </ClearLiquidGlass>
            </Animated.View>

            {/* Price History */}
            {result.priceHistory.length > 0 && (
              <Animated.View entering={animationsEnabled ? FadeInDown.delay(60).springify().damping(18).stiffness(110) : undefined}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>PRIJSHISTORIE</Text>
                <ClearLiquidGlass isDark={isDark} borderRadius={Radius.xl} style={styles.chartCard}>
                  <View style={styles.chartHeader}>
                    <Text style={[styles.chartLow, { color: Palette.accent }]}>
                      Laagste: €{Math.min(...result.priceHistory.map(p => p.price)).toFixed(2)}
                    </Text>
                    <Text style={[styles.chartHigh, { color: colors.textSecondary }]}>
                      Hoogste: €{Math.max(...result.priceHistory.map(p => p.price)).toFixed(2)}
                    </Text>
                  </View>
                  <MiniChart data={result.priceHistory} isDark={isDark} />
                  {result.priceHistory.length === 1 && (
                    <Text style={[styles.chartNote, { color: colors.textSecondary }]}>
                      Eerste meting — scan opnieuw om geschiedenis op te bouwen.
                    </Text>
                  )}
                </ClearLiquidGlass>
              </Animated.View>
            )}

            {/* Price Alert */}
            <Animated.View entering={animationsEnabled ? FadeInDown.delay(120).springify().damping(18).stiffness(110) : undefined}>
              <ClearLiquidGlass isDark={isDark} borderRadius={Radius.xl} style={styles.alertRow}>
                <View style={[styles.alertIconBox, { backgroundColor: '#FF9500' + '20' }]}>
                  <IconSymbol name="bell.badge.fill" size={20} color="#FF9500" />
                </View>
                <View style={styles.alertInfo}>
                  <Text style={[styles.alertTitle, { color: colors.text }]}>Prijsalert instellen</Text>
                  {alertSaved ? (
                    <Text style={[styles.alertSub, { color: Palette.accent }]}>Alert opgeslagen!</Text>
                  ) : (
                    <Text style={[styles.alertSub, { color: colors.textSecondary }]}>Ontvang een melding als de prijs daalt</Text>
                  )}
                </View>
                {!alertSaved && (
                  <Pressable
                    onPress={() => setShowAlertInput(v => !v)}
                    style={[styles.alertToggle, { backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.07)' }]}
                  >
                    <Text style={[styles.alertToggleText, { color: colors.tint }]}>
                      {showAlertInput ? 'Annuleer' : 'Instellen'}
                    </Text>
                  </Pressable>
                )}
              </ClearLiquidGlass>
              {showAlertInput && !alertSaved && (
                <ClearLiquidGlass isDark={isDark} borderRadius={Radius.xl} style={styles.alertInputCard}>
                  <Text style={[styles.alertInputLabel, { color: colors.textSecondary }]}>Doelprijs (€)</Text>
                  <View style={styles.alertInputRow}>
                    <TextInput
                      style={[styles.alertInput, { color: colors.text, borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)' }]}
                      placeholder={result.currentPrice > 0 ? `bijv. ${(result.currentPrice * 0.9).toFixed(0)}` : 'bijv. 150'}
                      placeholderTextColor={colors.textSecondary}
                      value={alertPrice}
                      onChangeText={setAlertPrice}
                      keyboardType="decimal-pad"
                    />
                    <Pressable
                      style={[styles.alertConfirmBtn, { backgroundColor: Palette.primary, opacity: alertPrice.trim() ? 1 : 0.5 }]}
                      onPress={handleSetAlert}
                      disabled={!alertPrice.trim()}
                    >
                      <Text style={styles.alertConfirmText}>Bewaar</Text>
                    </Pressable>
                  </View>
                </ClearLiquidGlass>
              )}
            </Animated.View>

            {/* Buy CTA */}
            <Animated.View
              entering={animationsEnabled ? FadeInDown.delay(180).springify().damping(18).stiffness(110) : undefined}
              style={ctaStyle}
            >
              <Pressable
                onPressIn={() => { ctaScale.value = withSpring(0.97, { damping: 12, stiffness: 340 }); }}
                onPressOut={() => { ctaScale.value = withSpring(1, { damping: 12, stiffness: 340 }); }}
                onPress={() => Linking.openURL(result.affiliateUrl)}
                style={styles.ctaWrap}
              >
                <LinearGradient
                  colors={['#34C759', '#30B050']}
                  style={styles.ctaGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.ctaSpecular} pointerEvents="none" />
                  <View style={styles.ctaBlob} pointerEvents="none" />
                  <View style={styles.ctaContent}>
                    <View>
                      <Text style={styles.ctaLabel}>Kopen bij {result.shopDisplayName}</Text>
                      <Text style={styles.ctaShop}>Bekijk via Tweakly</Text>
                    </View>
                    <View style={styles.ctaRight}>
                      {result.currentPrice > 0 && (
                        <Text style={styles.ctaPrice}>€{result.currentPrice.toFixed(2)}</Text>
                      )}
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

  chartNote: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
  },
  alertInputCard: {
    overflow: 'hidden',
    padding: Spacing.md,
    gap: Spacing.sm,
    marginTop: 4,
  },
  alertInputLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  alertInputRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  alertInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  alertConfirmBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: Radius.lg,
  },
  alertConfirmText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  errorCard: {
    overflow: 'hidden',
    padding: Spacing.md,
    gap: Spacing.sm,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.full,
    marginTop: 4,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

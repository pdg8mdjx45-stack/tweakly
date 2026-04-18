/**
 * Link Scanner Screen
 * Paste any product URL to get promo codes, price history, alerts, and affiliate buy CTA.
 */

import { BackButton } from '@/components/back-button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Palette, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { addAlert } from '@/services/alerts-store';
import { supabase, supabaseAnonKey } from '@/services/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useState, useCallback } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LiquidScreen } from '@/components/liquid-screen';

const SUPABASE_URL = 'https://glnpdfbnyijdzvulzbfv.supabase.co';

// Canonical color name → display hex for the color swatch dot
const COLOR_HEX: Record<string, string> = {
  black: '#1C1C1E',
  white: '#F5F5F0',
  blue: '#2979FF',
  green: '#34C759',
  gray: '#8E8E93',
  silver: '#C0C0C0',
  gold: '#FFD700',
  pink: '#FF2D55',
  purple: '#AF52DE',
  red: '#FF3B30',
  titanium: '#8A8A8E',
  natural: '#C8A97E',
  desert: '#D2A679',
};

interface ScraperPromoCode {
  code: string;
  discount: string;
  expiresAt: string | null;
  source: 'page' | 'aggregator';
}

interface ScraperShopLink {
  name: string;
  price: number | null;
  url: string;
}

interface ScraperColorVariant {
  color: string;
  storage: string;
  imageUrl: string | null;
  affiliateUrl: string;
  shopLinks: ScraperShopLink[];
}

interface ScraperResponse {
  productId: string | null;
  affiliateUrl: string;
  name: string;
  brand: string | null;
  imageUrl: string | null;
  price: number | null;
  shopDisplayName: string;
  shopSlug: string;
  promoCodes: ScraperPromoCode[];
  category: string | null;
  specs: Record<string, string> | null;
  shopLinks: ScraperShopLink[];
  colorVariants: ScraperColorVariant[];
  scannedColor: string;
  scannedStorage: string;
}

async function callScraper(productUrl: string): Promise<ScraperResponse> {
  // Get user session if available; the gateway accepts requests with only
  // the apikey header (anon key) when no user JWT is present.
  let jwt: string | null = null;
  try {
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    if (session) {
      const nowSec = Math.floor(Date.now() / 1000);
      if ((session.expires_at ?? 0) - nowSec > 60) {
        jwt = session.access_token;
      } else {
        const { data: refreshData } = await supabase.auth.refreshSession();
        if (refreshData.session) jwt = refreshData.session.access_token;
      }
    }
  } catch {
    // No session — proceed without user JWT
  }

  const res = await fetch(`${SUPABASE_URL}/functions/v1/scan-product`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseAnonKey,
      ...(jwt ? { 'Authorization': `Bearer ${jwt}` } : {}),
    },
    body: JSON.stringify({ url: productUrl }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let body: Record<string, string> = {};
    try { body = JSON.parse(text); } catch { /* plain-text error */ }
    console.warn('[scan-product] error', res.status, text.slice(0, 300));
    const errCode = body.error ?? body.message ?? 'scraper_error';
    throw Object.assign(new Error(errCode), { status: res.status, scraperError: body.error, gatewayMessage: body.message });
  }

  return res.json() as Promise<ScraperResponse>;
}

type ScanResult = {
  name: string;
  brand: string | null;
  imageUrl: string | null;
  currentPrice: number;
  affiliateUrl: string;
  shopDisplayName: string;
  priceHistory: { date: string; price: number }[];
  promoCodes: ScraperPromoCode[];
  category: string | null;
  specs: Record<string, string> | null;
  shopLinks: ScraperShopLink[];
  colorVariants: ScraperColorVariant[];
  selectedColor: string;
  selectedStorage: string;
};

type ScanError =
  | 'invalid_url'
  | 'product_not_found'
  | 'network_error'
  | 'blocked_content'
  | 'shop_blocked'
  | 'auth_required'
  | 'scanner_unavailable';

const ERROR_MESSAGES: Record<ScanError, string> = {
  invalid_url: 'We konden dit product niet uitlezen. Probeer een directe productpagina van een webshop.',
  product_not_found: 'Product niet gevonden. Probeer een andere link of winkel.',
  network_error: 'Geen verbinding. Controleer je internet en probeer opnieuw.',
  blocked_content: 'Dit product kan niet worden toegevoegd aan Tracr.',
  shop_blocked: 'Deze winkel staat automatisch scannen helaas niet toe. Zoek hetzelfde product op Coolblue, Amazon of een andere winkel en plak die link.',
  auth_required: 'Je sessie is verlopen. Log opnieuw in en probeer het daarna nog eens.',
  scanner_unavailable: 'De linkscanner is tijdelijk niet beschikbaar. Probeer het zo opnieuw.',
};

function resolveScanError(err: unknown): ScanError {
  const e = err as { scraperError?: string; gatewayMessage?: string; status?: number; message?: string };
  const message = e?.message?.toLowerCase() ?? '';
  const gateway = e?.gatewayMessage?.toLowerCase() ?? '';

  if (e?.scraperError === 'invalid_url') return 'invalid_url';
  if (e?.scraperError === 'product_not_found') return 'product_not_found';
  if (e?.scraperError === 'shop_blocked') return 'shop_blocked';
  if (e?.scraperError === 'blocked_content' || e?.status === 403) return 'blocked_content';
  if (e?.scraperError === 'unauthorized') return 'auth_required';
  // Gateway JWT errors (expired/invalid token from Supabase) are infra issues, not user auth issues
  if (e?.status === 401 && /jwt|token/.test(gateway)) return 'scanner_unavailable';
  if (e?.status === 401) return 'auth_required';
  if (/network request failed|failed to fetch|load failed/.test(message)) return 'network_error';
  if (typeof e?.status === 'number') return 'scanner_unavailable';
  return 'network_error';
}

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

  return (
    <View style={{ height: H + 8, width: '100%', alignItems: 'center' }}>
      <View style={{ width: W, height: H + 8, position: 'relative' }}>
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
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const { animationsEnabled } = useReduceMotion();

  const [url, setUrl] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [scanError, setScanError] = useState<ScanError | null>(null);
  const [alertPrice, setAlertPrice] = useState('');
  const [alertSaved, setAlertSaved] = useState(false);
  const [showAlertInput, setShowAlertInput] = useState(false);
  const [alertProductId, setAlertProductId] = useState<string | null>(null);
  const [colorDropdownOpen, setColorDropdownOpen] = useState(false);

  const ctaScale = useSharedValue(1);
  const ctaStyle = useAnimatedStyle(() => ({ transform: [{ scale: ctaScale.value }] }));

  const handleReset = useCallback(() => {
    setUrl('');
    setScanning(false);
    setScanned(false);
    setScanError(null);
    setResult(null);
    setAlertPrice('');
    setAlertSaved(false);
    setShowAlertInput(false);
    setAlertProductId(null);
    setColorDropdownOpen(false);
  }, []);

  const finishScan = async (data: ScraperResponse) => {
    const price = data.price ?? 0;
    setAlertProductId(data.productId);

    setResult({
      name: data.name,
      brand: data.brand,
      imageUrl: data.imageUrl,
      currentPrice: price,
      affiliateUrl: data.affiliateUrl,
      shopDisplayName: data.shopDisplayName,
      priceHistory: data.productId ? [{ date: 'Vandaag', price }] : [],
      promoCodes: data.promoCodes,
      category: data.category ?? null,
      specs: data.specs ?? null,
      shopLinks: data.shopLinks ?? [],
      colorVariants: data.colorVariants ?? [],
      selectedColor: data.scannedColor ?? '',
      selectedStorage: data.scannedStorage ?? '',
    });
    setScanned(true);
  };

  // When user picks a variant, swap the active shop links / affiliate URL
  const handleSelectVariant = (variant: ScraperColorVariant) => {
    if (!result) return;
    const cheapest = [...variant.shopLinks].filter(l => l.price != null).sort((a, b) => (a.price ?? 0) - (b.price ?? 0))[0];
    setResult(prev => prev ? {
      ...prev,
      selectedColor: variant.color,
      selectedStorage: variant.storage,
      affiliateUrl: variant.affiliateUrl,
      imageUrl: variant.imageUrl ?? prev.imageUrl,
      shopLinks: variant.shopLinks.length > 0 ? variant.shopLinks : prev.shopLinks,
      currentPrice: cheapest?.price ?? prev.currentPrice,
    } : null);
    setColorDropdownOpen(false);
  };

  const handleScan = async () => {
    const raw = url.trim();
    if (!raw) return;
    setScanning(true);
    setScanError(null);
    setResult(null);
    setScanned(false);

    try {
      let data: ScraperResponse;
      try {
        data = await callScraper(raw);
      } catch (err: unknown) {
        setScanError(resolveScanError(err));
        return;
      }
      if (!data.name) { setScanError('product_not_found'); return; }
      await finishScan(data);
    } catch (err: unknown) {
      setScanError(resolveScanError(err));
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
      <Animated.View
        style={styles.header}
        entering={animationsEnabled ? FadeInDown.springify().damping(20).stiffness(130) : undefined}
      >
        <BackButton inline />
        <Text style={[styles.pageTitle, { color: '#1C1C1E' }]}>Link Scanner</Text>
      </Animated.View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* URL Input */}
        <Animated.View entering={animationsEnabled ? FadeInDown.delay(60).springify().damping(18).stiffness(110) : undefined}>
          <View style={[styles.inputCard, { backgroundColor: '#F2F2F7', borderColor: 'rgba(0,0,0,0.08)' }]}>
            <View style={styles.inputRow}>
              <IconSymbol name="link" size={18} color="rgba(0,0,0,0.4)" />
              <TextInput
                style={[styles.input, { color: '#1C1C1E' }]}
                placeholder="Plak productlink hier..."
                placeholderTextColor="rgba(0,0,0,0.35)"
                value={url}
                onChangeText={setUrl}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                returnKeyType="go"
                onSubmitEditing={handleScan}
              />
              {url.length > 0 && (
                <Pressable onPress={handleReset} hitSlop={8}>
                  <IconSymbol name="xmark.circle.fill" size={18} color="rgba(0,0,0,0.4)" />
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
          </View>
        </Animated.View>

        {/* Hint */}
        {!scanned && !scanning && !scanError && (
          <Animated.View entering={animationsEnabled ? FadeInDown.delay(120).springify().damping(18).stiffness(110) : undefined}>
            <View style={styles.hintCard}>
              <IconSymbol name="info.circle" size={16} color="rgba(0,0,0,0.4)" />
              <Text style={[styles.hintText, { color: 'rgba(0,0,0,0.5)' }]}>
                Plak een productlink van Coolblue, MediaMarkt, Amazon of een andere winkel. Tracr toont automatisch kortingscodes, prijshistorie en de beste aanbieding.
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Scanning indicator */}
        {scanning && (
          <Animated.View entering={animationsEnabled ? FadeInDown.springify().damping(18).stiffness(110) : undefined}>
            <View style={[styles.scanningCard, { backgroundColor: '#F2F2F7', borderColor: 'rgba(0,0,0,0.08)' }]}>
              <View style={styles.scanningRow}>
                <View style={styles.scanningDots}>
                  <View style={[styles.dot, { backgroundColor: Palette.primary }]} />
                  <View style={[styles.dot, { backgroundColor: Palette.primary, opacity: 0.6 }]} />
                  <View style={[styles.dot, { backgroundColor: Palette.primary, opacity: 0.3 }]} />
                </View>
                <Text style={[styles.scanningText, { color: 'rgba(0,0,0,0.5)' }]}>Product detecteren...</Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Error */}
        {scanError && (
          <Animated.View entering={animationsEnabled ? FadeInDown.springify().damping(18).stiffness(110) : undefined}>
            <View style={[styles.errorCard, { backgroundColor: '#F2F2F7', borderColor: 'rgba(0,0,0,0.08)' }]}>
              <IconSymbol name="exclamationmark.triangle" size={24} color="#FF3B30" />
              <Text style={[styles.errorText, { color: '#1C1C1E' }]}>{ERROR_MESSAGES[scanError]}</Text>
              <Pressable
                style={[styles.retryBtn, { backgroundColor: 'rgba(0,0,0,0.06)' }]}
                onPress={() => {
                  if (scanError === 'auth_required') {
                    router.replace('/(auth)/inloggen');
                    return;
                  }
                  handleReset();
                }}
              >
                <Text style={[styles.retryText, { color: Palette.primary }]}>
                  {scanError === 'auth_required' ? 'Opnieuw inloggen' : 'Opnieuw proberen'}
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        )}

        {/* Results */}
        {scanned && result && (
          <>
            {/* Product Card */}
            <Animated.View entering={animationsEnabled ? FadeInDown.springify().damping(18).stiffness(110) : undefined}>
              <View style={[styles.productCard, { backgroundColor: '#FFFFFF', borderColor: 'rgba(0,0,0,0.10)' }]}>
                <View style={styles.productHeader}>
                  <View style={[styles.productImagePlaceholder, { backgroundColor: 'rgba(0,0,0,0.05)' }]}>
                    <IconSymbol name={result.imageUrl ? 'photo' : 'cart'} size={36} color="rgba(0,0,0,0.35)" />
                  </View>
                  <View style={styles.productInfo}>
                    {result.brand && (
                      <Text style={[styles.productBrand, { color: 'rgba(0,0,0,0.5)' }]}>{result.brand}</Text>
                    )}
                    <Text style={[styles.productName, { color: '#1C1C1E' }]} numberOfLines={3}>{result.name}</Text>
                    <View style={styles.priceRow}>
                      {result.currentPrice > 0
                        ? <Text style={[styles.productPrice, { color: '#1C1C1E' }]}>€{result.currentPrice.toFixed(2)}</Text>
                        : <Text style={[styles.productPrice, { color: 'rgba(0,0,0,0.4)' }]}>Prijs onbekend</Text>
                      }
                    </View>

                    {/* Variant picker (color + storage) */}
                    {result.colorVariants.length > 1 && (
                      <View style={{ marginTop: 8 }}>
                        <Pressable
                          style={[styles.colorDropdownBtn, { backgroundColor: 'rgba(0,0,0,0.06)' }]}
                          onPress={() => setColorDropdownOpen(v => !v)}
                        >
                          {result.selectedColor ? (
                            <View style={[styles.colorDot, { backgroundColor: COLOR_HEX[result.selectedColor] ?? '#888' }]} />
                          ) : null}
                          <Text style={[styles.colorDropdownLabel, { color: '#1C1C1E' }]}>
                            {[
                              result.selectedStorage ? result.selectedStorage.toUpperCase() : '',
                              result.selectedColor ? result.selectedColor.charAt(0).toUpperCase() + result.selectedColor.slice(1) : '',
                            ].filter(Boolean).join(' · ') || 'Variant kiezen'}
                          </Text>
                          <IconSymbol
                            name={colorDropdownOpen ? 'chevron.up' : 'chevron.down'}
                            size={12}
                            color="rgba(0,0,0,0.45)"
                          />
                        </Pressable>
                        {colorDropdownOpen && (
                          <View style={[styles.colorDropdownList, { backgroundColor: '#fff', borderColor: 'rgba(0,0,0,0.10)' }]}>
                            {result.colorVariants.map((variant, i) => {
                              const isActive = variant.color === result.selectedColor && variant.storage === result.selectedStorage;
                              const label = [
                                variant.storage ? variant.storage.toUpperCase() : '',
                                variant.color ? variant.color.charAt(0).toUpperCase() + variant.color.slice(1) : '',
                              ].filter(Boolean).join(' · ') || 'Standaard';
                              const cheapest = [...variant.shopLinks].filter(l => l.price != null).sort((a, b) => (a.price ?? 0) - (b.price ?? 0))[0];
                              return (
                                <View key={`${variant.color}-${variant.storage}`}>
                                  {i > 0 && <View style={[styles.promoSep, { backgroundColor: 'rgba(0,0,0,0.06)' }]} />}
                                  <Pressable
                                    style={styles.colorOptionRow}
                                    onPress={() => handleSelectVariant(variant)}
                                  >
                                    {variant.color ? (
                                      <View style={[styles.colorDot, { backgroundColor: COLOR_HEX[variant.color] ?? '#888' }]} />
                                    ) : null}
                                    <Text style={[styles.colorOptionLabel, { color: '#1C1C1E' }]}>{label}</Text>
                                    {cheapest?.price != null && (
                                      <Text style={[styles.colorOptionPrice, { color: isActive ? Palette.accent : 'rgba(0,0,0,0.5)' }]}>
                                        €{cheapest.price.toFixed(2)}
                                      </Text>
                                    )}
                                    {isActive && (
                                      <IconSymbol name="checkmark" size={13} color={Palette.primary} />
                                    )}
                                  </Pressable>
                                </View>
                              );
                            })}
                          </View>
                        )}
                      </View>
                    )}

                  </View>
                </View>
              </View>
            </Animated.View>

            {/* Price History */}
            {result.priceHistory.length > 0 && (
              <Animated.View entering={animationsEnabled ? FadeInDown.delay(60).springify().damping(18).stiffness(110) : undefined}>
                <Text style={[styles.sectionLabel, { color: 'rgba(0,0,0,0.45)' }]}>PRIJSHISTORIE</Text>
                <View style={[styles.chartCard, { backgroundColor: '#FFFFFF', borderColor: 'rgba(0,0,0,0.10)' }]}>
                  <View style={styles.chartHeader}>
                    <Text style={[styles.chartLow, { color: Palette.accent }]}>
                      Laagste: €{Math.min(...result.priceHistory.map(p => p.price)).toFixed(2)}
                    </Text>
                    <Text style={[styles.chartHigh, { color: 'rgba(0,0,0,0.45)' }]}>
                      Hoogste: €{Math.max(...result.priceHistory.map(p => p.price)).toFixed(2)}
                    </Text>
                  </View>
                  <MiniChart data={result.priceHistory} isDark={isDark} />
                  {result.priceHistory.length === 1 && (
                    <Text style={[styles.chartNote, { color: 'rgba(0,0,0,0.45)' }]}>
                      Eerste meting — scan opnieuw om geschiedenis op te bouwen.
                    </Text>
                  )}
                </View>
              </Animated.View>
            )}

            {/* Price Alert */}
            <Animated.View entering={animationsEnabled ? FadeInDown.delay(120).springify().damping(18).stiffness(110) : undefined}>
              <View style={[styles.alertRow, { backgroundColor: '#FFFFFF', borderColor: 'rgba(0,0,0,0.10)' }]}>
                <View style={[styles.alertIconBox, { backgroundColor: '#FF9500' + '20' }]}>
                  <IconSymbol name="bell.badge.fill" size={20} color="#FF9500" />
                </View>
                <View style={styles.alertInfo}>
                  <Text style={[styles.alertTitle, { color: '#1C1C1E' }]}>Prijsalert instellen</Text>
                  {alertSaved
                    ? <Text style={[styles.alertSub, { color: Palette.accent }]}>Alert opgeslagen!</Text>
                    : <Text style={[styles.alertSub, { color: 'rgba(0,0,0,0.45)' }]}>Ontvang een melding als de prijs daalt</Text>
                  }
                </View>
                {!alertSaved && (
                  <Pressable
                    onPress={() => setShowAlertInput(v => !v)}
                    style={[styles.alertToggle, { backgroundColor: 'rgba(0,0,0,0.06)' }]}
                  >
                    <Text style={[styles.alertToggleText, { color: Palette.primary }]}>
                      {showAlertInput ? 'Annuleer' : 'Instellen'}
                    </Text>
                  </Pressable>
                )}
              </View>
              {showAlertInput && !alertSaved && (
                <View style={[styles.alertInputCard, { backgroundColor: '#F2F2F7', borderColor: 'rgba(0,0,0,0.08)' }]}>
                  <Text style={[styles.alertInputLabel, { color: 'rgba(0,0,0,0.5)' }]}>Doelprijs (€)</Text>
                  <View style={styles.alertInputRow}>
                    <TextInput
                      style={[styles.alertInput, { color: '#1C1C1E', borderColor: 'rgba(0,0,0,0.12)', backgroundColor: '#F2F2F7' }]}
                      placeholder={result.currentPrice > 0 ? `bijv. ${(result.currentPrice * 0.9).toFixed(0)}` : 'bijv. 150'}
                      placeholderTextColor="rgba(0,0,0,0.35)"
                      value={alertPrice}
                      onChangeText={setAlertPrice}
                      keyboardType="decimal-pad"
                    />
                    <Pressable
                      style={[styles.alertConfirmBtn, { backgroundColor: Palette.primary, opacity: alertPrice.trim() ? 1 : 0.5 }]}
                      onPress={() => { handleSetAlert().catch(() => {}); }}
                      disabled={!alertPrice.trim()}
                    >
                      <Text style={styles.alertConfirmText}>Bewaar</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </Animated.View>

            {/* Promo Codes */}
            {result.promoCodes.length > 0 && (
              <Animated.View entering={animationsEnabled ? FadeInDown.delay(150).springify().damping(18).stiffness(110) : undefined}>
                <Text style={[styles.sectionLabel, { color: 'rgba(0,0,0,0.45)' }]}>KORTINGSCODES</Text>
                <View style={[styles.promoCard, { backgroundColor: '#FFFFFF', borderColor: 'rgba(0,0,0,0.10)', borderWidth: StyleSheet.hairlineWidth, borderRadius: Radius.xl, overflow: 'hidden' }]}>
                  {result.promoCodes.map((promo, i) => (
                    <View key={promo.code}>
                      {i > 0 && <View style={[styles.promoSep, { backgroundColor: 'rgba(0,0,0,0.06)' }]} />}
                      <View style={styles.promoRow}>
                        <View style={[styles.promoCodeBox, { backgroundColor: Palette.primary + '18' }]}>
                          <Text style={[styles.promoCode, { color: Palette.primary }]}>{promo.code}</Text>
                        </View>
                        <View style={styles.promoInfo}>
                          <Text style={[styles.promoDiscount, { color: '#1C1C1E' }]} numberOfLines={1}>{promo.discount}</Text>
                          {promo.expiresAt && (
                            <Text style={[styles.promoExpiry, { color: 'rgba(0,0,0,0.4)' }]}>Geldig t/m {promo.expiresAt}</Text>
                          )}
                        </View>
                        <IconSymbol
                          name={promo.source === 'page' ? 'checkmark.seal.fill' : 'tag.fill'}
                          size={16}
                          color={promo.source === 'page' ? Palette.accent : 'rgba(0,0,0,0.3)'}
                        />
                      </View>
                    </View>
                  ))}
                </View>
              </Animated.View>
            )}

            {/* Specs */}
            <Animated.View entering={animationsEnabled ? FadeInDown.delay(160).springify().damping(18).stiffness(110) : undefined}>
              <Text style={[styles.sectionLabel, { color: 'rgba(0,0,0,0.45)' }]}>SPECIFICATIES</Text>
              <View style={[styles.specsCard, { backgroundColor: '#FFFFFF', borderColor: 'rgba(0,0,0,0.10)' }]}>
                {result.specs && Object.keys(result.specs).length > 0
                  ? Object.entries(result.specs).map(([key, val], i) => (
                    <View key={key}>
                      {i > 0 && <View style={[styles.specsSep, { backgroundColor: 'rgba(0,0,0,0.06)' }]} />}
                      <View style={styles.specsRow}>
                        <Text style={[styles.specsKey, { color: 'rgba(0,0,0,0.5)' }]} numberOfLines={2}>{key}</Text>
                        <Text style={[styles.specsVal, { color: '#1C1C1E' }]} numberOfLines={2}>{val}</Text>
                      </View>
                    </View>
                  ))
                  : (
                    <View style={styles.specsRow}>
                      <Text style={[styles.specsUnavailable, { color: 'rgba(0,0,0,0.4)' }]}>Niet beschikbaar</Text>
                    </View>
                  )
                }
              </View>
            </Animated.View>

            {/* Shop Links */}
            <Animated.View entering={animationsEnabled ? FadeInDown.delay(170).springify().damping(18).stiffness(110) : undefined}>
              <Text style={[styles.sectionLabel, { color: 'rgba(0,0,0,0.45)' }]}>ANDERE AANBIEDERS</Text>
              <View style={[styles.shopLinksCard, { backgroundColor: '#FFFFFF', borderColor: 'rgba(0,0,0,0.10)', borderWidth: StyleSheet.hairlineWidth, borderRadius: Radius.xl, overflow: 'hidden' }]}>
                {result.shopLinks.length > 1
                  ? (() => {
                    const cheapestIdx = result.shopLinks.reduce((best, link, i) => {
                      if (link.price == null) return best;
                      if (best === -1) return i;
                      return link.price < (result.shopLinks[best].price ?? Infinity) ? i : best;
                    }, -1);
                    return result.shopLinks.map((link, i) => (
                      <View key={`${link.name}-${i}`}>
                        {i > 0 && <View style={[styles.promoSep, { backgroundColor: 'rgba(0,0,0,0.06)' }]} />}
                        <Pressable
                          style={styles.shopLinkRow}
                          onPress={() => { Linking.openURL(link.url).catch(() => {}); }}
                        >
                          <View style={styles.shopLinkInfo}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={[styles.shopLinkName, { color: '#1C1C1E' }]} numberOfLines={1}>{link.name}</Text>
                              {i === cheapestIdx && (
                                <View style={styles.cheapestBadge}>
                                  <Text style={styles.cheapestBadgeText}>Goedkoopste</Text>
                                </View>
                              )}
                            </View>
                            {link.price != null
                              ? <Text style={[styles.shopLinkPrice, { color: i === cheapestIdx ? Palette.accent : 'rgba(0,0,0,0.55)' }]}>€{link.price.toFixed(2)}</Text>
                              : <Text style={[styles.shopLinkPrice, { color: 'rgba(0,0,0,0.4)' }]}>Prijs onbekend</Text>
                            }
                          </View>
                          <IconSymbol name="chevron.right" size={14} color="rgba(0,0,0,0.3)" />
                        </Pressable>
                      </View>
                    ));
                  })()
                  : (
                    <View style={styles.shopLinkRow}>
                      <Text style={[styles.specsUnavailable, { color: 'rgba(0,0,0,0.4)' }]}>Niet beschikbaar</Text>
                    </View>
                  )
                }
              </View>
            </Animated.View>

            {/* Buy CTA */}
            <Animated.View
              entering={animationsEnabled ? FadeInDown.delay(180).springify().damping(18).stiffness(110) : undefined}
              style={ctaStyle}
            >
              <Pressable
                onPressIn={() => { ctaScale.value = withSpring(0.97, { damping: 12, stiffness: 340 }); }}
                onPressOut={() => { ctaScale.value = withSpring(1, { damping: 12, stiffness: 340 }); }}
                onPress={() => { Linking.openURL(result.affiliateUrl).catch(() => {}); }}
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
                      <Text style={styles.ctaShop}>Bekijk via Tracr</Text>
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

            <Text style={[styles.affiliateNote, { color: 'rgba(0,0,0,0.4)' }]}>
              Tracr gebruikt affiliate links. Je betaalt nooit meer.
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
    borderRadius: Radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
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
    borderRadius: Radius.full,
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
    borderRadius: Radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
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
    borderRadius: Radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
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

  chartCard: {
    overflow: 'hidden',
    padding: Spacing.md,
    gap: Spacing.sm,
    borderRadius: Radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  chartLow: { fontSize: 13, fontWeight: '600' },
  chartHigh: { fontSize: 13 },
  chartNote: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
  },

  alertRow: {
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
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
  alertInputCard: {
    overflow: 'hidden',
    padding: Spacing.md,
    gap: Spacing.sm,
    marginTop: 4,
    borderRadius: Radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
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

  promoCard: { overflow: 'hidden' },
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

  specsCard: {
    overflow: 'hidden',
    borderRadius: Radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  specsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    gap: Spacing.sm,
  },
  specsSep: {
    height: StyleSheet.hairlineWidth,
    marginLeft: Spacing.md,
  },
  specsKey: { flex: 1, fontSize: 13, lineHeight: 18 },
  specsVal: { flex: 1.2, fontSize: 13, fontWeight: '600', lineHeight: 18, textAlign: 'right' },
  specsUnavailable: { fontSize: 13, fontStyle: 'italic' },

  shopLinksCard: {},
  shopLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 13,
    gap: Spacing.sm,
  },
  shopLinkInfo: { flex: 1, gap: 2 },
  shopLinkName: { fontSize: 14, fontWeight: '600' },
  shopLinkPrice: { fontSize: 13, fontWeight: '700' },
  cheapestBadge: {
    backgroundColor: 'rgba(52,199,89,0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  cheapestBadgeText: { fontSize: 10, fontWeight: '700', color: Palette.accent },

  colorDropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
  },
  colorDropdownLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  colorDropdownList: {
    marginTop: 6,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  colorOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  colorOptionLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  colorOptionPrice: {
    fontSize: 13,
    fontWeight: '700',
    marginRight: 4,
  },

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
    top: 0, left: 0, right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.45)',
    zIndex: 10,
  },
  ctaBlob: {
    position: 'absolute',
    top: 6, left: 24,
    width: 80, height: 10,
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

  errorCard: {
    overflow: 'hidden',
    padding: Spacing.md,
    gap: Spacing.sm,
    alignItems: 'center',
    borderRadius: Radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
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

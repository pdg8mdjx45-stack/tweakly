import { BackButton } from '@/components/back-button';
import { PriceHistoryChart } from '@/components/charts';
import { LiquidScreen } from '@/components/liquid-screen';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { PRICE_DISCLAIMER, type ProductVariant } from '@/constants/mock-data';
import { Colors, Palette, Radius, Shadow, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useProductImage } from '@/hooks/use-product-image';
import { buildOutboundUrl, getCheapestShop, getShopMeta, sortShopsByPrice } from '@/services/affiliate-links';
import { addToCompare, isInCompare, subscribeCompare } from '@/services/compare-store';
import { fetchIcecatByEAN, type IcecatProduct } from '@/services/icecat-api';
import { getProductById, type Product } from '@/services/product-db';
import { addAlert, getAlerts, type PriceAlert } from '@/services/alerts-store';
import {
  findTweakersProductCached,
  type TweakersPriceHistory,
  type TweakersProductInfo,
  type TweakersShopOffer,
} from '@/services/tweakers-pricewatch';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

/** Clean tracking params from URLs */
function cleanUrl(url: string): string {
  try {
    const u = new URL(url);
    // Remove common tracking params
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'ref', 'tag', 'affiliate', 'aff_id'];
    trackingParams.forEach(p => u.searchParams.delete(p));
    return u.toString();
  } catch {
    return url;
  }
}

/** Determine if a URL is a direct product page (not a search/redirect) */
function isDirectProductUrl(url: string): boolean {
  if (!url || url === '#') return false;
  // Tweakers clickout URLs are redirects, not direct
  if (url.includes('tweakers.net/clickout') || (url.includes('/pricewatch/') && url.includes('/shop'))) return false;
  // Search URLs are not direct
  if (url.includes('/zoeken?') || url.includes('/search?') || url.includes('google.com/search')) return false;
  // Tweakers pricewatch product pages (not direct retailer links)
  if (url.includes('tweakers.net/pricewatch/')) return false;
  return true;
}

/** Get a user-friendly label for the link type */
function getLinkStatusLabel(url: string, verified?: boolean): string | null {
  if (verified === true) return null;
  if (!url || url === '#') return 'Link niet beschikbaar';
  if (url.includes('google.com/search')) return 'Zoekresultaat';
  if (url.includes('tweakers.net/pricewatch/')) return 'Via Pricewatch';
  if (!isDirectProductUrl(url)) return 'Redirect';
  return 'Link niet geverifieerd';
}

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [product, setProduct] = useState<Product | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'prijzen' | 'specs' | 'reviews'>('prijzen');
  const [inCompare, setInCompare] = useState(() => !!id && isInCompare(id));
  const [icecatData, setIcecatData] = useState<IcecatProduct | null>(null);
  const [tweakersOffers, setTweakersOffers] = useState<TweakersShopOffer[]>([]);
  const [tweakersInfo, setTweakersInfo] = useState<TweakersProductInfo | null>(null);
  const [tweakersPriceHistory, setTweakersPriceHistory] = useState<TweakersPriceHistory | null>(null);
  const [tweakersLoading, setTweakersLoading] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [variantModalVisible, setVariantModalVisible] = useState(false);
  const [alertModalVisible, setAlertModalVisible] = useState(false);
  const [targetPrice, setTargetPrice] = useState('');
  const [existingAlert, setExistingAlert] = useState<PriceAlert | null>(null);

  const bestImageUrl = selectedVariant?.imageUrl || tweakersInfo?.imageUrl || icecatData?.imageUrl || product?.imageUrl || '';
  const productImage = useProductImage(product?.name ?? '', bestImageUrl);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    getProductById(id).then(p => {
      if (p) {
        setProduct(p);
        if (p.ean) {
          fetchIcecatByEAN(p.ean).then((icecat: IcecatProduct | null) => {
            if (icecat) setIcecatData(icecat);
          });
        }
        setTweakersLoading(true);
        findTweakersProductCached(p.name).then(result => {
          if (result) {
            setTweakersOffers(result.offers);
            setTweakersInfo(result.info);
            setTweakersPriceHistory(result.priceHistory);
          }
          setTweakersLoading(false);
        });
      }
      setLoading(false);
    });
  }, [id]);

  useEffect(() => {
    if (!id) return;
    getAlerts().then(alerts => {
      const alert = alerts.find(a => a.productId === id);
      if (alert) {
        setExistingAlert(alert);
        setTargetPrice(alert.targetPrice.toString());
      }
    });
  }, [id]);

  useEffect(() => {
    return subscribeCompare(() => setInCompare(!!id && isInCompare(id)));
  }, [id]);

  if (loading) {
    return (
      <LiquidScreen style={{ justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Palette.primary} />
      </LiquidScreen>
    );
  }

  if (!product) {
    return (
      <LiquidScreen>
        <View style={styles.notFound}>
          <Text style={[styles.notFoundText, { color: colors.text }]}>Product niet gevonden</Text>
          <Pressable onPress={() => router.back()}>
            <Text style={[styles.backLink, { color: colors.tint }]}>Terug</Text>
          </Pressable>
        </View>
      </LiquidScreen>
    );
  }

  const maxHistoryPrice = Math.max(...product.priceHistory.map(p => p.price), product.originalPrice ?? product.currentPrice);
  const minReasonablePrice = maxHistoryPrice > 50 ? maxHistoryPrice * 0.2 : 0;

  const validOffers = tweakersOffers.filter(o => o.price >= minReasonablePrice);

  let realPrice: number;
  if (validOffers.length > 0) {
    realPrice = Math.min(...validOffers.map(o => o.price));
  } else if (tweakersInfo?.lowPrice != null && tweakersInfo.lowPrice >= minReasonablePrice) {
    realPrice = tweakersInfo.lowPrice;
  } else {
    realPrice = product.currentPrice;
  }

  const displayPrice = selectedVariant ? selectedVariant.price : realPrice;
  const priceDropPct = displayPrice < product.originalPrice
    ? Math.round(((product.originalPrice - displayPrice) / product.originalPrice) * 100)
    : 0;

  let realPriceHistory = tweakersPriceHistory
    ? tweakersPriceHistory.prices.map(p => ({ date: p.date, price: p.minPrice }))
    : product.priceHistory;

  if (minReasonablePrice > 0) {
    realPriceHistory = realPriceHistory.filter(p => p.price >= minReasonablePrice);
  }

  // Use variant-specific shops if a variant is selected and has shops
  const variantShops = selectedVariant?.shops;
  const curatedShops = variantShops || product.shops;
  const cheapestCurated = getCheapestShop(curatedShops);

  const displayShops = validOffers.length > 0 && !selectedVariant
    ? validOffers.map(o => ({
        name: o.shopName,
        price: o.price,
        url: o.url,
        logo: o.shopName.slice(0, 3).toUpperCase(),
        shipping: o.shippingCost,
        isVerified: isDirectProductUrl(o.url),
        linkStatus: getLinkStatusLabel(o.url),
      }))
    : sortShopsByPrice(curatedShops).map(s => ({
        ...s,
        shipping: 0,
        isVerified: s.verified ?? isDirectProductUrl(s.url),
        linkStatus: getLinkStatusLabel(s.url, s.verified),
      }));

  return (
    <LiquidScreen style={styles.safe}>
      <BackButton />
      <StatusBar hidden />
      {/* Floating actions (bookmark) */}
      <View style={[styles.headerActions, { top: insets.top + 8 }]}>
        <Pressable onPress={() => setSaved(!saved)} hitSlop={12}>
          <IconSymbol
            name={saved ? 'bookmark.fill' : 'bookmark'}
            size={22}
            color={saved ? colors.tint : colors.icon}
          />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Product Image */}
        <View style={[styles.imageWrapper, { backgroundColor: isDark ? Palette.dark2 : '#F5F5F7' }]}>
          <Image
            source={{ uri: productImage }}
            style={styles.productImage}
            contentFit="contain"
            transition={200}
          />
          {product.badge && (
            <View style={[styles.badge, { backgroundColor: product.badge === 'prijsdaling' ? Palette.accent : product.badge === 'deal' ? Palette.deal : Palette.primary }]}>
              <Text style={styles.badgeText}>{product.badge}</Text>
            </View>
          )}
        </View>

        {/* Product Info */}
        <View style={styles.info}>
          <Text style={[styles.brand, { color: colors.textSecondary }]}>{product.brand}</Text>
          <Text style={[styles.name, { color: colors.text }]}>{product.name}</Text>

          <View style={styles.ratingRow}>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map(i => (
                <Text key={i} style={[styles.star, { color: i <= Math.round(product.rating) ? Palette.star : (isDark ? Palette.dark4 : Palette.grey5) }]}>
                  ★
                </Text>
              ))}
            </View>
            <Text style={[styles.ratingText, { color: colors.textSecondary }]}>
              {product.rating.toFixed(1)} ({product.reviewCount} reviews)
            </Text>
          </View>

          {/* Variant Selector */}
          {product.variants && product.variants.length > 0 && (
            <View style={styles.variantSection}>
              <Text style={[styles.variantLabel, { color: colors.textSecondary }]}>
                {product.variants[0].type === 'kleur' ? 'Kleur' :
                 product.variants[0].type === 'opslag' ? 'Opslag' :
                 product.variants[0].type === 'model' ? 'Model' : 'Variant'}
              </Text>
              <Pressable
                style={[styles.variantDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => setVariantModalVisible(true)}
              >
                <Text style={[styles.variantDropdownText, { color: colors.text }]}>
                  {selectedVariant ? selectedVariant.label : product.variants[0].label}
                </Text>
                {selectedVariant && selectedVariant.price !== product.currentPrice && (
                  <Text style={[styles.variantPriceTag, { color: Palette.primary }]}>
                    €{selectedVariant.price.toLocaleString('nl-NL')}
                  </Text>
                )}
                <Text style={[styles.variantArrow, { color: colors.textSecondary }]}>▼</Text>
              </Pressable>

              <Modal
                visible={variantModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setVariantModalVisible(false)}
              >
                <Pressable
                  style={styles.variantModalOverlay}
                  onPress={() => setVariantModalVisible(false)}
                >
                  <View style={[styles.variantModalContent, { backgroundColor: colors.background }]}>
                    <View style={styles.variantModalHeader}>
                      <Text style={[styles.variantModalTitle, { color: colors.text }]}>
                        Kies {product.variants[0].type === 'kleur' ? 'kleur' :
                               product.variants[0].type === 'opslag' ? 'opslag' : 'variant'}
                      </Text>
                      <Pressable onPress={() => setVariantModalVisible(false)}>
                        <Text style={[styles.variantModalClose, { color: Palette.primary }]}>✕</Text>
                      </Pressable>
                    </View>
                    <ScrollView>
                      {product.variants.map(variant => {
                        const isSelected = selectedVariant?.id === variant.id ||
                          (!selectedVariant && variant.id === product.variants![0].id);
                        return (
                          <Pressable
                            key={variant.id}
                            style={[
                              styles.variantOption,
                              isSelected && { backgroundColor: Palette.primary + '15' },
                            ]}
                            onPress={() => {
                              setSelectedVariant(variant);
                              setVariantModalVisible(false);
                            }}
                          >
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.variantOptionText, { color: colors.text }, isSelected && { color: Palette.primary, fontWeight: '600' }]}>
                                {variant.label}
                              </Text>
                            </View>
                            <Text style={[styles.variantOptionPrice, { color: colors.textSecondary }]}>
                              €{variant.price.toLocaleString('nl-NL')}
                            </Text>
                            {isSelected && (
                              <Text style={[styles.variantCheck, { color: Palette.primary }]}>✓</Text>
                            )}
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                </Pressable>
              </Modal>
            </View>
          )}
        </View>

        {/* Price Section — premium card */}
        <View style={[styles.sectionCard, styles.priceSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Lowest price badge */}
          {priceDropPct > 0 && (
            <View style={styles.lowestPriceBadge}>
              <Text style={styles.lowestPriceBadgeText}>↘ Laagste prijs in 30 dagen</Text>
            </View>
          )}

          {/* Big price */}
          <View style={styles.priceRow}>
            <Text style={[styles.currentPrice, { color: colors.text }]}>
              €{displayPrice.toLocaleString('nl-NL')}
            </Text>
            {displayPrice < product.originalPrice && (
              <Text style={[styles.originalPrice, { color: colors.textSecondary }]}>
                €{product.originalPrice.toLocaleString('nl-NL')}
              </Text>
            )}
          </View>

          {/* CTA row: Add to Alert + Compare */}
          <View style={styles.ctaRow}>
            <Pressable
              onPress={() => setAlertModalVisible(true)}
              style={[styles.alertButtonLarge, { backgroundColor: existingAlert ? Palette.primaryDark : Palette.primary }]}
            >
              <IconSymbol name={existingAlert ? 'bell.fill' : 'bell'} size={18} color={isDark ? '#000' : '#fff'} />
              <Text style={[styles.alertButtonLargeText, { color: isDark ? '#000' : '#fff' }]}>
                {existingAlert ? 'Alert actief' : 'Prijsalert instellen'}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                if (product) addToCompare(product);
                router.push('/vergelijk');
              }}
              style={[styles.compareRoundBtn, {
                backgroundColor: inCompare ? Palette.primary : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'),
                borderColor: inCompare ? 'transparent' : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'),
              }]}
            >
              <Text style={{ fontSize: 18 }}>⚖</Text>
            </Pressable>
          </View>

          <View style={styles.priceMetaRow}>
            <IconSymbol name="info.circle" size={12} color={colors.textSecondary} />
            <Text style={[styles.priceNote, { color: colors.textSecondary }]}>
              Laagste prijs ooit: €{(tweakersPriceHistory?.lowestEver ?? product.lowestPrice).toLocaleString('nl-NL')}
            </Text>
          </View>
        </View>

        {/* Price Chart */}
        <View style={[styles.sectionCard, styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <PriceHistoryChart
            data={realPriceHistory}
            isDark={colorScheme === 'dark'}
            title="Prijsgeschiedenis"
          />
        </View>

        {/* Tabs */}
        <View style={[styles.tabs, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {(['prijzen', 'specs', 'reviews'] as const).map(tab => (
            <Pressable
              key={tab}
              style={[
                styles.tab,
                activeTab === tab && { borderBottomColor: colors.tint, borderBottomWidth: 2 },
              ]}
              onPress={() => setActiveTab(tab)}>
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === tab ? colors.tint : colors.textSecondary },
                  activeTab === tab && { fontWeight: '600' },
                ]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'prijzen' && (
            <View style={[styles.sectionCard, styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.subTitle, { color: colors.textSecondary }]}>
                {tweakersOffers.length > 0 ? 'WINKELPRIJZEN (LIVE)' : 'WINKELPRIJZEN'}
              </Text>
              {tweakersOffers.length === 0 && (
                <View style={[styles.disclaimerRow, { backgroundColor: isDark ? Palette.dark3 : '#FFF8E1' }]}>
                  <IconSymbol name="info.circle" size={14} color={isDark ? Palette.grey2 : '#F57C00'} />
                  <Text style={[styles.disclaimerText, { color: isDark ? Palette.grey2 : '#5D4037' }]}>
                    {PRICE_DISCLAIMER}
                  </Text>
                </View>
              )}
              {tweakersLoading && (
                <View style={styles.tweakersLoadingRow}>
                  <ActivityIndicator size="small" color={Palette.primary} />
                  <Text style={[styles.tweakersLoadingText, { color: colors.textSecondary }]}>
                    Prijzen laden...
                  </Text>
                </View>
              )}
              {/* Hero CTA: goedkoopste aanbieder (alleen bij indicatieve prijzen) */}
              {validOffers.length === 0 && !selectedVariant && cheapestCurated && (() => {
                const meta = getShopMeta(cheapestCurated);
                const outUrl = buildOutboundUrl(cheapestCurated);
                const ctaBg = meta?.brandColor ?? Palette.primary;
                return (
                  <Pressable
                    style={[styles.heroCta, { backgroundColor: ctaBg }]}
                    onPress={() => WebBrowser.openBrowserAsync(outUrl, { toolbarColor: ctaBg })}
                  >
                    <View style={[styles.heroLogoBox, { backgroundColor: meta?.logoBackground ?? (isDark ? Palette.dark3 : Palette.grey6) }]}>
                      <Text style={[styles.heroLogoText, { color: meta?.logoTextColor ?? '#fff' }]}>
                        {cheapestCurated.logo}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.heroCtaLabel}>Beste prijs bij</Text>
                      <Text style={styles.heroCtaShop}>{cheapestCurated.name}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.heroCtaPrice}>
                        €{cheapestCurated.price.toLocaleString('nl-NL')}
                      </Text>
                      <Text style={styles.heroCtaCta}>Bekijk aanbieding →</Text>
                    </View>
                  </Pressable>
                );
              })()}

              <View style={styles.shopList}>
                {displayShops.map((shop, index, arr) => {
                  const shopUrl = validOffers.length > 0
                    ? cleanUrl(shop.url)
                    : buildOutboundUrl(shop);
                  const linkLabel = shop.linkStatus;
                  return (
                    <View key={`${shop.name}-${index}`}>
                      <View style={styles.shopRow}>
                        {/* Shop Logo */}
                        <View style={[styles.shopLogo, { backgroundColor: isDark ? Palette.dark3 : Palette.grey6 }]}>
                          <Text style={[styles.shopLogoText, { color: colors.text }]}>{shop.logo}</Text>
                        </View>

                        {/* Shop Info */}
                        <View style={styles.shopInfo}>
                          <View style={styles.shopNameRow}>
                            <Text style={[styles.shopName, { color: colors.text }]}>{shop.name}</Text>
                            {linkLabel && (
                              <View style={[styles.unverifiedBadge, { backgroundColor: isDark ? Palette.dark4 : Palette.grey5 }]}>
                                <Text style={[styles.unverifiedText, { color: colors.textSecondary }]}>{linkLabel}</Text>
                              </View>
                            )}
                          </View>
                          {shop.shipping > 0 && (
                            <Text style={[styles.shippingText, { color: colors.textSecondary }]}>
                              + €{shop.shipping.toFixed(2)} verzending
                            </Text>
                          )}
                        </View>

                        {/* Price */}
                        <Text style={[styles.shopPrice, { color: colors.text }]}>
                          €{shop.price.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Text>

                        {/* CTA Button */}
                        <Pressable
                          style={({ pressed }) => [
                            styles.shopButton,
                            { backgroundColor: Palette.primary },
                            pressed && { opacity: 0.85 },
                          ]}
                          onPress={() => shopUrl && shopUrl !== '#' && WebBrowser.openBrowserAsync(shopUrl, { toolbarColor: Palette.primary })}>
                          <Text style={styles.shopButtonText}>Bekijk</Text>
                        </Pressable>

                      </View>
                      {index < arr.length - 1 && (
                        <View style={[styles.shopSep, { backgroundColor: isDark ? Palette.dark4 : Palette.grey5 }]} />
                      )}
                    </View>
                  );
                })}
              </View>
              {/* Google Shopping link */}
              <Pressable
                style={({ pressed }) => [
                  styles.googleShoppingButton,
                  { borderColor: isDark ? Palette.dark4 : Palette.grey4 },
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() => {
                  const q = encodeURIComponent(product.name);
                  WebBrowser.openBrowserAsync(`https://www.google.com/search?tbm=shop&q=${q}`, { toolbarColor: Palette.primary });
                }}>
                <Text style={[styles.googleShoppingText, { color: colors.tint }]}>
                  Vergelijk op Google Shopping
                </Text>
              </Pressable>
            </View>
          )}

          {activeTab === 'specs' && (() => {
            const displaySpecs: Record<string, string> = icecatData && Object.keys(icecatData.specsFlat).length > 0
              ? icecatData.specsFlat
              : product.specs;
            const isIcecat = icecatData && Object.keys(icecatData.specsFlat).length > 0;
            return (
              <View style={[styles.sectionCard, styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.subTitle, { color: colors.textSecondary }]}>SPECIFICATIES</Text>
                {Object.keys(displaySpecs).length === 0 ? (
                  <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
                    Geen specificaties beschikbaar
                  </Text>
                ) : (
                  <View style={styles.specsList}>
                    {Object.entries(displaySpecs).map(([key, value], index, arr) => (
                      <View key={key}>
                        <View style={styles.specRow}>
                          <Text style={[styles.specKey, { color: colors.textSecondary }]}>{key}</Text>
                          <Text style={[styles.specValue, { color: colors.text }]}>{value}</Text>
                        </View>
                        {index < arr.length - 1 && (
                          <View style={[styles.specSep, { backgroundColor: isDark ? Palette.dark4 : Palette.grey5 }]} />
                        )}
                      </View>
                    ))}
                  </View>
                )}
                {isIcecat && (
                  <Text style={[styles.icecatAttribution, { color: colors.textSecondary }]}>
                    Bron: Icecat Open Catalog
                  </Text>
                )}
              </View>
            );
          })()}

          {activeTab === 'reviews' && (
            <View style={[styles.sectionCard, styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.subTitle, { color: colors.textSecondary }]}>REVIEWS</Text>
              <View style={styles.reviewSummary}>
                <Text style={[styles.reviewBigScore, { color: colors.text }]}>{product.rating.toFixed(1)}</Text>
                <View>
                  <View style={styles.reviewStars}>
                    {[1, 2, 3, 4, 5].map(i => (
                      <Text key={i} style={[styles.reviewStar, { color: i <= Math.round(product.rating) ? Palette.star : (isDark ? Palette.dark4 : Palette.grey5) }]}>
                        ★
                      </Text>
                    ))}
                  </View>
                  <Text style={[styles.reviewCount, { color: colors.textSecondary }]}>
                    {product.reviewCount} reviews
                  </Text>
                </View>
              </View>
              <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
                Reviews worden binnenkort beschikbaar
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Price Alert Modal */}
      <Modal
        visible={alertModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setAlertModalVisible(false)}
      >
        <View style={[styles.safe, { backgroundColor: colors.background }]}>
          <View style={[styles.variantModalHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => setAlertModalVisible(false)}>
              <Text style={[styles.variantModalClose, { color: colors.text }]}>✕</Text>
            </Pressable>
            <Text style={[styles.variantModalTitle, { color: colors.text }]}>
              {existingAlert ? 'Prijsalert bewerken' : 'Prijsalert instellen'}
            </Text>
            <Pressable
              onPress={async () => {
                const price = parseFloat(targetPrice.replace(',', '.'));
                if (isNaN(price) || price <= 0) {
                  return;
                }
                if (product) {
                  await addAlert({
                    productId: product.id,
                    productName: product.name,
                    targetPrice: price,
                    currentPrice: displayPrice,
                  });
                  const alerts = await getAlerts();
                  const alert = alerts.find(a => a.productId === product.id);
                  if (alert) setExistingAlert(alert);
                }
                setAlertModalVisible(false);
              }}
            >
              <Text style={{ color: Palette.primary, fontSize: 17, fontWeight: '600' }}>Opslaan</Text>
            </Pressable>
          </View>
          <View style={{ padding: Spacing.md, gap: Spacing.md }}>
            <View style={{ gap: Spacing.xs }}>
              <Text style={[styles.specKey, { color: colors.textSecondary }]}>Huidige prijs</Text>
              <Text style={[styles.currentPrice, { color: colors.text }]}>
                €{displayPrice.toLocaleString('nl-NL')}
              </Text>
            </View>
            <View style={{ gap: Spacing.xs }}>
              <Text style={[styles.specKey, { color: colors.textSecondary }]}>Doelprijs</Text>
              <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={{ fontSize: 24, fontWeight: '600', color: colors.text }}>€</Text>
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  value={targetPrice}
                  onChangeText={setTargetPrice}
                  placeholder="0,00"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="decimal-pad"
                />
              </View>
              <Text style={[styles.priceNote, { color: colors.textSecondary }]}>
                Je ontvangt een melding wanneer de prijs onder deze waarde daalt.
              </Text>
            </View>
            {existingAlert && (
              <Pressable
                onPress={async () => {
                  const { removeAlert } = await import('@/services/alerts-store');
                  await removeAlert(existingAlert.id);
                  setExistingAlert(null);
                  setTargetPrice('');
                  setAlertModalVisible(false);
                }}
                style={{ paddingVertical: Spacing.sm }}
              >
                <Text style={{ color: Palette.danger, fontSize: 16, textAlign: 'center' }}>
                  Alert verwijderen
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </Modal>
    </LiquidScreen>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  headerActions: {
    position: 'absolute',
    right: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    zIndex: 100,
  },
  compareChip: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1.5,
  },
  compareChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  imageWrapper: {
    position: 'relative',
    aspectRatio: 1.15,
    padding: Spacing.lg + Spacing.sm,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  info: {
    padding: Spacing.md,
    paddingTop: Spacing.md + Spacing.xs,
    gap: Spacing.xs + 2,
  },
  brand: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  name: {
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 30,
    letterSpacing: -0.5,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
  },
  star: {
    fontSize: 16,
  },
  ratingText: {
    fontSize: 13,
  },

  // Price section
  priceSection: {
    marginHorizontal: Spacing.md,
    padding: Spacing.md + Spacing.xs,
    borderRadius: Radius.xl,
    gap: Spacing.sm,
  },
  lowestPriceBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(74,222,128,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.30)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  lowestPriceBadgeText: {
    color: Palette.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.sm,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  alertButtonLarge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: Radius.full,
  },
  alertButtonLargeText: {
    fontSize: 15,
    fontWeight: '700',
  },
  compareRoundBtn: {
    width: 48,
    height: 48,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  currentPrice: {
    fontSize: 38,
    fontWeight: '800',
    letterSpacing: -1,
  },
  discountBadge: {
    backgroundColor: Palette.accentSoft,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  discountText: {
    color: Palette.accent,
    fontSize: 14,
    fontWeight: '700',
  },
  originalPrice: {
    fontSize: 18,
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
  priceMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  priceNote: {
    fontSize: 12,
  },
  priceSourceTag: {
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 2,
  },

  // Section card base (iOS 26 surface)
  sectionCard: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },

  // Cards
  card: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
  },

  // Tabs
  tabs: {
    flexDirection: 'row',
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  tabContent: {
    paddingVertical: Spacing.sm,
    paddingBottom: Spacing.xxl,
  },

  // Shop list
  subTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  shopList: {
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  shopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 12,
  },
  shopSep: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 52,
  },
  shopLogo: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopLogoText: {
    fontSize: 11,
    fontWeight: '700',
  },
  shopInfo: {
    flex: 1,
    gap: 2,
  },
  shopNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  shopName: {
    fontSize: 14,
    fontWeight: '600',
  },
  unverifiedBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: Radius.xs,
  },
  unverifiedText: {
    fontSize: 9,
    fontWeight: '600',
  },
  shippingText: {
    fontSize: 11,
  },
  shopPrice: {
    fontSize: 15,
    fontWeight: '700',
  },
  shopButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.md,
  },
  shopButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },

  // Hero CTA (goedkoopste aanbieder)
  heroCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
  },
  heroLogoBox: {
    width: 44,
    height: 44,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroLogoText: {
    fontSize: 11,
    fontWeight: '700',
  },
  heroCtaLabel: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 11,
  },
  heroCtaShop: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  heroCtaPrice: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  heroCtaCta: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    marginTop: 2,
  },

  // Google Shopping
  googleShoppingButton: {
    marginTop: Spacing.sm,
    paddingVertical: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  googleShoppingText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Specs
  specsList: {
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  specRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    gap: Spacing.md,
  },
  specSep: {
    height: StyleSheet.hairlineWidth,
  },
  specKey: {
    flex: 1,
    fontSize: 13,
  },
  specValue: {
    flex: 2,
    fontSize: 13,
    fontWeight: '600',
  },

  // Reviews
  reviewSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  reviewBigScore: {
    fontSize: 48,
    fontWeight: '700',
    letterSpacing: -1,
  },
  reviewStars: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewStar: {
    fontSize: 20,
  },
  reviewCount: {
    fontSize: 13,
    marginTop: 2,
  },
  placeholderText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: Spacing.sm,
  },

  // Disclaimer
  disclaimerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.sm,
    marginBottom: Spacing.sm,
  },
  disclaimerText: {
    fontSize: 12,
    flex: 1,
  },

  // Loading
  tweakersLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  tweakersLoadingText: {
    fontSize: 13,
  },

  // Variant selector
  variantSection: {
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  variantLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  variantDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  variantDropdownText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  variantPriceTag: {
    fontSize: 13,
    fontWeight: '600',
  },
  variantArrow: {
    fontSize: 10,
  },
  variantModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  variantModalContent: {
    maxHeight: '50%',
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    paddingBottom: Spacing.xl,
  },
  variantModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  variantModalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  variantModalClose: {
    fontSize: 20,
    fontWeight: '600',
    padding: Spacing.xs,
  },
  variantOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  variantOptionText: {
    fontSize: 16,
  },
  variantOptionPrice: {
    fontSize: 14,
    fontWeight: '500',
  },
  variantCheck: {
    fontSize: 18,
    fontWeight: '700',
  },

  // Misc
  icecatAttribution: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: Spacing.sm,
    fontStyle: 'italic',
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  notFoundText: {
    fontSize: 18,
    fontWeight: '600',
  },
  backLink: {
    fontSize: 16,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  input: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600',
    padding: 0,
  },
});

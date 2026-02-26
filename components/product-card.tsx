import type { Product, ProductVariant } from '@/constants/mock-data';
import { Colors, Palette, Radius, Shadow, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useProductImage } from '@/hooks/use-product-image';
import { isInCompare, subscribeCompare, toggleCompare } from '@/services/compare-store';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

function PriceChange({ current, original }: { current: number; original: number }) {
  if (current < original) {
    const pct = Math.round(((original - current) / original) * 100);
    return (
      <View style={styles.pctBadge}>
        <Text style={styles.pctText}>-{pct}%</Text>
      </View>
    );
  }
  return null;
}

function VariantSelector({ 
  variants, 
  onSelect,
  colorScheme 
}: { 
  variants: ProductVariant[]; 
  onSelect: (variant: ProductVariant) => void;
  colorScheme: 'light' | 'dark';
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const colors = Colors[colorScheme];
  
  const handleSelect = (index: number) => {
    setSelectedIndex(index);
    onSelect(variants[index]);
  };
  
  return (
    <View style={styles.variantSelector}>
      <View style={styles.variantOptions}>
        {variants.slice(0, 4).map((variant, index) => (
          <Pressable
            key={variant.id}
            onPress={() => handleSelect(index)}
            style={[
              styles.variantOption,
              { 
                backgroundColor: selectedIndex === index ? Palette.primary : 'transparent',
                borderColor: selectedIndex === index ? Palette.primary : colors.border,
              }
            ]}
          >
            <Text 
              style={[
                styles.variantOptionText,
                { color: selectedIndex === index ? '#fff' : colors.text }
              ]}
              numberOfLines={1}
            >
              {variant.label}
            </Text>
          </Pressable>
        ))}
      </View>
      {variants.length > 4 && (
        <Text style={[styles.moreVariants, { color: colors.textSecondary }]}>
          +{variants.length - 4} meer
        </Text>
      )}
    </View>
  );
}

function getShortDescription(product: Product): string {
  const specs = product.specs;
  const highlights: string[] = [];

  // Pick most relevant specs based on category
  const keySpecs = ['Scherm', 'Processor', 'RAM', 'GPU', 'Paneel', 'Type', 'Capaciteit', 'VRAM', 'Werkgeheugen', 'Opslag'];
  for (const key of keySpecs) {
    if (specs[key] && highlights.length < 2) {
      highlights.push(specs[key]);
    }
  }

  if (highlights.length === 0) {
    const shopCount = product.shops.length;
    return shopCount > 0 ? `${shopCount} winkel${shopCount !== 1 ? 's' : ''}` : product.brand;
  }
  return highlights.join(' · ');
}

export function ProductCard({ product }: { product: Product }) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';
  const [inCompare, setInCompare] = useState(() => isInCompare(product.id));
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    product.variants && product.variants.length > 0 ? product.variants[0] : null
  );
  const productImage = useProductImage(product.name, product.imageUrl);

  // Use selected variant's price and shops if available
  const currentPrice = selectedVariant?.price ?? product.currentPrice;
  const currentShops = selectedVariant?.shops ?? product.shops;
  const currentImage = selectedVariant?.imageUrl ?? productImage;

  useEffect(() => {
    return subscribeCompare(() => setInCompare(isInCompare(product.id)));
  }, [product.id]);

  const isPriceDown = currentPrice < product.originalPrice;
  const description = getShortDescription(product);

  return (
    <Link href={`/product/${product.id}`} asChild>
      <Pressable style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: isDark ? colors.border : 'transparent',
          borderWidth: isDark ? 1 : 0,
        },
        !isDark && Shadow.md,
        pressed && { opacity: 0.92, transform: [{ scale: 0.98 }] },
      ]}>
        {/* Image Section */}
        <View style={[styles.imageWrapper, { backgroundColor: isDark ? Palette.dark3 : '#F5F5F7' }]}>
          <Image
            source={{ uri: currentImage }}
            style={styles.image}
            contentFit="contain"
            transition={200}
          />
          {product.badge && (
            <View style={[styles.badgeWrapper, { backgroundColor: badgeColor(product.badge) }]}>
              <Text style={styles.badgeText}>
                {badgeLabel(product.badge)}
              </Text>
            </View>
          )}
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              toggleCompare(product);
            }}
            hitSlop={8}
            style={[
              styles.compareBtn,
              {
                backgroundColor: inCompare ? Palette.primary : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.06)'),
                borderWidth: inCompare ? 0 : 1,
                borderColor: inCompare ? 'transparent' : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'),
              },
            ]}>
            <Text style={[styles.compareBtnText, { color: inCompare ? '#fff' : colors.textSecondary }]}>
              {inCompare ? '✓' : '⚖'}
            </Text>
          </Pressable>
        </View>

        {/* Info Section */}
        <View style={styles.info}>
          <View style={styles.infoContent}>
            <Text style={[styles.brand, { color: colors.textSecondary }]} numberOfLines={1}>
              {product.brand}
            </Text>
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
              {product.name}
            </Text>

            {/* Short description */}
            <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={1}>
              {description}
            </Text>

            {/* Variant selector dropdown */}
            {product.variants && product.variants.length > 0 && (
              <VariantSelector 
                variants={product.variants} 
                onSelect={setSelectedVariant}
                colorScheme={colorScheme}
              />
            )}

            {/* Rating */}
            <View style={styles.ratingRow}>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map(i => (
                  <Text key={i} style={[styles.starSmall, { color: i <= Math.round(product.rating) ? Palette.star : (isDark ? Palette.dark4 : Palette.grey5) }]}>
                    ★
                  </Text>
                ))}
              </View>
              <Text style={[styles.ratingText, { color: colors.textSecondary }]}>
                ({product.reviewCount})
              </Text>
            </View>

            {/* Price Row */}
            <View style={styles.priceRow}>
              <Text style={[styles.price, { color: colors.text }]}>
                €{currentPrice.toLocaleString('nl-NL')}
              </Text>
              {isPriceDown && (
                <Text style={[styles.originalPrice, { color: colors.textSecondary }]}>
                  €{product.originalPrice.toLocaleString('nl-NL')}
                </Text>
              )}
            </View>
            {isPriceDown && (
              <PriceChange current={currentPrice} original={product.originalPrice} />
            )}
          </View>

          {/* CTA Button - always at bottom */}
          <View style={[styles.ctaButton, { backgroundColor: isDark ? Palette.primaryLight : Palette.primary }]}>
            <Text style={styles.ctaText}>Bekijk product</Text>
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

function badgeColor(badge: string) {
  switch (badge) {
    case 'prijsdaling': return Palette.accent;
    case 'deal': return Palette.deal;
    case 'nieuw': return Palette.primary;
    default: return Palette.primary;
  }
}

function badgeLabel(badge: string) {
  switch (badge) {
    case 'prijsdaling': return 'Prijsdaling';
    case 'deal': return 'Deal';
    case 'nieuw': return 'Nieuw';
    default: return badge;
  }
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  imageWrapper: {
    position: 'relative',
    aspectRatio: 1,
    padding: Spacing.md,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  badgeWrapper: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  pctBadge: {
    backgroundColor: Palette.accentSoft,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  pctText: {
    color: Palette.accent,
    fontSize: 11,
    fontWeight: '700',
  },
  info: {
    padding: Spacing.sm + 4,
    paddingTop: Spacing.sm + 2,
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: 180,
  },
  infoContent: {
    flex: 1,
    gap: 2,
  },
  brand: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
    letterSpacing: -0.1,
  },
  description: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
    opacity: 0.8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 1,
  },
  starSmall: {
    fontSize: 10,
  },
  ratingText: {
    fontSize: 10,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.xs + 2,
    marginTop: Spacing.sm,
  },
  price: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  originalPrice: {
    fontSize: 13,
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  ctaButton: {
    marginTop: 'auto',
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.md,
    alignItems: 'center',
    minHeight: 40,
  },
  ctaText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  variantIndicator: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  variantIndicatorText: {
    fontSize: 10,
    fontWeight: '500',
    opacity: 0.7,
  },
  variantSelector: {
    marginTop: 6,
    gap: 4,
  },
  variantOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  variantOption: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  variantOptionText: {
    fontSize: 10,
    fontWeight: '500',
  },
  moreVariants: {
    fontSize: 10,
    marginTop: 2,
  },
  compareBtn: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compareBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});

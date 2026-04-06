import type { Product, ProductVariant } from '@/constants/mock-data';
import { Colors, Palette, Radius, Spacing } from '@/constants/theme';
import { GlassCard } from '@/components/glass-card';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useProductImage } from '@/hooks/use-product-image';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { isInCompare, subscribeCompare, toggleCompare } from '@/services/compare-store';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
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

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';
  const { animationsEnabled } = useReduceMotion();
  const [inCompare, setInCompare] = useState(() => isInCompare(product.id));
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    product.variants && product.variants.length > 0 ? product.variants[0] : null
  );
  const productImage = useProductImage(product.name, product.imageUrl);
  
  const scale = useSharedValue(1);

  // Use selected variant's price and shops if available
  const currentPrice = selectedVariant?.price ?? product.currentPrice;
  const currentShops = selectedVariant?.shops ?? product.shops;
  const currentImage = selectedVariant?.imageUrl ?? productImage;

  useEffect(() => {
    return subscribeCompare(() => setInCompare(isInCompare(product.id)));
  }, [product.id]);

  const isPriceDown = currentPrice < product.originalPrice;
  const description = getShortDescription(product);

  const animatedPressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: animationsEnabled ? 1 : undefined,
  }));

  const handlePressIn = () => {
    if (animationsEnabled) {
      scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
    }
  };

  const handlePressOut = () => {
    if (animationsEnabled) {
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    }
  };

  const enteringAnimation = animationsEnabled 
    ? FadeInDown.delay(index * 50).springify().damping(15).stiffness(100)
    : undefined;

  return (
    <Link href={`/product/${product.id}`} asChild>
      <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut}>
        <Animated.View entering={enteringAnimation}>
        <Animated.View style={[animatedPressStyle, styles.card]}>
        <GlassCard style={styles.cardInner} radius={Radius.xl}>
          {/* Image Section */}
        <View style={styles.imageWrapper}>
          <Image
            source={{ uri: currentImage }}
            style={styles.image}
            contentFit="contain"
            transition={200}
          />
          {/* Badge — top left */}
          {product.badge && (
            <View style={[styles.badgeWrapper, { backgroundColor: badgeColor(product.badge) }]}>
              <Text style={styles.badgeText}>
                {badgeLabel(product.badge)}
              </Text>
            </View>
          )}
          {/* Compare button — top right */}
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              toggleCompare(product);
            }}
            hitSlop={8}
            style={[
              styles.compareBtn,
              {
                backgroundColor: inCompare ? Palette.primary : (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)'),
                borderWidth: inCompare ? 0 : 1,
                borderColor: inCompare ? 'transparent' : (isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.08)'),
              },
            ]}>
            <Text style={[styles.compareBtnText, { color: inCompare ? (isDark ? '#000' : '#fff') : colors.textSecondary }]}>
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
            <View style={styles.nameRow}>
              <Text style={[styles.name, { color: colors.text, flex: 1 }]} numberOfLines={2}>
                {product.name}
              </Text>
              {isPriceDown && (
                <Text style={styles.lightningIcon}>⚡</Text>
              )}
            </View>

            {/* Short description */}
            <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={1}>
              {description}
            </Text>

            {/* Variant selector */}
            {product.variants && product.variants.length > 0 && (
              <VariantSelector
                variants={product.variants}
                onSelect={setSelectedVariant}
                colorScheme={colorScheme}
              />
            )}

            {/* Price label + Price */}
            <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>LAAGSTE PRIJS</Text>
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
          </View>

        </View>
        </GlassCard>
        </Animated.View>
        </Animated.View>
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
    marginBottom: Spacing.sm + 2,
  },
  cardInner: {
    overflow: 'hidden',
  },
  imageWrapper: {
    position: 'relative',
    aspectRatio: 1,
    padding: Spacing.md + 2,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  badgeWrapper: {
    position: 'absolute',
    top: Spacing.sm + 2,
    left: Spacing.sm + 2,
    paddingHorizontal: Spacing.sm + 3,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
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
  },
  infoContent: {
    flex: 1,
    gap: 3,
  },
  brand: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    marginBottom: 1,
    opacity: 0.7,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
  },
  lightningIcon: {
    fontSize: 14,
    marginTop: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
    letterSpacing: -0.15,
  },
  description: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 3,
    opacity: 0.6,
  },
  priceLabel: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    marginTop: Spacing.sm + 2,
    marginBottom: 3,
    opacity: 0.5,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.xs + 2,
  },
  price: {
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  originalPrice: {
    fontSize: 12,
    textDecorationLine: 'line-through',
    opacity: 0.45,
  },
  ctaButton: {
    display: 'none',
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
    borderRadius: Radius.xs,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  variantIndicatorText: {
    fontSize: 10,
    fontWeight: '500',
    opacity: 0.7,
  },
  variantSelector: {
    marginTop: 8,
    gap: 4,
  },
  variantOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  variantOption: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: Radius.sm,
    borderWidth: 0.5,
  },
  variantOptionText: {
    fontSize: 10,
    fontWeight: '600',
  },
  moreVariants: {
    fontSize: 10,
    marginTop: 2,
    opacity: 0.6,
  },
  compareBtn: {
    position: 'absolute',
    top: Spacing.sm + 2,
    right: Spacing.sm + 2,
    width: 34,
    height: 34,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compareBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});

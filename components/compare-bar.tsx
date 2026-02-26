/**
 * CompareBar — floating bar at bottom that shows when compare list has items.
 * Tapping it navigates to the vergelijk screen.
 */

import { Colors, Palette, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useProductImage } from '@/hooks/use-product-image';
import {
  getCompareCount,
  getCompareList,
  subscribeCompare,
} from '@/services/compare-store';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Product } from '@/constants/mock-data';

function CompareAvatar({ product }: { product: Product }) {
  const imageUrl = useProductImage(product.name, product.imageUrl);
  return <Image source={{ uri: imageUrl }} style={styles.avatar} contentFit="contain" />;
}

export function CompareBar() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [count, setCount] = useState(getCompareCount);
  const [products, setProducts] = useState(getCompareList);

  useEffect(() => {
    return subscribeCompare(() => {
      setCount(getCompareCount());
      setProducts(getCompareList());
    });
  }, []);

  if (count === 0) return null;

  return (
    <Pressable
      onPress={() => router.push('/vergelijk')}
      style={[styles.bar, { backgroundColor: Palette.primary }]}>
      <View style={styles.avatars}>
        {products.slice(0, 3).map(p => (
          <CompareAvatar key={p.id} product={p} />
        ))}
      </View>
      <View style={styles.textCol}>
        <Text style={styles.barTitle}>
          {count} product{count > 1 ? 'en' : ''} vergelijken
        </Text>
        <Text style={styles.barSub}>
          {count >= 2 ? 'Tik om te vergelijken' : `Nog ${2 - count} nodig`}
        </Text>
      </View>
      <Text style={styles.arrow}>→</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    bottom: 90,
    left: Spacing.md,
    right: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: Radius.md,
    gap: Spacing.sm,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  avatars: {
    flexDirection: 'row',
    gap: -8,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  textCol: {
    flex: 1,
  },
  barTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  barSub: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
  },
  arrow: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
});

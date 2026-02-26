/**
 * AdCard Component
 * Displays a Google AdMob banner ad
 * 
 * Note: To enable real ads, run:
 * 1. npx expo prebuild --clean
 * 2. Press Y to continue
 * 3. Restart the app
 */

import { Radius, Spacing } from '@/constants/theme';
import { StyleSheet, View } from 'react-native';

interface AdCardProps {
  size?: 'small' | 'large';
}

export function AdCard({ size = 'small' }: AdCardProps) {
  const isLarge = size === 'large';
  
  return (
    <View style={[styles.container, isLarge && styles.containerLarge]}>
      <View style={[styles.adPlaceholder, isLarge && styles.adPlaceholderLarge]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
    paddingHorizontal: Spacing.sm,
  },
  containerLarge: {
    minHeight: 120,
    paddingHorizontal: 0,
  },
  adPlaceholder: {
    width: '100%',
    height: 100,
    backgroundColor: '#E8E8E8',
    borderRadius: Radius.md,
  },
  adPlaceholderLarge: {
    height: 120,
    backgroundColor: '#F0F0F0',
  },
});

/**
 * Category Filter Component
 * Horizontal scrollable filter for article categories
 */

import { CATEGORIES } from '@/constants/rss-feeds';
import { Spacing } from '@/constants/theme';
import type { FeedCategory } from '@/types/rss';
import { ScrollView, StyleSheet, View } from 'react-native';
import { FilterChip } from './filter-chip';

interface CategoryFilterProps {
  selectedCategory: FeedCategory | 'all';
  onSelectCategory: (category: FeedCategory | 'all') => void;
}

export function CategoryFilter({ selectedCategory, onSelectCategory }: CategoryFilterProps) {
  const categories: (FeedCategory | 'all')[] = ['all', 'nieuws', 'reviews'];

  const getLabel = (category: FeedCategory | 'all'): string => {
    if (category === 'all') return 'Alles';
    return CATEGORIES.find((c) => c.id === category)?.name ?? category;
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {categories.map((category) => (
          <FilterChip
            key={category}
            label={getLabel(category)}
            selected={selectedCategory === category}
            onPress={() => onSelectCategory(category)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
});

/**
 * Product Filters Hook
 * Manages filter state, sort, price range, and produces filtered results.
 * Resets automatically when category changes.
 */

import {
  analyzeCategory,
  applyPriceRange,
  applySpecFilters,
  type FilterConfig,
} from '@/services/filter-config';
import { ALL_PRODUCTS, getProductsByCategory, getAllProducts, type Product } from '@/services/product-db';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type SortOption = 'prijs-laag' | 'prijs-hoog' | 'beoordeling' | 'populair';
export type BadgeFilter = 'all' | 'deal' | 'prijsdaling' | 'nieuw';

export const SORT_OPTIONS: { id: SortOption; label: string }[] = [
  { id: 'prijs-laag', label: 'Prijs ↑' },
  { id: 'prijs-hoog', label: 'Prijs ↓' },
  { id: 'beoordeling', label: 'Best beoordeeld' },
  { id: 'populair', label: 'Populairste' },
];

export const BADGE_FILTERS: { id: BadgeFilter; label: string }[] = [
  { id: 'all', label: 'Alle' },
  { id: 'deal', label: 'Deals' },
  { id: 'prijsdaling', label: 'Prijsdaling' },
  { id: 'nieuw', label: 'Nieuw' },
];

function sortProducts(products: Product[] | undefined | null, sort: SortOption): Product[] {
  if (!products || !Array.isArray(products) || products.length === 0) {
    return [];
  }
  return [...products].sort((a, b) => {
    // Defensive check for invalid products
    if (!a || typeof a.currentPrice !== 'number') return 1;
    if (!b || typeof b.currentPrice !== 'number') return -1;
    switch (sort) {
      case 'prijs-laag':
        return a.currentPrice - b.currentPrice;
      case 'prijs-hoog':
        return b.currentPrice - a.currentPrice;
      case 'beoordeling':
        return (b.rating || 0) - (a.rating || 0);
      case 'populair':
        return (b.reviewCount || 0) - (a.reviewCount || 0);
    }
  });
}

export function useProductFilters(categoryId: string) {
  const [sortOption, setSortOption] = useState<SortOption>('prijs-laag');
  const [badgeFilter, setBadgeFilter] = useState<BadgeFilter>('all');
  const [priceRangeId, setPriceRangeId] = useState('all');
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});
  const [asyncProducts, setAsyncProducts] = useState<Product[] | null>(null);

  // Track category changes to reset filters
  const prevCategory = useRef(categoryId);
  useEffect(() => {
    if (prevCategory.current !== categoryId) {
      prevCategory.current = categoryId;
      setSortOption('prijs-laag');
      setBadgeFilter('all');
      setPriceRangeId('all');
      setActiveFilters({});
      setAsyncProducts(null);
    }
  }, [categoryId]);

  // Fetch products asynchronously from Supabase (with fallback to mock)
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const data = categoryId === 'all'
        ? await getAllProducts()
        : await getProductsByCategory(categoryId);
      if (!cancelled) setAsyncProducts(data);
    };
    load();
    return () => { cancelled = true; };
  }, [categoryId]);

  // Use async products when available, fall back to mock data for instant first render
  const categoryProducts = useMemo(() => {
    if (asyncProducts && asyncProducts.length > 0) return asyncProducts;
    // Fallback to mock data while loading
    if (!ALL_PRODUCTS || !Array.isArray(ALL_PRODUCTS)) return [];
    return categoryId === 'all'
      ? ALL_PRODUCTS
      : ALL_PRODUCTS.filter(p => p && p.category === categoryId);
  }, [categoryId, asyncProducts]);

  // Discover filter configs from product specs
  const filterConfigs: FilterConfig[] = useMemo(
    () => analyzeCategory(categoryProducts),
    [categoryProducts],
  );

  // Apply all filters + sort
  const filteredProducts = useMemo(() => {
    // Defensive check for empty categoryProducts
    if (!categoryProducts || categoryProducts.length === 0) {
      return [];
    }

    let list = [...categoryProducts];

    // Badge filter
    if (badgeFilter !== 'all') {
      list = list.filter(p => p && p.badge === badgeFilter);
    }

    // Price range
    list = applyPriceRange(list, priceRangeId);

    // Spec filters
    list = applySpecFilters(list, activeFilters);

    // Sort
    return sortProducts(list, sortOption);
  }, [categoryProducts, badgeFilter, priceRangeId, activeFilters, sortOption]);

  // Toggle a single value within a spec filter (multi-select)
  const toggleFilterValue = useCallback((key: string, value: string) => {
    setActiveFilters(prev => {
      const current = prev[key] || [];
      const next = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [key]: next };
    });
  }, []);

  // Set all values for a spec filter at once
  const setFilter = useCallback((key: string, values: string[]) => {
    setActiveFilters(prev => ({ ...prev, [key]: values }));
  }, []);

  // Count active filters (spec filters + badge + price range)
  const activeFilterCount = useMemo(() => {
    let count = 0;
    for (const values of Object.values(activeFilters)) {
      count += values.length;
    }
    if (badgeFilter !== 'all') count++;
    if (priceRangeId !== 'all') count++;
    return count;
  }, [activeFilters, badgeFilter, priceRangeId]);

  const resetFilters = useCallback(() => {
    setActiveFilters({});
    setBadgeFilter('all');
    setPriceRangeId('all');
    setSortOption('prijs-laag');
  }, []);

  return {
    // Configs
    filterConfigs,
    // Sort
    sortOption,
    setSortOption,
    // Badge
    badgeFilter,
    setBadgeFilter,
    // Price
    priceRangeId,
    setPriceRangeId,
    // Spec filters
    activeFilters,
    toggleFilterValue,
    setFilter,
    // Results
    filteredProducts,
    categoryProducts,
    activeFilterCount,
    resetFilters,
  };
}

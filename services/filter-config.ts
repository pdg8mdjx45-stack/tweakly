/**
 * Dynamic Filter Configuration Engine
 * Scans product specs at runtime to generate filter configs per category.
 * No hardcoded filter fields — automatically adapts to any category/specs.
 */

import type { Product } from '@/constants/mock-data';

// ─── Types ───────────────────────────────────────────────────────────────────

export type FilterType = 'select' | 'boolean';

export type FilterOption = {
  value: string;
  label: string;
  count: number;
};

export type FilterConfig = {
  key: string;
  label: string;
  type: FilterType;
  options: FilterOption[];
};

export type PriceRangePreset = {
  id: string;
  label: string;
  min?: number;
  max?: number;
};

export const PRICE_RANGE_PRESETS: PriceRangePreset[] = [
  { id: 'all', label: 'Alle prijzen' },
  { id: '0-200', label: '€0 – €200', min: 0, max: 200 },
  { id: '200-500', label: '€200 – €500', min: 200, max: 500 },
  { id: '500-1000', label: '€500 – €1000', min: 500, max: 1000 },
  { id: '1000-2000', label: '€1000 – €2000', min: 1000, max: 2000 },
  { id: '2000+', label: '€2000+', min: 2000 },
];

// ─── Spec analysis ───────────────────────────────────────────────────────────

/** Max unique values before a spec is considered too varied for a select filter */
const MAX_SELECT_OPTIONS = 15;

/** Minimum products that must have a spec for it to become a filter */
const MIN_COVERAGE_RATIO = 0.05; // at least 5% of products

/**
 * Analyze a set of products and generate filter configurations from their specs.
 * Automatically determines which specs make useful filters.
 * Also includes a "Merk" (brand) filter from the product's top-level brand property.
 */
export function analyzeCategory(products: Product[] | undefined | null): FilterConfig[] {
  // Defensive check for null, undefined, or empty array
  if (!products || !Array.isArray(products) || products.length === 0) {
    return [];
  }

  // Collect brand distribution for Merk filter
  const brandMap = new Map<string, number>();
  for (const product of products) {
    if (!product || !product.brand || typeof product.brand !== 'string') {
      continue;
    }
    const brand = product.brand.trim();
    if (brand) {
      brandMap.set(brand, (brandMap.get(brand) || 0) + 1);
    }
  }

  // Collect all spec keys and their value distributions
  const specMap = new Map<string, Map<string, number>>();

  for (const product of products) {
    // Skip products without specs or with invalid specs
    if (!product || !product.specs || typeof product.specs !== 'object') {
      continue;
    }
    
    for (const [key, value] of Object.entries(product.specs)) {
      // Skip empty or whitespace-only values
      if (!value || typeof value !== 'string' || value.trim() === '') {
        continue;
      }

      let valueMap = specMap.get(key);
      if (!valueMap) {
        valueMap = new Map();
        specMap.set(key, valueMap);
      }
      valueMap.set(value, (valueMap.get(value) || 0) + 1);
    }
  }

  const configs: FilterConfig[] = [];
  const minCoverage = Math.max(1, Math.floor(products.length * MIN_COVERAGE_RATIO));

  // Add Merk (brand) filter if there are multiple brands
  if (brandMap.size > 1) {
    const brandOptions: FilterOption[] = Array.from(brandMap.entries())
      .map(([value, count]) => ({ value, label: value, count }))
      .sort((a, b) => b.count - a.count); // most common first

    configs.push({
      key: 'brand',
      label: 'Merk',
      type: 'select',
      options: brandOptions,
    });
  }

  for (const [key, valueMap] of specMap) {
    // Skip specs with only 1 unique value — not useful as filter
    if (!valueMap || valueMap.size <= 1) continue;

    // Total products that have this spec
    let totalWithSpec = 0;
    for (const count of valueMap.values()) totalWithSpec += count;

    // Skip specs that too few products have
    if (totalWithSpec < minCoverage) continue;

    // Boolean filter: spec has exactly 2 values like "Ja"/"Nee"
    const values = Array.from(valueMap.keys());
    const isBooleanLike =
      valueMap.size === 2 &&
      values.some(v => ['ja', 'nee', 'yes', 'no'].includes(v.toLowerCase()));

    if (isBooleanLike) {
      configs.push({
        key,
        label: key,
        type: 'boolean',
        options: values
          .sort()
          .map(v => ({ value: v, label: v, count: valueMap.get(v) || 0 })),
      });
      continue;
    }

    // Select filter: reasonable number of unique values
    if (valueMap.size <= MAX_SELECT_OPTIONS) {
      const options: FilterOption[] = Array.from(valueMap.entries())
        .map(([value, count]) => ({ value, label: value, count }))
        .sort((a, b) => b.count - a.count); // most common first

      configs.push({
        key,
        label: key,
        type: 'select',
        options,
      });
    }
    // If too many unique values (e.g., battery "3717 mAh"), skip — not useful as a chip filter
  }

  // Sort: Merk (brand) first, then specs with fewer options (more useful filters), then alphabetically
  configs.sort((a, b) => {
    if (a.key === 'brand') return -1;
    if (b.key === 'brand') return 1;
    return a.options.length - b.options.length || a.label.localeCompare(b.label);
  });

  return configs;
}

/**
 * Apply spec filters to a product list.
 * activeFilters is a map of spec key → selected values.
 * Products missing a filtered spec are excluded when that filter is active.
 * Special handling for 'brand' key - filters by product.brand property.
 */
export function applySpecFilters(products: Product[] | undefined | null, activeFilters: Record<string, string[]> | undefined | null): Product[] {
  // Defensive checks
  if (!products || !Array.isArray(products) || products.length === 0) {
    return [];
  }

  if (!activeFilters || typeof activeFilters !== 'object') {
    return products;
  }

  const activeEntries = Object.entries(activeFilters).filter(
    ([, values]) => Array.isArray(values) && values.length > 0,
  );

  if (activeEntries.length === 0) return products;

  return products.filter(product => {
    // Skip invalid products
    if (!product) {
      return false;
    }

    for (const [key, selectedValues] of activeEntries) {
      // Special handling for brand filter - check product.brand property
      if (key === 'brand') {
        const brandValue = product.brand;
        if (!brandValue || typeof brandValue !== 'string' || !selectedValues.includes(brandValue)) {
          return false;
        }
        continue;
      }

      // Standard spec filter - check product.specs
      if (!product.specs || typeof product.specs !== 'object') {
        return false;
      }
      const specValue = product.specs[key];
      // Product must match at least one of the selected values
      if (!specValue || typeof specValue !== 'string' || !selectedValues.includes(specValue)) {
        return false;
      }
    }
    return true;
  });
}

/**
 * Apply a price range preset to products.
 */
export function applyPriceRange(products: Product[] | undefined | null, presetId: string | undefined): Product[] {
  // Defensive checks
  if (!products || !Array.isArray(products) || products.length === 0) {
    return [];
  }

  if (!presetId || presetId === 'all') return products;

  const preset = PRICE_RANGE_PRESETS.find(p => p.id === presetId);
  if (!preset) return products;

  return products.filter(p => {
    // Skip invalid products
    if (!p || typeof p.currentPrice !== 'number') {
      return false;
    }
    
    if (preset.min !== undefined && p.currentPrice < preset.min) return false;
    if (preset.max !== undefined && p.currentPrice > preset.max) return false;
    return true;
  });
}

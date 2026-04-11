/**
 * Product Database — unified async API.
 *
 * Prioritizes curated MOCK_PRODUCTS (real products with verified links).
 * Merges in user-scanned products from Supabase per category.
 * Falls back to scraped data when needed.
 */

import { MOCK_PRODUCTS, type Product as ProductType } from '@/constants/mock-data';
import {
  fetchBestDeal as apiFetchBestDeal,
  fetchProductById as apiFetchById,
  fetchPriceDrops as apiFetchDrops,
  fetchNewProducts as apiFetchNew,
  searchProducts as apiSearch,
  fetchCategoryProducts,
} from './product-api';
import { getScannedProductsByCategory, type ScannedProduct } from './scanned-products';

/** Maps a ScannedProduct row to the app-wide Product type. */
function scannedToProduct(p: ScannedProduct): ProductType {
  return {
    id: `scanned-${p.id}`,
    name: p.name,
    brand: p.brand ?? '',
    mainCategory: '',
    category: p.category ?? 'Overig',
    imageUrl: p.image_url ?? '',
    currentPrice: p.current_price,
    originalPrice: p.current_price,
    lowestPrice: p.current_price,
    rating: 0,
    reviewCount: 0,
    priceHistory: [{ date: p.updated_at.slice(0, 10), price: p.current_price }],
    shops: (p.shop_links ?? []).map(l => ({
      name: l.name,
      price: l.price ?? p.current_price,
      url: l.url,
      logo: '',
      verified: false,
    })),
    specs: p.specs ?? {},
    badge: undefined,
  };
}

export type { Product } from '@/constants/mock-data';
export { fetchManifest } from './product-api';
export type { CategoryInfo, Manifest } from './product-api';

// Curated products with verified links - these are prioritized
const CURATED = MOCK_PRODUCTS;

// Get products by category from curated list
function getCuratedByCategory(category: string): ProductType[] {
  return CURATED.filter(p => p.category === category);
}

export const getProductsByCategory = async (category: string): Promise<ProductType[]> => {
  const curated = getCuratedByCategory(category);

  // Always merge scanned products from Supabase so community-scanned items appear
  const [scanned] = await Promise.allSettled([getScannedProductsByCategory(category)]);
  const scannedProducts = scanned.status === 'fulfilled'
    ? scanned.value.map(scannedToProduct)
    : [];

  // Deduplicate: skip scanned items already present in curated (by name match)
  const curatedNames = new Set(curated.map(p => p.name.toLowerCase()));
  const uniqueScanned = scannedProducts.filter(p => !curatedNames.has(p.name.toLowerCase()));

  if (curated.length > 0 || uniqueScanned.length > 0) {
    return [...curated, ...uniqueScanned];
  }
  return fetchCategoryProducts(category);
};

export async function getAllProducts(): Promise<ProductType[]> {
  // Return all curated products first (these have verified links)
  return CURATED;
}

export async function getPriceDrops(limit = 10): Promise<ProductType[]> {
  try {
    // Return curated products with price drops
    const drops = CURATED.filter(p => p.badge === 'prijsdaling');
    if (drops.length > 0) return drops.slice(0, limit);
    
    // Fallback to scraped
    const remote = await apiFetchDrops(limit);
    return remote.length > 0 ? remote : CURATED.filter(p => p.badge === 'prijsdaling').slice(0, limit);
  } catch (error) {
    console.warn('getPriceDrops failed:', error);
    return [];
  }
}

export async function getNewProducts(): Promise<ProductType[]> {
  try {
    // Return curated new products
    const nieuw = CURATED.filter(p => p.badge === 'nieuw');
    if (nieuw.length > 0) return nieuw;
    
    // Fallback
    const remote = await apiFetchNew();
    return remote.length > 0 ? remote : CURATED.filter(p => p.badge === 'nieuw');
  } catch (error) {
    console.warn('getNewProducts failed:', error);
    return [];
  }
}

export async function getBestDeal(): Promise<ProductType | undefined> {
  try {
    // Check curated first
    const deal = CURATED.find(p => p.badge === 'deal' || p.badge === 'prijsdaling');
    if (deal) return deal;
    
    // Fallback
    return apiFetchBestDeal();
  } catch (error) {
    console.warn('getBestDeal failed:', error);
    return CURATED.find(p => p.badge === 'deal' || p.badge === 'prijsdaling');
  }
}

export async function getProductById(id: string): Promise<ProductType | undefined> {
  // Check curated first for instant results with verified links
  const curated = CURATED.find(p => p.id === id);
  if (curated) return curated;
  
  // Fallback
  return apiFetchById(id);
}

// Search within a specific category
export async function searchInCategory(category: string, query: string): Promise<ProductType[]> {
  const q = query.toLowerCase();
  
  // Search curated products first
  const curatedMatches = CURATED.filter(
    p => p.category === category && (
      p.name.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      (p.specs && Object.values(p.specs).some(v => v.toLowerCase().includes(q)))
    )
  );
  
  if (curatedMatches.length > 0) return curatedMatches;
  
  // Fallback to scraped
  const categoryProducts = await fetchCategoryProducts(category);
  return categoryProducts.filter(
    p => p.name.toLowerCase().includes(q) ||
         p.brand.toLowerCase().includes(q) ||
         (p.specs && Object.values(p.specs).some(v => v.toLowerCase().includes(q)))
  );
}

export async function searchProducts(query: string): Promise<ProductType[]> {
  const q = query.toLowerCase();
  
  // Search curated products first (these have verified links)
  const curatedMatches = CURATED.filter(
    p => p.name.toLowerCase().includes(q) ||
         p.brand.toLowerCase().includes(q) ||
         p.category.toLowerCase().includes(q),
  );
  
  if (curatedMatches.length > 0) return curatedMatches;
  
  // Fallback to scraped
  const remote = await apiSearch(query);
  return remote;
}

// Curated products as fallback
export const FALLBACK_PRODUCTS: ProductType[] = CURATED;

// Re-export for useProductFilters hook
export const ALL_PRODUCTS: ProductType[] = CURATED;

/** Geeft alle producten terug voor een hoofdcategorie */
export async function getProductsByMainCategory(mainCategory: string): Promise<ProductType[]> {
  return CURATED.filter(p => p.mainCategory === mainCategory);
}

/** Geeft alle producten terug voor een subcategorie */
export async function getProductsBySubCategory(subCategory: string): Promise<ProductType[]> {
  return getProductsByCategory(subCategory);
}

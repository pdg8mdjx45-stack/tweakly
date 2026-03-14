/**
 * Icecat Products — loads 17K+ tech products from local JSON files.
 *
 * Products are split per category in data/products/{slug}.json.
 * Each product has:
 *   - Full Icecat specs (real technical specifications)
 *   - Remote image URLs from Icecat CDN (stable, fast)
 *   - Search-based shop links (Coolblue, Bol.com, MediaMarkt)
 *   - No prices (prices are indicative, per app design)
 *
 * Data flow:
 *   1. Load manifest.json to discover categories
 *   2. Load category JSON on demand (lazy loading)
 *   3. Cache in memory for instant subsequent access
 */

import { type Product } from '@/constants/mock-data';

// ─── Category manifests (bundled at build time via metro) ────────────

const CATEGORY_FILES: Record<string, () => Product[]> = {
  'Laptops': () => require('../data/products/laptops.json'),
  'Televisies': () => require('../data/products/televisies.json'),
  'Monitoren': () => require('../data/products/monitoren.json'),
  'Software': () => require('../data/products/software.json'),
  'Audio': () => require('../data/products/audio.json'),
  'Opslag & Servers': () => require('../data/products/opslag-servers.json'),
  'Componenten': () => require('../data/products/componenten.json'),
  'Smartphones': () => require('../data/products/smartphones.json'),
  'Printers': () => require('../data/products/printers.json'),
  'Opslag': () => require('../data/products/opslag.json'),
  'Netwerk': () => require('../data/products/netwerk.json'),
  'Desktops': () => require('../data/products/desktops.json'),
  'Accessoires': () => require('../data/products/accessoires.json'),
  'Tablets': () => require('../data/products/tablets.json'),
  'Randapparatuur': () => require('../data/products/randapparatuur.json'),
  'Gaming': () => require('../data/products/gaming.json'),
  'Wearables': () => require('../data/products/wearables.json'),
};

// ─── In-memory cache ────────────────────────────────────────────────

const cache = new Map<string, Product[]>();

/**
 * Get all available Icecat categories
 */
export function getIcecatCategories(): string[] {
  return Object.keys(CATEGORY_FILES);
}

/**
 * Get products for a specific category (lazy-loaded, cached)
 */
export function getIcecatProducts(category: string): Product[] {
  if (cache.has(category)) return cache.get(category)!;

  const loader = CATEGORY_FILES[category];
  if (!loader) return [];

  try {
    const products = loader();
    cache.set(category, products);
    return products;
  } catch {
    return [];
  }
}

/**
 * Get a single product by ID
 */
export function getIcecatProductById(id: string): Product | undefined {
  // Check cache first
  for (const products of cache.values()) {
    const found = products.find(p => p.id === id);
    if (found) return found;
  }

  // Load all categories to find it
  for (const category of Object.keys(CATEGORY_FILES)) {
    const products = getIcecatProducts(category);
    const found = products.find(p => p.id === id);
    if (found) return found;
  }

  return undefined;
}

/**
 * Search Icecat products across all categories
 */
export function searchIcecatProducts(query: string): Product[] {
  const q = query.toLowerCase();
  const results: Product[] = [];

  for (const category of Object.keys(CATEGORY_FILES)) {
    const products = getIcecatProducts(category);
    for (const p of products) {
      if (
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.specs && Object.values(p.specs).some(v => v.toLowerCase().includes(q)))
      ) {
        results.push(p);
      }
      if (results.length >= 50) return results;
    }
  }

  return results;
}

/**
 * Get total number of Icecat products
 */
export function getIcecatProductCount(): number {
  let total = 0;
  for (const category of Object.keys(CATEGORY_FILES)) {
    total += getIcecatProducts(category).length;
  }
  return total;
}

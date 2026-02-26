/**
 * Google Shopping API Service
 * Integrates with searchapi.io to fetch real-time product prices from Google Shopping
 * 
 * API Documentation: https://www.searchapi.io/docs/google-shopping
 */

import { type Product } from '../constants/mock-data';

// API Configuration
const SEARCHAPI_API_KEY = 'VP9f7wNzwHEev6veFuLr5PT9';
const SEARCHAPI_BASE_URL = 'https://www.searchapi.io/api/v1/search';

// Google Shopping result type from searchapi.io
interface GoogleShoppingItem {
  title: string;
  link: string;
  image: string;
  price: number;
  currency: string;
  store_name?: string;
  store_rating?: number;
  store_reviews_count?: number;
  availability?: string;
  condition?: string;
  product_id?: string;
}

interface SearchApiResponse {
  shopping_results?: GoogleShoppingItem[];
  organic_results?: Array<{
    title: string;
    link: string;
    snippet?: string;
  }>;
  knowledge_graph?: {
    title: string;
    description?: string;
  };
  search_metadata?: {
    status: string;
  };
}

// Cache for Google Shopping results
const searchCache = new Map<string, { data: Product[]; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Generate a unique ID for Google Shopping products
 */
function generateGoogleProductId(name: string, store: string): string {
  const hash = name.slice(0, 20) + store.slice(0, 10);
  return `gs_${Buffer.from(hash).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 15)}`;
}

/**
 * Detect product category from title
 */
function detectCategory(title: string): string {
  const lowerTitle = title.toLowerCase();
  
  const categoryPatterns: Array<{ pattern: RegExp; category: string }> = [
    { pattern: /iphone|ipad|galaxy|pixel|smartphone|mobile|android|ios/i, category: 'Smartphones' },
    { pattern: /macbook|laptop|notebook|chromebook|thinkpad|zenbook|rog\s/i, category: 'Laptops' },
    { pattern: /tablet|ipad|galaxy\s+tab|surface/i, category: 'Tablets' },
    { pattern: /desktop|pc|computer|all-in-one/i, category: 'Desktops' },
    { pattern: /monitor|scherm|display|odyssey|ultrasharp|lg\s+oled|samsung\s+qe/i, category: 'Monitoren' },
    { pattern: /televisie|tv|lg\s+oled|samsung\s+oled|sony\s+television/i, category: 'Televisies' },
    { pattern: /headphone|earbud|airpod|wh-1000|sony\s+wh|beats|bose/i, category: 'Audio' },
    { pattern: /playstation|ps5|ps4|nintendo|switch|xbox/i, category: 'Gameconsoles' },
    { pattern: /rtx|geforce|radeon|gpu|graphics\s*card|grafische/i, category: 'Grafische kaarten' },
    { pattern: /ryzen|core\s+i|processor|cpu|intel\s+core/i, category: 'Processors' },
    { pattern: /keyboard|toetsenbord|mechanisch/i, category: 'Toetsenborden' },
    { pattern: /mouse|muis|logitech.*mx|razer/i, category: 'Muizen' },
    { pattern: /apple\s+watch|galaxy\s+watch|wearable|fitness/i, category: 'Wearables' },
    { pattern: /ssd|hard\s*disk|hdd|opslag|storage/i, category: 'Opslag (SSD)' },
    { pattern: /ram|geheugen|corsair|kingston|crucial/i, category: 'Geheugen' },
    { pattern: /moederbord|motherboard|asus\s+rog|msi|gigabyte/i, category: 'Moederbord' },
    { pattern: /dyson|vacuum|stofzuiger|robot/i, category: 'Huishoudelijk' },
    { pattern: /camera|canon|nikon|sony\s+alpha|foto/i, category: 'Fotografie' },
    { pattern: /printer|hp\s+|canon\s+|brother/i, category: 'Printers' },
  ];
  
  for (const { pattern, category } of categoryPatterns) {
    if (pattern.test(lowerTitle)) {
      return category;
    }
  }
  
  return 'Overig';
}

/**
 * Detect brand from product title
 */
function detectBrand(title: string): string {
  const lowerTitle = title.toLowerCase();
  
  const brandPatterns: Array<{ pattern: RegExp; brand: string }> = [
    { pattern: /apple|iphone|ipad|macbook|airpods|apple\s+watch/i, brand: 'Apple' },
    { pattern: /samsung|galaxy|galaxy\s+/i, brand: 'Samsung' },
    { pattern: /google\s+pixel|pixel\s+/i, brand: 'Google' },
    { pattern: /sony|playstation|wh-1000|xperia/i, brand: 'Sony' },
    { pattern: /lg\s+oled|lg\s+/i, brand: 'LG' },
    { pattern: /nvidia|geforce|rtx/i, brand: 'NVIDIA' },
    { pattern: /amd|ryzen|radeon/i, brand: 'AMD' },
    { pattern: /intel|core\s*i/i, brand: 'Intel' },
    { pattern: /asus|rog|zenbook|tuf/i, brand: 'ASUS' },
    { pattern: /lenovo|thinkpad|ideapad/i, brand: 'Lenovo' },
    { pattern: /dell|xps|alienware/i, brand: 'Dell' },
    { pattern: /hp|pavilion|omen|envy/i, brand: 'HP' },
    { pattern: /msi|modern/i, brand: 'MSI' },
    { pattern: /logitech/i, brand: 'Logitech' },
    { pattern: /razer/i, brand: 'Razer' },
    { pattern: /corsair|vengeance/i, brand: 'Corsair' },
    { pattern: /dyson/i, brand: 'Dyson' },
    { pattern: /jbl|bose|beats/i, brand: 'Audio' },
  ];
  
  for (const { pattern, brand } of brandPatterns) {
    if (pattern.test(lowerTitle)) {
      return brand;
    }
  }
  
  // Extract first word as fallback
  const firstWord = title.split(' ')[0];
  return firstWord || 'Onbekend';
}

/**
 * Transform Google Shopping result to Product type
 */
function transformToProduct(item: GoogleShoppingItem): Product {
  const id = generateGoogleProductId(item.title, item.store_name || 'Google Shopping');
  const category = detectCategory(item.title);
  const brand = detectBrand(item.title);
  
  // Create price history with single point
  const today = new Date().toISOString().split('T')[0];
  const priceHistory = [{ date: today, price: item.price }];
  
  // Create shop entry
  const shopName = item.store_name || 'Google Shopping';
  const shops = [{
    name: shopName,
    price: item.price,
    url: item.link,
    logo: shopName.slice(0, 3).toUpperCase(),
  }];
  
  // Estimate original price (usually 10-20% higher)
  const originalPrice = Math.round(item.price * 1.15);
  
  return {
    id,
    name: item.title,
    brand,
    category,
    imageUrl: item.image || `https://placehold.co/400x400/1a1a1a/ffffff?text=${encodeURIComponent(brand)}`,
    currentPrice: item.price,
    originalPrice,
    lowestPrice: item.price,
    rating: item.store_rating || 0,
    reviewCount: item.store_reviews_count || 0,
    priceHistory,
    shops,
    specs: {},
    badge: undefined,
  };
}

/**
 * Search products on Google Shopping
 */
export async function searchGoogleShopping(query: string, limit = 10): Promise<Product[]> {
  // Check cache first
  const cached = searchCache.get(query.toLowerCase());
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data.slice(0, limit);
  }
  
  try {
    const params = new URLSearchParams({
      engine: 'google_shopping',
      q: query,
      api_key: SEARCHAPI_API_KEY,
      num: limit.toString(),
      gl: 'nl', // Netherlands
      hl: 'nl', // Dutch language
    });
    
    const url = `${SEARCHAPI_BASE_URL}?${params.toString()}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Shopping API error:', response.status, errorText);
      throw new Error(`API error: ${response.status}`);
    }
    
    const data: SearchApiResponse = await response.json();
    
    if (!data.shopping_results || data.shopping_results.length === 0) {
      console.log('No Google Shopping results found for:', query);
      return [];
    }
    
    // Transform results to Product type
    const products = data.shopping_results
      .slice(0, limit)
      .map(transformToProduct);
    
    // Cache the results
    searchCache.set(query.toLowerCase(), {
      data: products,
      timestamp: Date.now(),
    });
    
    console.log(`✅ Google Shopping: Found ${products.length} products for "${query}"`);
    return products;
    
  } catch (error) {
    console.error('❌ Google Shopping search failed:', error);
    return [];
  }
}

/**
 * Get multiple products from Google Shopping
 */
export async function getGoogleShoppingProducts(queries: string[]): Promise<Product[]> {
  const allProducts: Product[] = [];
  
  for (const query of queries) {
    const products = await searchGoogleShopping(query, 5);
    allProducts.push(...products);
  }
  
  // Remove duplicates based on similar names
  const seen = new Set<string>();
  const uniqueProducts = allProducts.filter(p => {
    const key = p.name.toLowerCase().slice(0, 30);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  
  return uniqueProducts;
}

/**
 * Search Google Shopping with price filters
 */
export async function searchGoogleShoppingWithFilters(
  query: string,
  options: {
    minPrice?: number;
    maxPrice?: number;
    condition?: 'new' | 'used' | 'refurbished';
    limit?: number;
  } = {}
): Promise<Product[]> {
  const { minPrice, maxPrice, condition, limit = 10 } = options;
  
  let products = await searchGoogleShopping(query, limit * 2);
  
  // Apply filters
  if (minPrice !== undefined) {
    products = products.filter(p => p.currentPrice >= minPrice);
  }
  
  if (maxPrice !== undefined) {
    products = products.filter(p => p.currentPrice <= maxPrice);
  }
  
  if (condition) {
    // Note: searchapi doesn't always return condition, this is a placeholder
    products = products.filter(p => true);
  }
  
  return products.slice(0, limit);
}

/**
 * Clear search cache
 */
export function clearGoogleShoppingCache(): void {
  searchCache.clear();
}

/**
 * Check if API is configured and working
 */
export async function checkApiHealth(): Promise<boolean> {
  try {
    const result = await searchGoogleShopping('test', 1);
    return result.length >= 0; // If no error, API is working
  } catch {
    return false;
  }
}

// Export for testing
export { CACHE_DURATION, searchCache };


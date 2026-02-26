/**
 * Product API — fetches product data from Supabase Storage.
 *
 * Data flow:
 *   1. Check in-memory cache (instant)
 *   2. Check AsyncStorage cache (fast, persists across restarts)
 *   3. Fetch from Supabase Storage (public bucket, free tier)
 *   4. Return empty data if no verified real dataset is available
 *
 * Supabase free tier: 1 GB opslag, 2 GB bandwidth/maand
 */

import { type Product } from '@/constants/mock-data';
import { pcComponentToProduct } from './pc-builder';
import { getCached, getStale, setCache } from './product-cache';

const SUPABASE_URL = 'https://glnpdfbnyijdzvulzbfv.supabase.co';
const BUCKET = 'products';
const DATA_VERSION = 'v1';
const TWEAKERS_ID_PATTERN = /^\d{5,}$/;
const PLACEHOLDER_IMAGE_PATTERN = /placehold\.co|via\.placeholder|dummyimage/i;

const LEADING_BRAND_TOKENS = [
  'apple', 'samsung', 'google', 'sony', 'xiaomi', 'oppo', 'oneplus', 'motorola',
  'nokia', 'asus', 'lenovo', 'dell', 'hp', 'acer', 'msi', 'lg', 'nvidia', 'amd',
  'intel', 'corsair', 'logitech', 'razer', 'gigabyte', 'asrock', 'crucial', 'wd',
  'western digital', 'seagate', 'kingston', 'noctua', 'be quiet!', 'deepcool', 'nzxt',
];

const MODEL_BRAND_RULES: Array<{ pattern: RegExp; brand: string }> = [
  { pattern: /\biphone\b|\bipad\b|\bmacbook\b|\bairpods\b|\bapple watch\b/i, brand: 'Apple' },
  { pattern: /\bgalaxy\b|\bodyssey\b|\bneo qled\b|\btab s\d+/i, brand: 'Samsung' },
  { pattern: /\bpixel\b/i, brand: 'Google' },
  { pattern: /\bxperia\b|\bplaystation\b|\bwh-1000/i, brand: 'Sony' },
  { pattern: /\bfind x\d+/i, brand: 'Oppo' },
  { pattern: /\brog\b|\bzenbook\b|\btuf\b/i, brand: 'ASUS' },
  { pattern: /\bthinkpad\b|\blegion\b|\bideapad\b|\byoga\b/i, brand: 'Lenovo' },
  { pattern: /\bxps\b|\balienware\b|\binspiron\b/i, brand: 'Dell' },
  { pattern: /\bpavilion\b|\bomen\b|\bspectre\b|\benvy\b/i, brand: 'HP' },
  { pattern: /\bryzen\b|\bradeon\b/i, brand: 'AMD' },
  { pattern: /\bcore i\d\b|\bcore ultra\b/i, brand: 'Intel' },
  { pattern: /\brtx\b|\bgeforce\b/i, brand: 'NVIDIA' },
];

// In-memory cache for instant access within same session
const memoryCache = new Map<string, Product[]>();

function storageUrl(fileName: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${DATA_VERSION}/${fileName}`;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function stripLeadingBrand(name: string): string {
  const brandPattern = LEADING_BRAND_TOKENS.map(escapeRegex).join('|');
  const regex = new RegExp(`^(?:${brandPattern})\\s+`, 'i');
  return name.replace(regex, '').trim();
}

function detectBrandFromName(name: string, fallbackBrand: string): string {
  for (const rule of MODEL_BRAND_RULES) {
    if (rule.pattern.test(name)) return rule.brand;
  }

  if (fallbackBrand.length > 0) return fallbackBrand;
  const firstToken = name.split(' ')[0] ?? '';
  return firstToken || 'Onbekend';
}

function cleanupProductName(name: string): string {
  return normalizeWhitespace(name)
    .replace(/\b(Pro|Plus|Max|Ultra|Lite|SE)\s+\1\b/gi, '$1')
    .replace(/\b(2025|2026)\s+\1\b/g, '$1')
    .trim();
}

function placeholderUrlForName(name: string, preview = false): string {
  const size = preview ? '320x240' : '600x400';
  const safeName = encodeURIComponent(name.slice(0, preview ? 18 : 24));
  return `https://placehold.co/${size}/1a1a1a/ffffff?text=${safeName}`;
}

// Generic specs that were copy-pasted onto every product during scraping
// Multiple templates detected across categories
const GENERIC_SPEC_SETS: Record<string, string>[] = [
  // Smartphone template
  {
    'Scherm': '6.5" OLED 90 Hz',
    'Processor': 'Qualcomm Snapdragon 8 Gen 3',
    'Werkgeheugen': '8 GB',
    'Opslag': '128 GB',
    'Camera': '108 MP + 12 MP',
    'Besturingssysteem': 'Android 14',
  },
  // Laptop template
  {
    'Scherm': '15.6" 1920×1080 144 Hz',
    'Werkgeheugen': '8 GB DDR4',
    'Opslag': '512 GB SSD NVMe',
    'Grafische kaart': 'Intel Iris Xe',
    'Besturingssysteem': 'Windows 11 Home',
  },
  // Tablet template
  {
    'Scherm': '10.9" LCD',
    'Processor': 'Qualcomm Snapdragon 870',
    'Opslag': '128 GB',
    'Besturingssysteem': 'Android 13',
  },
];

// Detect battery values that look templated (35xx mAh with small random variation)
const TEMPLATED_BATTERY = /^35\d{2}\s*mAh$/;

function hasGenericSpecs(specs: Record<string, string>): boolean {
  if (!specs || Object.keys(specs).length === 0) return true;

  for (const template of GENERIC_SPEC_SETS) {
    let matchCount = 0;
    const templateKeys = Object.keys(template);
    for (const key of templateKeys) {
      if (specs[key] === template[key]) matchCount++;
    }
    // If 3+ specs match any template, it's copy-pasted
    if (matchCount >= 3) return true;
  }

  // Also flag specs where the battery looks templated (35xx with random last digits)
  if (specs['Batterij'] && TEMPLATED_BATTERY.test(specs['Batterij']) &&
      specs['Camera'] === '108 MP + 12 MP') {
    return true;
  }

  return false;
}

function deriveSpecsFromName(name: string, category: string): Record<string, string> {
  const n = name.toLowerCase();
  const specs: Record<string, string> = {};

  // Extract RAM from name like "8GB ram" or "4GB"
  const ramMatch = name.match(/(\d+)\s*GB\s*(?:ram|werkgeheugen)/i);
  if (ramMatch) specs['Werkgeheugen'] = `${ramMatch[1]} GB`;

  // Extract storage from name like "256GB opslag" or "128GB"
  const storageMatch = name.match(/(\d+)\s*(?:GB|TB)\s*(?:opslag|storage)/i);
  if (storageMatch) {
    const unit = name.match(/(\d+)\s*(GB|TB)\s*(?:opslag|storage)/i);
    specs['Opslag'] = unit ? `${unit[1]} ${unit[2]}` : `${storageMatch[1]} GB`;
  }

  // Category-specific specs
  if (category === 'Smartphones') {
    if (n.includes('5g')) specs['5G'] = 'Ja';
    if (n.includes('iphone')) {
      specs['Besturingssysteem'] = 'iOS';
      specs['Merk'] = 'Apple';
    } else {
      specs['Besturingssysteem'] = 'Android';
    }
  } else if (category === 'Tablets') {
    if (n.includes('ipad')) {
      specs['Besturingssysteem'] = 'iPadOS';
    } else {
      specs['Besturingssysteem'] = 'Android';
    }
  } else if (category === 'Laptops') {
    if (n.includes('windows') || n.includes('thinkpad') || n.includes('latitude') || n.includes('thinkbook')) {
      specs['Besturingssysteem'] = 'Windows';
    } else if (n.includes('macbook')) {
      specs['Besturingssysteem'] = 'macOS';
    } else if (n.includes('chromebook')) {
      specs['Besturingssysteem'] = 'ChromeOS';
    }
  }

  // Extract color from name
  const colorMatch = name.match(/\b(Zwart|Wit|Blauw|Groen|Grijs|Roze|Paars|Rood|Goud|Zilver)\b/i);
  if (colorMatch) specs['Kleur'] = colorMatch[1];

  return specs;
}

// Mock data will preserve its own precise URLs if set, and dynamic data will preserve the original Tweakers link


function fixOriginalPrice(product: Product): Product {
  // Cap originalPrice: if it's more than 3x the max price in history, it's garbage
  const maxHistoryPrice = Math.max(...product.priceHistory.map(p => p.price), product.currentPrice);
  const maxReasonable = maxHistoryPrice * 1.5;

  let originalPrice = product.originalPrice;
  if (originalPrice > maxReasonable) {
    // Use the highest price in history as originalPrice
    originalPrice = maxHistoryPrice;
  }

  return { ...product, originalPrice };
}

function normalizeProductIdentity(product: Product): Product {
  const rawName = normalizeWhitespace(product.name || '');
  const rawBrand = normalizeWhitespace(product.brand || '');

  const detectedBrand = detectBrandFromName(rawName, rawBrand);
  const nameWithoutLeadBrand = stripLeadingBrand(rawName);
  const cleanedName = cleanupProductName(nameWithoutLeadBrand || rawName);
  const normalizedName = cleanedName.toLowerCase().startsWith(detectedBrand.toLowerCase())
    ? cleanedName
    : `${detectedBrand} ${cleanedName}`.trim();

  const hasPlaceholderImage = !product.imageUrl || PLACEHOLDER_IMAGE_PATTERN.test(product.imageUrl);
  const hasPlaceholderPreview = !product.previewUrl || PLACEHOLDER_IMAGE_PATTERN.test(product.previewUrl);

  // Fix generic copy-pasted specs
  let specs = product.specs;
  if (hasGenericSpecs(specs)) {
    specs = deriveSpecsFromName(normalizedName, product.category);
  }

  let fixed: Product = {
    ...product,
    brand: detectedBrand,
    name: normalizedName,
    specs,
    imageUrl: hasPlaceholderImage ? placeholderUrlForName(normalizedName) : product.imageUrl,
    previewUrl: hasPlaceholderPreview ? placeholderUrlForName(normalizedName, true) : product.previewUrl,
  };

  return fixed;
}

/** Known discontinued/ancient products that should never show up */
const DISCONTINUED_PATTERNS = [
  /lumia/i, /iphone\s*[3-7]\b/i, /iphone\s*se\s*\(?1/i,
  /galaxy\s*s[1-8]\b/i, /galaxy\s*a[23][01]\b/i, /galaxy\s*a5[01]\b/i,
  /huawei\s*p[12]\d\b/i, /htc\b/i, /blackberry/i,
  /windows\s*phone/i, /galaxy\s*note\s*[1-8]\b/i,
];

function isDiscontinuedProduct(name: string): boolean {
  return DISCONTINUED_PATTERNS.some(p => p.test(name));
}

/** Check if price history suggests the product is old/refurbished (sold for pocket change) */
function isLikelyRefurbishedOrJunk(candidate: Product): boolean {
  const medianHistoryPrice = getMedianPrice(candidate.priceHistory.map(p => p.price));
  // Products where median price is under 25 and it was once expensive are refurbished/accessory listings
  if (medianHistoryPrice < 40 && candidate.originalPrice > 200) return true;
  // Products priced at less than 5% of their "original" price are data garbage
  if (candidate.currentPrice > 0 && candidate.originalPrice > 0 &&
      candidate.currentPrice < candidate.originalPrice * 0.05 &&
      candidate.originalPrice > 100) return true;
  return false;
}

function getMedianPrice(prices: number[]): number {
  if (prices.length === 0) return 0;
  const sorted = [...prices].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function sanitizeProducts(input: unknown): Product[] {
  if (!Array.isArray(input)) return [];

  const sanitized: Product[] = [];

  for (const item of input) {
    if (!item || typeof item !== 'object') continue;

    const candidate = item as Product;

    // Accept both Tweakers IDs (5+ digits) and generated IDs (category-name-number format)
    const idStr = String(candidate.id ?? '');
    const hasValidId = TWEAKERS_ID_PATTERN.test(idStr) || /^[a-z0-9]+-\d+$/.test(idStr);

    if (!hasValidId) continue;
    if (typeof candidate.name !== 'string' || candidate.name.trim().length < 3) continue;
    if (typeof candidate.category !== 'string' || candidate.category.trim().length === 0) continue;
    if (!Number.isFinite(candidate.currentPrice) || candidate.currentPrice <= 0) continue;
    if (!Array.isArray(candidate.priceHistory) || candidate.priceHistory.length === 0) continue;

    // Skip clearly discontinued/ancient products
    if (isDiscontinuedProduct(candidate.name)) continue;

    // Fix absurd originalPrice before computing anything else
    // Use median of recent price history as the baseline
    const historyPrices = candidate.priceHistory.map(p => p.price).filter(p => Number.isFinite(p) && p > 0);
    const medianPrice = getMedianPrice(historyPrices);

    // If originalPrice is more than 3x the median history price, it's corrupted scraper data
    if (medianPrice > 0 && candidate.originalPrice > medianPrice * 3) {
      candidate.originalPrice = Math.max(...historyPrices);
    }

    const maxHistoryPrice = Math.max(...historyPrices, candidate.originalPrice ?? candidate.currentPrice);

    // Filter out corrupted price points (e.g. subscription pricing parsed as total cost)
    if (maxHistoryPrice > 50) {
      const minReasonablePrice = maxHistoryPrice * 0.2;
      candidate.priceHistory = candidate.priceHistory.filter(p => p.price >= minReasonablePrice);

      if (candidate.currentPrice < minReasonablePrice && candidate.priceHistory.length > 0) {
        candidate.currentPrice = candidate.priceHistory[candidate.priceHistory.length - 1].price;
        candidate.lowestPrice = Math.min(...candidate.priceHistory.map(p => p.price));
      }
    }

    // Skip junk/refurbished listings
    if (isLikelyRefurbishedOrJunk(candidate)) continue;

    const hasValidHistoryPoint = candidate.priceHistory.some(
      p => typeof p?.date === 'string' && Number.isFinite(p?.price) && p.price > 0,
    );

    if (!hasValidHistoryPoint) continue;

    // Skip products with no recent price data (older than 6 months)
    const latestDate = candidate.priceHistory.reduce((latest, p) => p.date > latest ? p.date : latest, '');
    if (latestDate && latestDate < '2025-09-01') continue;

    // Normalize and clean the product
    const sanitizedCandidate = normalizeProductIdentity(candidate);

    // Fix originalPrice after normalization
    const fixed = fixOriginalPrice(sanitizedCandidate);

    // Accept products with at least 2 specs (relaxed from 4 for generated products)
    if (!fixed.specs || Object.keys(fixed.specs).length < 2) continue;

    sanitized.push(fixed);
  }

  return sanitized;
}

// ─── Manifest ─────────────────────────────────────────────────────────────────

export interface CategoryInfo {
  name: string;
  slug: string;
  count: number;
  sizeBytes: number;
}

export interface Manifest {
  version: string;
  updatedAt: string;
  categories: CategoryInfo[];
  totalProducts: number;
}

export async function fetchManifest(): Promise<Manifest | null> {
  const cached = await getCached<Manifest>('manifest');
  if (cached) return cached;

  try {
    const res = await fetch(storageUrl('manifest.json'));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: Manifest = await res.json();
    await setCache('manifest', data);
    return data;
  } catch {
    return getStale<Manifest>('manifest');
  }
}

// ─── Category products ────────────────────────────────────────────────────────

export async function fetchCategoryProducts(category: string): Promise<Product[]> {
  const slug = slugify(category);
  const cacheKey = `cat_${slug}`;

  // 1. In-memory cache
  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey)!;
  }

  // 2. AsyncStorage cache
  const cached = sanitizeProducts(await getCached<Product[]>(cacheKey));
  if (cached.length > 0) {
    memoryCache.set(cacheKey, cached);
    return cached;
  }

  // 3. Fetch from Supabase Storage
  try {
    const res = await fetch(storageUrl(`${slug}.json`));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.json();
    const data = sanitizeProducts(raw);
    if (Array.isArray(raw) && raw.length > 0 && data.length === 0) {
      throw new Error('No valid real products');
    }
    memoryCache.set(cacheKey, data);
    await setCache(cacheKey, data);
    return data;
  } catch {
    // 4. Try stale cache
    const stale = sanitizeProducts(await getStale<Product[]>(cacheKey));
    if (stale.length > 0) return stale;
    return [];
  }
}

// ─── All products ─────────────────────────────────────────────────────────────

export async function fetchAllProducts(): Promise<Product[]> {
  const cacheKey = 'all_products';

  if (memoryCache.has(cacheKey)) return memoryCache.get(cacheKey)!;

  const cached = sanitizeProducts(await getCached<Product[]>(cacheKey));
  if (cached.length > 0) {
    memoryCache.set(cacheKey, cached);
    return cached;
  }

  // Load all categories from manifest
  const manifest = await fetchManifest();
  if (manifest) {
    try {
      const results = await Promise.all(
        manifest.categories.map(cat => fetchCategoryProducts(cat.name)),
      );
      const all = results.flat();
      if (all.length === 0) return [];
      memoryCache.set(cacheKey, all);
      await setCache(cacheKey, all);
      return all;
    } catch { /* fall through */ }
  }

  return [];
}

// ─── Price drops ──────────────────────────────────────────────────────────────

export async function fetchPriceDrops(limit = 10): Promise<Product[]> {
  const cacheKey = 'price_drops';
  const cached = sanitizeProducts(await getCached<Product[]>(cacheKey));
  if (cached.length > 0) return cached.slice(0, limit);

  try {
    const res = await fetch(storageUrl('price-drops.json'));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.json();
    const data = sanitizeProducts(raw);
    if (Array.isArray(raw) && raw.length > 0 && data.length === 0) {
      throw new Error('No valid real products');
    }
    await setCache(cacheKey, data);
    return data.slice(0, limit);
  } catch {
    const stale = sanitizeProducts(await getStale<Product[]>(cacheKey));
    if (stale.length > 0) return stale.slice(0, limit);
    return [];
  }
}

// ─── New products ─────────────────────────────────────────────────────────────

export async function fetchNewProducts(): Promise<Product[]> {
  const cacheKey = 'new_products';
  const cached = sanitizeProducts(await getCached<Product[]>(cacheKey));
  if (cached.length > 0) return cached;

  try {
    const res = await fetch(storageUrl('new-products.json'));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.json();
    const data = sanitizeProducts(raw);
    if (Array.isArray(raw) && raw.length > 0 && data.length === 0) {
      throw new Error('No valid real products');
    }
    await setCache(cacheKey, data);
    return data;
  } catch {
    const stale = sanitizeProducts(await getStale<Product[]>(cacheKey));
    if (stale.length > 0) return stale;
    return [];
  }
}

// ─── Best deal ────────────────────────────────────────────────────────────────

export async function fetchBestDeal(): Promise<Product | undefined> {
  const drops = await fetchPriceDrops(1);
  return drops[0];
}

// ─── Search ───────────────────────────────────────────────────────────────────

export async function searchProducts(query: string): Promise<Product[]> {
  const all = await fetchAllProducts();
  const q = query.toLowerCase();
  return all.filter(
    p =>
      p.name.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q),
  );
}

// ─── Single product by ID ─────────────────────────────────────────────────────

export async function fetchProductById(id: string): Promise<Product | undefined> {
  // Check PC components first (e.g. cpu-001, gpu-003)
  const pcComponent = pcComponentToProduct(id);
  if (pcComponent) return pcComponent;

  const all = await fetchAllProducts();
  return all.find(p => p.id === id);
}

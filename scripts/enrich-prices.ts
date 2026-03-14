/**
 * Enrich Icecat products with real indicative prices from Tweakers Pricewatch.
 *
 * Usage: npm run enrich-prices
 *
 * Strategy:
 *   1. Load each category JSON from data/products/
 *   2. Score products for "currentness" (filter out ancient/vintage products)
 *   3. For selected products, search Tweakers Pricewatch for prices + history
 *   4. Write enriched JSON back to data/products/*.json
 *   5. Rate limit: 1.2s between requests to be polite
 */

import * as fs from 'fs';
import * as path from 'path';

// ─── Tweakers API (inline, since we can't import the RN service) ─────────────

const BASE = 'https://tweakers.net';
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

interface TweakersSearchResult {
  productId: number;
  name: string;
  url: string;
  price: number | null;
}

interface TweakersPricePoint {
  date: string;
  minPrice: number;
  avgPrice: number;
}

interface TweakersPriceHistory {
  productId: number;
  prices: TweakersPricePoint[];
  lowestEver: number | null;
  lowestEverDate: string | null;
  lastPrice: number | null;
}

function extractProductId(link: string): number | null {
  const m = link.match(/\/pricewatch\/(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

function parseDutchPrice(s: string): number {
  s = s.trim().replace(/-$/, '').replace(/,$/, '');
  s = s.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function parseMinPriceHtml(html: string): number | null {
  const m = html.match(/€\s*([\d.,]+(?:-)?)/);
  return m ? parseDutchPrice(m[1]) : null;
}

async function searchTweakers(query: string): Promise<TweakersSearchResult[]> {
  try {
    const resp = await fetch(
      `${BASE}/ajax/zoeken/pricewatch/?keyword=${encodeURIComponent(query)}`,
      {
        headers: {
          'User-Agent': UA,
          Accept: 'application/json',
          'Accept-Language': 'nl,en;q=0.9',
        },
      },
    );
    if (!resp.ok) return [];
    const data = await resp.json();

    const results: TweakersSearchResult[] = [];
    const seenIds = new Set<number>();

    for (const item of data.articles ?? []) {
      const pid = extractProductId(item.link ?? '');
      if (pid && !seenIds.has(pid)) {
        seenIds.add(pid);
        results.push({ productId: pid, name: item.name ?? '', url: item.link ?? '', price: null });
      }
    }

    for (const item of data.entities ?? []) {
      if (item.type !== 'product') continue;
      const pid = extractProductId(item.link ?? '');
      if (pid && !seenIds.has(pid)) {
        seenIds.add(pid);
        const price = parseMinPriceHtml(item.minPrice ?? '');
        results.push({ productId: pid, name: item.name ?? '', url: item.link ?? '', price });
      }
    }

    return results;
  } catch {
    return [];
  }
}

async function fetchPriceHistory(productId: number): Promise<TweakersPriceHistory | null> {
  try {
    const resp = await fetch(`${BASE}/ajax/price_chart/${productId}/nl/`, {
      headers: {
        'User-Agent': UA,
        Accept: 'application/json',
        'Accept-Language': 'nl,en;q=0.9',
        'X-Requested-With': 'XMLHttpRequest',
        Referer: `${BASE}/pricewatch/${productId}/`,
      },
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    if (!data.success) return null;

    const prices: TweakersPricePoint[] = [];
    for (const row of data.dataset?.source ?? []) {
      if (Array.isArray(row) && row.length >= 3) {
        prices.push({ date: row[0], minPrice: row[1], avgPrice: row[2] });
      }
    }

    let lowestEver: number | null = null;
    for (const markerGroup of data.markers ?? []) {
      if (!Array.isArray(markerGroup)) continue;
      for (const marker of markerGroup) {
        if (marker?.yAxis != null) {
          const val = Number(marker.yAxis);
          if (lowestEver === null || val < lowestEver) lowestEver = val;
        }
      }
    }

    let lowestEverDate: string | null = null;
    if (lowestEver !== null) {
      const match = prices.find(p => p.minPrice === lowestEver);
      if (match) lowestEverDate = match.date;
    }

    return {
      productId,
      prices,
      lowestEver,
      lowestEverDate,
      lastPrice: prices.length > 0 ? prices[prices.length - 1].minPrice : null,
    };
  } catch {
    return null;
  }
}

// ─── Product currentness scoring ─────────────────────────────────────────────

const YEAR_PATTERNS = /\b(202[3-6])\b/i;
const RECENT_MODELS = /\b(RTX\s*[45]0[5-9]0|RTX\s*[45]060|RTX\s*[45]070|RTX\s*[45]080|RTX\s*[45]090|RX\s*[79]\d{3}|Ryzen\s*[3579]\s*[79]\d{2,3}|Core\s*(Ultra|i[3579]-1[3-5])|iPhone\s*1[4-7]|Galaxy\s*S2[3-6]|Galaxy\s*Z\s*(Flip|Fold)\s*[5-7]|Galaxy\s*A[5-7]\d|Pixel\s*[8-9]|MacBook\s*(Pro|Air)\s*(M[3-5]|1[4-6])|iPad\s*(Pro|Air)\s*(M[2-5]|1[1-3])|Apple\s*Watch\s*(Series\s*[9]|Ultra\s*[2-3])|AirPods\s*(Pro\s*[2-3]|Max\s*[2-3]|4)|PS5|Xbox\s*Series|Nintendo\s*Switch\s*2|GeForce\s*[45]0[5-9]0|Radeon\s*RX\s*[89]\d{3}|Wi-?Fi\s*[67]E?|DDR5|Thunderbolt\s*[45]|USB\s*4|HDMI\s*2\.[1-2])/i;
const MODERN_SPECS = /\b(DDR5|Wi-?Fi\s*[67]E?|USB-?C|USB\s*4|NVMe|OLED|AMOLED|Mini-?LED|4K|5G|Thunderbolt\s*[45]|PCIe\s*[45]\.0|Bluetooth\s*5\.[2-4]|Wi-?Fi\s*6E?|120\s*Hz|144\s*Hz|165\s*Hz|240\s*Hz|QHD|WQHD)\b/i;
const VINTAGE_NAMES = /\b(Pentium\s*[1-4]|Celeron\s*[DM]|DDR[12]\b|AGP|IDE|Floppy|VGA\s*\d|CRT|3\.5mm\s*floppy|Athlon\s*XP|Sempron|Core\s*2\s*Duo|Phenom|Atom\s*N|Windows\s*(XP|Vista|7|8\b)|NetBurst|Socket\s*(478|754|939|AM2\b))/i;
const VINTAGE_SPECS_PATTERNS = /\b(DDR2|DDR\b(?!5)|AGP|IDE|VGA-uit|PS\/2|Parallel\s*port|Serial\s*port)\b/i;

interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  imageUrl: string;
  currentPrice: number;
  originalPrice: number;
  lowestPrice: number;
  rating: number;
  reviewCount: number;
  priceHistory: { date: string; price: number }[];
  shops: { name: string; price: number; url: string; logo: string }[];
  specs: Record<string, string>;
  badge?: string;
  ean?: string;
  disclaimer?: string;
}

function scoreProduct(p: Product): number {
  let score = 0;
  const name = p.name;
  const allSpecs = Object.values(p.specs || {}).join(' ');

  // Year in name
  if (YEAR_PATTERNS.test(name)) score += 3;

  // Recent model series
  if (RECENT_MODELS.test(name)) score += 2;

  // Modern specs
  if (MODERN_SPECS.test(allSpecs) || MODERN_SPECS.test(name)) score += 1;

  // Vintage penalties
  if (VINTAGE_NAMES.test(name)) score -= 3;
  if (VINTAGE_SPECS_PATTERNS.test(allSpecs)) score -= 2;

  // Very small RAM/storage suggests old product
  const ramSpec = p.specs?.['Intern geheugen'] || p.specs?.['RAM-geheugen'] || '';
  const ramMB = ramSpec.match(/(\d+)\s*MB/i);
  if (ramMB && parseInt(ramMB[1]) < 512) score -= 2;

  // Screen resolution: tiny resolution = old phone
  const res = p.specs?.['Resolutie'] || '';
  const resMatch = res.match(/(\d+)\s*x\s*(\d+)/);
  if (resMatch) {
    const pixels = parseInt(resMatch[1]) * parseInt(resMatch[2]);
    if (pixels < 200000) score -= 2; // sub-480p
  }

  return score;
}

// Simplify product name for better Tweakers search
function simplifyName(name: string, brand: string): string {
  // Strategy: extract brand + model identifier, drop all the technical fluff
  // Icecat names look like: "DELL Latitude 5530 Intel® Core™ i5 i5-1245U Laptop 39, Full HD..."
  // We want: "Dell Latitude 5530"

  let q = name;

  // Remove everything after "Intel®", "AMD", "Qualcomm" etc (chip descriptions)
  q = q.replace(/\s+(Intel®?|AMD|Qualcomm|MediaTek|Apple\s+M[1-5]).*$/i, '');

  // Remove parenthetical descriptions like (2.6") or (15,6")
  q = q.replace(/\s*\([^)]*\)\s*/g, ' ');

  // Remove product type words
  q = q.replace(/\b(Laptop|Notebook|Desktop|Monitor|Tablet|Smartphone|Headset|Headphones|Speaker|Printer|Router|Switch|Server|All-in-One|All-in-één-pc|Alles-in-één-pc|workstation|Rack)\b/gi, '');

  // Remove tech noise (connection types, SIM info, OS versions, etc.)
  q = q.replace(/\b(Dual\s*SIM|Hybride|Enterprise\s*edition|Refurbished?|Android\s*\d+|iPadOS|USB\s*Type-C|LTE-?TDD|LTE-?FDD|LTE|Wi-?Fi\s*\d*E?|Snapdragon|Allwinner)\b/gi, '');
  q = q.replace(/\b(SM-[A-Z]\d+[A-Z]?(?:\/DS)?)\b/gi, ''); // Samsung model codes like SM-S921B/DS

  // Remove specs in name like "1300 mAh" or "128 GB"
  q = q.replace(/\b\d+[\d.,]*\s*(mAh|GB|TB|MB|kg|g|mm|cm|inch|"|Pixels|Hz|W|V|cd\/m²)\b/gi, '');

  // Remove color words anywhere (Dutch and English)
  q = q.replace(/\b(Blauw|Zwart|Wit|Grijs|Zilver|Goud|Rood|Groen|Roze|Paars|Crème|Koraal|Geel|Violet|Marmer|Black|White|Silver|Grey|Gray|Gold)\b/gi, '');

  // Remove "Forza Refurbished" / "upcycle it" prefixes
  q = q.replace(/^(Forza\s+Refurbished|upcycle\s+it)\s+/i, '');

  // Remove quality descriptions
  q = q.replace(/\b(Zo\s+goed\s+als\s+nieuw|Licht\s+gebruikt|Zichtbaar\s+gebruikt)\b/gi, '');

  // Remove "Gaming" prefix duplication (e.g. "MSI Gaming GP76" → "MSI GP76")
  q = q.replace(/\bGaming\s+/i, '');

  // If brand appears twice (Icecat often does "Samsung Samsung Galaxy"), remove duplicate
  const brandRe = new RegExp(`^${brand}\\s+${brand}\\s+`, 'i');
  q = q.replace(brandRe, `${brand} `);

  // Remove Smart TV / Ultra HD / QLED type descriptors (for TVs)
  q = q.replace(/\b(Smart\s*TV|Ultra\s*HD|Full\s*HD|QLED|Neo\s*QLED|OLED|Mini-?LED|Crystal\s*UHD|QHD|WQHD|MiniLED|QNED)\b/gi, '');

  // Remove stray quotes and special chars
  q = q.replace(/["""'']/g, '').replace(/[®™]/g, '');

  // Collapse whitespace, commas, semicolons
  q = q.replace(/[,;]/g, ' ').replace(/\s+/g, ' ').trim();

  // Take first ~40 chars for search (shorter = better on Tweakers)
  if (q.length > 40) q = q.substring(0, 40).trim();

  return q;
}

// ─── Main ────────────────────────────────────────────────────────────────────

const DATA_DIR = path.join(__dirname, '..', 'data', 'products');
const DELAY_MS = 1200; // 1.2s between requests

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

interface ManifestCategory {
  name: string;
  slug: string;
  count: number;
  sizeKB: number;
}

async function main() {
  const manifestPath = path.join(DATA_DIR, 'manifest.json');
  const manifest: { categories: ManifestCategory[]; totalProducts: number } = JSON.parse(
    fs.readFileSync(manifestPath, 'utf-8'),
  );

  let totalEnriched = 0;
  let totalSkipped = 0;
  let totalNotFound = 0;

  for (const cat of manifest.categories) {
    const filePath = path.join(DATA_DIR, `${cat.slug}.json`);
    if (!fs.existsSync(filePath)) {
      console.log(`⏭ ${cat.name}: file not found`);
      continue;
    }

    const products: Product[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    console.log(`\n📦 ${cat.name}: ${products.length} products`);

    // Score and sort by currentness
    const scored = products
      .map(p => ({ product: p, score: scoreProduct(p) }))
      .filter(s => s.score >= 2)
      .sort((a, b) => b.score - a.score);

    // Limit per category: max 80 for large categories, 30 for small
    const maxPerCat = products.length > 500 ? 80 : products.length > 100 ? 50 : 30;
    const selected = scored.slice(0, maxPerCat);

    console.log(`  ✅ ${selected.length} current products selected (score >= 2)`);

    let enrichedInCat = 0;

    for (const { product, score } of selected) {
      // Skip if already has a price
      if (product.currentPrice > 0) {
        enrichedInCat++;
        continue;
      }

      const query = simplifyName(product.name, product.brand);
      console.log(`  🔍 [score=${score}] "${query}"`);

      await sleep(DELAY_MS);

      const results = await searchTweakers(query);
      if (results.length === 0) {
        console.log(`    ❌ No Tweakers results`);
        totalNotFound++;
        continue;
      }

      const best = results[0];
      console.log(`    → Found: ${best.name} (id: ${best.productId})`);

      await sleep(DELAY_MS);

      const history = await fetchPriceHistory(best.productId);
      if (!history || history.lastPrice === null || history.lastPrice <= 0) {
        // Use search result price if available
        if (best.price && best.price > 0) {
          product.currentPrice = best.price;
          product.originalPrice = Math.round(best.price * 1.1);
          product.lowestPrice = Math.round(best.price * 0.95);
          product.priceHistory = [{ date: new Date().toISOString().split('T')[0], price: best.price }];
          enrichedInCat++;
          totalEnriched++;
          console.log(`    💰 Price from search: €${best.price}`);
          continue;
        }
        console.log(`    ❌ No price data`);
        totalNotFound++;
        continue;
      }

      // Map Tweakers data to product fields
      product.currentPrice = history.lastPrice;
      product.lowestPrice = history.lowestEver ?? history.lastPrice;

      // Original price = highest price in history
      const maxPrice = Math.max(...history.prices.map(p => p.minPrice).filter(p => p > 0));
      product.originalPrice = maxPrice > history.lastPrice ? maxPrice : Math.round(history.lastPrice * 1.05);

      // Convert price history (downsample to ~30 points)
      const step = Math.max(1, Math.floor(history.prices.length / 30));
      product.priceHistory = history.prices
        .filter((_, i) => i % step === 0 || i === history.prices.length - 1)
        .map(p => ({ date: p.date, price: p.minPrice }));

      // Set badge if significant price drop
      if (product.originalPrice > 0) {
        const dropPct = ((product.originalPrice - product.currentPrice) / product.originalPrice) * 100;
        if (dropPct >= 10) product.badge = 'prijsdaling';
        else if (dropPct >= 5) product.badge = 'deal';
      }

      // Update shop prices too
      for (const shop of product.shops) {
        shop.price = product.currentPrice;
      }

      enrichedInCat++;
      totalEnriched++;
      console.log(`    💰 €${product.currentPrice} (lowest: €${product.lowestPrice}, orig: €${product.originalPrice})`);
    }

    totalSkipped += products.length - selected.length;

    // Write back
    fs.writeFileSync(filePath, JSON.stringify(products, null, 0));
    console.log(`  💾 Saved ${cat.slug}.json (${enrichedInCat} enriched in category)`);
  }

  console.log(`\n═══════════════════════════════════════`);
  console.log(`✅ Enriched: ${totalEnriched}`);
  console.log(`⏭ Skipped (old): ${totalSkipped}`);
  console.log(`❌ Not found: ${totalNotFound}`);
  console.log(`═══════════════════════════════════════\n`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

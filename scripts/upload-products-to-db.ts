/**
 * Upload cleaned products to Supabase Database (products table).
 *
 * Sources:
 *   1. Curated products from constants/mock-data.ts (20 hand-picked)
 *   2. Icecat products from data/products/*.json (17K+ real specs)
 *
 * Skips:
 *   - data/products.json (100K fake/generated products)
 *   - Duplicates (by product name, normalized)
 *
 * Usage:
 *   npx ts-node --project tsconfig.scraper.json scripts/upload-products-to-db.ts <service_role_key>
 *
 * Or set env var:
 *   set SUPABASE_SERVICE_KEY=eyJ...
 *   npx ts-node --project tsconfig.scraper.json scripts/upload-products-to-db.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = 'https://glnpdfbnyijdzvulzbfv.supabase.co';
const PRODUCTS_DIR = path.join(__dirname, '../data/products');
const MOCK_DATA_PATH = path.join(__dirname, '../constants/mock-data.ts');
const BATCH_SIZE = 500;

interface ShopLink {
  name: string;
  price: number;
  url: string;
  logo: string;
  verified?: boolean;
}

interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  imageUrl: string;
  previewUrl?: string;
  currentPrice: number;
  originalPrice: number;
  lowestPrice: number;
  rating: number;
  reviewCount: number;
  priceHistory: { date: string; price: number }[];
  shops: ShopLink[];
  specs: Record<string, string>;
  badge?: string;
  ean?: string;
  disclaimer?: string;
  variants?: unknown[];
}

interface DbProduct {
  id: string;
  name: string;
  brand: string;
  category: string;
  image_url: string;
  preview_url: string | null;
  current_price: number;
  original_price: number;
  lowest_price: number;
  rating: number;
  review_count: number;
  price_history: { date: string; price: number }[];
  shops: ShopLink[];
  specs: Record<string, string>;
  badge: string | null;
  ean: string | null;
  disclaimer: string | null;
  variants: unknown[] | null;
  source: 'curated' | 'icecat';
}

function toDbProduct(p: Product, source: 'curated' | 'icecat'): DbProduct {
  return {
    id: p.id,
    name: p.name,
    brand: p.brand,
    category: p.category,
    image_url: p.imageUrl,
    preview_url: p.previewUrl || null,
    current_price: p.currentPrice,
    original_price: p.originalPrice,
    lowest_price: p.lowestPrice,
    rating: p.rating,
    review_count: p.reviewCount,
    price_history: p.priceHistory || [],
    shops: p.shops || [],
    specs: p.specs || {},
    badge: p.badge || null,
    ean: p.ean || null,
    disclaimer: p.disclaimer || null,
    variants: p.variants || null,
    source,
  };
}

function loadCuratedProducts(): Product[] {
  const content = fs.readFileSync(MOCK_DATA_PATH, 'utf8');

  // Extract just the MOCK_PRODUCTS array literal
  const startMarker = 'export const MOCK_PRODUCTS: Product[] = ';
  const startIdx = content.indexOf(startMarker);
  if (startIdx === -1) {
    console.warn('Could not find MOCK_PRODUCTS in mock-data.ts');
    return [];
  }

  // Get everything from the '[' after the marker
  const arrayStart = content.indexOf('[', startIdx + startMarker.length);
  if (arrayStart === -1) return [];

  // Find the matching closing '];'
  let depth = 0;
  let arrayEnd = -1;
  for (let i = arrayStart; i < content.length; i++) {
    if (content[i] === '[') depth++;
    if (content[i] === ']') {
      depth--;
      if (depth === 0) {
        arrayEnd = i + 1;
        break;
      }
    }
  }
  if (arrayEnd === -1) return [];

  const arrayStr = content.slice(arrayStart, arrayEnd);

  // Wrap in a self-executing function that returns the array
  const tmpFile = path.join(__dirname, '_tmp_mock_data.js');
  const jsCode = `module.exports = ${arrayStr};`;

  try {
    fs.writeFileSync(tmpFile, jsCode, 'utf8');
    delete require.cache[require.resolve(tmpFile)];
    const products = require(tmpFile);
    if (Array.isArray(products)) return products;
    console.warn('MOCK_PRODUCTS is not an array');
    return [];
  } catch (e) {
    console.warn('Failed to load MOCK_PRODUCTS:', (e as Error).message);
    return [];
  } finally {
    try { fs.unlinkSync(tmpFile); } catch {}
  }
}

function loadIcecatProducts(): Product[] {
  const products: Product[] = [];

  if (!fs.existsSync(PRODUCTS_DIR)) {
    console.warn('data/products/ directory not found');
    return products;
  }

  const files = fs.readdirSync(PRODUCTS_DIR)
    .filter(f => f.endsWith('.json') && f !== 'manifest.json');

  for (const file of files) {
    const filePath = path.join(PRODUCTS_DIR, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    if (Array.isArray(data)) {
      products.push(...data);
    }
  }

  return products;
}

function deduplicateProducts(products: DbProduct[]): DbProduct[] {
  const seen = new Map<string, DbProduct>();

  for (const p of products) {
    // Prefer curated over icecat if same id
    if (seen.has(p.id)) {
      const existing = seen.get(p.id)!;
      if (p.source === 'curated') {
        seen.set(p.id, p);
      }
      continue;
    }

    // Also dedupe by normalized name
    const nameKey = p.name.toLowerCase().replace(/\s+/g, ' ').trim();
    const existing = [...seen.values()].find(
      e => e.name.toLowerCase().replace(/\s+/g, ' ').trim() === nameKey
    );

    if (existing) {
      // Keep the one with more data
      if (p.source === 'curated' || (Object.keys(p.specs).length > Object.keys(existing.specs).length)) {
        seen.delete(existing.id);
        seen.set(p.id, p);
      }
      continue;
    }

    seen.set(p.id, p);
  }

  return [...seen.values()];
}

async function main() {
  const serviceKey = process.argv[2] || process.env.SUPABASE_SERVICE_KEY;
  if (!serviceKey) {
    console.error('Supabase service_role key ontbreekt!\n');
    console.error('Gebruik:');
    console.error('  npx ts-node --project tsconfig.scraper.json scripts/upload-products-to-db.ts <service_role_key>\n');
    console.error('Of stel de env var in:');
    console.error('  set SUPABASE_SERVICE_KEY=eyJ...\n');
    console.error('Je vindt de service_role key in Supabase Dashboard:');
    console.error('  → Settings → API → Project API keys → service_role (secret)');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, serviceKey);

  // Load products
  console.log('Loading curated products...');
  const curated = loadCuratedProducts().map(p => toDbProduct(p, 'curated'));
  console.log(`  ${curated.length} curated products loaded`);

  console.log('Loading Icecat products...');
  const icecat = loadIcecatProducts().map(p => toDbProduct(p, 'icecat'));
  console.log(`  ${icecat.length} Icecat products loaded`);

  // Merge: curated first (higher priority)
  const allProducts = [...curated, ...icecat];
  console.log(`\nTotal before dedup: ${allProducts.length}`);

  const cleaned = deduplicateProducts(allProducts);
  console.log(`Total after dedup: ${cleaned.length}`);

  // Stats
  const categories = new Map<string, number>();
  const sources = { curated: 0, icecat: 0 };
  let withEan = 0;

  for (const p of cleaned) {
    categories.set(p.category, (categories.get(p.category) || 0) + 1);
    sources[p.source]++;
    if (p.ean) withEan++;
  }

  console.log(`\nSources: ${sources.curated} curated, ${sources.icecat} icecat`);
  console.log(`With EAN: ${withEan}`);
  console.log(`Categories: ${categories.size}`);
  for (const [cat, count] of [...categories.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat}: ${count}`);
  }

  // Clear existing products
  console.log('\nClearing existing products from database...');
  const { error: deleteError } = await supabase.from('products').delete().neq('id', '');
  if (deleteError) {
    console.error('Failed to clear products:', deleteError.message);
    console.error('\nMake sure you have run the SQL schema first!');
    console.error('See: scripts/supabase-schema.sql');
    process.exit(1);
  }

  // Upload in batches
  console.log(`\nUploading ${cleaned.length} products in batches of ${BATCH_SIZE}...`);
  let uploaded = 0;
  let failed = 0;

  for (let i = 0; i < cleaned.length; i += BATCH_SIZE) {
    const batch = cleaned.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('products').upsert(batch, { onConflict: 'id' });

    if (error) {
      console.error(`  Batch ${Math.floor(i / BATCH_SIZE) + 1} failed: ${error.message}`);
      failed += batch.length;
    } else {
      uploaded += batch.length;
      process.stdout.write(`  ${uploaded}/${cleaned.length} uploaded\r`);
    }
  }

  console.log(`\n\nDone! ${uploaded} products uploaded, ${failed} failed.`);

  // Verify
  const { count } = await supabase.from('products').select('*', { count: 'exact', head: true });
  console.log(`\nVerification: ${count} products in database`);
}

main().catch(console.error);

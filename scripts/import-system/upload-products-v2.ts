/**
 * Upload Products v2 — Genormaliseerd schema
 *
 * Leest producten uit data/products/*.json en constants/mock-data.ts
 * en uploadt ze naar het genormaliseerde schema v2:
 *   brands, categories, products_v2, shop_prices, spec_keys, spec_values
 *
 * Usage:
 *   npx ts-node --project tsconfig.scraper.json scripts/import-system/upload-products-v2.ts <service_role_key>
 *
 * Of met env var:
 *   set SUPABASE_SERVICE_KEY=eyJ...
 *   npx ts-node --project tsconfig.scraper.json scripts/import-system/upload-products-v2.ts
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = 'https://glnpdfbnyijdzvulzbfv.supabase.co';
const PRODUCTS_DIR = path.join(__dirname, '../../data/products');
const MOCK_DATA_PATH = path.join(__dirname, '../../constants/mock-data.ts');
const BATCH_SIZE = 200;

// ─── Types (matching bestaande data structuur) ──────────────────────────────

interface ShopLink {
  name: string;
  price: number;
  url: string;
  logo: string;
  verified?: boolean;
}

interface FlatProduct {
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

// ─── Loaders ────────────────────────────────────────────────────────────────

function loadCuratedProducts(): FlatProduct[] {
  const content = fs.readFileSync(MOCK_DATA_PATH, 'utf8');
  const startMarker = 'export const MOCK_PRODUCTS: Product[] = ';
  const startIdx = content.indexOf(startMarker);
  if (startIdx === -1) {
    // Try alternate marker
    const alt = 'export const MOCK_PRODUCTS';
    const altIdx = content.indexOf(alt);
    if (altIdx === -1) {
      console.warn('MOCK_PRODUCTS niet gevonden in mock-data.ts');
      return [];
    }
  }

  const arrayStart = content.indexOf('[', startIdx + startMarker.length);
  if (arrayStart === -1) return [];

  let depth = 0;
  let arrayEnd = -1;
  for (let i = arrayStart; i < content.length; i++) {
    if (content[i] === '[') depth++;
    if (content[i] === ']') {
      depth--;
      if (depth === 0) { arrayEnd = i + 1; break; }
    }
  }
  if (arrayEnd === -1) return [];

  const tmpFile = path.join(__dirname, '_tmp_mock.js');
  try {
    fs.writeFileSync(tmpFile, `module.exports = ${content.slice(arrayStart, arrayEnd)};`, 'utf8');
    delete require.cache[require.resolve(tmpFile)];
    const products = require(tmpFile);
    return Array.isArray(products) ? products : [];
  } catch (e) {
    console.warn('Kon MOCK_PRODUCTS niet laden:', (e as Error).message);
    return [];
  } finally {
    try { fs.unlinkSync(tmpFile); } catch {}
  }
}

function loadIcecatProducts(): FlatProduct[] {
  if (!fs.existsSync(PRODUCTS_DIR)) {
    console.warn('data/products/ directory niet gevonden');
    return [];
  }

  const products: FlatProduct[] = [];
  const files = fs.readdirSync(PRODUCTS_DIR)
    .filter(f => f.endsWith('.json') && f !== 'manifest.json');

  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(path.join(PRODUCTS_DIR, file), 'utf8'));
    if (Array.isArray(data)) products.push(...data);
  }

  return products;
}

// ─── Deduplication ──────────────────────────────────────────────────────────

function deduplicateProducts(products: FlatProduct[]): FlatProduct[] {
  const seen = new Map<string, FlatProduct>();

  for (const p of products) {
    if (seen.has(p.id)) {
      const existing = seen.get(p.id)!;
      // Curated (sm-*, lp-*, etc.) wint van icecat (ic-*)
      if (!p.id.startsWith('ic-') && existing.id.startsWith('ic-')) {
        seen.set(p.id, p);
      }
      continue;
    }

    // Dedupe op genormaliseerde naam
    const nameKey = p.name.toLowerCase().replace(/\s+/g, ' ').trim();
    let isDupe = false;
    for (const [, existing] of seen) {
      if (existing.name.toLowerCase().replace(/\s+/g, ' ').trim() === nameKey) {
        isDupe = true;
        // Vervang als het nieuwe product meer data heeft
        if (Object.keys(p.specs || {}).length > Object.keys(existing.specs || {}).length) {
          seen.delete(existing.id);
          seen.set(p.id, p);
        }
        break;
      }
    }

    if (!isDupe) {
      seen.set(p.id, p);
    }
  }

  return [...seen.values()];
}

// ─── Upload logic ───────────────────────────────────────────────────────────

// Shop name → slug mapping (moet overeenkomen met shops seed data)
const SHOP_SLUG_MAP: Record<string, string> = {
  'Coolblue': 'coolblue',
  'Bol.com': 'bol-com',
  'MediaMarkt': 'mediamarkt',
  'Amazon.nl': 'amazon-nl',
  'Alternate': 'alternate',
  'Megekko': 'megekko',
  'Azerty': 'azerty',
  'Paradigit': 'paradigit',
  'Conrad': 'conrad',
  'Expert': 'expert',
  'BCC': 'bcc',
  'Apple Store': 'apple-store',
  'Samsung Shop': 'samsung-shop',
};

async function main() {
  const serviceKey = process.argv[2] || process.env.SUPABASE_SERVICE_KEY;
  if (!serviceKey) {
    console.error('Supabase service_role key ontbreekt!\n');
    console.error('Gebruik:');
    console.error('  npx ts-node --project tsconfig.scraper.json scripts/import-system/upload-products-v2.ts <service_role_key>\n');
    console.error('Of: set SUPABASE_SERVICE_KEY=eyJ...');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, serviceKey);

  // 1. Load products
  console.log('Curated producten laden...');
  const curated = loadCuratedProducts();
  console.log(`  ${curated.length} curated producten`);

  console.log('Icecat producten laden...');
  const icecat = loadIcecatProducts();
  console.log(`  ${icecat.length} icecat producten`);

  // Curated eerst (hogere prioriteit)
  const all = deduplicateProducts([...curated, ...icecat]);
  console.log(`Na dedup: ${all.length} producten\n`);

  // 2. Collect unieke brands en categories
  const brandSet = new Set<string>();
  const categorySet = new Set<string>();
  for (const p of all) {
    if (p.brand) brandSet.add(p.brand);
    if (p.category) categorySet.add(p.category);
  }

  // 3. Upsert brands
  console.log(`${brandSet.size} merken upserten...`);
  const brandIdMap = new Map<string, number>();
  for (const name of brandSet) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const { data } = await supabase
      .from('brands')
      .upsert({ name, slug }, { onConflict: 'slug' })
      .select('id')
      .single();
    if (data) brandIdMap.set(name, data.id);
  }
  console.log(`  ${brandIdMap.size} merken in database`);

  // 4. Load existing categories (already seeded by schema)
  console.log('Categorieën laden...');
  const categoryIdMap = new Map<string, number>();
  const { data: cats } = await supabase.from('categories').select('id, name');
  if (cats) {
    for (const c of cats) categoryIdMap.set(c.name, c.id);
  }
  console.log(`  ${categoryIdMap.size} categorieën beschikbaar`);

  // Create missing categories
  for (const cat of categorySet) {
    if (!categoryIdMap.has(cat)) {
      const slug = cat.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const { data } = await supabase
        .from('categories')
        .upsert({ name: cat, slug }, { onConflict: 'slug' })
        .select('id')
        .single();
      if (data) categoryIdMap.set(cat, data.id);
    }
  }

  // 5. Load shop IDs
  console.log('Shops laden...');
  const shopIdMap = new Map<string, number>();
  const { data: shops } = await supabase.from('shops').select('id, slug');
  if (shops) {
    for (const s of shops) shopIdMap.set(s.slug, s.id);
  }
  console.log(`  ${shopIdMap.size} shops beschikbaar`);

  // 6. Upsert products in batches
  console.log(`\n${all.length} producten uploaden...`);
  let uploaded = 0;
  let failed = 0;
  let pricesInserted = 0;
  let specsInserted = 0;

  for (let i = 0; i < all.length; i += BATCH_SIZE) {
    const batch = all.slice(i, i + BATCH_SIZE);

    const dbProducts = batch.map(p => ({
      external_id: p.id,
      name: p.name,
      brand_id: brandIdMap.get(p.brand) || 1,
      category_id: categoryIdMap.get(p.category) || 17, // Accessoires fallback
      ean: p.ean || null,
      image_url: p.imageUrl || null,
      preview_url: p.previewUrl || null,
      rating: p.rating || 0,
      review_count: p.reviewCount || 0,
      badge: p.badge || null,
      disclaimer: p.disclaimer || null,
      source: p.id.startsWith('ic-') ? 'icecat' : 'curated',
      is_active: true,
    }));

    const { data: inserted, error } = await supabase
      .from('products_v2')
      .upsert(dbProducts, { onConflict: 'external_id' })
      .select('id, external_id');

    if (error) {
      console.error(`  Batch fout: ${error.message}`);
      failed += batch.length;
      continue;
    }

    uploaded += (inserted?.length || 0);

    // Build external_id → db id mapping
    const idMap = new Map<string, number>();
    if (inserted) {
      for (const row of inserted) {
        if (row.external_id) idMap.set(row.external_id, row.id);
      }
    }

    // 7. Upsert shop_prices per product
    const allPrices: Array<{
      product_id: number;
      shop_id: number;
      price: number;
      url: string;
      in_stock: boolean;
      shipping: number;
      verified: boolean;
    }> = [];

    for (const p of batch) {
      const dbId = idMap.get(p.id);
      if (!dbId || !p.shops) continue;

      for (const shop of p.shops) {
        if (shop.price <= 0) continue; // Skip shops zonder prijs

        const shopSlug = SHOP_SLUG_MAP[shop.name];
        const shopId = shopSlug ? shopIdMap.get(shopSlug) : undefined;
        if (!shopId) continue;

        allPrices.push({
          product_id: dbId,
          shop_id: shopId,
          price: shop.price,
          url: shop.url,
          in_stock: true,
          shipping: 0,
          verified: shop.verified ?? false,
        });
      }
    }

    if (allPrices.length > 0) {
      const { error: priceErr } = await supabase
        .from('shop_prices')
        .upsert(allPrices, { onConflict: 'product_id,shop_id' });

      if (priceErr) {
        console.error(`  Prijs upsert fout: ${priceErr.message}`);
      } else {
        pricesInserted += allPrices.length;
      }
    }

    // 8. Upsert specs per product
    for (const p of batch) {
      const dbId = idMap.get(p.id);
      if (!dbId || !p.specs || Object.keys(p.specs).length === 0) continue;

      const catId = categoryIdMap.get(p.category);
      if (!catId) continue;

      for (const [keyName, value] of Object.entries(p.specs)) {
        // Upsert spec_key
        const { data: keyData } = await supabase
          .from('spec_keys')
          .upsert(
            { name: keyName, category_id: catId },
            { onConflict: 'name,category_id' },
          )
          .select('id')
          .single();

        if (!keyData) continue;

        // Parse numeric value if possible
        const numMatch = value.match(/^([\d.,]+)/);
        const numericValue = numMatch
          ? parseFloat(numMatch[1].replace(',', '.'))
          : null;

        // Upsert spec_value
        const { error: specErr } = await supabase
          .from('spec_values')
          .upsert(
            {
              product_id: dbId,
              spec_key_id: keyData.id,
              value,
              numeric_value: numericValue && !isNaN(numericValue) ? numericValue : null,
            },
            { onConflict: 'product_id,spec_key_id' },
          );

        if (!specErr) specsInserted++;
      }
    }

    process.stdout.write(`  ${uploaded}/${all.length} producten, ${pricesInserted} prijzen, ${specsInserted} specs\r`);
  }

  // 9. Price history: seed met bestaande priceHistory data
  console.log('\n\nPrijshistorie seeden...');
  let historyInserted = 0;

  for (const p of all) {
    if (!p.priceHistory || p.priceHistory.length === 0) continue;

    // Zoek product ID
    const { data: prod } = await supabase
      .from('products_v2')
      .select('id')
      .eq('external_id', p.id)
      .single();

    if (!prod) continue;

    const historyRows = p.priceHistory.map(h => ({
      product_id: prod.id,
      shop_id: null, // Geen specifieke shop, dit is de "laagste prijs" lijn
      price: h.price,
      recorded_at: h.date,
    }));

    const { error } = await supabase
      .from('price_history')
      .upsert(historyRows, { onConflict: 'product_id,shop_id,recorded_at' });

    if (!error) historyInserted += historyRows.length;
  }

  // 10. Summary
  console.log(`\n═══ Upload resultaat ═══`);
  console.log(`  Producten:     ${uploaded} OK, ${failed} gefaald`);
  console.log(`  Prijzen:       ${pricesInserted}`);
  console.log(`  Specs:         ${specsInserted}`);
  console.log(`  Prijshistorie: ${historyInserted}`);

  // Verify
  const { count } = await supabase
    .from('products_v2')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);
  console.log(`\n  Totaal actieve producten in DB: ${count}`);
}

main().catch(console.error);

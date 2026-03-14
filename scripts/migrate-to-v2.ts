/**
 * Migratie script: oude `products` tabel → nieuw genormaliseerd schema (v2)
 *
 * Leest alle producten uit de oude flat `products` tabel en zet ze over naar:
 *   brands, categories, products_v2, shop_prices, price_history,
 *   spec_keys, spec_values, product_variants, variant_prices
 *
 * Vereisten:
 *   - supabase-schema-v2.sql moet al uitgevoerd zijn
 *   - De oude `products` tabel moet nog bestaan
 *
 * Usage:
 *   npx ts-node --project tsconfig.scraper.json scripts/migrate-to-v2.ts <service_role_key>
 *
 * Of via env var:
 *   set SUPABASE_SERVICE_KEY=eyJ...
 *   npx ts-node --project tsconfig.scraper.json scripts/migrate-to-v2.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://glnpdfbnyijdzvulzbfv.supabase.co';
const SERVICE_KEY = process.argv[2] || process.env.SUPABASE_SERVICE_KEY;

if (!SERVICE_KEY) {
  console.error('Usage: npx ts-node scripts/migrate-to-v2.ts <service_role_key>');
  console.error('Or set SUPABASE_SERVICE_KEY env var');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// ─── Types for old schema ────────────────────────────────────────────────────

interface OldProduct {
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
  shops: { name: string; price: number; url: string; logo: string; verified?: boolean }[];
  specs: Record<string, string>;
  badge: string | null;
  ean: string | null;
  disclaimer: string | null;
  variants: {
    id: string;
    label: string;
    type: string;
    price: number;
    shops: { name: string; price: number; url: string; logo: string; verified?: boolean }[];
    imageUrl?: string;
    ean?: string;
  }[] | null;
  source: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Cache maps to avoid duplicate inserts
const brandCache = new Map<string, number>();   // name → id
const categoryCache = new Map<string, number>(); // name → id
const shopCache = new Map<string, number>();     // name → id
const specKeyCache = new Map<string, number>();  // `${categoryId}:${name}` → id

// ─── Ensure brand exists ─────────────────────────────────────────────────────

async function ensureBrand(name: string): Promise<number> {
  if (brandCache.has(name)) return brandCache.get(name)!;

  const { data: existing } = await supabase
    .from('brands')
    .select('id')
    .eq('name', name)
    .single();

  if (existing) {
    brandCache.set(name, existing.id);
    return existing.id;
  }

  const { data, error } = await supabase
    .from('brands')
    .insert({ name, slug: slugify(name) })
    .select('id')
    .single();

  if (error) throw new Error(`Brand insert failed for "${name}": ${error.message}`);
  brandCache.set(name, data.id);
  return data.id;
}

// ─── Ensure category exists ──────────────────────────────────────────────────

async function ensureCategory(name: string): Promise<number> {
  if (categoryCache.has(name)) return categoryCache.get(name)!;

  const { data: existing } = await supabase
    .from('categories')
    .select('id')
    .eq('name', name)
    .single();

  if (existing) {
    categoryCache.set(name, existing.id);
    return existing.id;
  }

  const { data, error } = await supabase
    .from('categories')
    .insert({ name, slug: slugify(name) })
    .select('id')
    .single();

  if (error) throw new Error(`Category insert failed for "${name}": ${error.message}`);
  categoryCache.set(name, data.id);
  return data.id;
}

// ─── Ensure shop exists ──────────────────────────────────────────────────────

async function ensureShop(name: string, logo: string): Promise<number> {
  if (shopCache.has(name)) return shopCache.get(name)!;

  const { data: existing } = await supabase
    .from('shops')
    .select('id')
    .eq('name', name)
    .single();

  if (existing) {
    shopCache.set(name, existing.id);
    return existing.id;
  }

  const slug = slugify(name);
  const website = `https://www.${slug}.nl`;

  const { data, error } = await supabase
    .from('shops')
    .insert({ name, slug, website, logo_code: logo })
    .select('id')
    .single();

  if (error) throw new Error(`Shop insert failed for "${name}": ${error.message}`);
  shopCache.set(name, data.id);
  return data.id;
}

// ─── Ensure spec key exists ──────────────────────────────────────────────────

async function ensureSpecKey(name: string, categoryId: number): Promise<number> {
  const cacheKey = `${categoryId}:${name}`;
  if (specKeyCache.has(cacheKey)) return specKeyCache.get(cacheKey)!;

  const { data: existing } = await supabase
    .from('spec_keys')
    .select('id')
    .eq('name', name)
    .eq('category_id', categoryId)
    .single();

  if (existing) {
    specKeyCache.set(cacheKey, existing.id);
    return existing.id;
  }

  const { data, error } = await supabase
    .from('spec_keys')
    .insert({ name, category_id: categoryId })
    .select('id')
    .single();

  if (error) throw new Error(`Spec key insert failed for "${name}": ${error.message}`);
  specKeyCache.set(cacheKey, data.id);
  return data.id;
}

// ─── Migrate a single product ────────────────────────────────────────────────

async function migrateProduct(old: OldProduct): Promise<void> {
  // 1. Ensure brand, category
  const brandId = await ensureBrand(old.brand);
  const categoryId = await ensureCategory(old.category);

  // 2. Insert product
  const { data: product, error: productError } = await supabase
    .from('products_v2')
    .insert({
      external_id: old.id,
      name: old.name,
      brand_id: brandId,
      category_id: categoryId,
      ean: old.ean,
      image_url: old.image_url,
      preview_url: old.preview_url,
      rating: old.rating || 0,
      review_count: old.review_count || 0,
      badge: old.badge,
      disclaimer: old.disclaimer,
      source: old.source || 'icecat',
    })
    .select('id')
    .single();

  if (productError) {
    // Skip duplicates
    if (productError.code === '23505') {
      console.log(`  Skipped duplicate: ${old.name}`);
      return;
    }
    throw new Error(`Product insert failed for "${old.name}": ${productError.message}`);
  }

  const productId = product.id;

  // 3. Insert shop prices
  if (old.shops && old.shops.length > 0) {
    for (const shop of old.shops) {
      try {
        const shopId = await ensureShop(shop.name, shop.logo);
        await supabase.from('shop_prices').insert({
          product_id: productId,
          shop_id: shopId,
          price: shop.price,
          url: shop.url || '#',
          verified: shop.verified || false,
        });
      } catch (e) {
        console.warn(`  Shop price skip (${shop.name}): ${(e as Error).message}`);
      }
    }
  }

  // 4. Insert price history
  if (old.price_history && old.price_history.length > 0) {
    const historyRows = old.price_history
      .filter(ph => ph.date && ph.price > 0)
      .map(ph => ({
        product_id: productId,
        shop_id: null as number | null, // overall laagste prijs
        price: ph.price,
        recorded_at: ph.date,
      }));

    if (historyRows.length > 0) {
      const { error: histError } = await supabase
        .from('price_history')
        .insert(historyRows);
      if (histError) {
        console.warn(`  Price history skip: ${histError.message}`);
      }
    }
  }

  // 5. Insert specs
  if (old.specs && Object.keys(old.specs).length > 0) {
    for (const [key, value] of Object.entries(old.specs)) {
      if (!value) continue;
      try {
        const specKeyId = await ensureSpecKey(key, categoryId);
        // Try to parse numeric value for filtering
        const numMatch = value.match(/^(\d+[\.,]?\d*)/);
        const numericValue = numMatch ? parseFloat(numMatch[1].replace(',', '.')) : null;

        await supabase.from('spec_values').insert({
          product_id: productId,
          spec_key_id: specKeyId,
          value,
          numeric_value: numericValue,
        });
      } catch (e) {
        console.warn(`  Spec skip (${key}): ${(e as Error).message}`);
      }
    }
  }

  // 6. Insert variants
  if (old.variants && old.variants.length > 0) {
    for (const variant of old.variants) {
      try {
        const { data: variantRow, error: variantError } = await supabase
          .from('product_variants')
          .insert({
            product_id: productId,
            label: variant.label,
            variant_type: variant.type || 'model',
            ean: variant.ean,
            image_url: variant.imageUrl,
          })
          .select('id')
          .single();

        if (variantError) {
          console.warn(`  Variant skip (${variant.label}): ${variantError.message}`);
          continue;
        }

        // Variant shop prices
        if (variant.shops && variant.shops.length > 0) {
          for (const shop of variant.shops) {
            try {
              const shopId = await ensureShop(shop.name, shop.logo);
              await supabase.from('variant_prices').insert({
                variant_id: variantRow.id,
                shop_id: shopId,
                price: shop.price,
                url: shop.url || '#',
              });
            } catch (e) {
              console.warn(`  Variant price skip: ${(e as Error).message}`);
            }
          }
        }
      } catch (e) {
        console.warn(`  Variant skip (${variant.label}): ${(e as Error).message}`);
      }
    }
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Tweakly Data Migration: products → v2 schema ===\n');

  // Fetch all products from old table
  console.log('Fetching products from old table...');
  const allProducts: OldProduct[] = [];
  let offset = 0;
  const PAGE_SIZE = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      console.error('Fetch error:', error.message);
      break;
    }
    if (!data || data.length === 0) break;

    allProducts.push(...(data as OldProduct[]));
    offset += PAGE_SIZE;
    console.log(`  Fetched ${allProducts.length} products...`);
  }

  console.log(`\nTotal products to migrate: ${allProducts.length}\n`);

  if (allProducts.length === 0) {
    console.log('No products found in old table. Nothing to migrate.');
    return;
  }

  // Migrate each product
  let success = 0;
  let failed = 0;

  for (let i = 0; i < allProducts.length; i++) {
    const old = allProducts[i];
    try {
      await migrateProduct(old);
      success++;
      if ((i + 1) % 100 === 0) {
        console.log(`Progress: ${i + 1}/${allProducts.length} (${success} ok, ${failed} failed)`);
      }
    } catch (e) {
      failed++;
      console.error(`FAILED [${old.id}] ${old.name}: ${(e as Error).message}`);
    }
  }

  console.log('\n=== Migration complete ===');
  console.log(`  Total:   ${allProducts.length}`);
  console.log(`  Success: ${success}`);
  console.log(`  Failed:  ${failed}`);
  console.log(`  Brands:  ${brandCache.size}`);
  console.log(`  Categories: ${categoryCache.size}`);
  console.log(`  Shops:   ${shopCache.size}`);
  console.log(`  Spec keys: ${specKeyCache.size}`);
}

main().catch(console.error);

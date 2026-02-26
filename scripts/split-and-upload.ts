/**
 * Split products.json into per-category files and upload to Firebase Storage.
 *
 * Usage:
 *   npx ts-node --project tsconfig.scraper.json scripts/split-and-upload.ts
 *
 * Prerequisites:
 *   npm install firebase-admin (in project root, not functions/)
 *
 * Environment:
 *   GOOGLE_APPLICATION_CREDENTIALS=path/to/serviceAccountKey.json
 *   or place serviceAccountKey.json in project root.
 */

import * as fs from 'fs';
import * as path from 'path';

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
  shops: { name: string; price: number; url: string; logo: string }[];
  specs: Record<string, string>;
  badge?: 'prijsdaling' | 'deal' | 'nieuw';
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function main() {
  const productsPath = path.join(__dirname, '../data/products.json');
  console.log('Loading products.json...');
  const allProducts: Product[] = JSON.parse(fs.readFileSync(productsPath, 'utf-8'));
  console.log(`Loaded ${allProducts.length} products`);

  // Group by category
  const byCategory: Record<string, Product[]> = {};
  for (const p of allProducts) {
    if (!byCategory[p.category]) byCategory[p.category] = [];
    byCategory[p.category].push(p);
  }

  // Create output directory
  const outDir = path.join(__dirname, '../data/categories');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  // Build manifest
  const manifest: {
    version: string;
    updatedAt: string;
    categories: { name: string; slug: string; count: number; sizeBytes: number }[];
    totalProducts: number;
  } = {
    version: '1',
    updatedAt: new Date().toISOString(),
    categories: [],
    totalProducts: allProducts.length,
  };

  // Write per-category files
  for (const [category, products] of Object.entries(byCategory)) {
    const slug = slugify(category);
    const filePath = path.join(outDir, `${slug}.json`);
    const json = JSON.stringify(products);
    fs.writeFileSync(filePath, json);
    const sizeBytes = Buffer.byteLength(json, 'utf-8');

    manifest.categories.push({
      name: category,
      slug,
      count: products.length,
      sizeBytes,
    });

    console.log(`  ${category}: ${products.length} products (${(sizeBytes / 1024).toFixed(0)} KB) -> ${slug}.json`);
  }

  // Also generate price-drops and new-products for the home screen
  // Filter out products with corrupted originalPrice before computing drops
  const priceDrops = allProducts
    .filter(p => {
      if (p.currentPrice >= p.originalPrice) return false;
      // Skip if original price is more than 3x the current price (likely corrupted)
      if (p.originalPrice > p.currentPrice * 3) return false;
      // Must have reasonable price history
      if (!p.priceHistory || p.priceHistory.length < 5) return false;
      return true;
    })
    .sort((a, b) => {
      const dropA = (a.originalPrice - a.currentPrice) / a.originalPrice;
      const dropB = (b.originalPrice - b.currentPrice) / b.originalPrice;
      return dropB - dropA;
    })
    .slice(0, 20);

  const newProducts = allProducts
    .filter(p => p.badge === 'nieuw' || (p.priceHistory && p.priceHistory.length <= 14))
    .sort((a, b) => {
      const latestA = a.priceHistory?.[a.priceHistory.length - 1]?.date ?? '';
      const latestB = b.priceHistory?.[b.priceHistory.length - 1]?.date ?? '';
      return latestB.localeCompare(latestA);
    })
    .slice(0, 20);

  fs.writeFileSync(path.join(outDir, 'price-drops.json'), JSON.stringify(priceDrops));
  fs.writeFileSync(path.join(outDir, 'new-products.json'), JSON.stringify(newProducts));

  // Write manifest
  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  console.log(`\nManifest written with ${manifest.categories.length} categories`);
  console.log(`Total: ${manifest.totalProducts} products`);
  console.log(`\nOutput: data/categories/`);
  console.log('\nNext step: upload to Firebase Storage');
  console.log('  1. Download serviceAccountKey.json from Firebase Console');
  console.log('     → Project Settings → Service accounts → Generate new private key');
  console.log('  2. Run: npx ts-node scripts/upload-to-firebase.ts');
}

main().catch(console.error);

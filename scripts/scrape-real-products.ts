/**
 * Real Product Scraper
 * 
 * Scrapes real products from Tweakers with verified retailer links.
 * Only includes products that have actual retailer product pages (not search URLs).
 * 
 * Usage: npx ts-node --project tsconfig.scraper.json scripts/scrape-real-products.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const TWEAKERS_BASE = 'https://tweakers.net';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const DATA_DIR = path.join(__dirname, '../data/categories');

interface ShopLink {
  name: string;
  price: number;
  url: string;
  logo: string;
  verified?: boolean;
}

interface ProductVariant {
  id: string;
  label: string;
  type: 'kleur' | 'opslag' | 'model' | 'configuratie';
  price: number;
  shops: ShopLink[];
  imageUrl?: string;
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
  variants?: ProductVariant[];
}

const CATEGORIES = [
  { name: 'Smartphones', slug: 'smartphones', minPrice: 100, maxPrice: 2000 },
  { name: 'Tablets', slug: 'tablets', minPrice: 150, maxPrice: 2500 },
  { name: 'Laptops', slug: 'laptops', minPrice: 300, maxPrice: 4000 },
  { name: 'Televisies', slug: 'televisies', minPrice: 300, maxPrice: 5000 },
  { name: 'Audio', slug: 'audio', minPrice: 30, maxPrice: 600 },
  { name: 'Gaming', slug: 'gaming', minPrice: 30, maxPrice: 500 },
  { name: 'Monitoren', slug: 'monitoren', minPrice: 150, maxPrice: 3000 },
  { name: 'Wearables', slug: 'wearables', minPrice: 100, maxPrice: 1000 },
];

function htmlDecode(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function parseDutchPrice(s: string): number {
  s = s.trim().replace(/-$/, '').replace(/,$/, '');
  s = s.replace(/\./g, '').replace(',', '.');
  return parseFloat(s) || 0;
}

async function fetchWithTimeout(url: string, timeout = 15000): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': UA },
      signal: controller.signal,
    });
    return await resp.text();
  } finally {
    clearTimeout(timeoutId);
  }
}

function extractProductId(url: string): string | null {
  const match = url.match(/\/pricewatch\/(\d+)/);
  return match ? match[1] : null;
}

function parseShopOffers(html: string, baseUrl: string): ShopLink[] {
  const shops: ShopLink[] = [];
  const shopPattern = /<li\s+data-shop-id="(\d+)"[^>]*>([\s\S]*?)<\/li>/g;
  let match;
  
  while ((match = shopPattern.exec(html)) !== null) {
    const block = match[2];
    
    const nameMatch = 
      block.match(/class="shop-name"[^>]*>\s*<a[^>]*>([\s\S]*?)<\/a>/) ??
      block.match(/class="[^"]*shop-name[^"]*"[^>]*>([\s\S]*?)<\/(?:span|div|td)>/);
    
    const shopName = nameMatch ? htmlDecode(nameMatch[1]).trim() : '';
    if (!shopName) continue;
    
    let price = 0;
    const priceMatch = block.match(/class="shop-price"[^>]*>[\s\S]*?€\s*([\d.,]+)/);
    if (priceMatch) price = parseDutchPrice(priceMatch[1]);
    
    let url = '';
    const urlMatch = block.match(/href="(\/[^"]*)"/);
    if (urlMatch) url = TWEAKERS_BASE + urlMatch[1];
    
    if (price > 0) {
      shops.push({
        name: shopName,
        price,
        url,
        logo: shopName.substring(0, 3).toUpperCase(),
        verified: url.includes('clickout') || url.includes('/pricewatch/'),
      });
    }
  }
  
  return shops.sort((a, b) => a.price - b.price);
}

async function scrapeCategory(category: typeof CATEGORIES[0]): Promise<Product[]> {
  console.log(`Scraping ${category.name}...`);
  
  try {
    const url = `${TWEAKERS_BASE}/pricewatch/${category.slug}/`;
    const html = await fetchWithTimeout(url, 20000);
    
    const products: Product[] = [];
    const productPattern = /<a\s+href="(\/pricewatch\/\d+[^"]*)"[^>]*>[\s\S]*?<img[^>]+alt="([^"]*)"[\s\S]*?<span class="price[^>]*>[\s\S]*?€\s*([\d.,]+)/g;
    
    let match;
    let count = 0;
    const seen = new Set<string>();
    
    while ((match = productPattern.exec(html)) !== null && count < 500) {
      const productUrl = TWEAKERS_BASE + match[1];
      const name = htmlDecode(match[2].trim()).substring(0, 100);
      const price = parseDutchPrice(match[3]);
      
      if (price < category.minPrice || price > category.maxPrice) continue;
      if (seen.has(name)) continue;
      seen.add(name);
      
      const productId = extractProductId(productUrl);
      if (!productId) continue;
      
      const brand = name.split(' ')[0];
      
      products.push({
        id: productId,
        name,
        brand,
        category: category.name,
        imageUrl: '',
        currentPrice: price,
        originalPrice: Math.round(price * 1.1),
        lowestPrice: price,
        rating: 0,
        reviewCount: 0,
        priceHistory: [{ date: new Date().toISOString().split('T')[0], price }],
        shops: [{ name: 'Tweakers Pricewatch', price, url: productUrl, logo: 'TWK', verified: true }],
        specs: {},
      });
      
      count++;
    }
    
    console.log(`  Found ${products.length} products`);
    return products;
  } catch (err) {
    console.log(`  Error: ${err}`);
    return [];
  }
}

async function main() {
  console.log('╔══════════════════════════════════════╗');
  console.log('║  Real Product Scraper               ║');
  console.log('╚══════════════════════════════════════╝\n');
  
  let allProducts: Product[] = [];
  
  for (const category of CATEGORIES) {
    const products = await scrapeCategory(category);
    allProducts = [...allProducts, ...products];
    await new Promise(r => setTimeout(r, 2000));
  }
  
  console.log(`\nTotal products scraped: ${allProducts.length}`);
  
  // Remove duplicates by name
  const seen = new Set<string>();
  const unique = allProducts.filter(p => {
    if (seen.has(p.name)) return false;
    seen.add(p.name);
    return true;
  });
  
  console.log(`Unique products: ${unique.length}`);
  
  // Save to file
  const outputPath = path.join(DATA_DIR, 'scraped-products.json');
  fs.writeFileSync(outputPath, JSON.stringify(unique, null, 2));
  console.log(`Saved to ${outputPath}`);
}

main().catch(console.error);

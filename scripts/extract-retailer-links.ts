/**
 * Link Extraction Script
 * 
 * Extracts real retailer URLs from Tweakers Pricewatch pages
 * and updates all category JSON files with verified direct links.
 * 
 * Usage: npx ts-node --project tsconfig.scraper.json scripts/extract-retailer-links.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const TWEAKERS_BASE = 'https://tweakers.net';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const DATA_DIR = path.join(__dirname, '../data/categories');
const BATCH_SIZE = 50;
const CONCURRENT_REQUESTS = 15;

interface Shop {
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
  shops: Shop[];
  specs: Record<string, string>;
  badge?: string;
}

const RETAILER_MAP: Record<string, { name: string; baseUrl: string; logo: string }> = {
  'Coolblue': { name: 'Coolblue', baseUrl: 'https://www.coolblue.nl', logo: 'CB' },
  'Bol.com': { name: 'Bol.com', baseUrl: 'https://www.bol.com', logo: 'BOL' },
  'MediaMarkt': { name: 'MediaMarkt', baseUrl: 'https://www.mediamarkt.nl', logo: 'MM' },
  'Azerty': { name: 'Azerty', baseUrl: 'https://azerty.nl', logo: 'AZ' },
  'Alternate': { name: 'Alternate', baseUrl: 'https://www.alternate.nl', logo: 'ALT' },
  'BCC': { name: 'BCC', baseUrl: 'https://www.bcc.nl', logo: 'BCC' },
  'Amazon.nl': { name: 'Amazon.nl', baseUrl: 'https://www.amazon.nl', logo: 'AMZ' },
  'Wehkamp': { name: 'Wehkamp', baseUrl: 'https://www.wehkamp.nl', logo: 'WHK' },
};

function extractProductId(url: string): string | null {
  const match = url.match(/\/pricewatch\/(\d+)/);
  return match ? match[1] : null;
}

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
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function parseShopOffers(html: string): Shop[] {
  const shops: Shop[] = [];
  
  const shopPattern = /<li\s+data-shop-id="(\d+)"[^>]*>([\s\S]*?)<\/li>/g;
  let match;
  
  while ((match = shopPattern.exec(html)) !== null) {
    const block = match[2];
    
    const nameMatch = 
      block.match(/class="shop-name"[^>]*>\s*<a[^>]*>([\s\S]*?)<\/a>/) ??
      block.match(/class="[^"]*shop-name[^"]*"[^>]*>([\s\S]*?)<\/(?:span|div|td)>/) ??
      block.match(/data-shop-name="([^"]*)"/);
    
    const shopName = nameMatch ? htmlDecode(nameMatch[1]).trim() : '';
    if (!shopName) continue;
    
    let productPrice = 0;
    const priceMatch = block.match(/class="shop-price"[^>]*>[\s\S]*?€\s*([\d.,]+)/);
    if (priceMatch) {
      productPrice = parseDutchPrice(priceMatch[1]);
    }
    
    let url = '';
    const urlMatch = 
      block.match(/href="([^"]*\/clickout[^"]*)"/) ??
      block.match(/href="(\/[^"]+)"/);
    
    if (urlMatch) {
      url = htmlDecode(urlMatch[1]);
      if (url.startsWith('/')) {
        url = TWEAKERS_BASE + url;
      }
    }
    
    const retailerInfo = Object.values(RETAILER_MAP).find(r => 
      shopName.toLowerCase().includes(r.name.toLowerCase())
    );
    
    if (productPrice > 0) {
      shops.push({
        name: shopName,
        price: productPrice,
        url: url || `#`,
        logo: retailerInfo?.logo || shopName.substring(0, 3).toUpperCase(),
        verified: url.includes(retailerInfo?.baseUrl || ''),
      });
    }
  }
  
  return shops;
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

async function extractRetailerLinks(productId: string): Promise<Shop[]> {
  try {
    const url = `${TWEAKERS_BASE}/pricewatch/${productId}/`;
    const html = await fetchWithTimeout(url, 15000);
    const shops = parseShopOffers(html);
    
    if (shops.length > 0) {
      console.log(`  ✓ Found ${shops.length} shops for product ${productId}`);
      return shops;
    }
  } catch (err) {
    console.log(`  ✗ Failed to fetch product ${productId}: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
  return [];
}

async function processProduct(product: Product): Promise<Product> {
  const existingShop = product.shops[0];
  if (!existingShop) return product;
  
  const productId = extractProductId(existingShop.url);
  if (!productId) return product;
  
  const newShops = await extractRetailerLinks(productId);
  
  if (newShops.length > 0) {
    return { ...product, shops: newShops };
  }
  
  return product;
}

async function processBatch(products: Product[], startIdx: number): Promise<Product[]> {
  const promises = products.map((p, i) => 
    processProduct(p).then(result => ({ result, index: startIdx + i }))
  );
  
  const results = await Promise.all(promises);
  return results.sort((a, b) => a.index - b.index).map(r => r.result);
}

async function processCategoryFile(categoryName: string): Promise<number> {
  const filePath = path.join(DATA_DIR, `${categoryName}.json`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`  File not found: ${filePath}`);
    return 0;
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  let products: Product[] = JSON.parse(content);
  
  console.log(`\n📦 Processing ${categoryName}: ${products.length} products`);
  
  let updated = 0;
  
  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(products.length / BATCH_SIZE);
    
    console.log(`  Batch ${batchNum}/${totalBatches} (${i + 1}-${Math.min(i + BATCH_SIZE, products.length)})`);
    
    const processed = await processBatch(batch, i);
    
    for (let j = 0; j < processed.length; j++) {
      if (processed[j].shops[0]?.url && 
          !processed[j].shops[0].url.includes('tweakers.net/pricewatch')) {
        products[i + j] = processed[j];
        updated++;
      }
    }
    
    if (i + BATCH_SIZE < products.length) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  
  fs.writeFileSync(filePath, JSON.stringify(products, null, 0));
  console.log(`  ✓ Updated ${updated}/${products.length} products`);
  
  return updated;
}

async function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  Retailer Link Extractor               ║');
  console.log('╚══════════════════════════════════════════╝\n');
  
  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json') && f !== 'manifest.json');
  
  console.log(`Found ${files.length} category files\n`);
  
  let totalUpdated = 0;
  
  for (const file of files) {
    const categoryName = file.replace('.json', '');
    const updated = await processCategoryFile(categoryName);
    totalUpdated += updated;
  }
  
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║  Summary                                ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`Total products updated: ${totalUpdated}`);
}

main().catch(console.error);

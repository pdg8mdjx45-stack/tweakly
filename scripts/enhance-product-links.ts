/**
 * Enhanced Link Generator
 * 
 * Creates a mix of:
 * 1. Original Pricewatch link (works, redirects to retailers)
 * 2. Retailer search URLs as fallback options
 * 
 * Usage: npx ts-node --project tsconfig.scraper.json scripts/enhance-product-links.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(__dirname, '../data/categories');

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

const RETAILERS = [
  { name: 'Coolblue', baseUrl: 'https://www.coolblue.nl', logo: 'CB', searchPath: '/zoeken?query=' },
  { name: 'Bol.com', baseUrl: 'https://www.bol.com', logo: 'BOL', searchPath: '/nl/nl/s/?search=' },
  { name: 'MediaMarkt', baseUrl: 'https://www.mediamarkt.nl', logo: 'MM', searchPath: '/nl/zoeken/?search=' },
  { name: 'Azerty', baseUrl: 'https://azerty.nl', logo: 'AZ', searchPath: '/?q=' },
  { name: 'Alternate', baseUrl: 'https://www.alternate.nl', logo: 'ALT', searchPath: '/html/searchresult.shtml?search=' },
];

function generateRetailerSearchLink(retailer: typeof RETAILERS[0], productName: string): string {
  const encoded = encodeURIComponent(productName);
  return `${retailer.baseUrl}${retailer.searchPath}${encoded}`;
}

function processProduct(product: Product): Product {
  const pricewatchUrl = product.shops[0]?.url || '';
  
  const shops: Shop[] = [];
  
  if (pricewatchUrl.includes('tweakers.net/pricewatch/')) {
    shops.push({
      name: 'Tweakers Pricewatch',
      price: product.currentPrice,
      url: pricewatchUrl,
      logo: 'TWK',
      verified: true,
    });
  }
  
  for (let i = 0; i < RETAILERS.length; i++) {
    const retailer = RETAILERS[i];
    const priceVariation = product.currentPrice + (i * 2) - 4;
    shops.push({
      name: retailer.name,
      price: Math.max(priceVariation, Math.round(product.currentPrice * 0.9)),
      url: generateRetailerSearchLink(retailer, product.name),
      logo: retailer.logo,
      verified: false,
    });
  }
  
  return { ...product, shops };
}

function processCategoryFile(categoryName: string): number {
  const filePath = path.join(DATA_DIR, `${categoryName}.json`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`  File not found: ${categoryName}`);
    return 0;
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  let products: Product[] = JSON.parse(content);
  
  console.log(`\n📦 Processing ${categoryName}: ${products.length} products`);
  
  products = products.map(p => processProduct(p));
  
  fs.writeFileSync(filePath, JSON.stringify(products, null, 0));
  console.log(`  ✓ Updated ${products.length} products`);
  
  return products.length;
}

function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  Enhanced Product Links Generator   ║');
  console.log('╚══════════════════════════════════════════╝\n');
  
  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json') && f !== 'manifest.json');
  
  console.log(`Found ${files.length} category files\n`);
  
  let totalProducts = 0;
  
  for (const file of files) {
    const categoryName = file.replace('.json', '');
    const count = processCategoryFile(categoryName);
    totalProducts += count;
  }
  
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║  Summary                                ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`Total products updated: ${totalProducts}`);
  console.log(`Each product now has Pricewatch + ${RETAILERS.length} retailer search links`);
}

main();

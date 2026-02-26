/**
 * Microcenter.com Product Scraper using Apify
 * 
 * Uses Apify's proxy service to bypass anti-bot protection.
 * 
 * Usage: npx ts-node --project tsconfig.scraper.json scripts/scraper-microcenter-apify.ts
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';

// Types
interface Shop {
  name: string;
  price: number;
  url: string;
  logo: string;
}

interface PricePoint {
  date: string;
  price: number;
}

interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  imageUrl: string;
  previewUrl: string;
  currentPrice: number;
  originalPrice: number;
  lowestPrice: number;
  rating: number;
  reviewCount: number;
  priceHistory: PricePoint[];
  shops: Shop[];
  specs: Record<string, string>;
  badge?: 'prijsdaling' | 'deal' | 'nieuw';
}

// Constants
const BASE_URL = 'https://www.microcenter.com';
// Using Apify proxy - more reliable than actor
const APIFY_API_KEY = 'REMOVED_SECRET';

const CATEGORIES = [
  { appName: 'Processors', url: '/category/Processors' },
  { appName: 'Grafische_kaarten', url: '/category/Video-Cards' },
  { appName: 'Moerborden', url: '/category/Motherboards' },
  { appName: 'Geheugen', url: '/category/Computer-Memory' },
  { appName: 'Opslag_SSD', url: '/category/Solid-State-Drives-SSD' },
  { appName: 'Laptops', url: '/category/Laptops-Notebooks' },
  { appName: 'Monitoren', url: '/category/Monitors' },
];

const KNOWN_BRANDS = [
  'Intel', 'AMD', 'NVIDIA', 'ASUS', 'MSI', 'Gigabyte', 'EVGA', 'Samsung',
  'Kingston', 'Corsair', 'G.Skill', 'Crucial', 'Western Digital', 'Seagate',
];

// Helpers
function extractBrand(name: string): string {
  const upper = name.toUpperCase();
  for (const b of KNOWN_BRANDS) {
    if (upper.includes(b.toUpperCase())) return b;
  }
  return name.split(' ')[0];
}

function parsePrice(text: string): number {
  if (!text) return 0;
  const cleaned = text.replace(/[$€£¥\s]/g, '').trim();
  const match = cleaned.match(/[\d,]+\.?\d*/);
  return match ? parseFloat(match[0].replace(/,/g, '')) : 0;
}

function generateShops(href: string, price: number): Shop[] {
  return [{
    name: 'Microcenter',
    price: Math.round(price * 100) / 100,
    url: href.startsWith('http') ? href : `${BASE_URL}${href}`,
    logo: 'MC',
  }];
}

// Main
async function scrapeWithApify() {
  console.log('=== Microcenter Scraper (Apify Proxy) ===\n');

  const allProducts: Product[] = [];

  for (const { appName, url } of CATEGORIES) {
    console.log(`\n[${appName}] url="${url}"`);
    
    try {
      const fullUrl = `${BASE_URL}${url}`;
      console.log(`  Requesting ${fullUrl} via Apify proxy...`);
      
      // Use Apify proxy directly - this bypasses bot protection
      const proxyUrl = `https://proxy.apify.com?url=${encodeURIComponent(fullUrl)}&token=${APIFY_API_KEY}`;
      
      const response = await axios.get(proxyUrl, { 
        timeout: 60000,
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        }
      });
      
      const html = response.data;
      
      // Save debug HTML
      fs.writeFileSync(
        path.join(__dirname, `../data/debug-apify-${appName.toLowerCase().replace(/\s+/g, '-')}.html`),
        html
      );
      console.log(`  Saved debug HTML (${html.length} bytes)`);
      
      const $ = cheerio.load(html);
      const pageTitle = $('title').text();
      console.log(`  Page title: ${pageTitle}`);
      
      if (pageTitle.includes('Just a moment') || pageTitle.includes('Cloudflare') || pageTitle.includes('Access denied')) {
        console.log(`  WARNING: Blocked by protection!`);
        continue;
      }
      
      // Extract products - try multiple selectors
      const products: Product[] = [];
      const seenIds = new Set<string>();
      
      // Try different selectors for product links
      const productSelectors = [
        'a[href*="/product/"]',
        '.product_wrapper a',
        '.product-item a',
        '.productListItem a',
        '[class*="product"] a[href*="/product/"]',
      ];
      
      for (const selector of productSelectors) {
        $(selector).each((_, el) => {
          const href = $(el).attr('href');
          if (!href) return;
          
          const idMatch = href.match(/\/product\/(\d+)/);
          if (!idMatch) return;
          
          const id = idMatch[1];
          if (seenIds.has(id)) return;
          seenIds.add(id);
          
          const name = $(el).text().trim() || $(el).attr('title') || '';
          
          // Find price by traversing up the DOM
          let price = 0;
          let parent = $(el).parent();
          for (let i = 0; i < 10 && parent.length && !price; i++) {
            const priceText = parent.find('[class*="price"]').first().text();
            price = parsePrice(priceText);
            if (!price) {
              const priceAttr = parent.attr('data-price') || parent.find('[data-price]').attr('data-price');
              price = parsePrice(priceAttr || '');
            }
            parent = parent.parent();
          }
          
          if (name && name.length > 3 && name.length < 200 && price > 0) {
            products.push({
              id: `mc-${id}`,
              name: name.substring(0, 200),
              brand: extractBrand(name),
              category: appName,
              imageUrl: '',
              previewUrl: '',
              currentPrice: price,
              originalPrice: price,
              lowestPrice: price,
              rating: 0,
              reviewCount: 0,
              priceHistory: [{ date: new Date().toISOString().split('T')[0], price }],
              shops: generateShops(href, price),
              specs: {},
            });
          }
        });
        
        if (products.length > 0) {
          console.log(`  Found ${products.length} products using selector: ${selector}`);
          break;
        }
      }
      
      console.log(`  Extracted ${products.length} products`);
      allProducts.push(...products);
      
    } catch (err: any) {
      console.error(`  Error: ${err.message}`);
    }
    
    await new Promise(r => setTimeout(r, 2000));
  }

  const OUTPUT_PATH = path.join(__dirname, '../data/products-microcenter.json');
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(allProducts, null, 2));
  
  console.log(`\n=== DONE! ${allProducts.length} products saved to data/products-microcenter.json ===`);
}

scrapeWithApify().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});


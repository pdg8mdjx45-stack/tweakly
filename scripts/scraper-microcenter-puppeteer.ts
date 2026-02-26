/**
 * Microcenter.com Product Scraper using Puppeteer
 * 
 * Uses a real headless browser to bypass anti-bot protection.
 * 
 * Usage: npx ts-node --project tsconfig.scraper.json scripts/scraper-microcenter-puppeteer.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as puppeteer from 'puppeteer';

// ─── Types ────────────────────────────────────────────────────────────────────

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

interface RawProduct {
  id: string;
  name: string;
  price: number;
  href: string;
  img: string;
  brand?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BASE_URL = 'https://www.microcenter.com';
const MAX_PRODUCTS_PER_CAT = 200;

const CATEGORIES = [
  { appName: 'Processors', url: '/category/Processors' },
  { appName: 'Grafische kaarten', url: '/category/Video-Cards' },
  { appName: 'Moerborden', url: '/category/Motherboards' },
  { appName: 'Geheugen', url: '/category/Computer-Memory' },
  { appName: 'Opslag (SSD)', url: '/category/Solid-State-Drives-SSD' },
  { appName: 'Laptops', url: '/category/Laptops-Notebooks' },
  { appName: 'Monitoren', url: '/category/Monitors' },
];

const KNOWN_BRANDS = [
  'Intel', 'AMD', 'NVIDIA', 'ASUS', 'MSI', 'Gigabyte', 'EVGA', 'Samsung',
  'Kingston', 'Corsair', 'G.Skill', 'Crucial', 'Western Digital', 'Seagate',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// ─── Main scraping function ────────────────────────────────────────────────

async function scrapeWithPuppeteer() {
  console.log('╔══════════════════════════════════════╗');
  console.log('║  Microcenter Scraper (Puppeteer) ║');
  console.log(`╚══════════════════════════════════════╝\n`);

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
    ],
  });

  const page = await browser.newPage();
  
  // Set realistic viewport
  await page.setViewport({ width: 1920, height: 1080 });
  
  // Set user agent
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

  const allProducts: Product[] = [];

  for (const { appName, url } of CATEGORIES) {
    console.log(`\n╔═ [${appName}] url="${url}"`);
    
    try {
      const fullUrl = `${BASE_URL}${url}`;
      console.log(`  Navigating to ${fullUrl}...`);
      
      await page.goto(fullUrl, { waitUntil: 'networkidle2', timeout: 60000 });
      
      // Wait a bit for any JavaScript to load
      await new Promise(r => setTimeout(r, 3000));
      
      // Get page content
      const html = await page.content();
      
      // Save debug HTML
      fs.writeFileSync(
        path.join(__dirname, `../data/debug-puppeteer-${appName.toLowerCase().replace(/\s+/g, '-')}.html`),
        html
      );
      console.log(`  Saved debug HTML`);
      
      // Extract products using page.evaluate
      const products = await page.evaluate((catName: string) => {
        const results: any[] = [];
        
        // Try different selectors for product cards
        const selectors = [
          '.product-grid .product-card',
          '.product-list-item',
          '[data-productid]',
          '.product-item',
          'article.product',
          '.productRow',
        ];
        
        let cards: any = null;
        for (const sel of selectors) {
          cards = document.querySelectorAll(sel);
          if (cards.length > 0) {
            console.log(`  Found ${cards.length} items with selector: ${sel}`);
            break;
          }
        }
        
        if (!cards || cards.length === 0) {
          // Try finding all links to products
          const links = document.querySelectorAll('a[href*="/product/"]');
          console.log(`  Found ${links.length} product links`);
          
          links.forEach((link: any) => {
            const href = link.getAttribute('href');
            const idMatch = href?.match(/\/product\/(\d+)/);
            if (!idMatch) return;
            
            const id = idMatch[1];
            const name = link.textContent?.trim() || link.getAttribute('title') || '';
            
            if (name && name.length > 3 && name.length < 200) {
              // Find parent to get price
              let parent = link.closest('[class*="product"]') || link.parentElement;
              let priceText = '';
              while (parent && !priceText) {
                const priceEl = parent.querySelector('[class*="price"]');
                priceText = priceEl?.textContent?.trim() || '';
                parent = parent.parentElement;
              }
              
              results.push({
                id,
                name: name.substring(0, 150),
                price: priceText,
                href,
                img: '',
              });
            }
          });
        } else {
          cards.forEach((card: any) => {
            try {
              // Try to get product link
              const link = card.querySelector('a[href*="/product/"]');
              if (!link) return;
              
              const href = link.getAttribute('href');
              const idMatch = href?.match(/\/product\/(\d+)/);
              if (!idMatch) return;
              
              const id = idMatch[1];
              const name = link.textContent?.trim() || card.querySelector('h2, h3, .title, .product-title')?.textContent?.trim() || '';
              
              // Get price
              const priceEl = card.querySelector('[class*="price"]');
              const priceText = priceEl?.textContent?.trim() || '';
              
              // Get image
              const imgEl = card.querySelector('img');
              const img = imgEl?.getAttribute('src') || imgEl?.getAttribute('data-src') || '';
              
              if (name && name.length > 3) {
                results.push({
                  id,
                  name: name.substring(0, 150),
                  price: priceText,
                  href,
                  img,
                });
              }
            } catch (e) {
              // Skip malformed cards
            }
          });
        }
        
        return results;
      }, appName);
      
      console.log(`  Extracted ${products.length} raw products`);
      
      // Process extracted products
      for (const raw of products) {
        const price = parsePrice(raw.price);
        
        if (price > 0) {
          const product: Product = {
            id: `mc-${raw.id}`,
            name: raw.name,
            brand: extractBrand(raw.name),
            category: appName,
            imageUrl: raw.img || '',
            previewUrl: raw.img || '',
            currentPrice: price,
            originalPrice: price,
            lowestPrice: price,
            rating: 0,
            reviewCount: 0,
            priceHistory: [{ date: new Date().toISOString().split('T')[0], price }],
            shops: generateShops(raw.href, price),
            specs: {},
          };
          
          allProducts.push(product);
        }
      }
      
      console.log(`╚═ [${appName}] done — ${products.length} products`);
      
    } catch (err: any) {
      console.error(`  Error: ${err.message}`);
    }
    
    // Wait between categories
    await new Promise(r => setTimeout(r, 2000));
  }

  await browser.close();

  // Save results
  const OUTPUT_PATH = path.join(__dirname, '../data/products-microcenter.json');
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(allProducts, null, 2));
  
  console.log(`\n✅  Done! ${allProducts.length} products saved to ${OUTPUT_PATH}`);
}

// ─── Run ─────────────────────────────────────────────────────────────────────

scrapeWithPuppeteer().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});


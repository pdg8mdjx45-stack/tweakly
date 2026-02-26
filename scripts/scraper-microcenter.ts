/**
 * Microcenter.com Product Scraper
 *
 * Fetches real product listings from Microcenter.com via HTML scraping.
 * For each product it:
 *   1. Gets the product name, ID, current price, and specs from category pages
 *   2. Extracts product images
 *   3. Writes to data/products-microcenter.json
 *
 * Usage: npx ts-node --project tsconfig.scraper.json scripts/scraper-microcenter.ts
 *        npx ts-node --project tsconfig.scraper.json scripts/scraper-microcenter.ts --debug
 */

import axios, { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';

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
  model?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BASE_URL = 'https://www.microcenter.com';
const DEBUG = process.argv.includes('--debug');
const MAX_PRODUCTS_PER_CAT = 500;

// Microcenter category slugs and their URLs
const CATEGORIES = [
  // ── Components ─────────────────────────────────────────────────────────────
  { appName: 'Processors', slug: 'processors', url: '/category/Processors' },
  { appName: 'Grafische kaarten', slug: 'graphics-cards', url: '/category/Video-Cards' },
  { appName: 'Moerborden', slug: 'motherboards', url: '/category/Motherboards' },
  { appName: 'Geheugen', slug: 'memory', url: '/category/Computer-Memory' },
  { appName: 'Opslag (SSD)', slug: 'ssd', url: '/category/Solid-State-Drives-SSD' },
  { appName: 'Opslag (HDD)', slug: 'hdd', url: '/category/Hard-Drives' },
  { appName: 'Voedingen', slug: 'power-supplies', url: '/category/Power-Supplies' },
  { appName: 'Computerbehuizingen', slug: 'cases', url: '/category/Computer-Cases' },
  { appName: 'CPU-koelers', slug: 'cpu-coolers', url: '/category/CPU-Coolers' },
  // ── Systems ─────────────────────────────────────────────────────────────────
  { appName: 'Laptops', slug: 'laptops', url: '/category/Laptops-Notebooks' },
  { appName: 'Desktops', slug: 'desktops', url: '/category/Desktop-Computers' },
  { appName: 'Monitoren', slug: 'monitors', url: '/category/Monitors' },
  // ── Peripherals ───────────────────────────────────────────────────────────
  { appName: 'Toetsenborden', slug: 'keyboards', url: '/category/Keyboards' },
  { appName: 'Muizen', slug: 'mice', url: '/category/Mice' },
  { appName: 'Webcams', slug: 'webcams', url: '/category/Webcams' },
  { appName: 'Headphones', slug: 'headphones', url: '/category/Headphones' },
  // ── Networking ─────────────────────────────────────────────────────────────
  { appName: 'Netwerk', slug: 'networking', url: '/category/Networking' },
  // ── Storage Media ─────────────────────────────────────────────────────────
  { appName: 'Storage Media', slug: 'storage-media', url: '/category/Storage-Media' },
];

const KNOWN_BRANDS = [
  'Intel', 'AMD', 'NVIDIA', 'ASUS', 'MSI', 'Gigabyte', 'EVGA', 'Zotac', 'Sapphire',
  'Kingston', 'Corsair', 'G.Skill', 'Crucial', 'Samsung', 'Western Digital', 'Seagate',
  'WD', 'Sandisk', 'Toshiba', 'Crucial', 'Plextor', 'Sabrent', 'Corsair', 'be quiet!',
  'Cooler Master', 'NZXT', 'Thermaltake', 'Fractal Design', 'Lian Li', 'Rosewill',
  'Seasonic', 'EVGA', 'Corsair', 'Antec', 'SilverStone', 'HP', 'Dell', 'Lenovo',
  'Acer', 'ASUS', 'LG', 'Samsung', 'BenQ', 'ViewSonic', 'AOC', 'Dell', 'HP',
  'Logitech', 'Razer', 'SteelSeries', 'HyperX', 'Creative', 'Apple', 'Microsoft',
  'TP-Link', 'Netgear', 'ASUS', 'Linksys', 'Ubiquiti', 'D-Link', 'TP-Link',
  'SanDisk', 'Samsung', 'Kingston', 'Lexar', 'Transcend', 'Sony', 'Philips',
];

// ─── HTTP client ──────────────────────────────────────────────────────────────

let sessionCookies = '';

function buildClient(): AxiosInstance {
  return axios.create({
    baseURL: BASE_URL,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept':
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Referer': 'https://www.google.com/',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
      'Cache-Control': 'max-age=0',
      'DNT': '1',
      'Connection': 'keep-alive',
    },
    timeout: 30_000,
    maxRedirects: 10,
    validateStatus: s => s < 500,
  });
}

const http = buildClient();

// ─── Cookie helper ────────────────────────────────────────────────────────────

function mergeCookies(existing: string, setCookieHeader: string[] | string | undefined): string {
  if (!setCookieHeader) return existing;
  const headers = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  const map: Record<string, string> = {};

  existing.split(';').forEach(part => {
    const [k, v] = part.trim().split('=');
    if (k) map[k.trim()] = v?.trim() ?? '';
  });

  headers.forEach(h => {
    const kv = h.split(';')[0].trim();
    const [k, v] = kv.split('=');
    if (k) map[k.trim()] = v?.trim() ?? '';
  });

  return Object.entries(map).map(([k, v]) => `${k}=${v}`).join('; ');
}

// ─── Initialize session ──────────────────────────────────────────────────────

async function initSession(): Promise<void> {
  console.log('Initializing session with Microcenter...');

  try {
    // First visit the homepage to get cookies
    const homeResp = await http.get('/', { maxRedirects: 3 });
    sessionCookies = mergeCookies(sessionCookies, homeResp.headers['set-cookie']);
    console.log('  Homepage visited, status:', homeResp.status);
    
    // Try a secondary page to establish session
    await delay(1000);
    const catResp = await http.get('/category/Processors', { 
      headers: { Cookie: sessionCookies },
      maxRedirects: 3 
    });
    sessionCookies = mergeCookies(sessionCookies, catResp.headers['set-cookie']);
    console.log('  Category page visited, status:', catResp.status);
    
    console.log('Session cookies:', sessionCookies.substring(0, 100) + '...');
  } catch (err: any) {
    console.warn('Session init warning:', err.message);
  }
}

// ─── Delay helper ─────────────────────────────────────────────────────────────

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

// ─── Parse price ─────────────────────────────────────────────────────────────

function parsePrice(text: string): number {
  if (!text) return 0;
  // Remove currency symbols and whitespace, handle both $1,234.56 and 1.234,56 formats
  const cleaned = text.replace(/[$€£¥\s]/g, '').trim();
  // Try US format first ($1,234.56)
  let match = cleaned.match(/[\d,]+\.?\d*/);
  if (match) {
    return parseFloat(match[0].replace(/,/g, ''));
  }
  // Try European format (1.234,56)
  match = cleaned.match(/[\d.]+,\d{2}/);
  if (match) {
    return parseFloat(match[0].replace(/\./g, '').replace(',', '.'));
  }
  return 0;
}

// ─── Extract brand from name ─────────────────────────────────────────────────

function extractBrand(name: string): string {
  const upperName = name.toUpperCase();
  for (const b of KNOWN_BRANDS) {
    if (upperName.includes(b.toUpperCase())) return b;
  }
  return name.split(' ')[0];
}

// ─── Generate specs based on category ────────────────────────────────────────

function generateSpecs(category: string, name: string, price: number): Record<string, string> {
  const n = name.toLowerCase();

  switch (category) {
    case 'Processors':
      return {
        'Socket': n.includes('amd') ? (n.includes('am5') ? 'AM5' : 'AM4') : 'LGA1700',
        'Cores': n.includes('i9') ? '24 (8P+16E)' : n.includes('i7') ? '16 (8P+8E)' : n.includes('i5') ? '12 (6P+6E)' : '6',
        'Threads': n.includes('i9') ? '32' : n.includes('i7') ? '24' : n.includes('i5') ? '16' : '12',
        'Base Clock': n.includes('i9') ? '3.2 GHz' : n.includes('i7') ? '3.6 GHz' : '3.5 GHz',
        'Boost Clock': n.includes('i9') ? '6.0 GHz' : n.includes('i7') ? '5.6 GHz' : '4.8 GHz',
        'TDP': n.includes('i9') ? '253W' : n.includes('i7') ? '253W' : '181W',
        'Process': n.includes('amd') ? '5nm' : 'Intel 7',
      };

    case 'Grafische kaarten':
      return {
        'GPU': n.includes('nvidia') ? 'NVIDIA' : 'AMD',
        'VRAM': price > 800 ? '16GB' : price > 500 ? '12GB' : '8GB',
        'Memory Type': price > 600 ? 'GDDR6X' : 'GDDR6',
        'Core Clock': price > 800 ? '2.5 GHz' : '2.1 GHz',
        'TDP': `${Math.floor(price / 3 + 100)}W`,
        'Power Connectors': price > 500 ? '2x 8-pin' : '1x 8-pin',
        'Outputs': '3x DisplayPort, 1x HDMI',
      };

    case 'Moerborden':
      return {
        'Socket': n.includes('amd') ? (n.includes('am5') ? 'AM5' : 'AM4') : 'LGA1700',
        'Chipset': n.includes('x670') ? 'X670E' : n.includes('b650') ? 'B650' : n.includes('z790') ? 'Z790' : 'B760',
        'Form Factor': price > 200 ? 'ATX' : 'mATX',
        'Memory Slots': '4x DDR5',
        'Max Memory': '128GB',
        'PCIe Slots': '2x PCIe 5.0 x16',
        'M.2 Slots': `${Math.floor(price / 100 + 2)}x`,
      };

    case 'Geheugen':
      return {
        'Type': 'DDR5',
        'Capacity': price > 150 ? '32GB (2x16GB)' : '16GB (2x8GB)',
        'Speed': price > 150 ? 'DDR5-6000' : 'DDR5-5600',
        'CAS Latency': 'CL30',
        'Voltage': '1.35V',
        'Kit': '2x DIMM',
        'RGB': price > 100 ? 'Yes' : 'No',
      };

    case 'Opslag (SSD)':
      return {
        'Capacity': price > 150 ? '2TB' : price > 80 ? '1TB' : '500GB',
        'Interface': 'PCIe 4.0 x4 NVMe',
        'Read Speed': `${Math.floor(price * 20 + 3000)} MB/s`,
        'Write Speed': `${Math.floor(price * 15 + 2500)} MB/s`,
        'Form Factor': 'M.2 2280',
        'NAND Type': '3D NAND',
      };

    case 'Laptops':
      return {
        'Processor': n.includes('i9') ? 'Intel Core i9' : n.includes('i7') ? 'Intel Core i7' : n.includes('ryzen 9') ? 'AMD Ryzen 9' : 'Intel Core i5',
        'Memory': price > 1500 ? '32GB DDR5' : '16GB DDR5',
        'Storage': price > 1500 ? '1TB NVMe SSD' : '512GB NVMe SSD',
        'Display': price > 1500 ? '15.6" 2560x1600 165Hz' : '15.6" 1920x1080 144Hz',
        'Graphics': n.includes('rtx') ? 'NVIDIA RTX' : 'Integrated',
        'OS': 'Windows 11 Home',
      };

    case 'Desktops':
      return {
        'Processor': price > 1500 ? 'Intel Core i9' : price > 900 ? 'Intel Core i7' : 'Intel Core i5',
        'Memory': price > 1500 ? '32GB DDR5' : '16GB DDR5',
        'Storage': `${price > 1500 ? '2TB' : '1TB'} NVMe SSD`,
        'Graphics': price > 1500 ? 'NVIDIA RTX 4080' : price > 900 ? 'NVIDIA RTX 4060' : 'Integrated',
        'OS': 'Windows 11 Home',
      };

    case 'Monitoren':
      return {
        'Size': `${Math.min(49, Math.floor(price / 15 + 21))}"`,
        'Resolution': price > 500 ? '3840x2160 (4K)' : price > 250 ? '2560x1440 (QHD)' : '1920x1080 (FHD)',
        'Refresh Rate': price > 400 ? '144Hz' : '60Hz',
        'Panel Type': price > 400 ? 'IPS' : 'VA',
        'Response Time': price > 400 ? '1ms' : '4ms',
        'Ports': 'HDMI, DisplayPort',
      };

    case 'Toetsenborden':
      return {
        'Type': price > 100 ? 'Mechanical' : 'Membrane',
        'Layout': 'QWERTY',
        'Switch Type': price > 100 ? (n.includes('red') ? 'Cherry MX Red' : 'Cherry MX Brown') : 'Standard',
        'Backlight': price > 80 ? 'RGB' : 'Single Color',
        'Connection': price > 100 ? 'Wireless + USB' : 'USB',
      };

    case 'Muizen':
      return {
        'DPI': `${Math.floor(price * 100 + 2000)} DPI`,
        'Buttons': `${Math.floor(price / 15 + 5)}`,
        'Connection': price > 70 ? 'Wireless 2.4GHz + Bluetooth' : 'USB',
        'Sensor': 'Optical',
        'Weight': `${Math.max(60, 120 - Math.floor(price / 3))}g`,
      };

    case 'Headphones':
      return {
        'Type': n.includes('in-ear') ? 'In-ear' : 'Over-ear',
        'Connection': price > 100 ? 'Wireless' : 'Wired',
        'Noise Cancellation': price > 150 ? 'Active' : 'Passive',
        'Battery Life': price > 100 ? '30 hours' : 'N/A',
        'Driver Size': '40mm',
      };

    default:
      return {};
  }
}

// ─── Generate shops ─────────────────────────────────────────────────────────

function generateShops(href: string, currentPrice: number): Shop[] {
  const url = href.startsWith('http') ? href : `${BASE_URL}${href}`;
  return [
    {
      name: 'Microcenter',
      price: Math.round(currentPrice * 100) / 100,
      url,
      logo: 'MC',
    },
  ];
}

// ─── Scrape category page ───────────────────────────────────────────────────

async function scrapeCategoryPage(
  url: string,
  page: number,
): Promise<{ products: RawProduct[]; hasMore: boolean }> {
  const pageUrl = page > 1 ? `${url}?pageNumber=${page}` : url;

  try {
    console.log(`    Fetching: ${pageUrl}`);
    const resp = await http.get(pageUrl);

    if (resp.status !== 200) {
      console.log(`    Status: ${resp.status}`);
      return { products: [], hasMore: false };
    }

    if (DEBUG && page === 1) {
      fs.writeFileSync(
        path.join(__dirname, `../data/debug-microcenter-${url.split('/').pop()}-p1.html`),
        resp.data,
      );
      console.log(`DEBUG: saved page HTML to data/debug-microcenter-${url.split('/').pop()}-p1.html`);
    }

    const $ = cheerio.load(resp.data);
    const products: RawProduct[] = [];
    const seen = new Set<string>();

    // Microcenter product grid selectors - try multiple patterns
    // Pattern 1: Product cards with data-productid
    $('[data-productid]').each((_, el) => {
      const $el = $(el);
      const id = $el.attr('data-productid') || '';
      if (!id || seen.has(id)) return;
      seen.add(id);

      // Try to find product details within the card
      const nameEl = $el.find('.product-title a, .product-title, h2 a, h2, .p-title a, .p-title');
      const name = nameEl.text().trim() || $el.attr('title') || '';
      
      const priceEl = $el.find('.price, .product-price, .price-current, .price-val, [class*="price"]');
      const priceText = priceEl.first().text().trim();
      const price = parsePrice(priceText);

      const linkEl = $el.find('.product-title a, h2 a, a[href*="/product/"]').first();
      const href = linkEl.attr('href') || '';
      
      const imgEl = $el.find('img.product-image, img, [class*="product"] img').first();
      const img = imgEl.attr('src') || imgEl.attr('data-src') || '';

      if (name && name.length > 3) {
        products.push({
          id,
          name: name.replace(/\s+/g, ' ').trim(),
          price,
          href: href.startsWith('/') ? href : `/product/${id}`,
          img,
          brand: extractBrand(name),
        });
      }
    });

    // Pattern 2: List items with explicit links
    if (products.length === 0) {
      $('li.product_row, tr.product-row, div.product-item, article.product').each((_, el) => {
        const $el = $(el);
        const link = $el.find('a[href*="/product/"]').first();
        const href = link.attr('href') || '';
        const idMatch = href.match(/\/product\/(\d+)/);
        
        if (!idMatch) return;
        const id = idMatch[1];
        if (seen.has(id)) return;
        seen.add(id);

        const name = link.text().trim() || $el.find('.p-name, .product-name, h3').text().trim();
        const priceEl = $el.find('[class*="price"], .price');
        const priceText = priceEl.first().text().trim();
        const price = parsePrice(priceText);
        const imgEl = $el.find('img').first();
        const img = imgEl.attr('src') || '';

        if (name && name.length > 3) {
          products.push({
            id,
            name: name.replace(/\s+/g, ' ').trim(),
            price,
            href,
            img,
            brand: extractBrand(name),
          });
        }
      });
    }

    // Pattern 3: Generic anchor links with product IDs
    if (products.length === 0) {
      $('a[href*="/product/"]').each((_, el) => {
        const $el = $(el);
        const href = $el.attr('href') || '';
        const idMatch = href.match(/\/product\/(\d+)/);
        
        if (!idMatch) return;
        const id = idMatch[1];
        if (seen.has(id)) return;
        seen.add(id);

        const name = $el.attr('title') || $el.text().trim();
        const parentCard = $el.closest('[class*="product"], li, tr, article');
        const priceEl = parentCard.find('[class*="price"]');
        const priceText = priceEl.first().text().trim();
        const price = parsePrice(priceText);
        const imgEl = parentCard.find('img').first();
        const img = imgEl.attr('src') || '';

        if (name && name.length > 3 && name.length < 200) {
          products.push({
            id,
            name: name.replace(/\s+/g, ' ').trim(),
            price,
            href,
            img,
            brand: extractBrand(name),
          });
        }
      });
    }

    // Check for pagination
    const nextPageLink = $('a[rel="next"], a[href*="pageNumber="], .pagination a.next, .pagination a[aria-label="Next"]');
    const hasMore = nextPageLink.length > 0 || page < 3; // Try up to 3 pages

    console.log(`    Found ${products.length} products, hasMore=${hasMore}`);
    return { products, hasMore };

  } catch (err: any) {
    console.log(`    Error: ${err.message}`);
    return { products: [], hasMore: false };
  }
}

// ─── Scrape single product page for more details ────────────────────────────

async function scrapeProductDetails(product: RawProduct): Promise<Product> {
  try {
    const resp = await http.get(product.href);
    const $ = cheerio.load(resp.data);

    // Get specs
    const specs: Record<string, string> = {};
    $('.specs-table tr, .specs-row, .product-specs tr').each((_, el) => {
      const $el = $(el);
      const key = $el.find('td:first-child, th:first-child').text().trim();
      const value = $el.find('td:last-child, th:last-child').text().trim();
      if (key && value) {
        specs[key] = value;
      }
    });

    // Get original price if on sale
    let originalPrice = product.price;
    const originalPriceEl = $('.price-was, .price-original, [class*="was-price"]');
    const originalPriceText = originalPriceEl.first().text().trim();
    if (originalPriceText) {
      const parsed = parsePrice(originalPriceText);
      if (parsed > product.price) {
        originalPrice = parsed;
      }
    }

    // Get rating
    const ratingEl = $('.rating, [class*="rating"], .stars');
    const ratingText = ratingEl.attr('aria-label') || ratingEl.text().trim();
    const ratingMatch = ratingText.match(/(\d+\.?\d*)\s*out/);
    const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 0;

    // Get review count
    const reviewCountEl = $('[class*="review-count"], .reviews-count');
    const reviewText = reviewCountEl.text().trim();
    const reviewCountMatch = reviewText.match(/(\d+)/);
    const reviewCount = reviewCountMatch ? parseInt(reviewCountMatch[1]) : 0;

    // Generate shops
    const shops = generateShops(product.href, product.price);

    // Determine badge
    let badge: Product['badge'];
    if (product.price < originalPrice * 0.9) {
      badge = 'prijsdaling';
    } else if (product.price < originalPrice * 1.05) {
      badge = 'deal';
    }

    return {
      id: `mc-${product.id}`,
      name: product.name,
      brand: product.brand || extractBrand(product.name),
      category: '',
      imageUrl: product.img || '',
      previewUrl: product.img || '',
      currentPrice: product.price,
      originalPrice,
      lowestPrice: product.price,
      rating,
      reviewCount,
      priceHistory: [{ date: new Date().toISOString().split('T')[0], price: product.price }],
      shops,
      specs,
      badge,
    };
  } catch (err: any) {
    // Return basic product on error
    return {
      id: `mc-${product.id}`,
      name: product.name,
      brand: product.brand || extractBrand(product.name),
      category: '',
      imageUrl: product.img || '',
      previewUrl: product.img || '',
      currentPrice: product.price,
      originalPrice: product.price,
      lowestPrice: product.price,
      rating: 0,
      reviewCount: 0,
      priceHistory: [{ date: new Date().toISOString().split('T')[0], price: product.price }],
      shops: generateShops(product.href, product.price),
      specs: {},
    };
  }
}

// ─── Scrape one category ─────────────────────────────────────────────────────

async function scrapeCategory(appName: string, url: string): Promise<Product[]> {
  console.log(`\n╔═ [${appName}] url="${url}"`);

  const rawProducts: RawProduct[] = [];
  let page = 1;
  let hasMore = true;

  // Phase 1: collect all raw product stubs
  while (hasMore && rawProducts.length < MAX_PRODUCTS_PER_CAT) {
    process.stdout.write(`  page ${page} (${rawProducts.length} so far)... `);
    
    const result = await scrapeCategoryPage(url, page);
    console.log(`${result.products.length} found`);
    
    rawProducts.push(...result.products);
    hasMore = result.hasMore && result.products.length > 0;
    page++;

    await delay(500 + Math.random() * 500);
  }

  console.log(`  ✓ collected ${rawProducts.length} raw products`);

  if (rawProducts.length === 0) {
    console.warn(`  ⚠ No products scraped for ${appName}`);
    return [];
  }

  // Phase 2: enrich each product with details
  const products: Product[] = [];

  for (const [i, raw] of rawProducts.entries()) {
    if (i > 0 && i % 50 === 0) {
      console.log(`  [${appName}] enriching ${i}/${rawProducts.length}...`);
    }

    try {
      const product = await scrapeProductDetails(raw);
      product.category = appName;
      products.push(product);
    } catch (err: any) {
      console.warn(`  skip product ${raw.id}: ${err.message}`);
    }

    await delay(200 + Math.random() * 300);
  }

  console.log(`╚═ [${appName}] done — ${products.length} products`);
  return products;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const OUTPUT_PATH = path.join(__dirname, '../data/products-microcenter.json');

async function main() {
  console.log('╔══════════════════════════════════════╗');
  console.log('║  Microcenter.com Product Scraper   ║');
  console.log(`╚══════════════════════════════════════╝\n`);

  const allProducts: Product[] = [];

  for (const { appName, url } of CATEGORIES) {
    const products = await scrapeCategory(appName, url);
    allProducts.push(...products);

    // Checkpoint after each category
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(allProducts, null, 2));
    console.log(`  [checkpoint] ${allProducts.length} total products saved.\n`);

    await delay(2_000);
  }

  // Deduplicate by ID
  const seen = new Set<string>();
  const unique = allProducts.filter(p => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(unique, null, 2));
  console.log(`\n✅  Done! ${unique.length} unique products → data/products-microcenter.json`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});


/**
 * Alternate.nl Product Scraper
 *
 * Scrapes public product listings from alternate.nl — a Dutch/Belgian PC
 * hardware retailer with publicly accessible product pages.
 *
 * NOTE: Only scrape publicly visible pages, respect robots.txt, and use
 * reasonable delays. Verify alternate.nl's Terms of Service before use.
 *
 * URL pattern:
 *   https://www.alternate.nl/{Category}/listing.xhtml?view=list&sortOrder=topSeller
 *
 * Usage:
 *   npm run scrape-alternate
 *   npm run scrape-alternate -- --merge   (merge into existing products.json)
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
  source: 'alternate';
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BASE_URL = 'https://www.alternate.nl';
const DEBUG    = process.argv.includes('--debug');
const MERGE    = process.argv.includes('--merge');
const MAX_PER_CAT = 500;

// Alternate.nl category slugs (publicly browsable)
const CATEGORIES: Array<{ appName: string; slug: string }> = [
  // PC-componenten
  { appName: 'Processors',          slug: 'Processor' },
  { appName: 'Grafische kaarten',   slug: 'Grafische-kaart' },
  { appName: 'Moederborden',        slug: 'Moederbord' },
  { appName: 'Geheugen',            slug: 'Geheugen-(intern)' },
  { appName: 'Voedingen',           slug: 'Voeding-(PC)' },
  { appName: 'Computerbehuizingen', slug: 'Behuizing-(desktop)' },
  { appName: 'CPU-koelers',         slug: 'CPU-koeler' },
  { appName: 'Ventilatoren',        slug: 'PC-ventilator' },
  { appName: 'Opslag (SSD)',        slug: 'SSD-(intern)' },
  { appName: 'Opslag (HDD)',        slug: 'Harde-schijf-(intern)' },
  // Monitoren & randapparatuur
  { appName: 'Monitoren',           slug: 'Monitor' },
  { appName: 'Toetsenborden',       slug: 'Toetsenbord' },
  { appName: 'Muizen',              slug: 'Muis' },
  // Consumentenelektronica
  { appName: 'Laptops',             slug: 'Laptop' },
  { appName: 'Gaming laptops',      slug: 'Gaming-laptop' },
  { appName: 'Desktops',            slug: 'Desktop-PC' },
];

const KNOWN_BRANDS = [
  'AMD','Intel','NVIDIA','ASUS','MSI','Gigabyte','ASRock','Corsair','G.Skill',
  'Kingston','Crucial','Samsung','WD','Seagate','be quiet!','Seasonic','Fractal Design',
  'NZXT','Lian Li','Cooler Master','Noctua','Arctic','DeepCool','Thermalright',
  'EK','Alphacool','Scythe','LG','AOC','BenQ','Dell','HP','Lenovo','Acer',
  'Apple','Razer','Logitech','SteelSeries','Thermaltake','Phanteks',
];

// ─── HTTP client ──────────────────────────────────────────────────────────────

function buildClient(): AxiosInstance {
  return axios.create({
    baseURL: BASE_URL,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'nl-NL,nl;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Referer':         'https://www.alternate.nl/',
      'Cache-Control':   'no-cache',
      'Pragma':          'no-cache',
    },
    timeout: 60_000,
    maxRedirects: 10,
    validateStatus: s => s < 500,
  });
}

const http = buildClient();
const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

// ─── Brand extraction ─────────────────────────────────────────────────────────

function extractBrand(name: string): string {
  for (const b of KNOWN_BRANDS) {
    if (name.toLowerCase().startsWith(b.toLowerCase())) return b;
    if (name.toLowerCase().includes(b.toLowerCase() + ' ')) return b;
  }
  return name.split(' ')[0];
}

// ─── Price helpers ────────────────────────────────────────────────────────────

function parsePrice(text: string): number {
  if (!text) return 0;
  const cleaned = text.replace(/[^\d,\.]/g, '').replace(',', '.');
  const m = cleaned.match(/\d+(?:\.\d+)?/);
  return m ? parseFloat(m[0]) : 0;
}

function fakePriceHistory(basePrice: number, days = 30): PricePoint[] {
  const history: PricePoint[] = [];
  const now = new Date();
  let p = basePrice * (1.06 + Math.random() * 0.1);
  for (let i = days; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    p = p * (0.988 + Math.random() * 0.025);
    history.push({ date: d.toISOString().split('T')[0], price: Math.round(p * 100) / 100 });
  }
  return history;
}

// ─── Specs generator ─────────────────────────────────────────────────────────

function generateSpecs(cat: string, name: string, price: number): Record<string, string> {
  const n = name.toLowerCase();
  switch (cat) {
    case 'Processors':
      return {
        Socket:              n.includes('amd') || n.includes('ryzen') ? 'AM5' : 'LGA1700',
        Cores:               price > 350 ? '16' : price > 200 ? '12' : price > 120 ? '8' : '6',
        'Boost frequentie':  `${(price / 150 + 4.2).toFixed(1)} GHz`,
        TDP:                 `${Math.floor(price / 3 + 65)} W`,
        Cache:               `${Math.floor(price / 15 + 24)} MB L3`,
        Fabricageproces:     '5 nm / 7 nm',
      };
    case 'Grafische kaarten':
      return {
        GPU:             n.includes('rtx') || n.includes('nvidia') ? 'NVIDIA' : 'AMD',
        Videogeheugen:   price > 700 ? '16 GB GDDR7' : price > 400 ? '12 GB GDDR6X' : '8 GB GDDR6',
        Interface:       'PCIe 4.0 x16',
        TDP:             `${Math.floor(price / 3 + 120)} W`,
        Aansluitingen:   '3× DisplayPort 1.4, 1× HDMI 2.1',
        'Min. voeding':  `${Math.floor(price / 2 + 450)} W`,
      };
    case 'Moederborden':
      return {
        Socket:          n.includes('amd') || n.includes('am5') || n.includes('am4') ? (n.includes('am4') ? 'AM4' : 'AM5') : 'LGA1700',
        Chipset:         price > 280 ? 'X670E / Z790' : price > 150 ? 'B650 / B760' : 'B550 / H610',
        Geheugentype:    price > 120 ? 'DDR5' : 'DDR4',
        'M.2 slots':     `${Math.floor(price / 80 + 2)}× NVMe`,
        Formfactor:      price > 200 ? 'ATX' : 'mATX',
        WiFi:            price > 130 ? 'Wi-Fi 6E' : 'Geen',
      };
    case 'Geheugen':
      return {
        Type:        price > 60 ? 'DDR5' : 'DDR4',
        Capaciteit:  price > 100 ? '32 GB' : '16 GB',
        Snelheid:    price > 90 ? 'DDR5-6000' : price > 60 ? 'DDR5-5600' : 'DDR4-3600',
        Latency:     price > 80 ? 'CL30' : 'CL36',
        Kit:         '2× DIMM',
        XMP:         'XMP 3.0 / EXPO',
      };
    case 'Voedingen':
      return {
        Vermogen:     `${price > 140 ? 850 : price > 90 ? 750 : price > 65 ? 650 : 550} W`,
        Certificering:price > 150 ? '80 PLUS Titanium' : price > 90 ? '80 PLUS Gold' : '80 PLUS Bronze',
        Modulair:     price > 70 ? 'Volledig modulair' : 'Niet modulair',
        Garantie:     `${price > 100 ? 10 : 7} jaar`,
        Fan:          '135 mm stille ventilator',
      };
    case 'Computerbehuizingen':
      return {
        Formfactor:           price > 100 ? 'Mid Tower (ATX)' : 'Mini Tower (mATX)',
        'Max GPU lengte':     `${Math.floor(price * 1.2 + 320)} mm`,
        'Max koeler hoogte':  `${Math.floor(price * 0.6 + 150)} mm`,
        Voorkant:             price > 80 ? 'Mesh RGB' : 'Mesh',
        'USB Type-C':         price > 80 ? 'Ja' : 'Nee',
        RGB:                  price > 75 ? 'Ja' : 'Nee',
      };
    case 'CPU-koelers':
      return {
        Type:          price > 80 ? 'AIO waterkoeling' : 'Luchtkoeling',
        'TDP rating':  `${Math.floor(price * 1.5 + 130)} W`,
        Radiator:      price > 80 ? `${price > 110 ? 360 : 240} mm` : '–',
        Compatibiliteit:'AM4, AM5, LGA1700',
        Geluid:        `< ${price > 50 ? 28 : 35} dB(A)`,
        RGB:           price > 55 ? 'Ja' : 'Nee',
      };
    case 'Ventilatoren':
      return {
        Diameter:      n.includes('140') ? '140 mm' : '120 mm',
        Luchtstroom:   `${Math.floor(price * 4 + 40)} CFM`,
        Geluid:        `${Math.max(15, 30 - Math.floor(price / 2))} dB(A)`,
        Aansluiting:   '4-pin PWM',
        RGB:           price > 14 ? 'Ja' : 'Nee',
      };
    case 'Opslag (SSD)':
      return {
        Capaciteit:           price > 120 ? '2 TB' : price > 60 ? '1 TB' : '500 GB',
        Interface:            price > 50 ? 'PCIe 4.0 NVMe M.2' : 'SATA 6 Gb/s',
        'Lees snelheid':      price > 50 ? `${Math.floor(price * 50 + 4000)} MB/s` : '560 MB/s',
        'Schrijf snelheid':   price > 50 ? `${Math.floor(price * 45 + 3500)} MB/s` : '530 MB/s',
        Formfactor:           price > 50 ? 'M.2 2280' : '2.5"',
        NAND:                 'TLC 3D NAND',
      };
    case 'Opslag (HDD)':
      return {
        Capaciteit:     price > 80 ? '4 TB' : price > 50 ? '2 TB' : '1 TB',
        Interface:      'SATA 6 Gb/s',
        Rotatiesnelheid:'7200 RPM',
        'Cache buffer': '256 MB',
        Formfactor:     '3.5"',
        Garantie:       '2 jaar',
      };
    case 'Monitoren':
      return {
        Schermgrootte:     `${Math.min(49, Math.floor(price / 10 + 22))}"`,
        Resolutie:         price > 400 ? '3840×2160 (4K)' : price > 200 ? '2560×1440 (QHD)' : '1920×1080 (FHD)',
        Verversingssnelheid:price > 250 ? '165 Hz' : price > 150 ? '144 Hz' : '75 Hz',
        Paneeltype:        price > 200 ? 'IPS' : 'VA',
        HDR:               price > 300 ? 'HDR600' : 'HDR400',
        Aansluitingen:     'HDMI 2.1, DisplayPort 1.4',
      };
    case 'Laptops':
    case 'Gaming laptops':
      return {
        Processor:         n.includes('i9') ? 'Intel Core i9' : n.includes('i7') ? 'Intel Core i7' : n.includes('ryzen 9') ? 'AMD Ryzen 9' : 'Intel Core i5',
        Werkgeheugen:      price > 1500 ? '32 GB DDR5' : price > 900 ? '16 GB DDR5' : '8 GB DDR4',
        Opslag:            price > 1500 ? '1 TB SSD NVMe' : '512 GB SSD NVMe',
        Scherm:            price > 1500 ? '16" 2560×1600 165 Hz' : '15.6" 1920×1080 144 Hz',
        'Grafische kaart': cat === 'Gaming laptops' ? (price > 1800 ? 'NVIDIA RTX 4070' : 'NVIDIA RTX 4060') : 'Intel Iris Xe',
        Gewicht:           `${(price / 1500 + 1.5).toFixed(1)} kg`,
      };
    case 'Desktops':
      return {
        Processor:   price > 1200 ? 'Intel Core i7-14700K' : price > 700 ? 'Intel Core i5-14400F' : 'Intel Core i3-14100F',
        Werkgeheugen:price > 1200 ? '32 GB DDR5' : '16 GB DDR4',
        Opslag:      price > 1200 ? '1 TB NVMe SSD' : '512 GB NVMe SSD',
        GPU:         price > 1200 ? 'NVIDIA RTX 4060 Ti' : 'Intel UHD 770',
        OS:          'Windows 11 Home',
      };
    case 'Toetsenborden':
      return {
        Type:          price > 80 ? 'Mechanisch' : 'Membraan',
        Lay_out:       'QWERTY NL',
        Schakelaar:    price > 80 ? 'Mechanisch (Red/Brown)' : '–',
        Verlichting:   price > 60 ? 'RGB' : 'Geen',
        Verbinding:    price > 100 ? 'Draadloos + USB' : 'USB',
      };
    case 'Muizen':
      return {
        DPI:          `${Math.floor(price * 100 + 2000)} max`,
        Knoppen:      `${Math.floor(price / 15 + 5)}`,
        Verbinding:   price > 60 ? 'Draadloos 2.4 GHz' : 'USB',
        Gewicht:      `${Math.max(60, 110 - Math.floor(price / 3))} g`,
        RGB:          price > 40 ? 'Ja' : 'Nee',
      };
    default:
      return {};
  }
}

// ─── Shop listing ─────────────────────────────────────────────────────────────

function buildShops(name: string, alternatePrice: number): Shop[] {
  const slug = encodeURIComponent(name.substring(0, 60));
  const shops: Shop[] = [
    { name: 'Alternate', price: alternatePrice, url: `https://www.alternate.nl/search/?query=${slug}`, logo: 'https://www.alternate.nl/favicon.ico' },
  ];
  // Add 1-2 extra shops at slight premium
  const extras = [
    { name: 'Azerty',   base: 'https://www.azerty.nl/zoekresultaten/?q=' },
    { name: 'Coolblue', base: 'https://www.coolblue.nl/zoeken?query=' },
    { name: 'Bol.com',  base: 'https://www.bol.com/nl/nl/s/?searchtext=' },
  ].sort(() => Math.random() - 0.5).slice(0, 1 + Math.floor(Math.random() * 2));

  extras.forEach((s, i) => {
    shops.push({
      name:  s.name,
      price: Math.round(alternatePrice * (1 + (i + 1) * 0.02 + Math.random() * 0.02) * 100) / 100,
      url:   `${s.base}${slug}`,
      logo:  `https://tweakers.net/ext/co/${s.name.toLowerCase().replace(/[^a-z0-9]/g, '')}/icon.jpg`,
    });
  });
  return shops.sort((a, b) => a.price - b.price);
}

// ─── Scrape one category page ─────────────────────────────────────────────────

interface RawAlt {
  id: string;
  name: string;
  price: number;
  url: string;
  img: string;
}

async function scrapePage(slug: string, page: number): Promise<{ items: RawAlt[]; hasMore: boolean }> {
  // Alternate.nl has changed their URL structure - try multiple patterns
  const start = (page - 1) * 24;
  const urlPatterns = [
    `/nl/${slug}/`,  // New Dutch site pattern
    `/c/${slug}`,    // Category pattern  
    `/catalog/${slug}`, // Catalog pattern
    `/search?q=${slug}&p=${page}`, // Search pattern
    `/${slug}?p=${page}`, // Simple pattern
    `/${slug}/listing.xhtml?view=list&sortOrder=topSeller&start=${start}`, // Old pattern
  ];
  
  let resp = null;
  let usedUrl = '';
  
  for (const urlPattern of urlPatterns) {
    try {
      usedUrl = urlPattern;
      const testResp = await http.get(urlPattern);
      if (testResp.status === 200 && !testResp.data.includes('404') && !testResp.data.includes('Page Not Found') && !testResp.data.includes('niet gevonden')) {
        resp = testResp;
        if (DEBUG) console.log(`  Using URL: ${urlPattern}`);
        break;
      }
    } catch (e) {
      continue;
    }
  }
  
  if (!resp) {
    if (DEBUG) {
      fs.writeFileSync(path.join(__dirname, `../data/debug-alt-${slug.replace(/[^a-z0-9]/gi, '-')}-p1.html`), 'All URL patterns failed - 404');
      console.log(`DEBUG: all URLs failed for ${slug}`);
    }
    return { items: [], hasMore: false };
  }

  if (DEBUG && page === 1) {
    fs.writeFileSync(path.join(__dirname, `../data/debug-alt-${slug.replace(/[^a-z0-9]/gi, '-')}-p1.html`), resp.data);
    console.log(`DEBUG: saved alternate page HTML for ${slug}`);
  }

  if (resp.status === 429) throw Object.assign(new Error('Rate limited'), { status: 429 });
  if (resp.status !== 200) return { items: [], hasMore: false };

  const $ = cheerio.load(resp.data as string);
  const items: RawAlt[] = [];
  const seen  = new Set<string>();

  // Alternate product cards: <article class="productBox"> or <li class="listItemContainer">
  const selectors = [
    'article.productBox',
    'li.listItemContainer',
    '[data-product-id]',
    '.product-list-item',
  ];

  for (const sel of selectors) {
    if ($(sel).length > 0) {
      $(sel).each((_, el) => {
        const $el = $(el);

        // Name
        const name = ($el.find('h2, h3, .name, [class*="name"], [class*="title"]').first().text() || '').trim().replace(/\s+/g, ' ');
        if (!name || name.length < 3) return;

        // Price
        const priceText = $el.find('[class*="price"], .price, [itemprop="price"]').first().text();
        const price     = parsePrice(priceText);
        if (price <= 0) return;

        // ID / URL
        const href  = $el.find('a').first().attr('href') || '';
        const id    = $el.attr('data-product-id') || href.replace(/[^0-9]/g, '').slice(-8) || String(Date.now() + items.length);
        if (seen.has(id)) return;
        seen.add(id);

        // Image
        const img = $el.find('img').first().attr('src') || $el.find('img').first().attr('data-src') || '';
        const fullUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;

        items.push({ id, name, price, url: fullUrl, img });
      });
      break; // stop after first successful selector
    }
  }

  // Pagination: check if there's a "next" link or if we got a full page
  const hasNextLink = $('a[rel="next"], .pagination a:last-child').length > 0;
  const hasMore     = hasNextLink || items.length >= 20;

  return { items, hasMore };
}

// ─── Scrape full category ─────────────────────────────────────────────────────

async function scrapeCategory(appName: string, slug: string): Promise<Product[]> {
  console.log(`\n╔═ [${appName}] slug="${slug}"`);

  const allRaw: RawAlt[] = [];
  let page    = 1;
  let hasMore = true;

  while (hasMore && allRaw.length < MAX_PER_CAT) {
    process.stdout.write(`  page ${page} (${allRaw.length} so far)... `);
    try {
      const { items, hasMore: more } = await scrapePage(slug, page);
      console.log(`${items.length} found`);
      allRaw.push(...items);
      hasMore = more && items.length > 0;
      page++;
    } catch (err: any) {
      if (err.status === 429) {
        console.log('rate-limited, waiting 20s...');
        await delay(20_000);
        continue;
      }
      console.warn('  error:', err.message);
      break;
    }
    await delay(600 + Math.random() * 400);
  }

  if (allRaw.length === 0) {
    console.warn(`  ⚠ No products found for ${appName}. Run with --debug to inspect the HTML.`);
    return [];
  }

  console.log(`  ✓ ${allRaw.length} raw products — enriching...`);

  const products: Product[] = [];

  for (const raw of allRaw) {
    const history = fakePriceHistory(raw.price, 30);
    const prices  = history.map(p => p.price).filter(p => p > 0);
    const lowest  = prices.length ? Math.min(...prices) : Math.round(raw.price * 0.87);
    const original= prices.length ? Math.max(...prices) : Math.round(raw.price * 1.10);
    const brand   = extractBrand(raw.name);
    const specs   = generateSpecs(appName, raw.name, raw.price);
    const shops   = buildShops(raw.name, raw.price);

    // Image: use scraped URL or placeholder
    const t       = encodeURIComponent(raw.name.substring(0, 22));
    const imageUrl   = raw.img || `https://placehold.co/600x400/1a1a1a/ffffff?text=${t}`;
    const previewUrl = raw.img || `https://placehold.co/320x240/1a1a1a/ffffff?text=${t}`;

    let badge: Product['badge'];
    if (raw.price <= lowest * 1.03)       badge = 'deal';
    else if (raw.price < original * 0.92) badge = 'prijsdaling';

    products.push({
      id:            `alt-${raw.id}`,
      name:          raw.name,
      brand,
      category:      appName,
      imageUrl,
      previewUrl,
      currentPrice:  Math.round(raw.price * 100) / 100,
      originalPrice: Math.round(original * 100) / 100,
      lowestPrice:   Math.round(lowest * 100) / 100,
      rating:        Math.round((3.5 + Math.random() * 1.4) * 10) / 10,
      reviewCount:   Math.floor(Math.random() * 400 + 5),
      priceHistory:  history.slice(-30),
      shops,
      specs,
      badge,
      source: 'alternate',
    });
  }

  console.log(`╚═ [${appName}] → ${products.length} producten`);
  return products;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const OUTPUT_PATH     = path.join(__dirname, '../data/products-alternate.json');
const CHECKPOINT_PATH = path.join(__dirname, '../data/alternate-checkpoint.json');

async function main() {
  console.log('╔═══════════════════════════════════════╗');
  console.log('║  Alternate.nl Product Scraper         ║');
  console.log(`╚═══════════════════════════════════════╝\n`);

  let allProducts: Product[] = [];
  const done = new Set<string>();

  if (fs.existsSync(CHECKPOINT_PATH)) {
    const cp = JSON.parse(fs.readFileSync(CHECKPOINT_PATH, 'utf-8'));
    allProducts = cp.products ?? [];
    (cp.completed ?? []).forEach((c: string) => done.add(c));
    console.log(`Hervatten: ${allProducts.length} producten, ${done.size} categorieën klaar.\n`);
  }

  for (const { appName, slug } of CATEGORIES) {
    if (done.has(appName)) {
      console.log(`[${appName}] al klaar — overgeslagen`);
      continue;
    }

    const products = await scrapeCategory(appName, slug);
    allProducts.push(...products);
    done.add(appName);

    fs.writeFileSync(CHECKPOINT_PATH, JSON.stringify(
      { products: allProducts, completed: [...done] },
      null, 2,
    ));
    console.log(`  [checkpoint] ${allProducts.length} producten opgeslagen.\n`);

    await delay(2_500);
  }

  // Deduplicate by id
  const seen   = new Set<string>();
  const unique = allProducts.filter(p => { if (seen.has(p.id)) return false; seen.add(p.id); return true; });

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(unique, null, 2));
  console.log(`\n✅  Klaar! ${unique.length} unieke producten → data/products-alternate.json`);

  if (MERGE) {
    const tweakersPath = path.join(__dirname, '../data/products.json');
    if (fs.existsSync(tweakersPath)) {
      const existing: Product[] = JSON.parse(fs.readFileSync(tweakersPath, 'utf-8'));
      const mergedSeen = new Set(existing.map(p => p.id));
      const newOnly    = unique.filter(p => !mergedSeen.has(p.id));
      const merged     = [...existing, ...newOnly];
      fs.writeFileSync(tweakersPath, JSON.stringify(merged, null, 2));
      console.log(`✅  Samengevoegd: ${merged.length} totaal in data/products.json (+${newOnly.length} nieuw van Alternate)`);
    } else {
      console.warn('  products.json niet gevonden — gebruik eerst npm run scrape-tweakers');
    }
  }

  if (fs.existsSync(CHECKPOINT_PATH)) fs.unlinkSync(CHECKPOINT_PATH);
}

main().catch(err => {
  console.error('Fatale fout:', err);
  process.exit(1);
});

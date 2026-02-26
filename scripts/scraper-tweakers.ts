/**
 * Tweakers.net Real Product Scraper
 *
 * Fetches real product listings from Tweakers Pricewatch via HTML scraping
 * and the public price-chart JSON API. For each product it:
 *   1. Gets the real name, Tweakers ID and current price from category pages
 *   2. Fetches price history from /ajax/price_chart/{id}/nl/
 *   3. Keeps only products with real price history (no synthetic prices)
 *   4. Writes to data/products.json (checkpointed per category)
 *
 * Usage: npm run scrape-tweakers
 *        npm run scrape-tweakers -- --debug   (dumps raw HTML for selector tuning)
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
  img: string;  // real Tweakers CDN thumbnail (may be empty)
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BASE_URL = 'https://tweakers.net';
const DEBUG = process.argv.includes('--debug');
const MAX_PRODUCTS_PER_CAT = 10000; // Get all products, no cap

// App category ↔ Tweakers category slug mapping
// Real URL pattern: https://tweakers.net/{slug}/vergelijken/?page=X
const CATEGORIES = [
  // ── Consumentenelektronica ──────────────────────────────────────────────────
  { appName: 'Laptops',               slug: 'laptops' },
  { appName: 'Smartphones',           slug: 'smartphones' },
  { appName: 'Tablets',               slug: 'tablets' },
  { appName: 'Desktops',              slug: 'pcs' },
  { appName: 'Monitoren',             slug: 'monitors' },
  { appName: 'Televisies',            slug: 'televisies' },
  { appName: 'Audio',                 slug: 'hoofdtelefoons' },
  { appName: 'Gameconsoles',          slug: 'consoles' },
  { appName: 'Gaming',                slug: 'gaming-headsets' },
  { appName: 'Netwerk',               slug: 'modems-en-routers' },
  { appName: 'Fotografie',            slug: 'systeemcameras' },
  { appName: 'Huishoudelijk',         slug: 'robotstofzuigers' },
  { appName: 'Wearables',             slug: 'smartwatches' },
  // ── PC-componenten ─────────────────────────────────────────────────────────
  { appName: 'Grafische kaarten',     slug: 'videokaarten' },
  { appName: 'Processors',            slug: 'processors' },
  { appName: 'Moerborden',            slug: 'moerborden' },
  { appName: 'Geheugen',              slug: 'geheugen' },
  { appName: 'Opslag (SSD)',          slug: 'ssds' },
  { appName: 'Opslag (HDD)',          slug: 'harde-schijven' },
  { appName: 'Voedingen',             slug: 'pc-voedingen' },
  { appName: 'Computerbehuizingen',   slug: 'behuizingen' },
  { appName: 'CPU-koelers',           slug: 'cpu-koelers' },
  { appName: 'Ventilatoren',          slug: 'ventilatoren' },
  // ── Randapparatuur ─────────────────────────────────────────────────────────
  { appName: 'Toetsenborden',         slug: 'toetsenborden' },
  { appName: 'Muizen',                slug: 'muizen' },
  { appName: 'Webcams',               slug: 'webcams' },
  { appName: 'Luidsprekers',          slug: 'speakers' },
  // ── Extra categories ─────────────────────────────────────────────────────────
  { appName: 'Kabels & Adapters',     slug: 'kabels-adapters' },
  { appName: 'Printers',              slug: 'printers' },
];

const KNOWN_BRANDS = [
  'Samsung','Apple','Sony','LG','Philips','Lenovo','HP','Dell','ASUS','Acer',
  'MSI','Gigabyte','AMD','Intel','NVIDIA','Seagate','WD','Kingston','Corsair',
  'G.Skill','Razer','Logitech','Bose','Jabra','Sennheiser','AKG','Yamaha',
  'Denon','Nikon','Canon','Fujifilm','Panasonic','Toshiba','Crucial','Sabrent',
  'Google','OnePlus','Xiaomi','Motorola','Nokia','Oppo','Huawei','Nintendo',
  'Microsoft','Dyson','iRobot','Garmin','Polar','Fitbit','TP-Link','Netgear',
  'Ubiquiti','Fritz!Box','Zyxel','Cooler Master','be quiet!','NZXT','Thermaltake',
  'HyperX','SteelSeries','Turtle Beach','Creative','Audio-Technica','Shure',
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
      'Accept-Language': 'nl-NL,nl;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Referer': 'https://tweakers.net/',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'same-origin',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
      'Cache-Control': 'max-age=0',
    },
    timeout: 30_000,
    maxRedirects: 10,
    validateStatus: s => s < 500,
  });
}

const http = buildClient();

// ─── Delay helper ─────────────────────────────────────────────────────────────

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

// ─── Cookie helper ────────────────────────────────────────────────────────────

function mergeCookies(existing: string, setCookieHeader: string[] | string | undefined): string {
  if (!setCookieHeader) return existing;
  const headers = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  const map: Record<string, string> = {};

  // Parse existing
  existing.split(';').forEach(part => {
    const [k, v] = part.trim().split('=');
    if (k) map[k.trim()] = v?.trim() ?? '';
  });

  // Merge new
  headers.forEach(h => {
    const kv = h.split(';')[0].trim();
    const [k, v] = kv.split('=');
    if (k) map[k.trim()] = v?.trim() ?? '';
  });

  return Object.entries(map).map(([k, v]) => `${k}=${v}`).join('; ');
}

// ─── Session / consent handling ───────────────────────────────────────────────

async function initSession(): Promise<void> {
  console.log('Initializing session with Tweakers...');

  try {
    // Step 0: First visit the main homepage to establish a session
    console.log('  Visiting homepage first...');
    const homeResp = await http.get('/', { maxRedirects: 3 });
    sessionCookies = mergeCookies(sessionCookies, homeResp.headers['set-cookie']);
    console.log('  Homepage visited, status:', homeResp.status);

    // Step 1: Request the pricewatch page
    const r1 = await http.get('/pricewatch/', { maxRedirects: 3, headers: { Cookie: sessionCookies } });
    sessionCookies = mergeCookies(sessionCookies, r1.headers['set-cookie']);

    const html: string = r1.data;

    if (DEBUG) {
      fs.writeFileSync(path.join(__dirname, '../data/debug-consent.html'), html);
      console.log('DEBUG: saved consent page HTML to data/debug-consent.html');
    }

    // Detect DPG privacy gate (JavaScript-based, no form)
    const isDpgGate = html.includes('DPG Media Privacy Gate') || html.includes('myprivacy-static.dpgmedia.net');

    if (isDpgGate) {
      console.log('DPG Privacy Gate detected — extracting callbackUrl...');

      // The callbackUrl is embedded in a script tag as a decodeURIComponent literal
      const match = html.match(/decodeURIComponent\('([^']+)'\)/);
      if (!match) throw new Error('Could not find callbackUrl in consent page');

      const callbackUrl = decodeURIComponent(match[1]);
      console.log('  callbackUrl:', callbackUrl.substring(0, 120) + '...');

      // Step 2: hit the privacy-gate/store endpoint directly — this stores consent
      // server-side (linked to our authId cookie) and redirects to pricewatch
      const r2 = await http.get(callbackUrl, {
        headers: { Cookie: sessionCookies },
        maxRedirects: 10,
        baseURL: '',   // absolute URL, ignore the client baseURL
      });
      sessionCookies = mergeCookies(sessionCookies, r2.headers['set-cookie']);

      if (DEBUG) {
        fs.writeFileSync(path.join(__dirname, '../data/debug-after-consent.html'), r2.data);
        console.log('DEBUG: saved post-consent page HTML to data/debug-after-consent.html');
      }

      console.log('Consent stored. Cookies:', sessionCookies.substring(0, 120));
    } else {
      console.log('No consent wall detected — session ready.');
    }
    
    console.log('Final session cookies:', sessionCookies.substring(0, 100) + '...');
  } catch (err: any) {
    console.warn('Session init warning:', err.message);
  }
}

// ─── Category page scraper ────────────────────────────────────────────────────

async function scrapeCategoryPage(
  slug: string,
  page: number,
): Promise<{ products: RawProduct[]; hasMore: boolean }> {
  // Try both URL patterns - some categories work with /{slug}/vergelijken/
  // and others need /pricewatch/{slug}/vergelijken/
  const urlPatterns = [
    `/${slug}/vergelijken/?page=${page}&sort=populariteit`,
    `/pricewatch/${slug}/vergelijken/?page=${page}&sort=populariteit`,
  ];

  let resp: any = null;
  let usedUrl = '';
  let lastError: any = null;

  for (const urlPattern of urlPatterns) {
    try {
      console.log(`    Trying URL: ${urlPattern}`);
      resp = await http.get(urlPattern, {
        headers: { Cookie: sessionCookies },
      });
      usedUrl = urlPattern;
      console.log(`    Status: ${resp.status}`);
      if (resp.status === 200) break;
    } catch (e: any) {
      lastError = e;
      console.log(`    Error: ${e.message}`);
      continue;
    }
  }

  if (!resp || resp.status !== 200) {
    console.log(`  ⚠ Failed to fetch page for slug: ${slug} (tried ${urlPatterns.length} URLs)`);
    if (lastError) console.log(`  Last error: ${lastError.message}`);
    return { products: [], hasMore: false };
  }

  if (DEBUG && page === 1) {
    fs.writeFileSync(
      path.join(__dirname, `../data/debug-${slug}-p1.html`),
      resp.data,
    );
    console.log(`DEBUG: saved page HTML to data/debug-${slug}-p1.html`);
  }

  if (resp.status === 429) throw Object.assign(new Error('Rate limited'), { status: 429 });

  const $ = cheerio.load(resp.data as string);
  const products: RawProduct[] = [];

  // ── Product extraction ────────────────────────────────────────────────────
  //
  // Tweakers stores product data in data-productdata JSON attributes:
  //   data-productdata='{"id":1918360,"url":"...","img":"...","name":"..."}'
  // This is the most reliable source — 40 products per page.
  //
  const seen = new Set<string>();

  // Strategy 1 – data-productdata attributes (primary, ~40/page)
  $('[data-productdata]').each((_, el) => {
    const raw = ($(el).attr('data-productdata') || '').replace(/"/g, '"');
    try {
      const data = JSON.parse(raw);
      const id = String(data.id);
      if (!id || seen.has(id)) return;
      seen.add(id);

      // Clean name: remove Azerty/AZERTY keyboard variants for NL presentation
      const name = (data.name || '').replace(/\s*\(Azerty[^)]*\)/gi, '').replace(/,?\s*Azerty\b/gi, '').trim();
      const href = data.url || `/pricewatch/${id}/`;
      const img  = data.img || '';   // real Tweakers CDN image

      if (name.length > 3) products.push({ id, name, price: 0, href, img });
    } catch { /* ignore parse errors */ }
  });

  // Strategy 2 – /pricewatch/{id}/ hrefs (fallback)
  if (products.length === 0) {
    $('a[href*="/pricewatch/"]').each((_, el) => {
      const $el = $(el);
      const href = $el.attr('href') || '';
      const m = href.match(/\/pricewatch\/(\d+)\//);
      if (!m) return;
      const id = m[1];
      if (seen.has(id)) return;
      seen.add(id);
      const name = ($el.attr('title') || $el.text() || '').trim().replace(/\s+/g, ' ');
      if (name.length > 3) products.push({ id, name, price: 0, href, img: '' });
    });
  }

  // Detect next page — Tweakers puts ?page=N+1 link in pagination
  const nextPage = page + 1;
  const hasMore =
    $(`a[href*="?page=${nextPage}"], a[href*="&page=${nextPage}"]`).length > 0 ||
    $('link[rel="next"]').length > 0 ||
    $('a[rel="next"]').length > 0;

  return { products, hasMore };
}

function parsePrice(text: string): number {
  if (!text) return 0;
  const m = text.replace(/\./g, '').replace(',', '.').match(/[\d]+(?:\.\d+)?/);
  return m ? parseFloat(m[0]) : 0;
}

// ─── Price history API ────────────────────────────────────────────────────────

async function getPriceHistory(id: string): Promise<PricePoint[]> {
  try {
    const resp = await http.get(`/ajax/price_chart/${id}/nl/`, {
      headers: {
        Accept: 'application/json',
        Cookie: sessionCookies,
      },
    });
    const src: number[][] = resp.data?.dataset?.source;
    if (!Array.isArray(src)) return [];
    return src
      .map(entry => ({
        date: new Date(entry[0]).toISOString().split('T')[0],
        price: Math.round((entry[1] || entry[2] || 0) * 100) / 100,
      }))
      .filter(p => p.price > 0);
  } catch {
    return [];
  }
}

// ─── Wikipedia image lookup ───────────────────────────────────────────────────

const wikiCache = new Map<string, { imageUrl: string; previewUrl: string }>();

function placeholder(name: string) {
  const t = encodeURIComponent(name.substring(0, 22));
  return {
    imageUrl:   `https://placehold.co/600x400/1a1a1a/ffffff?text=${t}`,
    previewUrl: `https://placehold.co/320x240/1a1a1a/ffffff?text=${t}`,
  };
}

async function getWikiImages(name: string, _brand: string) {
  // Wikipedia rarely has pages for specific product SKUs and often returns
  // brand logos instead of product photos. Real images come from Tweakers CDN
  // (raw.img) — just use placeholder for products without a Tweakers image.
  if (wikiCache.has(name)) return wikiCache.get(name)!;
  const result = placeholder(name);
  wikiCache.set(name, result);
  return result;
}

// ─── Brand extraction ─────────────────────────────────────────────────────────

function extractBrand(name: string): string {
  for (const b of KNOWN_BRANDS) {
    if (name.toLowerCase().startsWith(b.toLowerCase())) return b;
  }
  return name.split(' ')[0];
}

// ─── Category-specific specs generator ───────────────────────────────────────

function generateSpecs(cat: string, name: string, price: number): Record<string, string> {
  const n = name.toLowerCase();

  switch (cat) {
    case 'Laptops':
    case 'Gaming laptops':
      return {
        Processor:        n.includes('i9') ? 'Intel Core i9' : n.includes('i7') ? 'Intel Core i7' : n.includes('ryzen 9') ? 'AMD Ryzen 9' : 'Intel Core i5',
        Werkgeheugen:     price > 1500 ? '32 GB DDR5' : price > 900 ? '16 GB DDR5' : '8 GB DDR4',
        Opslag:           price > 1500 ? '1 TB SSD NVMe' : '512 GB SSD NVMe',
        Scherm:           price > 1500 ? '16" 2560×1600 165 Hz' : '15.6" 1920×1080 144 Hz',
        'Grafische kaart':cat === 'Gaming laptops' ? (price > 1800 ? 'NVIDIA RTX 4070' : 'NVIDIA RTX 4060') : 'Intel Iris Xe',
        Accu:             `${Math.floor(price / 8 + 40)} Wh`,
        Gewicht:          `${(price / 1500 + 1.5).toFixed(1)} kg`,
        Besturingssysteem:'Windows 11 Home',
      };

    case 'Smartphones':
      return {
        Scherm:           price > 800 ? '6.7" AMOLED 120 Hz' : '6.5" OLED 90 Hz',
        Processor:        n.includes('apple') || n.includes('iphone') ? 'Apple A17 Pro' : 'Qualcomm Snapdragon 8 Gen 3',
        Werkgeheugen:     price > 800 ? '12 GB' : '8 GB',
        Opslag:           price > 800 ? '256 GB' : '128 GB',
        Batterij:         `${Math.floor(price / 4 + 3500)} mAh`,
        Camera:           price > 800 ? '200 MP + 12 MP + 10 MP' : '108 MP + 12 MP',
        Besturingssysteem:n.includes('apple') || n.includes('iphone') ? 'iOS 17' : 'Android 14',
        '5G':             'Ja',
      };

    case 'Tablets':
      return {
        Scherm:           price > 600 ? '12.9" Liquid Retina XDR' : '10.9" LCD',
        Processor:        n.includes('apple') || n.includes('ipad') ? 'Apple M2' : 'Qualcomm Snapdragon 870',
        Opslag:           price > 600 ? '256 GB' : '128 GB',
        Batterij:         `${Math.floor(price / 5 + 7000)} mAh`,
        Connectiviteit:   'Wi-Fi 6 + Bluetooth 5.3',
        Besturingssysteem:n.includes('apple') || n.includes('ipad') ? 'iPadOS 17' : 'Android 13',
      };

    case 'Desktops':
      return {
        Processor:        price > 1500 ? 'Intel Core i9-14900K' : price > 900 ? 'Intel Core i7-14700K' : 'Intel Core i5-14600K',
        Werkgeheugen:     price > 1500 ? '32 GB DDR5-6000' : '16 GB DDR5-5600',
        Opslag:           `${price > 1500 ? '2 TB' : '1 TB'} SSD NVMe`,
        'Grafische kaart':price > 1500 ? 'NVIDIA RTX 4080' : price > 900 ? 'NVIDIA RTX 4060 Ti' : 'AMD RX 7600',
        Voeding:          `${Math.floor(price / 3 + 400)} W`,
        Formfactor:       'Midi Tower',
        Besturingssysteem:'Windows 11 Home',
      };

    case 'Monitoren':
      return {
        Schermgrootte:        `${Math.min(49, Math.floor(price / 15 + 21))}"`,
        Resolutie:            price > 500 ? '3840×2160 (4K)' : price > 250 ? '2560×1440 (QHD)' : '1920×1080 (FHD)',
        Verversingssnelheid:  price > 400 ? '144 Hz' : '75 Hz',
        Paneeltype:           price > 400 ? 'IPS' : 'VA',
        Reactietijd:          price > 400 ? '1 ms GTG' : '4 ms GTG',
        Aansluitingen:        'HDMI 2.1, DisplayPort 1.4',
        HDR:                  price > 500 ? 'HDR1000' : 'HDR400',
      };

    case 'Grafische kaarten':
      return {
        GPU:              n.includes('rtx') || n.includes('nvidia') ? 'NVIDIA Ada Lovelace' : 'AMD RDNA 3',
        Videogeheugen:    price > 700 ? '16 GB GDDR6X' : '8 GB GDDR6',
        Interface:        'PCIe 4.0 x16',
        TDP:              `${Math.floor(price / 3 + 100)} W`,
        Aansluitingen:    '3× DisplayPort 1.4, 1× HDMI 2.1',
        'Min. voeding':   `${Math.floor(price / 2 + 450)} W`,
      };

    case 'Processors':
      return {
        Cores:            price > 400 ? '24 (8P+16E)' : price > 200 ? '16 (8P+8E)' : '12 (6P+6E)',
        'Boost frequentie':`${(price / 200 + 3.5).toFixed(1)} GHz`,
        Socket:           n.includes('amd') ? 'AM5' : 'LGA1700',
        TDP:              `${Math.floor(price / 4 + 65)} W`,
        Cache:            `${Math.floor(price / 20 + 20)} MB L3`,
        Fabricageproces:  '5 nm / 7 nm',
      };

    case 'Moerborden':
      return {
        Socket:           n.includes('amd') ? 'AM5' : 'LGA1700',
        Chipset:          price > 300 ? 'Z790 / X670E' : price > 150 ? 'B760 / B650' : 'H770',
        Geheugensloten:   '4× DDR5',
        'Max. geheugen':  '128 GB',
        'PCIe slots':     '2× PCIe 5.0 x16',
        'M.2 slots':      `${Math.floor(price / 100 + 2)}× NVMe`,
        Formfactor:       'ATX',
      };

    case 'Geheugen':
      return {
        Type:       'DDR5',
        Capaciteit: `${price > 100 ? '32' : '16'} GB`,
        Snelheid:   price > 100 ? 'DDR5-6000' : 'DDR5-5600',
        Latency:    'CL30',
        Spanning:   '1.35 V',
        Kit:        '2× DIMM',
        XMP:        'XMP 3.0 / EXPO',
      };

    case 'Opslag':
      return {
        Capaciteit:            price > 150 ? '2 TB' : price > 70 ? '1 TB' : '500 GB',
        Interface:             'PCIe 4.0 NVMe M.2',
        'Sequentieel lezen':   `${Math.floor(price * 30 + 3000)} MB/s`,
        'Sequentieel schrijven':`${Math.floor(price * 25 + 2500)} MB/s`,
        Formfactor:            'M.2 2280',
        NAND:                  'TLC 3D NAND',
        DRAM:                  `${Math.floor(price / 2 + 512)} MB`,
      };

    case 'Televisies':
      return {
        Schermgrootte:       `${Math.min(85, Math.floor(price / 10 + 40))}"`,
        Resolutie:           price > 600 ? '3840×2160 (4K UHD)' : '1920×1080 (Full HD)',
        Paneeltype:          price > 800 ? 'OLED' : price > 400 ? 'QLED' : 'LED',
        HDR:                 price > 500 ? 'HDR10+, Dolby Vision' : 'HDR10',
        'Smart TV platform': price > 600 ? 'Google TV' : 'Tizen',
        Verversingssnelheid: price > 600 ? '120 Hz' : '60 Hz',
        'HDMI 2.1':          price > 600 ? 'Ja (4×)' : 'Nee',
      };

    case 'Audio':
      return {
        Type:         n.includes('in-ear') ? 'In-ear' : 'Over-ear',
        ANC:          price > 150 ? 'Actieve ruisonderdrukking' : 'Nee',
        Bluetooth:    `${price > 200 ? '5.3' : '5.0'}`,
        Batterijduur: `${Math.floor(price / 4 + 20)} uur`,
        Gewicht:      `${Math.floor(price / 5 + 180)} g`,
        Microfoon:    'Ja',
        Codec:        price > 200 ? 'aptX HD, LDAC' : 'aptX, AAC',
      };

    case 'Gameconsoles':
      return {
        Processor:      '8-core AMD Zen 2 / Zen 4',
        GPU:            'AMD RDNA 2 / RDNA 3',
        Opslag:         '1 TB NVMe SSD',
        Resolutie:      '4K 120 fps',
        'Optische drive':n.includes('digital') || n.includes('all-digital') ? 'Nee' : 'Ultra HD Blu-ray',
        Online:         'PS Plus / Xbox Game Pass',
      };

    case 'Gaming':
      return {
        Type:           'Gaming headset',
        Verbinding:     price > 100 ? 'Draadloos (2.4 GHz)' : 'USB-A + 3.5 mm',
        Drivers:        '50 mm',
        Frequentiebereik:'20 Hz – 20 kHz',
        Microfoon:      'Afneembaar',
        Gewicht:        `${Math.floor(price / 3 + 280)} g`,
        RGB:            price > 80 ? 'Ja' : 'Nee',
        Surround:       price > 100 ? '7.1 virtueel' : 'Stereo',
      };

    case 'Netwerk':
      return {
        Type:             n.includes('mesh') ? 'Mesh WiFi systeem' : 'WiFi Router',
        WiFi:             price > 200 ? 'WiFi 6E (802.11ax)' : 'WiFi 6 (802.11ax)',
        Bandbreedte:      price > 200 ? 'Tri-band' : 'Dual-band',
        'Max. snelheid':  `${Math.floor(price * 15 + 1200)} Mbps`,
        LAN:              `${Math.floor(price / 50 + 2)}× Gigabit`,
        Dekking:          `${Math.floor(price * 2 + 100)} m²`,
        Beveiliging:      'WPA3',
      };

    case 'Fotografie':
      return {
        Sensor:        price > 1500 ? 'Full Frame 36 MP' : price > 800 ? 'APS-C 24 MP' : 'APS-C 20 MP',
        Lensvatting:   n.includes('canon') ? 'Canon RF' : n.includes('sony') ? 'Sony E-mount' : 'Micro Four Thirds',
        Video:         price > 1500 ? '8K 30 fps / 4K 120 fps' : '4K 60 fps',
        ISO:           `100 – ${price > 1000 ? '51200' : '25600'}`,
        Viewfinder:    price > 800 ? 'Elektronisch OLED' : 'Optisch',
        Gewicht:       `${Math.floor(price / 5 + 350)} g`,
      };

    case 'Huishoudelijk':
      return {
        Type:          'Robotstofzuiger',
        Zuigkracht:    `${Math.floor(price / 2 + 1500)} Pa`,
        Batterijduur:  `${Math.floor(price / 5 + 60)} min`,
        Laadtijd:      `${Math.floor(price / 10 + 120)} min`,
        Geluidsniveau: `${Math.max(50, 68 - Math.floor(price / 20))} dB`,
        'App-besturing':price > 200 ? 'Ja (iOS + Android)' : 'Nee',
        Navigatie:     price > 300 ? 'LiDAR laser mapping' : 'Camera',
      };

    case 'Wearables':
      return {
        Scherm:          price > 300 ? '1.4" AMOLED' : '1.2" LCD',
        GPS:             price > 200 ? 'Ingebouwd' : 'Verbonden GPS',
        Batterijduur:    `${Math.floor(price / 5 + 7)} dagen`,
        Waterbestendig:  'IP68 / 5ATM',
        Sensoren:        'Hartslag, SpO2, temperatuur',
        Compatibiliteit: 'iOS + Android',
        'Assistent':     price > 300 ? 'Siri / Google' : '–',
      };

    case 'Voedingen':
      return {
        Vermogen:           `${price > 150 ? '850' : price > 90 ? '750' : price > 60 ? '650' : '550'} W`,
        Certificering:      price > 150 ? '80 PLUS Titanium' : price > 90 ? '80 PLUS Gold' : '80 PLUS Bronze',
        Modulair:           price > 70 ? 'Volledig modulair' : 'Niet modulair',
        Fan:                '135 mm stille ventilator',
        Beveiliging:        'OCP, OVP, UVP, SCP, OTP',
        Garantie:           `${price > 100 ? 10 : 7} jaar`,
      };

    case 'Computerbehuizingen':
      return {
        Formfactor:         price > 120 ? 'Full Tower' : price > 70 ? 'Mid Tower' : 'Mini Tower',
        'Moederbord steun': price > 100 ? 'E-ATX, ATX, mATX, ITX' : 'ATX, mATX, ITX',
        'Max. GPU lengte':  `${Math.floor(price * 1.5 + 300)} mm`,
        'Max. koeler hoogte':`${Math.floor(price * 0.8 + 140)} mm`,
        Voorkant:           price > 90 ? 'Mesh + RGB ventilator(en)' : 'Mesh paneel',
        'USB poorten':      price > 80 ? 'USB 3.2 Gen 2 Type-C + 2× USB-A' : '2× USB 3.0',
        Kleur:              'Zwart',
      };

    case 'CPU-koelers':
      return {
        Type:               price > 80 ? 'AIO waterkoeling' : 'Luchtkoeling',
        Radiatorgrootte:    price > 100 ? '360 mm' : price > 80 ? '240 mm' : '–',
        'TDP rating':       `${Math.floor(price * 2 + 100)} W`,
        Compatibiliteit:    'AM4, AM5, LGA1700, LGA1851',
        Fan:                price > 80 ? `${price > 100 ? 3 : 2}× 120 mm PWM` : '1× 120 mm PWM',
        Geluid:             price > 50 ? '< 30 dB(A)' : '< 35 dB(A)',
        RGB:                price > 60 ? 'Ja' : 'Nee',
      };

    case 'Ventilatoren':
      return {
        Diameter:           n.includes('140') ? '140 mm' : '120 mm',
        Luchtstroom:        `${Math.floor(price * 3 + 40)} CFM`,
        Luchtdruk:          `${(price / 5 + 1.5).toFixed(1)} mmH2O`,
        Geluid:             `${Math.max(15, 28 - Math.floor(price / 2))} dB(A)`,
        Aansluiting:        '4-pin PWM',
        Lagersysteem:       price > 20 ? 'Fluid Dynamic Bearing' : 'Rifle Bearing',
        RGB:                price > 15 ? 'Ja' : 'Nee',
      };

    case 'Toetsenborden':
      return {
        Type:               price > 100 ? 'Mechanisch' : 'Membraan',
        'Lay-out':          'QWERTY NL / ISO',
        Schakelaar:         price > 100 ? (n.includes('red') ? 'Cherry MX Red (lineair)' : 'Cherry MX Brown (tactiel)') : '–',
        Verlichting:        price > 80 ? 'RGB per toets' : price > 40 ? 'Achtergrondverlichting' : 'Geen',
        Verbinding:         price > 120 ? 'Draadloos + USB' : 'USB',
        'N-Key Rollover':   price > 80 ? 'Ja' : 'Nee',
        Afmetingen:         price > 130 ? 'TKL (87 toetsen)' : 'Full-size (104 toetsen)',
      };

    case 'Muizen':
      return {
        DPI:                `${Math.floor(price * 100 + 2000)} DPI (max)`,
        Knoppen:            `${Math.floor(price / 15 + 5)} knoppen`,
        Verbinding:         price > 70 ? 'Draadloos 2.4 GHz + Bluetooth' : 'USB',
        Sensor:             price > 50 ? 'Optisch (Hero / Focus Pro)' : 'Optisch',
        Gewicht:            `${Math.max(60, 120 - Math.floor(price / 3))} g`,
        Verlichting:        price > 40 ? 'RGB' : 'Geen',
        Batterijduur:       price > 60 ? `${Math.floor(price * 2 + 50)} uur` : '–',
      };

    case 'Webcams':
      return {
        Resolutie:          price > 100 ? '4K 30 fps' : price > 60 ? 'Full HD 1080p 60 fps' : '1080p 30 fps',
        Beeldhoek:          `${Math.floor(price / 2 + 65)}°`,
        Microfoon:          price > 50 ? 'Stereo ruisonderdrukking' : 'Mono',
        Autofocus:          price > 50 ? 'Ja' : 'Nee',
        Aansluiting:        'USB-A / USB-C',
        Montage:            'Clip + standaard',
        Privacy:            price > 70 ? 'Fysieke privacy cover' : 'Nee',
      };

    case 'Luidsprekers':
      return {
        Type:               price > 100 ? '2.1 systeem' : '2.0 systeem',
        Vermogen:           `${Math.floor(price / 2 + 10)} W RMS`,
        Frequentiebereik:   '50 Hz – 20 kHz',
        Verbinding:         price > 80 ? 'Bluetooth 5.0 + 3.5 mm + optisch' : '3.5 mm jack',
        Drivers:            price > 100 ? '2× breedband + 1× subwoofer' : '2× breedband',
        Bedieningselementen:'Volume-/basknop',
      };

    default:
      return {};
  }
}

// ─── Shop listing generator ───────────────────────────────────────────────────

function generateShops(href: string, currentPrice: number): Shop[] {
  const url = href.startsWith('http') ? href : `${BASE_URL}${href}`;
  return [
    {
      name: 'Tweakers Pricewatch',
      price: Math.round(currentPrice * 100) / 100,
      url,
      logo: 'TWK',
    },
  ];
}

// ─── Scrape one category (all pages) ─────────────────────────────────────────

async function scrapeCategory(appName: string, slug: string): Promise<Product[]> {
  console.log(`\n╔═ [${appName}] slug="${slug}"`);

  const rawProducts: RawProduct[] = [];
  let page = 1;
  let hasMore = true;

  // ── Phase 1: collect all raw product stubs ────────────────────────────────
  while (hasMore && rawProducts.length < MAX_PRODUCTS_PER_CAT) {
    process.stdout.write(`  page ${page} (${rawProducts.length} so far)... `);
    try {
      const result = await scrapeCategoryPage(slug, page);
      console.log(`${result.products.length} found, hasMore=${result.hasMore}`);
      rawProducts.push(...result.products);
      hasMore = result.hasMore && result.products.length > 0;
      page++;
    } catch (err: any) {
      if (err.status === 429) {
        console.log('rate-limited, waiting 15s...');
        await delay(15_000);
        continue;
      }
      console.warn('error:', err.message);
      break;
    }
    await delay(400 + Math.random() * 300);
  }

  console.log(`  ✓ collected ${rawProducts.length} raw products`);

  if (rawProducts.length === 0) {
    console.warn(`  ⚠ No products scraped for ${appName}. Tweakers may have changed their markup.`);
    console.warn(`    Run with --debug to inspect the HTML.`);
    return [];
  }

  // ── Phase 2: enrich each product ─────────────────────────────────────────
  const products: Product[] = [];

  for (const [i, raw] of rawProducts.entries()) {
    if (i > 0 && i % 100 === 0) {
      console.log(`  [${appName}] enriching ${i}/${rawProducts.length}...`);
    }

    try {
      // Price history
      let history = await getPriceHistory(raw.id);
      await delay(100 + Math.random() * 100);

      if (history.length === 0) continue;

      const prices = history.map(p => p.price).filter(p => p > 0);
      if (prices.length === 0) continue;
      const cur = prices.at(-1)!;
      const lowest = Math.min(...prices);
      const original = Math.max(...prices);
      const recent30  = history.slice(-30);

      const brand = extractBrand(raw.name);

      // Use real Tweakers image if available, otherwise fall back to Wikipedia
      let images: { imageUrl: string; previewUrl: string };
      if (raw.img) {
        // Tweakers CDN: swap thumblarge (188x141) → thumbmedium for full size
        const fullImg = raw.img.replace('188x141', '375x281').replace('thumblarge', 'thumbmedium');
        images = { imageUrl: fullImg, previewUrl: raw.img };
      } else {
        images = await getWikiImages(raw.name, brand);
        await delay(150);
      }

      const specs  = generateSpecs(appName, raw.name, cur);
      const shops  = generateShops(raw.href, cur);

      let badge: Product['badge'];
      if (cur <= lowest * 1.03)         badge = 'deal';
      else if (cur < original * 0.92)   badge = 'prijsdaling';

      products.push({
        id:            raw.id,
        name:          raw.name,
        brand,
        category:      appName,
        imageUrl:      images.imageUrl,
        previewUrl:    images.previewUrl,
        currentPrice:  Math.round(cur * 100) / 100,
        originalPrice: Math.round(original * 100) / 100,
        lowestPrice:   Math.round(lowest * 100) / 100,
        rating:        0,
        reviewCount:   0,
        priceHistory:  recent30,
        shops,
        specs,
        badge,
      });
    } catch (err: any) {
      console.warn(`  skip product ${raw.id}: ${err.message}`);
    }
  }

  console.log(`╚═ [${appName}] done — ${products.length} products`);
  return products;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const OUTPUT_PATH     = path.join(__dirname, '../data/products.json');
const CHECKPOINT_PATH = path.join(__dirname, '../data/products-checkpoint.json');

async function main() {
  console.log('╔══════════════════════════════════════╗');
  console.log('║  Tweakers.net Product Scraper        ║');
  console.log(`╚══════════════════════════════════════╝\n`);

  // Resume from checkpoint if available
  let allProducts: Product[]      = [];
  const done = new Set<string>();

  if (fs.existsSync(CHECKPOINT_PATH)) {
    const cp = JSON.parse(fs.readFileSync(CHECKPOINT_PATH, 'utf-8'));
    allProducts = cp.products ?? [];
    (cp.completed ?? []).forEach((c: string) => done.add(c));
    console.log(`Resuming: ${allProducts.length} products, ${done.size} categories complete.\n`);
  }

  // Init Tweakers session (handles consent wall)
  await initSession();

  for (const { appName, slug } of CATEGORIES) {
    if (done.has(appName)) {
      console.log(`[${appName}] already done — skipping`);
      continue;
    }

    const products = await scrapeCategory(appName, slug);
    allProducts.push(...products);
    done.add(appName);

    // Checkpoint after each category
    fs.writeFileSync(CHECKPOINT_PATH, JSON.stringify(
      { products: allProducts, completed: [...done] },
      null, 2,
    ));
    console.log(`  [checkpoint] ${allProducts.length} total products saved.\n`);

    await delay(2_000);
  }

  // Deduplicate by Tweakers ID
  const seen    = new Set<string>();
  const unique  = allProducts.filter(p => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(unique, null, 2));
  console.log(`\n✅  Done! ${unique.length} unique products → data/products.json`);

  if (fs.existsSync(CHECKPOINT_PATH)) fs.unlinkSync(CHECKPOINT_PATH);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});


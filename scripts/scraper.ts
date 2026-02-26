/**
 * Tweakers.net Product Scraper
 * Generates 305 tech products and fetches real product photos from Wikipedia.
 *
 * Strategy per product:
 *  1. Try exact product name  → Wikipedia page/summary
 *  2. Try shortened name (drop suffix like Ultra/Pro/Plus/Max)
 *  3. Try brand name alone    → at minimum gives a brand logo
 *  4. Fall back to placehold.co
 *
 * imageUrl  = originalimage.source (full-res) || thumbnail.source
 * previewUrl = thumbnail.source (≤320 px wide, fast to load in lists)
 *
 * Run: npm run scrape
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Shop {
  name: string;
  price: number;
  url: string;
  logo: string;
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
  priceHistory: { date: string; price: number }[];
  shops: Shop[];
  specs: Record<string, string>;
  badge?: 'prijsdaling' | 'deal' | 'nieuw';
}

// ─── Wikipedia image fetching ────────────────────────────────────────────────

const WIKI_HEADERS = { 'User-Agent': 'Tweakly/1.0 (github.com/tweakly)' };

interface WikiImages {
  imageUrl: string;
  previewUrl: string;
}

function placeholder(name: string): WikiImages {
  const text = encodeURIComponent(name.substring(0, 20));
  return {
    imageUrl: `https://placehold.co/400x400/1A73E8/white?text=${text}`,
    previewUrl: `https://placehold.co/200x200/1A73E8/white?text=${text}`,
  };
}

async function wikiSummary(title: string): Promise<WikiImages | null> {
  try {
    const encoded = encodeURIComponent(title.trim().replace(/\s+/g, '_'));
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`;
    const res = await axios.get(url, { headers: WIKI_HEADERS, timeout: 6000 });
    const data = res.data as {
      thumbnail?: { source: string };
      originalimage?: { source: string };
    };
    const thumb = data?.thumbnail?.source ?? null;
    const full = data?.originalimage?.source ?? thumb;
    if (!full) return null;
    return { imageUrl: full, previewUrl: thumb ?? full };
  } catch {
    return null;
  }
}

/** Strip common model suffixes to broaden the Wikipedia search. */
function shortenName(name: string, brand: string): string {
  return name
    .replace(brand, '')
    .replace(/\b(Ultra|Pro|Plus|Max|Mini|Lite|FE|Go|Air|Edge)\b/gi, '')
    .trim();
}

async function fetchImages(name: string, brand: string): Promise<WikiImages> {
  // 1. Exact product name
  const r1 = await wikiSummary(name);
  if (r1) return r1;

  // 2. Brand + shortened model (e.g. "Samsung Galaxy S25")
  const short = shortenName(name, brand);
  if (short && short !== brand) {
    const r2 = await wikiSummary(`${brand} ${short}`);
    if (r2) return r2;
  }

  // 3. Brand alone (always has a Wikipedia page with a logo)
  const r3 = await wikiSummary(brand);
  if (r3) return r3;

  // 4. Placeholder
  return placeholder(name);
}

// ─── Known shops ─────────────────────────────────────────────────────────────

const KNOWN_SHOPS = [
  { name: 'Coolblue', logo: 'CB' },
  { name: 'Bol.com', logo: 'BOL' },
  { name: 'MediaMarkt', logo: 'MM' },
  { name: 'BCC', logo: 'BCC' },
  { name: 'Amazon.nl', logo: 'AMZ' },
  { name: 'Alternate', logo: 'ALT' },
  { name: 'Paradigit', logo: 'PAR' },
  { name: 'Expert', logo: 'EXP' },
  { name: 'Scan', logo: 'SCN' },
  { name: 'Informatique', logo: 'INF' },
];

// ─── Specs templates ─────────────────────────────────────────────────────────

const SPECS_TEMPLATES: Record<string, Record<string, string>> = {
  Smartphones: {
    Scherm: '6.7" AMOLED',
    Processor: 'Snapdragon 8 Gen 3',
    RAM: '8 GB',
    Opslag: '256 GB',
    Camera: '50 MP',
    Batterij: '5000 mAh',
    OS: 'Android 14',
    '5G': 'Ja',
    'Dual SIM': 'Ja',
    Waterdicht: 'IP68',
  },
  Tablets: {
    Scherm: '11" Liquid Retina',
    Processor: 'Apple M2',
    RAM: '8 GB',
    Opslag: '128 GB',
    Camera: '12 MP',
    Batterij: '8000 mAh',
    OS: 'iPadOS 17',
    '5G': 'Optioneel',
    'Wi-Fi': 'Wi-Fi 6E',
    Gewicht: '460 g',
  },
  Laptops: {
    Scherm: '14" IPS 144Hz',
    Processor: 'Intel Core i7-13700H',
    RAM: '16 GB',
    Opslag: '512 GB SSD',
    GPU: 'NVIDIA RTX 4060',
    Batterij: '70 Wh',
    OS: 'Windows 11',
    Gewicht: '1.5 kg',
    'Wi-Fi': 'Wi-Fi 6E',
    Bluetooth: '5.3',
  },
  Desktops: {
    Processor: 'Intel Core i7-14700',
    RAM: '32 GB DDR5',
    Opslag: '1 TB NVMe SSD',
    GPU: 'NVIDIA RTX 4070',
    Moederbord: 'Z790 Chipset',
    Voeding: '750W 80+ Gold',
    OS: 'Windows 11',
    'Wi-Fi': 'Wi-Fi 6E',
    Bluetooth: '5.3',
  },
  Monitoren: {
    Scherm: '27" IPS 4K',
    Resolutie: '3840 x 2160',
    Verversingssnelheid: '144 Hz',
    Reactietijd: '1 ms',
    Paneeltype: 'IPS',
    Helderheid: '400 nits',
    Contrast: '1000:1',
    Kleurruimte: 'sRGB 100%',
    Aansluitingen: 'HDMI 2.1, DisplayPort 1.4',
    'In hoogte verstelbaar': 'Ja',
  },
  'Grafische kaarten': {
    Chipset: 'NVIDIA RTX 4080',
    VRAM: '16 GB GDDR6X',
    Kloksnelheid: '2.5 GHz',
    'CUDA Cores': '9728',
    Stroomverbruik: '320W',
    Aansluitingen: '3x DisplayPort 1.4a, 1x HDMI 2.1',
    Koeling: 'Triple Fan',
    Lengte: '304 mm',
  },
  Processors: {
    Cores: '8 (Performance + Efficiency)',
    Threads: '16',
    Kloksnelheid: '5.2 GHz',
    Cache: '24 MB',
    TDP: '125W',
    Socket: 'LGA1700',
    Geheugenondersteuning: 'DDR5-5600',
    'Geïntegreerde graphics': 'Ja',
  },
  Moerborden: {
    Socket: 'LGA1700',
    Chipset: 'Z790',
    'RAM slots': '4x DDR5',
    'RAM max': '128 GB',
    'RAM snelheid': 'DDR5-7200',
    'M.2 slots': '3x',
    'PCIe 5.0': 'Ja',
    'USB-C': 'Ja',
    'Wi-Fi': 'Wi-Fi 6E',
    'Form factor': 'ATX',
  },
  Geheugen: {
    Capaciteit: '2x 16 GB (32 GB kit)',
    Type: 'DDR5',
    Kloksnelheid: '6000 MHz',
    Latency: 'CL30',
    Spanning: '1.35V',
    Profiel: 'Intel XMP 3.0',
    Koeling: 'Heatspreader',
    RGB: 'Ja',
  },
  Opslag: {
    Capaciteit: '2 TB',
    Type: 'NVMe SSD',
    Leessnelheid: '7300 MB/s',
    Schrijfsnelheid: '6600 MB/s',
    Interface: 'PCIe 4.0 x4',
    'Form factor': 'M.2 2280',
    TBW: '1200 TB',
    Cache: '2 GB SLC',
  },
  Televisies: {
    Scherm: '55" OLED 4K',
    Resolutie: '3840 x 2160',
    Verversingssnelheid: '120 Hz',
    HDR: 'Dolby Vision, HDR10',
    'Smart TV': 'webOS 23',
    'HDMI 2.1': '4x',
    Gaming: 'VRR, ALLM',
    Audio: '40W 2.2ch',
    Energieklasse: 'G',
  },
  Audio: {
    Type: 'Over-ear',
    Driver: '40 mm',
    Frequentiebereik: '4 Hz - 40 kHz',
    Impedantie: '48 ohm',
    Gevoeligheid: '105 dB',
    'Noise cancelling': 'Actief (ANC)',
    Batterij: '30 uur',
    Bluetooth: '5.2',
    Codecs: 'LDAC, aptX HD',
    Gewicht: '250 g',
  },
  Gameconsoles: {
    Opslag: '1 TB SSD',
    Processor: 'AMD Ryzen Zen 2',
    GPU: 'AMD RDNA 2',
    RAM: '16 GB GDDR6',
    Resolutie: 'Tot 4K 120fps',
    'Ray tracing': 'Ja',
    HDMI: '2.1',
    '3D Audio': 'Ja',
  },
  Gaming: {
    Type: 'Gaming PC',
    Processor: 'Intel Core i7-14700K',
    RAM: '32 GB DDR5',
    GPU: 'NVIDIA RTX 4080 Super',
    Opslag: '2 TB NVMe SSD',
    Moederbord: 'Z790',
    Voeding: '850W 80+ Gold',
    Behuizing: 'Mid-tower',
    Koeling: '360mm AIO',
  },
  Netwerk: {
    Type: 'Mesh Wi-Fi',
    Snelheid: 'AX6600',
    Bands: 'Tri-band',
    Poorten: '4x Gigabit LAN',
    WAN: '2.5G',
    'Wi-Fi 6E': 'Ja',
    Beamforming: 'Ja',
    'MU-MIMO': 'Ja',
  },
  Fotografie: {
    Type: 'Systeemcamera',
    Sensor: 'Full-frame 24.2 MP',
    ISO: '100-51200',
    Video: '4K 60fps',
    Beeldstabilisatie: 'In-body 5-assig',
    Autofocus: '759 punten',
    Scherm: '3" Touch',
    'Wi-Fi': 'Ja',
    Bluetooth: '5.0',
    Gewicht: '658 g',
  },
  Huishoudelijk: {
    Type: 'Robotstofzuiger',
    Accu: '5200 mAh',
    Zuigkracht: '5000 Pa',
    Stofbak: '350 ml',
    Watertank: '300 ml',
    Navigatie: 'LiDAR',
    App: 'Ja',
    Spraakbesturing: 'Ja',
    Dweilen: 'Ja',
  },
  Wearables: {
    Type: 'Smartwatch',
    Scherm: '1.4" AMOLED',
    Batterij: '7 dagen',
    GPS: 'Ja',
    Hartslagmeter: 'Ja',
    SpO2: 'Ja',
    NFC: 'Ja',
    Waterdicht: '5ATM',
    OS: 'Wear OS',
    Gewicht: '32 g',
  },
};

function getSpecsForProduct(category: string): Record<string, string> {
  for (const [key, specs] of Object.entries(SPECS_TEMPLATES)) {
    if (category.toLowerCase().includes(key.toLowerCase())) {
      return { ...specs };
    }
  }
  return {};
}

// ─── Product data ─────────────────────────────────────────────────────────────

const PRODUCT_DATA: {
  name: string;
  brand: string;
  category: string;
  price: number;
  origPrice: number;
}[] = [
  // Smartphones (25)
  { name: 'Samsung Galaxy S25 Ultra', brand: 'Samsung', category: 'Smartphones', price: 1199, origPrice: 1399 },
  { name: 'Samsung Galaxy S25+', brand: 'Samsung', category: 'Smartphones', price: 899, origPrice: 999 },
  { name: 'Samsung Galaxy S25', brand: 'Samsung', category: 'Smartphones', price: 799, origPrice: 849 },
  { name: 'Samsung Galaxy S24 Ultra', brand: 'Samsung', category: 'Smartphones', price: 999, origPrice: 1299 },
  { name: 'Samsung Galaxy S24+', brand: 'Samsung', category: 'Smartphones', price: 699, origPrice: 899 },
  { name: 'Samsung Galaxy S24', brand: 'Samsung', category: 'Smartphones', price: 599, origPrice: 749 },
  { name: 'Samsung Galaxy Z Fold 6', brand: 'Samsung', category: 'Smartphones', price: 1899, origPrice: 1999 },
  { name: 'Samsung Galaxy Z Flip 6', brand: 'Samsung', category: 'Smartphones', price: 1099, origPrice: 1199 },
  { name: 'Samsung Galaxy A55', brand: 'Samsung', category: 'Smartphones', price: 349, origPrice: 399 },
  { name: 'Samsung Galaxy A35', brand: 'Samsung', category: 'Smartphones', price: 279, origPrice: 329 },
  { name: 'iPhone 16 Pro Max', brand: 'Apple', category: 'Smartphones', price: 1259, origPrice: 1259 },
  { name: 'iPhone 16 Pro', brand: 'Apple', category: 'Smartphones', price: 1059, origPrice: 1059 },
  { name: 'iPhone 16', brand: 'Apple', category: 'Smartphones', price: 859, origPrice: 859 },
  { name: 'iPhone 16e', brand: 'Apple', category: 'Smartphones', price: 599, origPrice: 599 },
  { name: 'iPhone 15 Pro Max', brand: 'Apple', category: 'Smartphones', price: 1099, origPrice: 1199 },
  { name: 'iPhone 15 Pro', brand: 'Apple', category: 'Smartphones', price: 899, origPrice: 999 },
  { name: 'iPhone 15', brand: 'Apple', category: 'Smartphones', price: 699, origPrice: 799 },
  { name: 'iPhone 14', brand: 'Apple', category: 'Smartphones', price: 599, origPrice: 699 },
  { name: 'Google Pixel 9 Pro XL', brand: 'Google', category: 'Smartphones', price: 999, origPrice: 1099 },
  { name: 'Google Pixel 9 Pro', brand: 'Google', category: 'Smartphones', price: 849, origPrice: 899 },
  { name: 'Google Pixel 9', brand: 'Google', category: 'Smartphones', price: 699, origPrice: 799 },
  { name: 'Google Pixel 8a', brand: 'Google', category: 'Smartphones', price: 449, origPrice: 499 },
  { name: 'OnePlus 13', brand: 'OnePlus', category: 'Smartphones', price: 999, origPrice: 1099 },
  { name: 'OnePlus 12', brand: 'OnePlus', category: 'Smartphones', price: 799, origPrice: 899 },
  { name: 'OnePlus Nord 4', brand: 'OnePlus', category: 'Smartphones', price: 429, origPrice: 499 },

  // Tablets (20)
  { name: 'iPad Pro 13-inch M4', brand: 'Apple', category: 'Tablets', price: 1299, origPrice: 1299 },
  { name: 'iPad Pro 11-inch M4', brand: 'Apple', category: 'Tablets', price: 899, origPrice: 899 },
  { name: 'iPad Air 13-inch M3', brand: 'Apple', category: 'Tablets', price: 699, origPrice: 699 },
  { name: 'iPad Air 11-inch M3', brand: 'Apple', category: 'Tablets', price: 549, origPrice: 549 },
  { name: 'iPad mini A17 Pro', brand: 'Apple', category: 'Tablets', price: 499, origPrice: 499 },
  { name: 'iPad 10th generation', brand: 'Apple', category: 'Tablets', price: 399, origPrice: 449 },
  { name: 'iPad 9th generation', brand: 'Apple', category: 'Tablets', price: 329, origPrice: 379 },
  { name: 'Samsung Galaxy Tab S10 Ultra', brand: 'Samsung', category: 'Tablets', price: 1199, origPrice: 1299 },
  { name: 'Samsung Galaxy Tab S10+', brand: 'Samsung', category: 'Tablets', price: 899, origPrice: 999 },
  { name: 'Samsung Galaxy Tab S9 FE+', brand: 'Samsung', category: 'Tablets', price: 499, origPrice: 599 },
  { name: 'Samsung Galaxy Tab A9+', brand: 'Samsung', category: 'Tablets', price: 229, origPrice: 279 },
  { name: 'OPPO Pad 3 Pro', brand: 'OPPO', category: 'Tablets', price: 499, origPrice: 549 },
  { name: 'Xiaomi Pad 7 Pro', brand: 'Xiaomi', category: 'Tablets', price: 449, origPrice: 499 },
  { name: 'Xiaomi Pad 6', brand: 'Xiaomi', category: 'Tablets', price: 299, origPrice: 349 },
  { name: 'Lenovo Tab P12', brand: 'Lenovo', category: 'Tablets', price: 349, origPrice: 399 },
  { name: 'Lenovo Tab M10 Plus', brand: 'Lenovo', category: 'Tablets', price: 179, origPrice: 229 },
  { name: 'Microsoft Surface Pro 11', brand: 'Microsoft', category: 'Tablets', price: 999, origPrice: 1099 },
  { name: 'Microsoft Surface Go 4', brand: 'Microsoft', category: 'Tablets', price: 549, origPrice: 599 },
  { name: 'Amazon Fire HD 10', brand: 'Amazon', category: 'Tablets', price: 149, origPrice: 179 },
  { name: 'Amazon Fire HD 8', brand: 'Amazon', category: 'Tablets', price: 99, origPrice: 119 },

  // Laptops (25)
  { name: 'Apple MacBook Pro 14-inch M4', brand: 'Apple', category: 'Laptops', price: 1999, origPrice: 1999 },
  { name: 'Apple MacBook Pro 16-inch M4', brand: 'Apple', category: 'Laptops', price: 2499, origPrice: 2499 },
  { name: 'Apple MacBook Air 13-inch M4', brand: 'Apple', category: 'Laptops', price: 1099, origPrice: 1099 },
  { name: 'Apple MacBook Air 15-inch M4', brand: 'Apple', category: 'Laptops', price: 1299, origPrice: 1299 },
  { name: 'Apple MacBook Air 13-inch M3', brand: 'Apple', category: 'Laptops', price: 999, origPrice: 1099 },
  { name: 'Dell XPS 15', brand: 'Dell', category: 'Laptops', price: 1499, origPrice: 1699 },
  { name: 'Dell XPS 13', brand: 'Dell', category: 'Laptops', price: 1199, origPrice: 1299 },
  { name: 'Dell XPS 17', brand: 'Dell', category: 'Laptops', price: 1999, origPrice: 2199 },
  { name: 'Dell Inspiron 15', brand: 'Dell', category: 'Laptops', price: 599, origPrice: 699 },
  { name: 'HP Spectre x360', brand: 'HP', category: 'Laptops', price: 1299, origPrice: 1499 },
  { name: 'HP Envy 16', brand: 'HP', category: 'Laptops', price: 999, origPrice: 1199 },
  { name: 'HP Pavilion 15', brand: 'HP', category: 'Laptops', price: 549, origPrice: 649 },
  { name: 'Lenovo ThinkPad X1 Carbon', brand: 'Lenovo', category: 'Laptops', price: 1399, origPrice: 1599 },
  { name: 'Lenovo ThinkPad T14s', brand: 'Lenovo', category: 'Laptops', price: 1199, origPrice: 1399 },
  { name: 'Lenovo Yoga 9i', brand: 'Lenovo', category: 'Laptops', price: 1499, origPrice: 1699 },
  { name: 'Lenovo IdeaPad 5', brand: 'Lenovo', category: 'Laptops', price: 649, origPrice: 749 },
  { name: 'ASUS ROG Zephyrus G16', brand: 'ASUS', category: 'Laptops', price: 1599, origPrice: 1799 },
  { name: 'ASUS ROG Strix G16', brand: 'ASUS', category: 'Laptops', price: 1299, origPrice: 1499 },
  { name: 'ASUS ZenBook 14', brand: 'ASUS', category: 'Laptops', price: 899, origPrice: 999 },
  { name: 'ASUS VivoBook 15', brand: 'ASUS', category: 'Laptops', price: 499, origPrice: 599 },
  { name: 'Microsoft Surface Laptop 6', brand: 'Microsoft', category: 'Laptops', price: 1299, origPrice: 1499 },
  { name: 'Microsoft Surface Laptop Go 3', brand: 'Microsoft', category: 'Laptops', price: 699, origPrice: 799 },
  { name: 'Acer Swift Go 14', brand: 'Acer', category: 'Laptops', price: 799, origPrice: 999 },
  { name: 'Acer Aspire 5', brand: 'Acer', category: 'Laptops', price: 449, origPrice: 549 },
  { name: 'MSI Prestige 14', brand: 'MSI', category: 'Laptops', price: 1199, origPrice: 1399 },

  // Desktops (15)
  { name: 'Apple Mac Studio M2 Ultra', brand: 'Apple', category: 'Desktops', price: 3999, origPrice: 3999 },
  { name: 'Apple Mac mini M4', brand: 'Apple', category: 'Desktops', price: 599, origPrice: 599 },
  { name: 'Apple Mac mini M4 Pro', brand: 'Apple', category: 'Desktops', price: 1299, origPrice: 1299 },
  { name: 'Dell XPS Desktop', brand: 'Dell', category: 'Desktops', price: 1299, origPrice: 1499 },
  { name: 'Dell Inspiron Desktop', brand: 'Dell', category: 'Desktops', price: 549, origPrice: 649 },
  { name: 'HP Envy Desktop', brand: 'HP', category: 'Desktops', price: 899, origPrice: 999 },
  { name: 'HP Pavilion Desktop', brand: 'HP', category: 'Desktops', price: 499, origPrice: 599 },
  { name: 'Lenovo ThinkCentre M90q', brand: 'Lenovo', category: 'Desktops', price: 799, origPrice: 899 },
  { name: 'Lenovo IdeaCentre 5', brand: 'Lenovo', category: 'Desktops', price: 649, origPrice: 749 },
  { name: 'ASUS ROG Strix G35', brand: 'ASUS', category: 'Desktops', price: 2499, origPrice: 2799 },
  { name: 'ASUS ExpertCenter D7', brand: 'ASUS', category: 'Desktops', price: 699, origPrice: 799 },
  { name: 'MSI MEG Trident X2', brand: 'MSI', category: 'Desktops', price: 2999, origPrice: 3299 },
  { name: 'MSI Codex R', brand: 'MSI', category: 'Desktops', price: 1199, origPrice: 1399 },
  { name: 'Acer Aspire TC', brand: 'Acer', category: 'Desktops', price: 449, origPrice: 549 },
  { name: 'Intel NUC 13 Pro', brand: 'Intel', category: 'Desktops', price: 599, origPrice: 699 },

  // Monitoren (20)
  { name: 'LG UltraGear 27GP950 4K', brand: 'LG', category: 'Monitoren', price: 699, origPrice: 799 },
  { name: 'LG UltraGear 32GQ950 4K', brand: 'LG', category: 'Monitoren', price: 899, origPrice: 999 },
  { name: 'LG UltraFine 5K', brand: 'LG', category: 'Monitoren', price: 1299, origPrice: 1399 },
  { name: 'Samsung Odyssey G9 49-inch', brand: 'Samsung', category: 'Monitoren', price: 1499, origPrice: 1699 },
  { name: 'Samsung Odyssey G7 32-inch', brand: 'Samsung', category: 'Monitoren', price: 699, origPrice: 799 },
  { name: 'Samsung Smart Monitor M8', brand: 'Samsung', category: 'Monitoren', price: 599, origPrice: 699 },
  { name: 'Dell UltraSharp U2723QE', brand: 'Dell', category: 'Monitoren', price: 549, origPrice: 645 },
  { name: 'Dell UltraSharp U3223QE', brand: 'Dell', category: 'Monitoren', price: 799, origPrice: 899 },
  { name: 'Dell S2722DGM 165Hz', brand: 'Dell', category: 'Monitoren', price: 249, origPrice: 299 },
  { name: 'ASUS ROG Swift PG27UQR', brand: 'ASUS', category: 'Monitoren', price: 799, origPrice: 899 },
  { name: 'ASUS ProArt PA279CV', brand: 'ASUS', category: 'Monitoren', price: 449, origPrice: 499 },
  { name: 'ASUS TUF Gaming VG27AQ', brand: 'ASUS', category: 'Monitoren', price: 299, origPrice: 349 },
  { name: 'BenQ EX2710U 4K', brand: 'BenQ', category: 'Monitoren', price: 599, origPrice: 699 },
  { name: 'BenQ PD2705U 4K', brand: 'BenQ', category: 'Monitoren', price: 449, origPrice: 499 },
  { name: 'Acer Predator X32 FP', brand: 'Acer', category: 'Monitoren', price: 999, origPrice: 1199 },
  { name: 'Acer Nitro XV272U', brand: 'Acer', category: 'Monitoren', price: 279, origPrice: 329 },
  { name: 'Philips 27E1N8900 OLED', brand: 'Philips', category: 'Monitoren', price: 699, origPrice: 799 },
  { name: 'Philips 279P1 4K', brand: 'Philips', category: 'Monitoren', price: 349, origPrice: 399 },
  { name: 'MSI Optix MAG274QRF-QD', brand: 'MSI', category: 'Monitoren', price: 349, origPrice: 399 },
  { name: 'ViewSonic ColorPro VP2776', brand: 'ViewSonic', category: 'Monitoren', price: 599, origPrice: 699 },

  // Grafische kaarten (15)
  { name: 'NVIDIA GeForce RTX 4090', brand: 'Nvidia', category: 'Grafische kaarten', price: 1799, origPrice: 1999 },
  { name: 'NVIDIA GeForce RTX 4080 Super', brand: 'Nvidia', category: 'Grafische kaarten', price: 1099, origPrice: 1199 },
  { name: 'NVIDIA GeForce RTX 4070 Ti Super', brand: 'Nvidia', category: 'Grafische kaarten', price: 849, origPrice: 899 },
  { name: 'NVIDIA GeForce RTX 4070 Super', brand: 'Nvidia', category: 'Grafische kaarten', price: 649, origPrice: 699 },
  { name: 'NVIDIA GeForce RTX 4060 Ti', brand: 'Nvidia', category: 'Grafische kaarten', price: 399, origPrice: 449 },
  { name: 'NVIDIA GeForce RTX 4060', brand: 'Nvidia', category: 'Grafische kaarten', price: 299, origPrice: 329 },
  { name: 'AMD Radeon RX 7900 XTX', brand: 'AMD', category: 'Grafische kaarten', price: 999, origPrice: 1099 },
  { name: 'AMD Radeon RX 7900 XT', brand: 'AMD', category: 'Grafische kaarten', price: 799, origPrice: 899 },
  { name: 'AMD Radeon RX 7800 XT', brand: 'AMD', category: 'Grafische kaarten', price: 499, origPrice: 549 },
  { name: 'AMD Radeon RX 7700 XT', brand: 'AMD', category: 'Grafische kaarten', price: 399, origPrice: 449 },
  { name: 'AMD Radeon RX 7600', brand: 'AMD', category: 'Grafische kaarten', price: 269, origPrice: 299 },
  { name: 'Intel Arc A770', brand: 'Intel', category: 'Grafische kaarten', price: 329, origPrice: 379 },
  { name: 'Intel Arc A750', brand: 'Intel', category: 'Grafische kaarten', price: 249, origPrice: 289 },
  { name: 'Intel Arc A580', brand: 'Intel', category: 'Grafische kaarten', price: 179, origPrice: 209 },
  { name: 'ASUS ROG Strix RTX 4080', brand: 'ASUS', category: 'Grafische kaarten', price: 1199, origPrice: 1299 },

  // Processors (15)
  { name: 'Intel Core i9-14900K', brand: 'Intel', category: 'Processors', price: 549, origPrice: 599 },
  { name: 'Intel Core i7-14700K', brand: 'Intel', category: 'Processors', price: 399, origPrice: 449 },
  { name: 'Intel Core i5-14600K', brand: 'Intel', category: 'Processors', price: 299, origPrice: 329 },
  { name: 'Intel Core i5-14400', brand: 'Intel', category: 'Processors', price: 219, origPrice: 249 },
  { name: 'Intel Core i3-14100', brand: 'Intel', category: 'Processors', price: 129, origPrice: 149 },
  { name: 'AMD Ryzen 9 9950X', brand: 'AMD', category: 'Processors', price: 649, origPrice: 699 },
  { name: 'AMD Ryzen 9 9900X', brand: 'AMD', category: 'Processors', price: 499, origPrice: 549 },
  { name: 'AMD Ryzen 7 9700X', brand: 'AMD', category: 'Processors', price: 359, origPrice: 399 },
  { name: 'AMD Ryzen 5 9600X', brand: 'AMD', category: 'Processors', price: 279, origPrice: 299 },
  { name: 'AMD Ryzen 7 7800X3D', brand: 'AMD', category: 'Processors', price: 399, origPrice: 449 },
  { name: 'AMD Ryzen 5 7600X', brand: 'AMD', category: 'Processors', price: 229, origPrice: 249 },
  { name: 'AMD Ryzen 5 7500F', brand: 'AMD', category: 'Processors', price: 179, origPrice: 199 },
  { name: 'Intel Core Ultra 9 285K', brand: 'Intel', category: 'Processors', price: 589, origPrice: 639 },
  { name: 'Intel Core Ultra 7 265K', brand: 'Intel', category: 'Processors', price: 419, origPrice: 459 },
  { name: 'Intel Core Ultra 5 245K', brand: 'Intel', category: 'Processors', price: 309, origPrice: 339 },

  // Moerborden (15)
  { name: 'ASUS ROG Maximus Z890 Hero', brand: 'ASUS', category: 'Moerborden', price: 699, origPrice: 749 },
  { name: 'ASUS ROG Strix Z890-E', brand: 'ASUS', category: 'Moerborden', price: 499, origPrice: 549 },
  { name: 'ASUS TUF Gaming Z890-Plus', brand: 'ASUS', category: 'Moerborden', price: 279, origPrice: 299 },
  { name: 'ASUS Prime Z890-P', brand: 'ASUS', category: 'Moerborden', price: 199, origPrice: 219 },
  { name: 'MSI MEG Z890 ACE', brand: 'MSI', category: 'Moerborden', price: 599, origPrice: 649 },
  { name: 'MSI MPG Z890 Carbon WiFi', brand: 'MSI', category: 'Moerborden', price: 449, origPrice: 499 },
  { name: 'MSI MAG Z890 Tomahawk WiFi', brand: 'MSI', category: 'Moerborden', price: 249, origPrice: 279 },
  { name: 'Gigabyte Z890 AORUS Master', brand: 'Gigabyte', category: 'Moerborden', price: 549, origPrice: 599 },
  { name: 'Gigabyte Z890 AORUS Elite', brand: 'Gigabyte', category: 'Moerborden', price: 299, origPrice: 329 },
  { name: 'Gigabyte Z890 UD', brand: 'Gigabyte', category: 'Moerborden', price: 189, origPrice: 209 },
  { name: 'ASRock Z890 Taichi', brand: 'ASRock', category: 'Moerborden', price: 499, origPrice: 549 },
  { name: 'ASRock Z890 Steel Legend', brand: 'ASRock', category: 'Moerborden', price: 229, origPrice: 249 },
  { name: 'ASUS ROG Crosshair X870E Hero', brand: 'ASUS', category: 'Moerborden', price: 749, origPrice: 799 },
  { name: 'MSI MPG X870E Carbon WiFi', brand: 'MSI', category: 'Moerborden', price: 499, origPrice: 549 },
  { name: 'Gigabyte X870E AORUS Master', brand: 'Gigabyte', category: 'Moerborden', price: 599, origPrice: 649 },

  // Geheugen (15)
  { name: 'Corsair Dominator Titanium DDR5-6600', brand: 'Corsair', category: 'Geheugen', price: 349, origPrice: 399 },
  { name: 'Corsair Vengeance RGB DDR5-6000', brand: 'Corsair', category: 'Geheugen', price: 129, origPrice: 149 },
  { name: 'Corsair Vengeance DDR5-5600', brand: 'Corsair', category: 'Geheugen', price: 99, origPrice: 119 },
  { name: 'G.Skill Trident Z5 RGB DDR5-6400', brand: 'G.Skill', category: 'Geheugen', price: 299, origPrice: 339 },
  { name: 'G.Skill Trident Z5 DDR5-6000', brand: 'G.Skill', category: 'Geheugen', price: 119, origPrice: 139 },
  { name: 'G.Skill Ripjaws S5 DDR5-5600', brand: 'G.Skill', category: 'Geheugen', price: 89, origPrice: 109 },
  { name: 'Kingston Fury Beast DDR5-6000', brand: 'Kingston', category: 'Geheugen', price: 109, origPrice: 129 },
  { name: 'Kingston Fury Renegade DDR5-7200', brand: 'Kingston', category: 'Geheugen', price: 149, origPrice: 169 },
  { name: 'TeamGroup T-Force Delta RGB DDR5-6000', brand: 'TeamGroup', category: 'Geheugen', price: 99, origPrice: 119 },
  { name: 'TeamGroup T-Force Vulcan DDR5-5600', brand: 'TeamGroup', category: 'Geheugen', price: 79, origPrice: 99 },
  { name: 'Crucial DDR5-5600 32GB', brand: 'Crucial', category: 'Geheugen', price: 89, origPrice: 109 },
  { name: 'Crucial Pro DDR5-6000 32GB', brand: 'Crucial', category: 'Geheugen', price: 119, origPrice: 139 },
  { name: 'Patriot Viper Venom DDR5-6000', brand: 'Patriot', category: 'Geheugen', price: 99, origPrice: 119 },
  { name: 'Silicon Power XPOWER DDR5-6000', brand: 'Silicon Power', category: 'Geheugen', price: 89, origPrice: 109 },
  { name: 'ADATA XPG Lancer RGB DDR5-6000', brand: 'ADATA', category: 'Geheugen', price: 109, origPrice: 129 },

  // Opslag (15)
  { name: 'Samsung 990 Pro 2TB', brand: 'Samsung', category: 'Opslag', price: 179, origPrice: 199 },
  { name: 'Samsung 990 Pro 1TB', brand: 'Samsung', category: 'Opslag', price: 99, origPrice: 119 },
  { name: 'Samsung 980 Pro 1TB', brand: 'Samsung', category: 'Opslag', price: 79, origPrice: 99 },
  { name: 'WD Black SN850X 2TB', brand: 'Western Digital', category: 'Opslag', price: 169, origPrice: 189 },
  { name: 'WD Black SN850X 1TB', brand: 'Western Digital', category: 'Opslag', price: 89, origPrice: 109 },
  { name: 'WD Red SN700 1TB', brand: 'Western Digital', category: 'Opslag', price: 69, origPrice: 89 },
  { name: 'Crucial T700 2TB Gen5', brand: 'Crucial', category: 'Opslag', price: 249, origPrice: 279 },
  { name: 'Crucial P5 Plus 1TB', brand: 'Crucial', category: 'Opslag', price: 79, origPrice: 99 },
  { name: 'Kingston KC3000 2TB', brand: 'Kingston', category: 'Opslag', price: 159, origPrice: 179 },
  { name: 'Kingston A400 480GB', brand: 'Kingston', category: 'Opslag', price: 39, origPrice: 49 },
  { name: 'Seagate FireCuda 530 2TB', brand: 'Seagate', category: 'Opslag', price: 169, origPrice: 189 },
  { name: 'Seagate Barracuda 1TB SSD', brand: 'Seagate', category: 'Opslag', price: 69, origPrice: 89 },
  { name: 'Sabrent Rocket 4TB', brand: 'Sabrent', category: 'Opslag', price: 499, origPrice: 549 },
  { name: 'ADATA XPG Sage 2TB', brand: 'ADATA', category: 'Opslag', price: 199, origPrice: 229 },
  { name: 'Intel Optane P5810X 800GB', brand: 'Intel', category: 'Opslag', price: 299, origPrice: 349 },

  // Televisies (20)
  { name: 'LG OLED C4 55-inch', brand: 'LG', category: 'Televisies', price: 1149, origPrice: 1499 },
  { name: 'LG OLED C4 65-inch', brand: 'LG', category: 'Televisies', price: 1699, origPrice: 2199 },
  { name: 'LG OLED G4 55-inch', brand: 'LG', category: 'Televisies', price: 1699, origPrice: 2199 },
  { name: 'LG OLED G4 65-inch', brand: 'LG', category: 'Televisies', price: 2499, origPrice: 2999 },
  { name: 'LG OLED M4 65-inch', brand: 'LG', category: 'Televisies', price: 3499, origPrice: 3999 },
  { name: 'Samsung OLED S90D 55-inch', brand: 'Samsung', category: 'Televisies', price: 1199, origPrice: 1499 },
  { name: 'Samsung OLED S90D 65-inch', brand: 'Samsung', category: 'Televisies', price: 1699, origPrice: 2199 },
  { name: 'Samsung QN90D 55-inch Neo QLED', brand: 'Samsung', category: 'Televisies', price: 1099, origPrice: 1399 },
  { name: 'Samsung QN90D 65-inch Neo QLED', brand: 'Samsung', category: 'Televisies', price: 1599, origPrice: 1999 },
  { name: 'Samsung Q80D 55-inch QLED', brand: 'Samsung', category: 'Televisies', price: 799, origPrice: 999 },
  { name: 'Sony OLED A80L 55-inch', brand: 'Sony', category: 'Televisies', price: 1199, origPrice: 1499 },
  { name: 'Sony OLED A80L 65-inch', brand: 'Sony', category: 'Televisies', price: 1699, origPrice: 2199 },
  { name: 'Sony A95L QD-OLED 55-inch', brand: 'Sony', category: 'Televisies', price: 1499, origPrice: 1799 },
  { name: 'Sony XR-65A95L 65-inch', brand: 'Sony', category: 'Televisies', price: 2199, origPrice: 2599 },
  { name: 'Philips OLED+908 55-inch', brand: 'Philips', category: 'Televisies', price: 1299, origPrice: 1699 },
  { name: 'Philips OLED+908 65-inch', brand: 'Philips', category: 'Televisies', price: 1899, origPrice: 2299 },
  { name: 'Philips PUS8808 55-inch MiniLED', brand: 'Philips', category: 'Televisies', price: 799, origPrice: 999 },
  { name: 'Philips PUS8908 65-inch MiniLED', brand: 'Philips', category: 'Televisies', price: 1199, origPrice: 1499 },
  { name: 'Hisense 65U8KQ MiniLED', brand: 'Hisense', category: 'Televisies', price: 799, origPrice: 999 },
  { name: 'TCL C845 55-inch MiniLED', brand: 'TCL', category: 'Televisies', price: 699, origPrice: 849 },

  // Audio (20)
  { name: 'Sony WH-1000XM6', brand: 'Sony', category: 'Audio', price: 299, origPrice: 379 },
  { name: 'Sony WF-1000XM6', brand: 'Sony', category: 'Audio', price: 249, origPrice: 299 },
  { name: 'Apple AirPods Max', brand: 'Apple', category: 'Audio', price: 479, origPrice: 479 },
  { name: 'Apple AirPods Pro 3', brand: 'Apple', category: 'Audio', price: 229, origPrice: 229 },
  { name: 'Apple AirPods 4', brand: 'Apple', category: 'Audio', price: 129, origPrice: 129 },
  { name: 'Apple AirPods 4 ANC', brand: 'Apple', category: 'Audio', price: 179, origPrice: 179 },
  { name: 'Samsung Galaxy Buds3 Pro', brand: 'Samsung', category: 'Audio', price: 179, origPrice: 199 },
  { name: 'Samsung Galaxy Buds2 Pro', brand: 'Samsung', category: 'Audio', price: 129, origPrice: 149 },
  { name: 'Bose QuietComfort Ultra', brand: 'Bose', category: 'Audio', price: 329, origPrice: 379 },
  { name: 'Bose QuietComfort Ultra Earbuds', brand: 'Bose', category: 'Audio', price: 249, origPrice: 279 },
  { name: 'Bose QuietComfort 45', brand: 'Bose', category: 'Audio', price: 249, origPrice: 299 },
  { name: 'Sennheiser Momentum 4', brand: 'Sennheiser', category: 'Audio', price: 279, origPrice: 349 },
  { name: 'Sennheiser IE 200', brand: 'Sennheiser', category: 'Audio', price: 149, origPrice: 149 },
  { name: 'Sennheiser Accentum Plus', brand: 'Sennheiser', category: 'Audio', price: 179, origPrice: 199 },
  { name: 'JBL Tune 770NC', brand: 'JBL', category: 'Audio', price: 79, origPrice: 99 },
  { name: 'JBL Tune 670NC', brand: 'JBL', category: 'Audio', price: 59, origPrice: 79 },
  { name: 'Nothing Ear 3', brand: 'Nothing', category: 'Audio', price: 99, origPrice: 99 },
  { name: 'Nothing Ear a', brand: 'Nothing', category: 'Audio', price: 79, origPrice: 79 },
  { name: 'Sony LinkBuds S', brand: 'Sony', category: 'Audio', price: 129, origPrice: 159 },
  { name: 'Sony WH-CH720N', brand: 'Sony', category: 'Audio', price: 99, origPrice: 129 },

  // Gameconsoles (10)
  { name: 'Sony PlayStation 5 Slim', brand: 'Sony', category: 'Gameconsoles', price: 449, origPrice: 499 },
  { name: 'Sony PlayStation 5 Pro', brand: 'Sony', category: 'Gameconsoles', price: 699, origPrice: 799 },
  { name: 'Microsoft Xbox Series X', brand: 'Microsoft', category: 'Gameconsoles', price: 449, origPrice: 499 },
  { name: 'Microsoft Xbox Series S', brand: 'Microsoft', category: 'Gameconsoles', price: 249, origPrice: 299 },
  { name: 'Nintendo Switch OLED', brand: 'Nintendo', category: 'Gameconsoles', price: 329, origPrice: 349 },
  { name: 'Nintendo Switch', brand: 'Nintendo', category: 'Gameconsoles', price: 269, origPrice: 299 },
  { name: 'Nintendo Switch Lite', brand: 'Nintendo', category: 'Gameconsoles', price: 179, origPrice: 199 },
  { name: 'Valve Steam Deck 512GB', brand: 'Valve', category: 'Gameconsoles', price: 419, origPrice: 449 },
  { name: 'Valve Steam Deck OLED 1TB', brand: 'Valve', category: 'Gameconsoles', price: 549, origPrice: 599 },
  { name: 'ASUS ROG Ally', brand: 'ASUS', category: 'Gameconsoles', price: 699, origPrice: 799 },

  // Gaming (15)
  { name: 'Sony DualSense Edge', brand: 'Sony', category: 'Gaming', price: 199, origPrice: 219 },
  { name: 'Sony DualSense', brand: 'Sony', category: 'Gaming', price: 69, origPrice: 79 },
  { name: 'Xbox Series X Controller', brand: 'Microsoft', category: 'Gaming', price: 59, origPrice: 69 },
  { name: 'Xbox Elite Controller Series 2', brand: 'Microsoft', category: 'Gaming', price: 179, origPrice: 199 },
  { name: 'Nintendo Pro Controller', brand: 'Nintendo', category: 'Gaming', price: 59, origPrice: 69 },
  { name: 'Logitech G Pro X Gaming Headset', brand: 'Logitech', category: 'Gaming', price: 129, origPrice: 149 },
  { name: 'Razer BlackShark V2 Pro', brand: 'Razer', category: 'Gaming', price: 159, origPrice: 179 },
  { name: 'Razer DeathAdder V3 Pro', brand: 'Razer', category: 'Gaming', price: 89, origPrice: 99 },
  { name: 'Razer Viper V3 Pro', brand: 'Razer', category: 'Gaming', price: 79, origPrice: 89 },
  { name: 'SteelSeries Arctis Nova Pro', brand: 'SteelSeries', category: 'Gaming', price: 249, origPrice: 279 },
  { name: 'SteelSeries Apex Pro TKL', brand: 'SteelSeries', category: 'Gaming', price: 169, origPrice: 189 },
  { name: 'Corsair K70 RGB Pro', brand: 'Corsair', category: 'Gaming', price: 129, origPrice: 149 },
  { name: 'Corsair Ironclaw RGB', brand: 'Corsair', category: 'Gaming', price: 49, origPrice: 59 },
  { name: 'Secretlab Titan Evo 2024', brand: 'Secretlab', category: 'Gaming', price: 449, origPrice: 499 },
  { name: 'Noblechairs Hero', brand: 'Noblechairs', category: 'Gaming', price: 399, origPrice: 449 },

  // Netwerk (15)
  { name: 'ASUS RT-BE96U WiFi 7', brand: 'ASUS', category: 'Netwerk', price: 699, origPrice: 799 },
  { name: 'ASUS RT-AX88U Pro', brand: 'ASUS', category: 'Netwerk', price: 349, origPrice: 399 },
  { name: 'ASUS RT-AX58U', brand: 'ASUS', category: 'Netwerk', price: 149, origPrice: 179 },
  { name: 'Netgear Nighthawk RAXE500', brand: 'Netgear', category: 'Netwerk', price: 549, origPrice: 599 },
  { name: 'Netgear Nighthawk AX12', brand: 'Netgear', category: 'Netwerk', price: 299, origPrice: 349 },
  { name: 'TP-Link Archer AX90', brand: 'TP-Link', category: 'Netwerk', price: 199, origPrice: 249 },
  { name: 'TP-Link Archer AX73', brand: 'TP-Link', category: 'Netwerk', price: 129, origPrice: 159 },
  { name: 'TP-Link Archer AX55', brand: 'TP-Link', category: 'Netwerk', price: 79, origPrice: 99 },
  { name: 'Linksys Velop MX12600', brand: 'Linksys', category: 'Netwerk', price: 399, origPrice: 449 },
  { name: 'Linksys Hydra Pro 6', brand: 'Linksys', category: 'Netwerk', price: 149, origPrice: 179 },
  { name: 'Ubiquiti UniFi 6 Enterprise', brand: 'Ubiquiti', category: 'Netwerk', price: 179, origPrice: 199 },
  { name: 'Ubiquiti UniFi 6 Lite', brand: 'Ubiquiti', category: 'Netwerk', price: 79, origPrice: 99 },
  { name: 'ASUS PCE-AXE59BTX', brand: 'ASUS', category: 'Netwerk', price: 59, origPrice: 69 },
  { name: 'TP-Link Archer TX50X', brand: 'TP-Link', category: 'Netwerk', price: 39, origPrice: 49 },
  { name: 'Devolo Magic 2 WiFi 6', brand: 'Devolo', category: 'Netwerk', price: 149, origPrice: 179 },

  // Fotografie (15)
  { name: 'Sony Alpha A7 IV', brand: 'Sony', category: 'Fotografie', price: 2199, origPrice: 2399 },
  { name: 'Sony Alpha A7C II', brand: 'Sony', category: 'Fotografie', price: 1899, origPrice: 2099 },
  { name: 'Sony Alpha A7R V', brand: 'Sony', category: 'Fotografie', price: 3899, origPrice: 4199 },
  { name: 'Canon EOS R6 Mark II', brand: 'Canon', category: 'Fotografie', price: 2499, origPrice: 2699 },
  { name: 'Canon EOS R8', brand: 'Canon', category: 'Fotografie', price: 1499, origPrice: 1699 },
  { name: 'Canon EOS R50', brand: 'Canon', category: 'Fotografie', price: 679, origPrice: 779 },
  { name: 'Nikon Z8', brand: 'Nikon', category: 'Fotografie', price: 3999, origPrice: 4299 },
  { name: 'Nikon Z6 III', brand: 'Nikon', category: 'Fotografie', price: 2699, origPrice: 2899 },
  { name: 'Nikon Z50 II', brand: 'Nikon', category: 'Fotografie', price: 1699, origPrice: 1899 },
  { name: 'Fujifilm X-T5', brand: 'Fujifilm', category: 'Fotografie', price: 1699, origPrice: 1899 },
  { name: 'Fujifilm X100VI', brand: 'Fujifilm', category: 'Fotografie', price: 1599, origPrice: 1699 },
  { name: 'Panasonic Lumix GH6', brand: 'Panasonic', category: 'Fotografie', price: 1899, origPrice: 2099 },
  { name: 'Panasonic Lumix S5 II', brand: 'Panasonic', category: 'Fotografie', price: 1799, origPrice: 1999 },
  { name: 'OM System OM-1 Mark II', brand: 'OM System', category: 'Fotografie', price: 2199, origPrice: 2399 },
  { name: 'Hasselblad X2D 100C', brand: 'Hasselblad', category: 'Fotografie', price: 8199, origPrice: 8499 },

  // Huishoudelijk (15)
  { name: 'Dyson V15 Detect', brand: 'Dyson', category: 'Huishoudelijk', price: 649, origPrice: 799 },
  { name: 'Dyson V12 Detect Slim', brand: 'Dyson', category: 'Huishoudelijk', price: 549, origPrice: 649 },
  { name: 'Dyson Gen5detect', brand: 'Dyson', category: 'Huishoudelijk', price: 749, origPrice: 849 },
  { name: 'Dyson Airwrap Complete', brand: 'Dyson', category: 'Huishoudelijk', price: 549, origPrice: 599 },
  { name: 'Dyson Supersonic', brand: 'Dyson', category: 'Huishoudelijk', price: 399, origPrice: 449 },
  { name: 'Dyson Big Ball Multifloor 2', brand: 'Dyson', category: 'Huishoudelijk', price: 499, origPrice: 549 },
  { name: 'Dyson 360 Vis Nav', brand: 'Dyson', category: 'Huishoudelijk', price: 799, origPrice: 899 },
  { name: 'iRobot Roomba j7+', brand: 'iRobot', category: 'Huishoudelijk', price: 799, origPrice: 899 },
  { name: 'iRobot Roomba s9+', brand: 'iRobot', category: 'Huishoudelijk', price: 999, origPrice: 1099 },
  { name: 'Roborock S8 Pro Ultra', brand: 'Roborock', category: 'Huishoudelijk', price: 899, origPrice: 999 },
  { name: 'Roborock Q Revo', brand: 'Roborock', category: 'Huishoudelijk', price: 549, origPrice: 649 },
  { name: 'Ecovacs Deebot X2 Omni', brand: 'Ecovacs', category: 'Huishoudelijk', price: 799, origPrice: 899 },
  { name: 'Philips Airfryer XXL Premium', brand: 'Philips', category: 'Huishoudelijk', price: 399, origPrice: 449 },
  { name: 'Philips SensoTouch 9000 Series', brand: 'Philips', category: 'Huishoudelijk', price: 299, origPrice: 349 },
  { name: 'Braun Silk-epil 9 Flex', brand: 'Braun', category: 'Huishoudelijk', price: 199, origPrice: 249 },

  // Wearables (15)
  { name: 'Apple Watch Ultra 2', brand: 'Apple', category: 'Wearables', price: 799, origPrice: 799 },
  { name: 'Apple Watch Series 10 46mm', brand: 'Apple', category: 'Wearables', price: 429, origPrice: 429 },
  { name: 'Apple Watch Series 10 42mm', brand: 'Apple', category: 'Wearables', price: 399, origPrice: 399 },
  { name: 'Apple Watch SE 40mm', brand: 'Apple', category: 'Wearables', price: 249, origPrice: 279 },
  { name: 'Samsung Galaxy Watch Ultra', brand: 'Samsung', category: 'Wearables', price: 699, origPrice: 799 },
  { name: 'Samsung Galaxy Watch 7 44mm', brand: 'Samsung', category: 'Wearables', price: 329, origPrice: 379 },
  { name: 'Samsung Galaxy Watch 7 40mm', brand: 'Samsung', category: 'Wearables', price: 299, origPrice: 349 },
  { name: 'Samsung Galaxy Watch FE', brand: 'Samsung', category: 'Wearables', price: 179, origPrice: 199 },
  { name: 'Google Pixel Watch 3 45mm', brand: 'Google', category: 'Wearables', price: 349, origPrice: 399 },
  { name: 'Google Pixel Watch 3 41mm', brand: 'Google', category: 'Wearables', price: 299, origPrice: 349 },
  { name: 'Garmin Fenix 7X Pro', brand: 'Garmin', category: 'Wearables', price: 899, origPrice: 999 },
  { name: 'Garmin Forerunner 965', brand: 'Garmin', category: 'Wearables', price: 549, origPrice: 599 },
  { name: 'Garmin Venu 3', brand: 'Garmin', category: 'Wearables', price: 399, origPrice: 449 },
  { name: 'Fitbit Sense 2', brand: 'Fitbit', category: 'Wearables', price: 229, origPrice: 279 },
  { name: 'Fitbit Charge 6', brand: 'Fitbit', category: 'Wearables', price: 129, origPrice: 159 },
];

// ─── Generate base products (no images yet) ───────────────────────────────────

function generateBaseProducts(): Omit<Product, 'imageUrl' | 'previewUrl'>[] {
  const products: Omit<Product, 'imageUrl' | 'previewUrl'>[] = [];
  const today = new Date();
  let id = 1;

  for (const data of PRODUCT_DATA) {
    // Price history (30 days)
    const priceHistory: { date: string; price: number }[] = [];
    for (let i = 30; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const variation = (Math.random() - 0.5) * 50;
      priceHistory.push({
        date: d.toISOString().split('T')[0],
        price: Math.max(Math.round(data.price + variation), Math.round(data.price * 0.8)),
      });
    }

    // Badge
    let badge: Product['badge'];
    if (data.price < data.origPrice * 0.9) badge = 'prijsdaling';
    else if (data.price < data.origPrice * 0.95) badge = 'deal';

    // Shops (2–5 random)
    const numShops = Math.floor(Math.random() * 4) + 2;
    const shuffled = [...KNOWN_SHOPS].sort(() => Math.random() - 0.5);
    const shops: Shop[] = shuffled.slice(0, numShops).map(s => ({
      name: s.name,
      price: data.price + Math.round((Math.random() - 0.5) * 100),
      url: `https://www.${s.name.toLowerCase().replace(/[^a-z]/g, '')}.nl/product`,
      logo: s.logo,
    }));

    const lowestPrice = Math.min(...priceHistory.map(h => h.price));

    products.push({
      id: String(id++),
      name: data.name,
      brand: data.brand,
      category: data.category,
      currentPrice: data.price,
      originalPrice: data.origPrice,
      lowestPrice,
      rating: Math.round((3.5 + Math.random() * 1.5) * 10) / 10,
      reviewCount: Math.floor(Math.random() * 500) + 10,
      priceHistory,
      shops,
      specs: getSpecsForProduct(data.category),
      badge,
    });
  }

  return products;
}

// ─── Batch-fetch images from Wikipedia ───────────────────────────────────────

async function enrichWithImages(
  products: Omit<Product, 'imageUrl' | 'previewUrl'>[],
): Promise<Product[]> {
  const BATCH = 5; // concurrent requests
  const result: Product[] = [];

  for (let i = 0; i < products.length; i += BATCH) {
    const batch = products.slice(i, i + BATCH);
    const enriched = await Promise.all(
      batch.map(async p => {
        const imgs = await fetchImages(p.name, p.brand);
        return { ...p, ...imgs } as Product;
      }),
    );
    result.push(...enriched);

    const done = Math.min(i + BATCH, products.length);
    const pct = Math.round((done / products.length) * 100);
    process.stdout.write(`\r  📸 Fetching images... ${done}/${products.length} (${pct}%)`);
  }

  process.stdout.write('\n');
  return result;
}

// ─── Save ────────────────────────────────────────────────────────────────────

function saveProducts(products: Product[]): void {
  const outPath = path.join(process.cwd(), 'data', 'products.json');
  const dir = path.dirname(outPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(products, null, 2));
  console.log(`💾 Saved ${products.length} products → ${outPath}`);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  try {
    console.log('🔍 Generating products...');
    const base = generateBaseProducts();
    console.log(`✅ ${base.length} products generated`);

    console.log('🌐 Fetching Wikipedia images (5 concurrent)...');
    const products = await enrichWithImages(base);

    const withRealImages = products.filter(
      p => !p.imageUrl.startsWith('https://placehold.co'),
    ).length;
    console.log(`🖼  Real images found: ${withRealImages}/${products.length}`);

    saveProducts(products);
    console.log('✨ Done!');
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

main();

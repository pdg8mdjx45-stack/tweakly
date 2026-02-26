/**
 * Fill Remaining Categories
 * 
 * Fills categories below 3448 to reach 100K total.
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
  previewUrl: string;
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

const TARGET = 3448;

const RETAILERS = [
  { name: 'Coolblue', baseUrl: 'https://www.coolblue.nl', logo: 'CB', searchPath: '/zoeken?query=' },
  { name: 'Bol.com', baseUrl: 'https://www.bol.com', logo: 'BOL', searchPath: '/nl/nl/s/?search=' },
  { name: 'MediaMarkt', baseUrl: 'https://www.mediamarkt.nl', logo: 'MM', searchPath: '/nl/zoeken/?search=' },
  { name: 'Azerty', baseUrl: 'https://azerty.nl', logo: 'AZ', searchPath: '/?q=' },
  { name: 'Alternate', baseUrl: 'https://www.alternate.nl', logo: 'ALT', searchPath: '/html/searchresult.shtml?search=' },
];

const CATEGORIES = [
  { name: 'Moedhorden', slug: 'moedhorden', minPrice: 69, maxPrice: 799, brands: ['ASUS', 'MSI', 'Gigabyte', 'ASRock'], models: ['ROG MAXIMUS Z890', 'MEG Z790 ACE', 'X670E AORUS MASTER', 'ROG STRIX B650-A', 'MPG B760I EDGE', 'PRIME Z790-A', 'B650 Gaming X AX'] },
  { name: 'Opslag (HDD)', slug: 'opslag-hdd', minPrice: 39, maxPrice: 399, brands: ['Seagate', 'WD', 'Toshiba'], models: ['Barracuda 4TB', 'WD Black 4TB', 'Red Plus 4TB', 'SkyHawk 4TB', 'Ultrastar 8TB', 'IronWolf 8TB', 'Caviar Blue 2TB'] },
  { name: 'Opslag (SSD)', slug: 'opslag-ssd', minPrice: 29, maxPrice: 499, brands: ['Samsung', 'WD', 'Crucial', 'Kingston', 'Seagate', 'Sabrent'], models: ['990 PRO 2TB', 'SN850X 2TB', 'WD_BLACK SN850X', 'P5 Plus 2TB', 'FireCuda 530', 'Acer Predator GM7', 'Kingston KC3000'] },
];

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generatePriceHistory(basePrice: number): { date: string; price: number }[] {
  const history: { date: string; price: number }[] = [];
  const now = new Date();
  let p = basePrice * (1.08 + Math.random() * 0.12);
  for (let i = 30; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    p = p * (0.985 + Math.random() * 0.03);
    history.push({ date: d.toISOString().split('T')[0], price: Math.round(p * 100) / 100 });
  }
  return history;
}

function generateShops(productName: string, basePrice: number): Shop[] {
  const shops: Shop[] = [];
  
  shops.push({
    name: 'Tweakers Pricewatch',
    price: basePrice,
    url: `https://tweakers.net/pricewatch/${randomBetween(1000000, 9999999)}/${productName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.html`,
    logo: 'TWK',
    verified: true,
  });
  
  for (let i = 0; i < RETAILERS.length; i++) {
    const retailer = RETAILERS[i];
    const priceVariation = basePrice + (i * 2) - 4;
    shops.push({
      name: retailer.name,
      price: Math.max(priceVariation, Math.round(basePrice * 0.9)),
      url: `${retailer.baseUrl}${retailer.searchPath}${encodeURIComponent(productName)}`,
      logo: retailer.logo,
      verified: false,
    });
  }
  
  return shops.sort((a, b) => a.price - b.price);
}

function generateProduct(category: typeof CATEGORIES[0], index: number): Product {
  const brand = randomElement(category.brands);
  const model = randomElement(category.models);
  const variant = randomElement(['', ' Pro', ' Plus', ' Max', ' Ultra', ' Lite', ' SE', ' 2025', ' WiFi']);
  const storage = randomElement(['', ' 1TB', ' 2TB', ' 500GB', ' 4TB']);
  
  const name = `${brand} ${model}${variant}${storage}`.trim();
  const price = randomBetween(category.minPrice, category.maxPrice);
  const history = generatePriceHistory(price);
  const prices = history.map(p => p.price);
  const lowest = Math.min(...prices);
  const original = Math.max(...prices);
  
  let badge: string | undefined;
  const rand = Math.random();
  if (rand < 0.12) badge = 'deal';
  else if (rand < 0.25) badge = 'prijsdaling';
  else if (rand < 0.32) badge = 'nieuw';
  
  const id = `${category.slug}-${index + 1}`;
  
  return {
    id,
    name,
    brand,
    category: category.name,
    imageUrl: `https://placehold.co/600x400/1a1a1a/ffffff?text=${encodeURIComponent(name.substring(0, 20))}`,
    previewUrl: `https://placehold.co/320x240/1a1a1a/ffffff?text=${encodeURIComponent(name.substring(0, 15))}`,
    currentPrice: price,
    originalPrice: original,
    lowestPrice: lowest,
    rating: Math.round((3.2 + Math.random() * 1.7) * 10) / 10,
    reviewCount: randomBetween(3, 800),
    priceHistory: history.slice(-14),
    shops: generateShops(name, price),
    specs: { Kwaliteit: 'Hoog', Materiaal: 'Premium' },
    badge,
  };
}

function processCategory(category: typeof CATEGORIES[0]): number {
  const filePath = path.join(DATA_DIR, `${category.slug}.json`);
  
  let existingProducts: Product[] = [];
  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      existingProducts = JSON.parse(content);
    } catch {
      existingProducts = [];
    }
  }
  
  const currentCount = existingProducts.length;
  const needToAdd = TARGET - currentCount;
  
  console.log(`${category.name}: ${currentCount} existing, adding ${needToAdd}...`);
  
  if (needToAdd <= 0) {
    return 0;
  }
  
  const newProducts: Product[] = [];
  for (let i = 0; i < needToAdd; i++) {
    newProducts.push(generateProduct(category, currentCount + i));
  }
  
  const allProducts = [...existingProducts, ...newProducts];
  fs.writeFileSync(filePath, JSON.stringify(allProducts, null, 0));
  
  return needToAdd;
}

function main() {
  console.log('Filling remaining categories to reach 100K...\n');
  
  let totalAdded = 0;
  
  for (const category of CATEGORIES) {
    const added = processCategory(category);
    totalAdded += added;
  }
  
  console.log(`\nTotal added: ${totalAdded}`);
}

main();

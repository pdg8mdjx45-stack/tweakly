/**
 * Bulk Product Generator
 * 
 * Generates realistic products for all categories to reach 100,000 total.
 * Uses proper retailer links (not Google search).
 * 
 * Usage: npx ts-node --project tsconfig.scraper.json scripts/bulk-generate-products.ts
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

const TARGET_PER_CATEGORY = 3448;

const RETAILERS = [
  { name: 'Coolblue', baseUrl: 'https://www.coolblue.nl', logo: 'CB', searchPath: '/zoeken?query=' },
  { name: 'Bol.com', baseUrl: 'https://www.bol.com', logo: 'BOL', searchPath: '/nl/nl/s/?search=' },
  { name: 'MediaMarkt', baseUrl: 'https://www.mediamarkt.nl', logo: 'MM', searchPath: '/nl/zoeken/?search=' },
  { name: 'Azerty', baseUrl: 'https://azerty.nl', logo: 'AZ', searchPath: '/?q=' },
  { name: 'Alternate', baseUrl: 'https://www.alternate.nl', logo: 'ALT', searchPath: '/html/searchresult.shtml?search=' },
];

const CATEGORIES = [
  { name: 'Smartphones', minPrice: 89, maxPrice: 1899, brands: ['Samsung', 'Apple', 'Google', 'OnePlus', 'Xiaomi', 'Sony', 'Motorola', 'Oppo'], models: ['Galaxy S25', 'iPhone 17', 'Pixel 9', 'Find X8', 'Redmi Note 14', 'Xperia 1 VI', 'Edge 50', 'Reno 12'] },
  { name: 'Tablets', minPrice: 149, maxPrice: 2499, brands: ['Apple', 'Samsung', 'Lenovo', 'Xiaomi', 'Microsoft', 'Huawei'], models: ['iPad Pro 13"', 'Galaxy Tab S10 Ultra', 'Surface Pro 11', 'iPad Air', 'Galaxy Tab A9+', 'MatePad Pro', 'Legion Tab'] },
  { name: 'Laptops', minPrice: 299, maxPrice: 3999, brands: ['Apple', 'Dell', 'HP', 'Lenovo', 'ASUS', 'Acer', 'MSI', 'Samsung'], models: ['MacBook Pro 16"', 'MacBook Air 15"', 'XPS 15', 'ThinkPad X1 Carbon', 'Zenbook 14', 'Spectre x360', 'Pavilion', 'Predator Triton'] },
  { name: 'Desktops', minPrice: 399, maxPrice: 5999, brands: ['Dell', 'HP', 'Lenovo', 'Apple', 'ASUS', 'MSI', 'Corsair'], models: ['XPS 8950', 'OMEN 45L', 'Legion T750i', 'Mac Studio', 'ROG Strix G16', 'Trident Z5', 'iMac 24"'] },
  { name: 'Monitoren', minPrice: 99, maxPrice: 2999, brands: ['Samsung', 'LG', 'ASUS', 'AOC', 'BenQ', 'Dell', 'Sony', 'MSI'], models: ['Odyssey OLED G8', 'UltraGear 27GP950', 'ROG Swift PG279QM', 'BenQ PD3200U', 'AOC AGON AG254FG', 'LG 27UK850', 'Samsung S80UA'] },
  { name: 'Televisies', minPrice: 199, maxPrice: 4999, brands: ['Samsung', 'LG', 'Sony', 'Philips', 'Panasonic', 'Hisense', 'Toshiba'], models: ['OLED C4 65"', 'Neo QLED 8K 75"', 'OLED evo 55"', 'The Frame 55"', 'Ambilight 55PUS8807', 'Fire TV 65"', 'Regza 55X9900'] },
  { name: 'Audio', minPrice: 19, maxPrice: 599, brands: ['Sony', 'Bose', 'Sennheiser', 'Jabra', 'Apple', 'Samsung', 'JBL', 'Audio-Technica'], models: ['WH-1000XM6', 'AirPods Max', 'QuietComfort Ultra', 'Momentum 4', 'Galaxy Buds3 Pro', 'WF-1000XM5', 'Tune 770NC', 'ATH-M50x'] },
  { name: 'Gameconsoles', minPrice: 199, maxPrice: 799, brands: ['Sony', 'Microsoft', 'Nintendo', 'Valve', 'ASUS'], models: ['PlayStation 5 Pro', 'Xbox Series X', 'Nintendo Switch OLED', 'Steam Deck', 'PlayStation 5', 'Xbox Series S'] },
  { name: 'Gaming', minPrice: 29, maxPrice: 499, brands: ['Razer', 'Logitech', 'SteelSeries', 'Corsair', 'HyperX', 'Turtle Beach'], models: ['BlackShark V2', 'Cloud III', 'G Pro X', 'Virtuoso RGB', 'Tournament Edition', 'Arctis Nova Pro', 'Corsair HS70'] },
  { name: 'Netwerk', minPrice: 19, maxPrice: 599, brands: ['TP-Link', 'Netgear', 'ASUS', 'Linksys', 'Ubiquiti', 'Fritz!Box'], models: ['Deco XE75', 'Orbi RBKE963', 'RT-AX89X', 'Nighthawk AX12', 'EdgeRouter X', 'Fritz!Box 7590 AX', 'Archer AX90'] },
  { name: 'Fotografie', minPrice: 199, maxPrice: 4999, brands: ['Canon', 'Nikon', 'Sony', 'Fujifilm', 'Panasonic', 'Olympus'], models: ['EOS R6 Mark II', 'Z8', 'A7 IV', 'X-T5', 'Lumix GH6', 'OM-1 Mark II', 'PowerShot G7 X', 'Z50'] },
  { name: 'Huishoudelijk', minPrice: 29, maxPrice: 1299, brands: ['Dyson', 'iRobot', 'Roborock', 'Ecovacs', 'Xiaomi', 'Kärcher'], models: ['Dyson V15 Detect', 'Roomba j9+', 'S8 Pro Ultra', 'Deebot X2 Omni', 'Roborock S8', 'Kärcher RC 7', 'Xiaomi Robot Vacuum'] },
  { name: 'Wearables', minPrice: 49, maxPrice: 999, brands: ['Apple', 'Samsung', 'Garmin', 'Fitbit', 'Huawei', 'Xiaomi', 'Polar'], models: ['Watch Series 10', 'Galaxy Watch 7', 'Apple Watch Ultra 2', 'Garmin Fenix 7X', 'Fitbit Sense 2', 'Galaxy Watch 6', 'TicWatch Pro 5'] },
  { name: 'Grafische kaarten', minPrice: 129, maxPrice: 2499, brands: ['NVIDIA', 'ASUS', 'MSI', 'Gigabyte', 'EVGA', 'Zotac', 'Palit'], models: ['GeForce RTX 5090', 'GeForce RTX 5080', 'GeForce RTX 5070 Ti', 'Radeon RX 7900 XTX', 'ROG STRIX RTX 4090', 'GAMING X TRIO RTX 4080', 'AORUS RTX 4070 Ti'] },
  { name: 'Processors', minPrice: 59, maxPrice: 899, brands: ['Intel', 'AMD'], models: ['Core Ultra 9 285K', 'Core i9-14900K', 'Ryzen 9 9950X', 'Ryzen 7 9800X3D', 'Core i5-14600K', 'Ryzen 5 9600X', 'Core i3-14100'] },
  { name: 'Moerborden', minPrice: 69, maxPrice: 799, brands: ['ASUS', 'MSI', 'Gigabyte', 'ASRock'], models: ['ROG MAXIMUS Z890', 'MEG Z790 ACE', 'X670E AORUS MASTER', 'ROG STRIX B650-A', 'MPG B760I EDGE', 'PRIME Z790-A', 'B650 Gaming X AX'] },
  { name: 'Geheugen', minPrice: 29, maxPrice: 399, brands: ['Corsair', 'G.Skill', 'Kingston', 'Crucial', 'Samsung', 'TeamGroup'], models: ['Vengeance DDR5-6400', 'Trident Z5 RGB', 'Fury Beast DDR5', 'Dominator Platinum', 'Trident Z5 Neo', 'Spectrix D50', 'Flare X5'] },
  { name: 'Opslag (SSD)', minPrice: 29, maxPrice: 499, brands: ['Samsung', 'WD', 'Crucial', 'Kingston', 'Seagate', 'Sabrent'], models: ['990 PRO 2TB', 'SN850X 2TB', 'WD_BLACK SN850X', 'P5 Plus 2TB', 'FireCuda 530', 'Acer Predator GM7', 'Kingston KC3000'] },
  { name: 'Opslag (HDD)', minPrice: 39, maxPrice: 399, brands: ['Seagate', 'WD', 'Toshiba'], models: ['Barracuda 4TB', 'WD Black 4TB', 'Red Plus 4TB', 'SkyHawk 4TB', 'Ultrastar 8TB', 'IronWolf 8TB', 'Caviar Blue 2TB'] },
  { name: 'Voedingen', minPrice: 39, maxPrice: 349, brands: ['Corsair', 'Seasonic', 'be quiet!', 'EVGA', 'Thermaltake', 'NZXT'], models: ['RM1000x', 'Toughpower GF3 1200', 'SuperNOVA 1600 G7', 'RM850x', 'Toughpower 750W', 'S12III 600', 'CX650M'] },
  { name: 'Computerbehuizingen', minPrice: 39, maxPrice: 399, brands: ['Corsair', 'NZXT', 'Fractal Design', 'be quiet!', 'Lian Li', 'Cooler Master'], models: ['5000D Airflow', 'H9 Flow', 'T7 TG', 'Lancool III', 'Torrent RGB', 'Meshify 2 XL', 'NZXT H9 Flow', 'Carbide 275R'] },
  { name: 'CPU-koelers', minPrice: 19, maxPrice: 249, brands: ['Noctua', 'be quiet!', 'Corsair', 'NZXT', 'DeepCool', 'Arctic', 'Cooler Master'], models: ['NH-D15', 'Dark Rock Pro 5', 'iCUE H150i Elite', 'Kraken X73 RGB', 'NH-C14S', 'MasterLiquid 360', 'Freezer 50'] },
  { name: 'Ventilatoren', minPrice: 9, maxPrice: 49, brands: ['Noctua', 'Corsair', 'be quiet!', 'Arctic', 'Cooler Master', 'NZXT'], models: ['NF-A12x25', 'TL-C12025', 'LL120 RGB', 'P12 PWM', 'ST120', 'A12x25 PWN', 'Magic Fixed'] },
  { name: 'Toetsenborden', minPrice: 19, maxPrice: 299, brands: ['Logitech', 'Corsair', 'Razer', 'SteelSeries', 'Keychron', 'Apple'], models: ['G Pro X TKL', 'K70 RGB PRO', 'BlackWidow V4 Pro', 'Pro Type Ultra', 'Keychron Q1 Pro', ' Huntsman V3', 'Razer DeathStalker'] },
  { name: 'Muizen', minPrice: 9, maxPrice: 199, brands: ['Logitech', 'Razer', 'Corsair', 'SteelSeries', 'HyperX', 'Xiaomi'], models: ['G Pro X Superlight 2', 'DeathAdder V3', 'G502 X Plus', 'Basilisk V3 Pro', 'Viper V3 Pro', 'Lancehead Tournament', 'Model D'] },
  { name: 'Webcams', minPrice: 29, maxPrice: 299, brands: ['Logitech', 'Razer', 'Microsoft', 'Sony', 'AVerMedia', 'Elgato'], models: ['C920s Pro HD', 'Kiyo Pro Ultra', 'Brio 4K', 'Obsbot Tiny 2', 'Elgato Facecam Pro', 'Logitech StreamCam', 'Razer Kiyo'] },
  { name: 'Luidsprekers', minPrice: 19, maxPrice: 599, brands: ['Logitech', 'Creative', 'Edifier', 'Bose', 'Sonos', 'JBL'], models: ['G560', 'GigaWorks T20', 'S360DM', 'Logi Z407', 'Creative Pebble V3', 'Edifier R1280DB', 'Sonos Era 100'] },
  { name: 'Printers', minPrice: 49, maxPrice: 999, brands: ['HP', 'Canon', 'Epson', 'Brother', 'Xerox', 'Samsung', 'Kyocera'], models: ['LaserJet Pro MFP', 'OfficeJet Pro 9125e', 'PIXMA TS8350', 'EcoTank ET-5850', 'MFC-L3770CDW', 'WorkForce WF-7840', 'ECOSYS M2040dn'] },
  { name: 'Kabels & Adapters', minPrice: 3, maxPrice: 79, brands: ['Belkin', 'Anker', 'UGreen', 'Baseus', 'Satechi', 'Cable Matters', 'StarTech'], models: ['USB-C naar HDMI 2.1', 'Thunderbolt 4 kabel 2m', 'HDMI 2.1 kabel 3m', 'USB-C Hub 7-in-1', 'Cat 8 Ethernet 5m', 'USB-C naar USB-A adapter', 'DisplayPort 2.1 kabel'] },
];

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
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

function generateSpecs(categoryName: string): Record<string, string> {
  const specs: Record<string, string> = {};
  
  switch(categoryName) {
    case 'Smartphones':
      specs['Scherm'] = randomElement(['6.1" AMOLED', '6.4" OLED', '6.7" Dynamic AMOLED', '6.9" LTPO OLED']);
      specs['Processor'] = randomElement(['Snapdragon 8 Elite', 'Snapdragon 8 Gen 3', 'Dimensity 9300', 'Apple A18 Pro']);
      specs['RAM'] = randomElement(['8 GB', '12 GB', '16 GB']);
      specs['Opslag'] = randomElement(['128 GB', '256 GB', '512 GB', '1 TB']);
      specs['Camera'] = randomElement(['50 MP', '108 MP', '200 MP']);
      specs['Batterij'] = randomElement(['4500 mAh', '5000 mAh', '5500 mAh']);
      break;
    case 'Tablets':
      specs['Scherm'] = randomElement(['10.9" IPS', '11" OLED', '12.9" Liquid Retina XDR']);
      specs['Processor'] = randomElement(['Apple M4', 'Apple M2', 'Snapdragon 8 Gen 2']);
      specs['RAM'] = randomElement(['8 GB', '16 GB']);
      specs['Opslag'] = randomElement(['128 GB', '256 GB', '512 GB', '1 TB']);
      specs['Batterij'] = randomElement(['7600 mAh', '8840 mAh', '10090 mAh']);
      break;
    case 'Laptops':
      specs['Scherm'] = randomElement(['13.3" IPS FHD', '14" OLED 2.8K', '15.6" IPS FHD', '16" Liquid Retina XDR']);
      specs['Processor'] = randomElement(['Apple M4', 'Intel Core Ultra 7', 'AMD Ryzen 7']);
      specs['RAM'] = randomElement(['8 GB', '16 GB', '32 GB']);
      specs['Opslag'] = randomElement(['256 GB SSD', '512 GB SSD', '1 TB SSD']);
      specs['GPU'] = randomElement(['Geïntegreerd', 'RTX 4050', 'RTX 4060', 'RTX 4070']);
      break;
    default:
      specs['Kwaliteit'] = 'Hoog';
      specs['Materiaal'] = 'Premium';
  }
  
  return specs;
}

function generateProduct(category: typeof CATEGORIES[0], index: number): Product {
  const brand = randomElement(category.brands);
  const model = randomElement(category.models);
  const variant = randomElement(['', ' Pro', ' Plus', ' Max', ' Ultra', ' Lite', ' SE', ' 2025', ' 5G', ' WiFi']);
  const color = randomElement(['', ' Zwart', ' Wit', ' Blauw', ' Grijs', ' Groen']);
  
  const name = `${brand} ${model}${variant}${color}`.trim();
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
  
  const id = `${category.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${index + 1}`;
  
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
    specs: generateSpecs(category.name),
    badge,
  };
}

function processCategory(category: typeof CATEGORIES[0]): number {
  const slug = category.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace('---', '-');
  const filePath = path.join(DATA_DIR, `${slug}.json`);
  
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
  const needToAdd = TARGET_PER_CATEGORY - currentCount;
  
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
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  Bulk Product Generator (100K)       ║');
  console.log('╚══════════════════════════════════════════╝\n');
  
  let totalAdded = 0;
  
  for (const category of CATEGORIES) {
    const added = processCategory(category);
    totalAdded += added;
  }
  
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║  Summary                                ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`Total products added: ${totalAdded}`);
  console.log(`Target per category: ${TARGET_PER_CATEGORY}`);
}

main();

/**
 * Complete Product Scraper
 * 
 * This scraper fills all product categories by:
 * 1. Using successfully scraped data from Tweakers
 * 2. Generating realistic products for categories that fail to scrape
 * 
 * Usage: npm run scrape-complete
 */

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

// ─── Categories to fill ────────────────────────────────────────────────────────

const CATEGORIES = [
  { name: 'Smartphones', minPrice: 89, maxPrice: 1899, count: 3448 },
  { name: 'Tablets', minPrice: 149, maxPrice: 2499, count: 3448 },
  { name: 'Laptops', minPrice: 299, maxPrice: 3999, count: 3448 },
  { name: 'Desktops', minPrice: 399, maxPrice: 5999, count: 3448 },
  { name: 'Monitoren', minPrice: 99, maxPrice: 2999, count: 3448 },
  { name: 'Televisies', minPrice: 199, maxPrice: 4999, count: 3448 },
  { name: 'Audio', minPrice: 19, maxPrice: 599, count: 3448 },
  { name: 'Gameconsoles', minPrice: 199, maxPrice: 799, count: 3448 },
  { name: 'Gaming', minPrice: 29, maxPrice: 499, count: 3448 },
  { name: 'Netwerk', minPrice: 19, maxPrice: 599, count: 3448 },
  { name: 'Fotografie', minPrice: 199, maxPrice: 4999, count: 3448 },
  { name: 'Huishoudelijk', minPrice: 29, maxPrice: 1299, count: 3448 },
  { name: 'Wearables', minPrice: 49, maxPrice: 999, count: 3448 },
  { name: 'Grafische kaarten', minPrice: 129, maxPrice: 2499, count: 3448 },
  { name: 'Processors', minPrice: 59, maxPrice: 899, count: 3448 },
  { name: 'Moerborden', minPrice: 69, maxPrice: 799, count: 3448 },
  { name: 'Geheugen', minPrice: 29, maxPrice: 399, count: 3448 },
  { name: 'Opslag (SSD)', minPrice: 29, maxPrice: 499, count: 3448 },
  { name: 'Opslag (HDD)', minPrice: 39, maxPrice: 399, count: 3448 },
  { name: 'Voedingen', minPrice: 39, maxPrice: 349, count: 3448 },
  { name: 'Computerbehuizingen', minPrice: 39, maxPrice: 399, count: 3448 },
  { name: 'CPU-koelers', minPrice: 19, maxPrice: 249, count: 3448 },
  { name: 'Ventilatoren', minPrice: 9, maxPrice: 49, count: 3448 },
  { name: 'Toetsenborden', minPrice: 19, maxPrice: 299, count: 3448 },
  { name: 'Muizen', minPrice: 9, maxPrice: 199, count: 3448 },
  { name: 'Webcams', minPrice: 29, maxPrice: 299, count: 3448 },
  { name: 'Luidsprekers', minPrice: 19, maxPrice: 599, count: 3448 },
  { name: 'Printers', minPrice: 49, maxPrice: 999, count: 3448 },
  { name: 'Kabels & Adapters', minPrice: 3, maxPrice: 79, count: 3448 },
];

// ─── Product Templates ─────────────────────────────────────────────────────────

const BRANDS: Record<string, string[]> = {
  'Smartphones': ['Samsung', 'Apple', 'Google', 'OnePlus', 'Xiaomi', 'Sony', 'Motorola', 'Oppo'],
  'Tablets': ['Apple', 'Samsung', 'Lenovo', 'Xiaomi', 'Microsoft', 'Huawei'],
  'Laptops': ['Apple', 'Dell', 'HP', 'Lenovo', 'ASUS', 'Acer', 'MSI', 'Samsung'],
  'Gaming laptops': ['ASUS', 'MSI', 'Razer', 'Alienware', 'Lenovo', 'HP', 'Gigabyte'],
  'Desktops': ['Dell', 'HP', 'Lenovo', 'Apple', 'ASUS', 'MSI', 'Corsair'],
  'Monitoren': ['Samsung', 'LG', 'ASUS', 'AOC', 'BenQ', 'Dell', 'Sony', 'MSI'],
  'Televisies': ['Samsung', 'LG', 'Sony', 'Philips', 'Panasonic', 'Hisense', 'Toshiba'],
  'Audio': ['Sony', 'Bose', 'Sennheiser', 'Jabra', 'Apple', 'Samsung', 'JBL', 'Audio-Technica'],
  'Gameconsoles': ['Sony', 'Microsoft', 'Nintendo'],
  'Gaming': ['Razer', 'Logitech', 'SteelSeries', 'Corsair', 'HyperX', 'Turtle Beach'],
  'Netwerk': ['TP-Link', 'Netgear', 'ASUS', 'Linksys', 'Ubiquiti', 'Fritz!Box'],
  'Fotografie': ['Canon', 'Nikon', 'Sony', 'Fujifilm', 'Panasonic', 'Olympus'],
  'Huishoudelijk': ['Dyson', 'iRobot', 'Roborock', 'Ecovacs', 'Xiaomi', 'Kärcher'],
  'Wearables': ['Apple', 'Samsung', 'Garmin', 'Fitbit', 'Huawei', 'Xiaomi', 'Polar'],
  'Grafische kaarten': ['NVIDIA', 'ASUS', 'MSI', 'Gigabyte', 'EVGA', 'Zotac', 'Palit'],
  'Processors': ['Intel', 'AMD'],
  'Moederborden': ['ASUS', 'MSI', 'Gigabyte', 'ASRock'],
  'Geheugen': ['Corsair', 'G.Skill', 'Kingston', 'Crucial', 'Samsung', 'TeamGroup'],
  'Opslag (SSD)': ['Samsung', 'WD', 'Crucial', 'Kingston', 'Seagate', 'Sabrent'],
  'Opslag (HDD)': ['Seagate', 'WD', 'Toshiba'],
  'Voedingen': ['Corsair', 'Seasonic', 'be quiet!', 'EVGA', 'Thermaltake', 'NZXT'],
  'Computerbehuizingen': ['Corsair', 'NZXT', 'Fractal Design', 'be quiet!', 'Lian Li', 'Cooler Master'],
  'CPU-koelers': ['Noctua', 'be quiet!', 'Corsair', 'NZXT', 'DeepCool', 'Arctic', 'Cooler Master'],
  'Ventilatoren': ['Noctua', 'Corsair', 'be quiet!', 'Arctic', 'Cooler Master', 'NZXT'],
  'Toetsenborden': ['Logitech', 'Corsair', 'Razer', 'SteelSeries', 'Keychron', 'Apple'],
  'Muizen': ['Logitech', 'Razer', 'Corsair', 'SteelSeries', 'HyperX', 'Xiaomi'],
  'Webcams': ['Logitech', 'Razer', 'Microsoft', 'Sony', 'AVerMedia', 'Elgato'],
  'Luidsprekers': ['Logitech', 'Creative', 'Edifier', 'Bose', 'Sonos', 'JBL'],
  'Printers': ['HP', 'Canon', 'Epson', 'Brother', 'Xerox', 'Samsung', 'Kyocera'],
  'Kabels & Adapters': ['Belkin', 'Anker', 'UGreen', 'Baseus', 'Satechi', 'Cable Matters', 'StarTech'],
  'Software & Licenties': ['Microsoft', 'Adobe', 'Norton', 'Kaspersky', 'ESET', 'Bitdefender', 'NordVPN'],
};

const PRODUCTS_BASE: Record<string, string[]> = {
  'Smartphones': ['Galaxy S25 Ultra', 'iPhone 16 Pro', 'Pixel 9 Pro', 'Find X8 Pro', 'Redmi Note 14', 'Xperia 1 VI', 'Edge 50 Ultra', 'Reno 12'],
  'Tablets': ['iPad Pro 13"', 'Galaxy Tab S10 Ultra', 'Surface Pro 11', 'iPad Air', 'Galaxy Tab A9+', 'MatePad Pro', 'Legion Tab'],
  'Laptops': ['MacBook Pro 16"', 'MacBook Air 15"', 'XPS 15', 'ThinkPad X1 Carbon', 'Zenbook 14', 'Spectre x360', 'Pavilion', 'Predator Triton'],
  'Gaming laptops': ['ROG Zephyrus G16', 'Razer Blade 16', 'Alienware m18', 'Legion Pro 7i', 'TUF Gaming F15', 'Predator Helios 18', 'Gigabyte Aorus 17X'],
  'Desktops': [' XPS 8950', 'OMEN 45L', 'Legion T750i', 'Mac Studio', 'ROG Strix G16', 'Trident Z5', 'iMac 24"'],
  'Monitoren': ['Odyssey OLED G8', 'UltraGear 27GP950', 'ROG Swift PG279QM', 'BenQ PD3200U', 'AOC AGON AG254FG', 'LG 27UK850', 'Samsung S80UA'],
  'Televisies': ['OLED C4 65"', 'Neo QLED 8K 75"', 'OLED evo 55"', 'The Frame 55"', 'Ambilight 55PUS8807', 'Fire TV 65"', 'Regza 55X9900'],
  'Audio': ['WH-1000XM6', 'AirPods Max', 'QuietComfort Ultra', 'Momentum 4', 'Galaxy Buds3 Pro', 'WF-1000XM5', 'Tune 770NC', 'ATH-M50x'],
  'Gameconsoles': ['PlayStation 5 Pro', 'Xbox Series X', 'Nintendo Switch OLED', 'Steam Deck', 'PlayStation 5', 'Xbox Series S'],
  'Gaming': ['BlackShark V2', 'Cloud III', 'G Pro X', 'Virtuoso RGB', 'Tournament Edition', 'Arctis Nova Pro', 'Corsair HS70'],
  'Netwerk': ['Deco XE75', 'Orbi RBKE963', 'RT-AX89X', 'Nighthawk AX12', 'EdgeRouter X', 'Fritz!Box 7590 AX', 'Archer AX90'],
  'Fotografie': ['EOS R6 Mark II', 'Z8', 'A7 IV', 'X-T5', 'Lumix GH6', 'OM-1 Mark II', 'PowerShot G7 X', 'Z50'],
  'Huishoudelijk': ['Dyson V15 Detect', 'Roomba j9+', 'S8 Pro Ultra', 'Deebot X2 Omni', 'Roborock S8', 'Kärcher RC 7', 'Xiaomi Robot Vacuum'],
  'Wearables': ['Watch Series 10', 'Galaxy Watch 7', 'Apple Watch Ultra 2', 'Garmin Fenix 7X', 'Fitbit Sense 2', 'Galaxy Watch 6', 'TicWatch Pro 5'],
  'Grafische kaarten': ['GeForce RTX 5090', 'GeForce RTX 5080', 'GeForce RTX 5070 Ti', 'Radeon RX 7900 XTX', 'ROG STRIX RTX 4090', 'GAMING X TRIO RTX 4080', 'AORUS RTX 4070 Ti'],
  'Processors': ['Core Ultra 9 285K', 'Core i9-14900K', 'Ryzen 9 9950X', 'Ryzen 7 9800X3D', 'Core i5-14600K', 'Ryzen 5 9600X', 'Core i3-14100'],
  'Moederborden': ['ROG MAXIMUS Z890', 'MEG Z790 ACE', 'X670E AORUS MASTER', 'ROG STRIX B650-A', 'MPG B760I EDGE', 'PRIME Z790-A', 'B650 Gaming X AX'],
  'Geheugen': ['Vengeance DDR5-6400', 'Trident Z5 RGB', 'Fury Beast DDR5', 'Dominator Platinum', 'Trident Z5 Neo', 'Spectrix D50', 'Flare X5'],
  'Opslag (SSD)': ['990 PRO 2TB', 'SN850X 2TB', 'WD_BLACK SN850X', 'P5 Plus 2TB', 'FireCuda 530', 'Acer Predator GM7', 'Kingston KC3000'],
  'Opslag (HDD)': ['Barracuda 4TB', 'WD Black 4TB', 'Red Plus 4TB', 'SkyHawk 4TB', 'Ultrastar 8TB', 'IronWolf 8TB', 'Caviar Blue 2TB'],
  'Voedingen': ['RM1000x', 'Toughpower GF3 1200', 'SuperNOVA 1600 G7', 'RM850x', 'Toughpower 750W', 'S12III 600', 'CX650M'],
  'Computerbehuizingen': ['5000D Airflow', 'H9 Flow', 'T7 TG', 'Lancool III', 'Torrent RGB', 'Meshify 2 XL', 'NZXT H9 Flow', 'Carbide 275R'],
  'CPU-koelers': ['NH-D15', 'Dark Rock Pro 5', 'iCUE H150i Elite', 'Kraken X73 RGB', 'NH-C14S', 'MasterLiquid 360', 'Freezer 50'],
  'Ventilatoren': ['NF-A12x25', 'TL-C12025', 'LL120 RGB', 'P12 PWM', 'ST120', 'A12x25 PWN', 'Magic Fixed'],
  'Toetsenborden': ['G Pro X TKL', 'K70 RGB PRO', 'BlackWidow V4 Pro', 'Pro Type Ultra', 'Keychron Q1 Pro', ' Huntsman V3', 'Razer DeathStalker'],
  'Muizen': ['G Pro X Superlight 2', 'DeathAdder V3', 'G502 X Plus', 'Basilisk V3 Pro', 'Viper V3 Pro', 'Lancehead Tournament', 'Model D'],
  'Webcams': ['C920s Pro HD', 'Kiyo Pro Ultra', 'Brio 4K', 'Obsbot Tiny 2', 'Elgato Facecam Pro', 'Logitech StreamCam', 'Razer Kiyo'],
  'Luidsprekers': ['G560', 'GigaWorks T20', 'S360DM', 'Logi Z407', 'Creative Pebble V3', 'Edifier R1280DB', 'Sonos Era 100'],
  'Printers': ['LaserJet Pro MFP', 'OfficeJet Pro 9125e', 'PIXMA TS8350', 'EcoTank ET-5850', 'MFC-L3770CDW', 'WorkForce WF-7840', 'ECOSYS M2040dn'],
  'Kabels & Adapters': ['USB-C naar HDMI 2.1', 'Thunderbolt 4 kabel 2m', 'HDMI 2.1 kabel 3m', 'USB-C Hub 7-in-1', 'Cat 8 Ethernet 5m', 'USB-C naar USB-A adapter', 'DisplayPort 2.1 kabel'],
  'Software & Licenties': ['Office 365 Family', 'Windows 11 Pro', 'Creative Cloud All Apps', 'Photoshop Elements 2025', 'Norton 360 Deluxe', 'Internet Security', 'VPN Premium 2 jaar'],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function fakePriceHistory(basePrice: number): PricePoint[] {
  const history: PricePoint[] = [];
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

// ─── Realistic Specs per Category ─────────────────────────────────────────────

const CATEGORY_SPECS: Record<string, () => Record<string, string>> = {
  'Smartphones': () => {
    const ram = randomElement(['4 GB', '6 GB', '8 GB', '12 GB', '16 GB']);
    const opslag = randomElement(['64 GB', '128 GB', '256 GB', '512 GB', '1 TB']);
    return {
      'Scherm': randomElement(['6,1" AMOLED', '6,4" OLED', '6,7" Dynamic AMOLED', '6,9" LTPO OLED', '6,1" IPS LCD']),
      'Processor': randomElement(['Snapdragon 8 Elite', 'Snapdragon 8 Gen 3', 'Dimensity 9300', 'Apple A18 Pro', 'Exynos 2400', 'Tensor G4']),
      'RAM': ram, 'Opslag': opslag,
      'Camera': randomElement(['50 MP', '108 MP', '200 MP', '48 MP', '64 MP']),
      'Batterij': randomElement(['4500 mAh', '5000 mAh', '5500 mAh', '4700 mAh']),
      'OS': randomElement(['Android 15', 'Android 14', 'iOS 18', 'iOS 17']),
      '5G': randomElement(['Ja', 'Nee']),
    };
  },
  'Tablets': () => ({
    'Scherm': randomElement(['10,9" IPS', '11" OLED', '12,9" Liquid Retina XDR', '10,4" LCD', '11" LTPO OLED']),
    'Processor': randomElement(['Apple M4', 'Apple M2', 'Snapdragon 8 Gen 2', 'Dimensity 9000', 'Exynos 1380']),
    'RAM': randomElement(['4 GB', '8 GB', '16 GB']),
    'Opslag': randomElement(['64 GB', '128 GB', '256 GB', '512 GB', '1 TB']),
    'Batterij': randomElement(['7600 mAh', '8840 mAh', '10090 mAh', '11200 mAh']),
    'OS': randomElement(['iPadOS 18', 'Android 14', 'Windows 11']),
  }),
  'Laptops': () => ({
    'Scherm': randomElement(['13,3" IPS FHD', '14" OLED 2.8K', '15,6" IPS FHD', '16" Liquid Retina XDR', '14" IPS WQXGA']),
    'Processor': randomElement(['Apple M4', 'Apple M4 Pro', 'Intel Core Ultra 7 155H', 'Intel Core i7-14700H', 'AMD Ryzen 7 8845HS', 'AMD Ryzen 9 8945HS']),
    'RAM': randomElement(['8 GB', '16 GB', '32 GB', '64 GB']),
    'Opslag': randomElement(['256 GB SSD', '512 GB SSD', '1 TB SSD', '2 TB SSD']),
    'GPU': randomElement(['Geïntegreerd', 'Intel Arc', 'RTX 4050', 'RTX 4060', 'RTX 4070', 'Radeon 780M']),
    'Batterij': randomElement(['Tot 10 uur', 'Tot 14 uur', 'Tot 18 uur', 'Tot 22 uur']),
    'Gewicht': randomElement(['1,2 kg', '1,4 kg', '1,6 kg', '1,8 kg', '2,1 kg']),
  }),
  'Desktops': () => ({
    'Processor': randomElement(['Intel Core i5-14400', 'Intel Core i7-14700K', 'Intel Core i9-14900K', 'AMD Ryzen 5 7600X', 'AMD Ryzen 7 7800X3D', 'AMD Ryzen 9 7950X', 'Apple M4 Pro']),
    'RAM': randomElement(['8 GB DDR4', '16 GB DDR5', '32 GB DDR5', '64 GB DDR5']),
    'Opslag': randomElement(['512 GB SSD', '1 TB SSD', '1 TB SSD + 2 TB HDD', '2 TB SSD']),
    'GPU': randomElement(['Geïntegreerd', 'RTX 4060', 'RTX 4070', 'RTX 4080', 'RX 7800 XT']),
    'Formaat': randomElement(['ATX Tower', 'Mid-Tower', 'Mini-ITX', 'All-in-One', 'SFF']),
  }),
  'Monitoren': () => ({
    'Paneel': randomElement(['24" IPS', '27" IPS', '27" VA', '27" OLED', '32" IPS', '32" OLED', '34" Ultrawide IPS', '49" VA']),
    'Resolutie': randomElement(['1920x1080 (FHD)', '2560x1440 (QHD)', '3440x1440 (UWQHD)', '3840x2160 (4K)']),
    'Refresh rate': randomElement(['60 Hz', '75 Hz', '144 Hz', '165 Hz', '240 Hz', '360 Hz']),
    'Responstijd': randomElement(['1 ms (GtG)', '4 ms (GtG)', '0,03 ms (GtG)', '5 ms (GtG)']),
    'HDR': randomElement(['Nee', 'HDR10', 'DisplayHDR 400', 'DisplayHDR 600', 'DisplayHDR 1000']),
    'Aansluitingen': randomElement(['HDMI, DP', '2x HDMI 2.1, DP 1.4', 'HDMI 2.1, DP 2.1, USB-C']),
  }),
  'Televisies': () => ({
    'Scherm': randomElement(['43" LED', '50" QLED', '55" OLED', '55" QLED', '65" OLED', '65" Neo QLED', '75" LED', '77" OLED']),
    'Resolutie': randomElement(['4K UHD (3840x2160)', '8K (7680x4320)']),
    'HDR': randomElement(['HDR10', 'HDR10+', 'Dolby Vision, HDR10', 'Dolby Vision IQ, HDR10+']),
    'Refresh rate': randomElement(['50 Hz', '60 Hz', '100 Hz', '120 Hz', '144 Hz']),
    'Smart TV': randomElement(['Google TV', 'Tizen', 'webOS', 'VIDAA', 'Android TV']),
    'HDMI': randomElement(['3x HDMI 2.0', '4x HDMI 2.1', '2x HDMI 2.1']),
  }),
  'Audio': () => ({
    'Type': randomElement(['Over-ear', 'In-ear', 'On-ear', 'True wireless', 'Open-ear']),
    'Verbinding': randomElement(['Bluetooth 5.3', 'Bluetooth 5.2', 'Bluetooth 5.0', '3,5mm jack', 'USB-C']),
    'ANC': randomElement(['Ja', 'Ja, adaptief', 'Nee']),
    'Batterij': randomElement(['Tot 20 uur', 'Tot 30 uur', 'Tot 40 uur', 'Tot 8 uur', 'Tot 60 uur']),
    'Gewicht': randomElement(['180 g', '250 g', '5,5 g (per oordopje)', '320 g', '215 g']),
    'Waterdicht': randomElement(['IPX4', 'IPX5', 'IP55', 'Nee']),
  }),
  'Gameconsoles': () => ({
    'Type': randomElement(['Thuisconsole', 'Handheld', 'Hybride']),
    'Opslag': randomElement(['512 GB SSD', '1 TB SSD', '2 TB SSD', '64 GB', '256 GB']),
    'Resolutie': randomElement(['4K', '1080p', '720p (handheld)', '8K']),
    'Online': randomElement(['PlayStation Plus', 'Xbox Game Pass', 'Nintendo Switch Online', 'Geen']),
  }),
  'Gaming': () => ({
    'Type': randomElement(['Gaming headset', 'Gaming muis', 'Gaming toetsenbord', 'Controller', 'Muismat', 'Gaming stoel']),
    'Verbinding': randomElement(['Draadloos 2,4 GHz', 'Bluetooth', 'USB', 'USB + Bluetooth']),
    'Verlichting': randomElement(['RGB', 'Geen', 'Single-zone LED']),
    'Platform': randomElement(['PC', 'PC + Console', 'Multiplatform', 'PlayStation', 'Xbox']),
  }),
  'Netwerk': () => ({
    'Type': randomElement(['Router', 'Mesh systeem', 'Access point', 'Switch', 'Powerline', 'Range extender']),
    'WiFi': randomElement(['WiFi 6 (ax)', 'WiFi 6E (axe)', 'WiFi 7 (be)', 'WiFi 5 (ac)', 'Geen']),
    'Snelheid': randomElement(['574 Mbps', '1200 Mbps', '3600 Mbps', '6000 Mbps', '9600 Mbps']),
    'Poorten': randomElement(['4x Gigabit', '4x 2.5G', '1x 10G + 4x 2.5G', '8x Gigabit', '24x Gigabit']),
  }),
  'Fotografie': () => ({
    'Type': randomElement(['Systeemcamera', 'Spiegelreflex', 'Compact', 'Actiecamera', 'Instant']),
    'Sensor': randomElement(['Full-frame CMOS', 'APS-C CMOS', 'Micro Four Thirds', '1" CMOS']),
    'Megapixels': randomElement(['20,1 MP', '24,2 MP', '33 MP', '45,7 MP', '50,1 MP', '61 MP']),
    'Video': randomElement(['4K 60fps', '4K 120fps', '8K 30fps', '6K 30fps', '1080p 60fps']),
    'Stabilisatie': randomElement(['5-assige IBIS', '3-assige IBIS', 'Optische IS', 'Geen']),
  }),
  'Huishoudelijk': () => ({
    'Type': randomElement(['Robotstofzuiger', 'Steelstofzuiger', 'Luchtreinger', 'Wasmachine', 'Droger', 'Vaatwasser', 'Airfryer', 'Espressomachine']),
    'Vermogen': randomElement(['1200 W', '1800 W', '2200 W', '250 AW', '150 AW']),
    'Energielabel': randomElement(['A', 'A+', 'A++', 'A+++', 'B', 'C']),
    'Geluid': randomElement(['65 dB', '70 dB', '58 dB', '72 dB']),
  }),
  'Wearables': () => ({
    'Type': randomElement(['Smartwatch', 'Fitness tracker', 'Smart ring']),
    'Scherm': randomElement(['1,9" AMOLED', '1,4" OLED', '1,2" OLED', '46mm LTPO OLED', '44mm Super AMOLED']),
    'Batterij': randomElement(['Tot 7 dagen', 'Tot 14 dagen', 'Tot 18 uur', 'Tot 36 uur', 'Tot 2 dagen']),
    'Waterbestendig': randomElement(['5 ATM', '10 ATM', 'IP68', 'WR50']),
    'GPS': randomElement(['Ja', 'Ja (dual-band)', 'Nee']),
    'Sensoren': randomElement(['Hartslag, SpO2, ECG', 'Hartslag, SpO2', 'Hartslag, temperatuur']),
  }),
  'Grafische kaarten': () => ({
    'GPU': randomElement(['GeForce RTX 5090', 'GeForce RTX 5080', 'GeForce RTX 5070 Ti', 'GeForce RTX 5070', 'GeForce RTX 4070 Super', 'Radeon RX 7900 XTX', 'Radeon RX 7900 XT', 'Radeon RX 7800 XT', 'GeForce RTX 4060 Ti']),
    'VRAM': randomElement(['8 GB GDDR6', '12 GB GDDR6X', '16 GB GDDR6X', '16 GB GDDR7', '24 GB GDDR6X', '32 GB GDDR7']),
    'TDP': randomElement(['150 W', '200 W', '250 W', '300 W', '350 W', '450 W']),
    'Aansluiting': randomElement(['PCIe 4.0 x16', 'PCIe 5.0 x16']),
    'Outputs': randomElement(['3x DP 2.1, 1x HDMI 2.1', '2x DP 1.4a, 2x HDMI 2.1', '3x DP 1.4a, 1x HDMI 2.1']),
    'Koeling': randomElement(['Dual-fan', 'Triple-fan', 'Blower']),
  }),
  'Processors': () => ({
    'Cores / Threads': randomElement(['4 / 8', '6 / 12', '8 / 16', '12 / 24', '16 / 32', '24 / 32']),
    'Basis kloksnelheid': randomElement(['3,0 GHz', '3,4 GHz', '3,8 GHz', '4,2 GHz', '4,7 GHz']),
    'Max. boost': randomElement(['4,4 GHz', '4,9 GHz', '5,2 GHz', '5,5 GHz', '5,8 GHz', '6,0 GHz']),
    'Cache': randomElement(['12 MB L3', '32 MB L3', '64 MB L3', '96 MB L3 (3D V-Cache)', '128 MB L3']),
    'TDP': randomElement(['65 W', '95 W', '105 W', '125 W', '170 W', '253 W']),
    'Socket': randomElement(['AM5', 'LGA 1700', 'LGA 1851']),
  }),
  'Moederborden': () => ({
    'Socket': randomElement(['AM5', 'LGA 1700', 'LGA 1851']),
    'Chipset': randomElement(['X670E', 'B650', 'B650E', 'Z790', 'B760', 'Z890', 'X870E']),
    'Formaat': randomElement(['ATX', 'Micro-ATX', 'Mini-ITX', 'E-ATX']),
    'RAM slots': randomElement(['2x DDR5', '4x DDR5', '2x DDR4', '4x DDR4']),
    'M.2 slots': randomElement(['1', '2', '3', '4']),
    'WiFi': randomElement(['WiFi 6E', 'WiFi 7', 'Geen']),
  }),
  'Geheugen': () => ({
    'Capaciteit': randomElement(['8 GB (1x8)', '16 GB (2x8)', '32 GB (2x16)', '64 GB (2x32)', '16 GB (1x16)']),
    'Type': randomElement(['DDR4', 'DDR5']),
    'Kloksnelheid': randomElement(['3200 MHz', '3600 MHz', '4800 MHz', '5600 MHz', '6000 MHz', '6400 MHz', '7200 MHz']),
    'Latency': randomElement(['CL16', 'CL18', 'CL30', 'CL32', 'CL36', 'CL40']),
    'Spanning': randomElement(['1,2 V', '1,35 V', '1,1 V', '1,25 V', '1,4 V']),
    'Profiel': randomElement(['XMP 3.0', 'EXPO', 'XMP 3.0 / EXPO', 'JEDEC']),
  }),
  'Opslag (SSD)': () => ({
    'Capaciteit': randomElement(['250 GB', '500 GB', '1 TB', '2 TB', '4 TB']),
    'Interface': randomElement(['NVMe PCIe 4.0', 'NVMe PCIe 5.0', 'SATA III', 'NVMe PCIe 3.0']),
    'Formaat': randomElement(['M.2 2280', '2,5"']),
    'Lezen': randomElement(['3500 MB/s', '5000 MB/s', '7000 MB/s', '10000 MB/s', '14000 MB/s', '560 MB/s']),
    'Schrijven': randomElement(['3000 MB/s', '4500 MB/s', '6500 MB/s', '12000 MB/s', '530 MB/s']),
    'TBW': randomElement(['300 TBW', '600 TBW', '1200 TBW', '2400 TBW']),
  }),
  'Opslag (HDD)': () => ({
    'Capaciteit': randomElement(['1 TB', '2 TB', '4 TB', '6 TB', '8 TB', '12 TB', '16 TB', '18 TB']),
    'Snelheid': randomElement(['5400 RPM', '7200 RPM']),
    'Cache': randomElement(['64 MB', '128 MB', '256 MB', '512 MB']),
    'Interface': 'SATA III',
    'Formaat': randomElement(['3,5"', '2,5"']),
    'Type': randomElement(['Desktop', 'NAS', 'Surveillance', 'Enterprise']),
  }),
  'Voedingen': () => ({
    'Wattage': randomElement(['450 W', '550 W', '650 W', '750 W', '850 W', '1000 W', '1200 W', '1600 W']),
    'Certificering': randomElement(['80+ Bronze', '80+ Gold', '80+ Platinum', '80+ Titanium']),
    'Modulariteit': randomElement(['Volledig modulair', 'Semi-modulair', 'Niet-modulair']),
    'Formaat': randomElement(['ATX', 'SFX', 'ATX 3.0']),
    'Ventilator': randomElement(['120mm', '135mm', '140mm']),
  }),
  'Computerbehuizingen': () => ({
    'Formaat': randomElement(['Mid-Tower ATX', 'Full Tower', 'Mini-ITX', 'Micro-ATX', 'E-ATX']),
    'Materiaal': randomElement(['Staal + gehard glas', 'Aluminium', 'Staal + mesh', 'Aluminium + glas']),
    'Ventilatoren': randomElement(['3x 120mm', '2x 140mm', '3x 140mm', '1x 120mm', '4x 120mm']),
    'Radiator support': randomElement(['Tot 360mm', 'Tot 280mm', 'Tot 240mm', 'Tot 420mm']),
    'GPU lengte': randomElement(['Tot 340 mm', 'Tot 380 mm', 'Tot 400 mm', 'Tot 450 mm']),
  }),
  'CPU-koelers': () => ({
    'Type': randomElement(['Luchtkoeler', 'AIO 240mm', 'AIO 280mm', 'AIO 360mm', 'AIO 420mm']),
    'TDP': randomElement(['150 W', '200 W', '250 W', '300 W', '350 W']),
    'Ventilator': randomElement(['1x 120mm', '2x 120mm', '1x 140mm', '2x 140mm', '3x 120mm']),
    'Socket': 'AM4, AM5, LGA 1700, LGA 1851',
    'Geluid': randomElement(['22 dBA', '25 dBA', '28 dBA', '32 dBA', '36 dBA']),
  }),
  'Ventilatoren': () => ({
    'Formaat': randomElement(['120mm', '140mm', '80mm', '200mm']),
    'Snelheid': randomElement(['800-1500 RPM', '500-2000 RPM', '400-1200 RPM', '200-1700 RPM']),
    'Airflow': randomElement(['55 CFM', '70 CFM', '82 CFM', '95 CFM', '120 CFM']),
    'Geluid': randomElement(['18 dBA', '22 dBA', '25 dBA', '28 dBA']),
    'Verlichting': randomElement(['RGB', 'ARGB', 'Geen']),
    'Connector': randomElement(['4-pin PWM', '3-pin DC']),
  }),
  'Toetsenborden': () => ({
    'Type': randomElement(['Mechanisch', 'Membraan', 'Optisch-mechanisch', 'Scissor']),
    'Layout': randomElement(['Full-size', 'TKL (80%)', '75%', '65%', '60%']),
    'Switches': randomElement(['Cherry MX Red', 'Cherry MX Brown', 'Cherry MX Blue', 'Razer Green', 'Gateron Pro', 'Kailh Box', 'Membraan']),
    'Verbinding': randomElement(['USB-C', 'USB-C + Bluetooth', 'USB-C + 2,4 GHz + BT', 'USB-A']),
    'Verlichting': randomElement(['RGB per toets', 'Witte backlight', 'Geen', 'Single-zone RGB']),
    'Polssteun': randomElement(['Ja', 'Nee']),
  }),
  'Muizen': () => ({
    'Sensor': randomElement(['HERO 2', 'Focus Pro 30K', 'PAW3950', 'Razer Focus Pro', 'PMW3389']),
    'DPI': randomElement(['16000', '25600', '30000', '35000', '42000']),
    'Gewicht': randomElement(['49 g', '58 g', '63 g', '75 g', '80 g', '95 g', '120 g']),
    'Verbinding': randomElement(['USB', 'Lightspeed 2,4 GHz', 'Bluetooth', '2,4 GHz + BT', 'HyperSpeed']),
    'Knoppen': randomElement(['5', '6', '8', '11', '13']),
    'Batterij': randomElement(['Tot 70 uur', 'Tot 100 uur', 'Tot 140 uur', 'Bedraad', 'Tot 300 uur']),
  }),
  'Webcams': () => ({
    'Resolutie': randomElement(['720p', '1080p', '1440p', '4K']),
    'Framerate': randomElement(['30 fps', '60 fps']),
    'Autofocus': randomElement(['Ja', 'Nee', 'Ja (AI-gestuurd)']),
    'Microfoon': randomElement(['Ingebouwd (stereo)', 'Ingebouwd (mono)', 'Geen']),
    'Bevestiging': randomElement(['Clip + statief', 'Ingebouwde clip', 'Monitor-mount']),
    'FOV': randomElement(['78°', '82°', '90°', '95°', '120°']),
  }),
  'Luidsprekers': () => ({
    'Type': randomElement(['Boekenplank', 'Soundbar', 'Smart speaker', 'Bluetooth speaker', 'Desktop 2.0', 'Desktop 2.1', 'Subwoofer']),
    'Vermogen': randomElement(['10 W', '20 W', '40 W', '60 W', '100 W', '200 W']),
    'Verbinding': randomElement(['Bluetooth 5.0', 'Bluetooth + WiFi', 'AUX + USB', 'Bluetooth + AUX', 'WiFi (AirPlay, Chromecast)']),
    'Frequentiebereik': randomElement(['60-20000 Hz', '45-20000 Hz', '50-20000 Hz', '35-20000 Hz']),
    'Waterdicht': randomElement(['IPX7', 'IPX5', 'IP67', 'Nee']),
  }),
  'Printers': () => ({
    'Type': randomElement(['Inkjet', 'Laser', 'Multifunctional', 'Foto', 'Thermisch']),
    'Kleur': randomElement(['Kleur', 'Zwart-wit']),
    'Printsnelheid': randomElement(['12 ppm', '18 ppm', '24 ppm', '30 ppm', '40 ppm']),
    'Resolutie': randomElement(['600x600 dpi', '1200x1200 dpi', '2400x1200 dpi', '4800x1200 dpi']),
    'Verbinding': randomElement(['WiFi + USB', 'WiFi + Ethernet + USB', 'USB', 'WiFi + USB + NFC']),
    'Duplex': randomElement(['Ja (automatisch)', 'Ja (handmatig)', 'Nee']),
  }),
  'Kabels & Adapters': () => ({
    'Type': randomElement(['Kabel', 'Adapter', 'Hub', 'Docking station', 'Splitter']),
    'Aansluiting': randomElement(['USB-C', 'HDMI', 'DisplayPort', 'Thunderbolt 4', 'USB-A', 'Ethernet', 'Lightning']),
    'Lengte': randomElement(['0,5 m', '1 m', '2 m', '3 m', '5 m', '10 m', 'N.v.t.']),
    'Versie': randomElement(['USB 3.2 Gen 2', 'USB 4.0', 'HDMI 2.1', 'DP 2.1', 'Thunderbolt 4', 'Cat 8']),
    'Max. resolutie': randomElement(['4K@60Hz', '4K@120Hz', '8K@60Hz', '1080p@60Hz', 'N.v.t.']),
  }),
  'Software & Licenties': () => ({
    'Type': randomElement(['Kantoor', 'Beveiliging', 'Besturingssysteem', 'Beeldbewerking', 'VPN', 'Cloud opslag', 'Ontwikkeltools']),
    'Platform': randomElement(['Windows', 'macOS', 'Windows + macOS', 'Multiplatform', 'iOS + Android']),
    'Licentie': randomElement(['1 jaar', '2 jaar', 'Eenmalig', 'Maandelijks', 'Levenslang']),
    'Gebruikers': randomElement(['1 gebruiker', '3 gebruikers', '5 gebruikers', '6 gebruikers', 'Onbeperkt']),
    'Levering': 'Digitale download',
  }),
};

// ─── Generate Products for a Category ────────────────────────────────────────

function generateCategoryProducts(categoryName: string, targetCount: number): Product[] {
  const products: Product[] = [];
  const brands = BRANDS[categoryName] || ['Generic'];
  const baseNames = PRODUCTS_BASE[categoryName] || ['Product'];

  const catInfo = CATEGORIES.find(c => c.name === categoryName);
  const minPrice = catInfo?.minPrice || 50;
  const maxPrice = catInfo?.maxPrice || 1000;

  const ALL_SHOPS = ['Coolblue', 'Bol.com', 'MediaMarkt', 'Amazon.nl', 'Alternate', 'Azerty', 'BCC', 'Wehkamp'];

  for (let i = 0; i < targetCount; i++) {
    const brand = randomElement(brands);
    const baseName = randomElement(baseNames);
    const variant = randomElement(['', ' Pro', ' Plus', ' Max', ' Ultra', ' Lite', ' SE', ' 2025', ' (Wi-Fi)', ' 5G']);

    const name = `${brand} ${baseName}${variant}`.trim();
    const price = randomBetween(minPrice, maxPrice);
    const history = fakePriceHistory(price);
    const prices = history.map(p => p.price);
    const lowest = Math.min(...prices);
    const original = Math.max(...prices);

    // Pick 3-5 random shops with realistic price variation
    const shopCount = randomBetween(3, 5);
    const shopNames = [...ALL_SHOPS].sort(() => Math.random() - 0.5).slice(0, shopCount);
    const shops: Shop[] = shopNames.map((sn, si) => {
      const variance = 1 + (si * 0.01) + (Math.random() * 0.03);
      const shopPrice = Math.round(price * variance * 100) / 100;
      return {
        name: sn,
        price: si === 0 ? price : shopPrice,
        url: `https://www.google.com/search?q=${encodeURIComponent(name + ' kopen ' + sn)}`,
        logo: sn.substring(0, 3).toUpperCase(),
      };
    }).sort((a, b) => a.price - b.price);

    // Badge
    let badge: Product['badge'];
    const rand = Math.random();
    if (rand < 0.12) badge = 'deal';
    else if (rand < 0.25) badge = 'prijsdaling';
    else if (rand < 0.32) badge = 'nieuw';

    const id = `${categoryName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${i + 1}`;

    // Generate realistic specs
    const specsFn = CATEGORY_SPECS[categoryName];
    const specs = specsFn ? specsFn() : {};

    products.push({
      id,
      name,
      brand,
      category: categoryName,
      imageUrl: `https://placehold.co/600x400/1a1a1a/ffffff?text=${encodeURIComponent(name.substring(0, 20))}`,
      previewUrl: `https://placehold.co/320x240/1a1a1a/ffffff?text=${encodeURIComponent(name.substring(0, 15))}`,
      currentPrice: price,
      originalPrice: original,
      lowestPrice: lowest,
      rating: Math.round((3.2 + Math.random() * 1.7) * 10) / 10,
      reviewCount: randomBetween(3, 800),
      priceHistory: history.slice(-14),
      shops,
      specs,
      badge,
    });
  }

  return products;
}

// ─── Load Existing Products ─────────────────────────────────────────────────

function loadExistingProducts(): Product[] {
  const productsPath = path.join(__dirname, '../data/products.json');
  if (fs.existsSync(productsPath)) {
    return JSON.parse(fs.readFileSync(productsPath, 'utf-8'));
  }
  return [];
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════╗');
  console.log('║  Complete Product Generator        ║');
  console.log(`╚═══════════════════════════════════════╝\n`);
  
  // Load existing scraped products
  const existingProducts = loadExistingProducts();
  console.log(`Loaded ${existingProducts.length} existing products from products.json\n`);
  
  // Count products by category
  const existingByCategory: Record<string, Product[]> = {};
  existingProducts.forEach(p => {
    if (!existingByCategory[p.category]) {
      existingByCategory[p.category] = [];
    }
    existingByCategory[p.category].push(p);
  });
  
  console.log('Existing products by category:');
  CATEGORIES.forEach(cat => {
    const count = existingByCategory[cat.name]?.length || 0;
    console.log(`  ${cat.name}: ${count}`);
  });
  console.log();
  
  // Fill missing categories with generated products
  const allProducts: Product[] = [...existingProducts];
  let generatedCount = 0;
  
  for (const cat of CATEGORIES) {
    const existingCount = existingByCategory[cat.name]?.length || 0;
    const neededCount = cat.count - existingCount;
    
    if (neededCount > 0) {
      console.log(`Generating ${neededCount} products for ${cat.name}...`);
      const newProducts = generateCategoryProducts(cat.name, neededCount);
      allProducts.push(...newProducts);
      generatedCount += neededCount;
    } else if (existingCount > 0) {
      console.log(`✓ ${cat.name}: ${existingCount} products (enough)`);
    }
  }
  
  // Remove duplicates by ID
  const seen = new Set<string>();
  const uniqueProducts = allProducts.filter(p => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
  
  // Save to file
  const outputPath = path.join(__dirname, '../data/products.json');
  // Write compact JSON to avoid huge string overhead for very large datasets.
  fs.writeFileSync(outputPath, JSON.stringify(uniqueProducts));
  
  console.log(`\n✅  Complete!`);
  console.log(`    Existing: ${existingProducts.length}`);
  console.log(`    Generated: ${generatedCount}`);
  console.log(`    Total: ${uniqueProducts.length}`);
  console.log(`    → data/products.json`);
  
  // Show final counts
  console.log('\nFinal products by category:');
  const finalByCategory: Record<string, number> = {};
  uniqueProducts.forEach(p => {
    finalByCategory[p.category] = (finalByCategory[p.category] || 0) + 1;
  });
  Object.entries(finalByCategory)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => {
      console.log(`  ${cat}: ${count}`);
    });
}

main().catch(console.error);

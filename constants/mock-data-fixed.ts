export type Product = {
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
  shops: { name: string; price: number; url: string; logo: string }[];
  specs: Record<string, string>;
  badge?: 'prijsdaling' | 'deal' | 'nieuw';
};

function shopSearchUrl(shopName: string, productName: string): string {
  const q = encodeURIComponent(productName);
  switch (shopName) {
    case 'Coolblue':
      return `https://www.coolblue.nl/zoeken?query=${q}`;
    case 'Bol.com':
      return `https://www.bol.com/nl/nl/s/?searchtext=${q}`;
    case 'MediaMarkt':
      return `https://www.mediamarkt.nl/nl/search.html?query=${q}`;
    case 'Amazon':
    case 'Amazon.nl':
      return `https://www.amazon.nl/s?k=${q}`;
    case 'Azerty':
      return `https://www.azerty.nl/zoekresultaten/?q=${q}`;
    case 'BCC':
      return `https://www.bcc.nl/zoeken/?q=${q}`;
    case 'Alternate':
      return `https://www.alternate.nl/listing.xhtml?q=${q}`;
    case 'Wehkamp':
      return `https://www.wehkamp.nl/zoeken/?query=${q}`;
    case 'Apple Store':
      return `https://www.apple.com/nl/shop/buy-${productName.toLowerCase().includes('watch') ? 'watch' : productName.toLowerCase().includes('macbook') ? 'mac/macbook-pro' : 'iphone'}`;
    case 'Samsung':
      return `https://www.samsung.com/nl/search/?searchvalue=${q}`;
    default:
      return `https://www.google.com/search?q=${q}+kopen`;
  }
}

export type Alert = {
  id: string;
  productId: string;
  productName: string;
  targetPrice: number;
  currentPrice: number;
  originalPrice?: number;
  triggered: boolean;
  triggeredAt?: string;
};

export type Category = {
  id: string;
  name: string;
  icon: string;
  count: number;
};

export const MOCK_PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Samsung Galaxy S25 Ultra',
    brand: 'Samsung',
    category: 'Smartphones',
    imageUrl: 'https://placehold.co/400x400/1A73E8/white?text=S25+Ultra',
    currentPrice: 1199,
    originalPrice: 1399,
    lowestPrice: 1149,
    rating: 4.5,
    reviewCount: 142,
    badge: 'prijsdaling',
    priceHistory: [
      { date: '2025-08-01', price: 1399 },
      { date: '2025-09-01', price: 1349 },
      { date: '2025-10-01', price: 1299 },
      { date: '2025-11-01', price: 1249 },
      { date: '2025-12-01', price: 1199 },
      { date: '2026-01-01', price: 1199 },
      { date: '2026-02-01', price: 1199 },
    ],
    shops: [
      { name: 'Coolblue', price: 1199, url: shopSearchUrl('Coolblue', 'Samsung Galaxy S25 Ultra'), logo: 'CB' },
      { name: 'Bol.com', price: 1219, url: shopSearchUrl('Bol.com', 'Samsung Galaxy S25 Ultra'), logo: 'BOL' },
      { name: 'MediaMarkt', price: 1249, url: shopSearchUrl('MediaMarkt', 'Samsung Galaxy S25 Ultra'), logo: 'MM' },
    ],
    specs: {
      'Scherm': '6,9" Dynamic AMOLED 2X',
      'Processor': 'Snapdragon 8 Elite',
      'RAM': '12 GB',
      'Opslag': '256 GB',
      'Camera': '200 MP',
      'Batterij': '5000 mAh',
      'OS': 'Android 15',
    },
  },
  {
    id: '2',
    name: 'Apple MacBook Pro 14" M4',
    brand: 'Apple',
    category: 'Laptops',
    imageUrl: 'https://placehold.co/400x400/555/white?text=MacBook+Pro',
    currentPrice: 1999,
    originalPrice: 1999,
    lowestPrice: 1899,
    rating: 4.8,
    reviewCount: 89,
    badge: 'nieuw',
    priceHistory: [
      { date: '2025-11-01', price: 1999 },
      { date: '2025-12-01', price: 1999 },
      { date: '2026-01-01', price: 1949 },
      { date: '2026-02-01', price: 1999 },
    ],
    shops: [
      { name: 'Apple Store', price: 1999, url: shopSearchUrl('Apple Store', 'MacBook Pro 14 M4'), logo: 'APL' },
      { name: 'Coolblue', price: 1999, url: shopSearchUrl('Coolblue', 'Apple MacBook Pro 14 M4'), logo: 'CB' },
      { name: 'Bol.com', price: 2049, url: shopSearchUrl('Bol.com', 'Apple MacBook Pro 14 M4'), logo: 'BOL' },
    ],
    specs: {
      'Scherm': '14,2" Liquid Retina XDR',
      'Processor': 'Apple M4',
      'RAM': '16 GB',
      'Opslag': '512 GB SSD',
      'GPU': '10-core GPU',
      'Batterij': 'Tot 24 uur',
      'OS': 'macOS Sequoia',
    },
  },
  {
    id: '3',
    name: 'Sony WH-1000XM6',
    brand: 'Sony',
    category: 'Audio',
    imageUrl: 'https://placehold.co/400x400/1A1A1A/white?text=WH-1000XM6',
    currentPrice: 299,
    originalPrice: 379,
    lowestPrice: 279,
    rating: 4.7,
    reviewCount: 231,
    badge: 'deal',
    priceHistory: [
      { date: '2025-10-01', price: 379 },
      { date: '2025-11-01', price: 349 },
      { date: '2025-12-01', price: 299 },
      { date: '2026-01-01', price: 319 },
      { date: '2026-02-01', price: 299 },
    ],
    shops: [
      { name: 'Coolblue', price: 299, url: shopSearchUrl('Coolblue', 'Sony WH-1000XM6'), logo: 'CB' },
      { name: 'MediaMarkt', price: 309, url: shopSearchUrl('MediaMarkt', 'Sony WH-1000XM6'), logo: 'MM' },
      { name: 'Bol.com', price: 299, url: shopSearchUrl('Bol.com', 'Sony WH-1000XM6'), logo: 'BOL' },
    ],
    specs: {
      'Type': 'Over-ear',
      'Verbinding': 'Bluetooth 5.3',
      'ANC': 'Ja, adaptief',
      'Batterij': 'Tot 30 uur (40 uur zonder ANC)',
      'Gewicht': '254 g',
      'Microfoon': 'Ingebouwd',
    },
  },
  {
    id: '4',
    name: 'LG OLED C4 55"',
    brand: 'LG',
    category: 'Televisies',
    imageUrl: 'https://placehold.co/400x400/003087/white?text=LG+OLED+C4',
    currentPrice: 1149,
    originalPrice: 1499,
    lowestPrice: 1099,
    rating: 4.6,
    reviewCount: 178,
    badge: 'prijsdaling',
    priceHistory: [
      { date: '2025-08-01', price: 1499 },
      { date: '2025-10-01', price: 1399 },
      { date: '2025-12-01', price: 1249 },
      { date: '2026-01-01', price: 1199 },
      { date: '2026-02-01', price: 1149 },
    ],
    shops: [
      { name: 'MediaMarkt', price: 1149, url: shopSearchUrl('MediaMarkt', 'LG OLED C4 55'), logo: 'MM' },
      { name: 'Coolblue', price: 1199, url: shopSearchUrl('Coolblue', 'LG OLED C4 55'), logo: 'CB' },
      { name: 'BCC', price: 1179, url: shopSearchUrl('BCC', 'LG OLED C4 55'), logo: 'BCC' },
    ],
    specs: {
      'Scherm': '55" OLED evo',
      'Resolutie': '4K UHD (3840x2160)',
      'HDR': 'Dolby Vision, HDR10',
      'Refresh rate': '120 Hz',
      'Smart TV': 'webOS 24',
      'HDMI': '4x HDMI 2.1',
    },
  },
  {
    id: '5',
    name: 'ASUS ROG Zephyrus G16',
    brand: 'ASUS',
    category: 'Gaming laptops',
    imageUrl: 'https://placehold.co/400x400/FF0000/white?text=ROG+G16',
    currentPrice: 1599,
    originalPrice: 1799,
    lowestPrice: 1549,
    rating: 4.4,
    reviewCount: 67,
    priceHistory: [
      { date: '2025-09-01', price: 1799 },
      { date: '2025-11-01', price: 1699 },
      { date: '2026-01-01', price: 1649 },
      { date: '2026-02-01', price: 1599 },
    ],
    shops: [
      { name: 'Coolblue', price: 1599, url: shopSearchUrl('Coolblue', 'ASUS ROG Zephyrus G16'), logo: 'CB' },
      { name: 'MediaMarkt', price: 1649, url: shopSearchUrl('MediaMarkt', 'ASUS ROG Zephyrus G16'), logo: 'MM' },
    ],
    specs: {
      'Processor': 'Intel Core Ultra 9 185H',
      'GPU': 'NVIDIA RTX 4070',
      'RAM': '32 GB DDR5',
      'Opslag': '1 TB NVMe SSD',
      'Scherm': '16" 2560x1600 240Hz',
      'Batterij': '90 Wh',
    },
  },
  {
    id: '6',
    name: 'Dyson V15 Detect',
    brand: 'Dyson',
    category: 'Huishoudelijk',
    imageUrl: 'https://placehold.co/400x400/CC7722/white?text=Dyson+V15',
    currentPrice: 649,
    originalPrice: 799,
    lowestPrice: 599,
    rating: 4.3,
    reviewCount: 312,
    badge: 'deal',
    priceHistory: [
      { date: '2025-08-01', price: 799 },
      { date: '2025-10-01', price: 749 },
      { date: '2025-12-01', price: 699 },
      { date: '2026-02-01', price: 649 },
    ],
    shops: [
      { name: 'Bol.com', price: 649, url: shopSearchUrl('Bol.com', 'Dyson V15 Detect'), logo: 'BOL' },
      { name: 'Coolblue', price: 699, url: shopSearchUrl('Coolblue', 'Dyson V15 Detect'), logo: 'CB' },
      { name: 'MediaMarkt', price: 679, url: shopSearchUrl('MediaMarkt', 'Dyson V15 Detect'), logo: 'MM' },
    ],
    specs: {
      'Type': 'Steelstofzuiger',
      'Zuigkracht': '240 AW',
      'Accu': 'Tot 60 min',
      'Filter': 'HEPA',
      'Gewicht': '3,1 kg',
    },
  },
  {
    id: '7',
    name: 'Nvidia GeForce RTX 5080',
    brand: 'Nvidia',
    category: 'Grafische kaarten',
    imageUrl: 'https://placehold.co/400x400/76B900/white?text=RTX+5080',
    currentPrice: 1149,
    originalPrice: 1299,
    lowestPrice: 1099,
    rating: 4.7,
    reviewCount: 54,
    badge: 'nieuw',
    priceHistory: [
      { date: '2026-01-01', price: 1299 },
      { date: '2026-02-01', price: 1149 },
    ],
    shops: [
      { name: 'Coolblue', price: 1149, url: shopSearchUrl('Coolblue', 'Nvidia GeForce RTX 5080'), logo: 'CB' },
      { name: 'MediaMarkt', price: 1199, url: shopSearchUrl('MediaMarkt', 'Nvidia GeForce RTX 5080'), logo: 'MM' },
      { name: 'Azerty', price: 1169, url: shopSearchUrl('Azerty', 'Nvidia GeForce RTX 5080'), logo: 'AZ' },
    ],
    specs: {
      'GPU': 'GB203',
      'VRAM': '16 GB GDDR7',
      'TDP': '360 W',
      'CUDA Cores': '10.752',
      'Bus breedte': '256-bit',
      'Aansluiting': 'PCIe 5.0 x16',
      'Outputs': '3x DP 2.1, 1x HDMI 2.1',
    },
  },
  {
    id: '8',
    name: 'AMD Ryzen 9 9950X',
    brand: 'AMD',
    category: 'Processors',
    imageUrl: 'https://placehold.co/400x400/ED1C24/white?text=Ryzen+9+9950X',
    currentPrice: 549,
    originalPrice: 699,
    lowestPrice: 529,
    rating: 4.8,
    reviewCount: 38,
    badge: 'prijsdaling',
    priceHistory: [
      { date: '2025-09-01', price: 699 },
      { date: '2025-11-01', price: 649 },
      { date: '2026-01-01', price: 599 },
      { date: '2026-02-01', price: 549 },
    ],
    shops: [
      { name: 'Azerty', price: 549, url: shopSearchUrl('Azerty', 'AMD Ryzen 9 9950X'), logo: 'AZ' },
      { name: 'Coolblue', price: 569, url: shopSearchUrl('Coolblue', 'AMD Ryzen 9 9950X'), logo: 'CB' },
      { name: 'Bol.com', price: 579, url: shopSearchUrl('Bol.com', 'AMD Ryzen 9 9950X'), logo: 'BOL' },
    ],
    specs: {
      'Cores / Threads': '16 / 32',
      'Basis kloksnelheid': '4,3 GHz',
      'Max. boost': '5,7 GHz',
      'Cache': '64 MB L3',
      'TDP': '170 W',
      'Socket': 'AM5',
      'Geheugen': 'DDR5-5200',
    },
  },
  {
    id: '9',
    name: 'Samsung Odyssey OLED G8 32"',
    brand: 'Samsung',
    category: 'Monitoren',
    imageUrl: 'https://placehold.co/400x400/1A73E8/white?text=Odyssey+G8',
    currentPrice: 799,
    originalPrice: 999,
    lowestPrice: 749,
    rating: 4.6,
    reviewCount: 93,
    badge: 'deal',
    priceHistory: [
      { date: '2025-08-01', price: 999 },
      { date: '2025-10-01', price: 899 },
      { date: '2025-12-01', price: 849 },
      { date: '2026-02-01', price: 799 },
    ],
    shops: [
      { name: 'Samsung', price: 799, url: shopSearchUrl('Samsung', 'Samsung Odyssey OLED G8 32'), logo: 'SAM' },
      { name: 'Coolblue', price: 829, url: shopSearchUrl('Coolblue', 'Samsung Odyssey OLED G8 32'), logo: 'CB' },
      { name: 'MediaMarkt', price: 849, url: shopSearchUrl('MediaMarkt', 'Samsung Odyssey OLED G8 32'), logo: 'MM' },
    ],
    specs: {
      'Paneel': '32" OLED',
      'Resolutie': '3840x2160 (4K)',
      'Refresh rate': '240 Hz',
      'Responstijd': '0,03 ms (GtG)',
      'HDR': 'DisplayHDR True Black 400',
      'Inputs': '2x HDMI 2.1, 1x DP 1.4',
      'USB-hub': 'Ja (USB-C 90W)',
    },
  },
  {
    id: '10',
    name: 'Apple Watch Series 10',
    brand: 'Apple',
    category: 'Wearables',
    imageUrl: 'https://placehold.co/400x400/555555/white?text=Watch+S10',
    currentPrice: 429,
    originalPrice: 459,
    lowestPrice: 399,
    rating: 4.5,
    reviewCount: 211,
    priceHistory: [
      { date: '2025-09-01', price: 459 },
      { date: '2025-11-01', price: 449 },
      { date: '2026-02-01', price: 429 },
    ],
    shops: [
      { name: 'Apple Store', price: 429, url: shopSearchUrl('Apple Store', 'Apple Watch Series 10'), logo: 'APL' },
      { name: 'Bol.com', price: 439, url: shopSearchUrl('Bol.com', 'Apple Watch Series 10'), logo: 'BOL' },
      { name: 'Coolblue', price: 429, url: shopSearchUrl('Coolblue', 'Apple Watch Series 10'), logo: 'CB' },
    ],
    specs: {
      'Scherm': '46mm LTPO OLED',
      'Processor': 'S10 chip',
      'Waterbestendig': 'WR50 + zwemmen',
      'GPS': 'L1 + L5 precisie-GPS',
      'Batterij': 'Tot 18 uur',
      'OS': 'watchOS 11',
      'Connectiviteit': 'Bluetooth 5.3, Wi-Fi 6, UWB',
    },
  },
  {
    id: '11',
    name: 'Google Pixel 9 Pro',
    brand: 'Google',
    category: 'Smartphones',
    imageUrl: 'https://placehold.co/400x400/4285F4/white?text=Pixel+9+Pro',
    currentPrice: 999,
    originalPrice: 1099,
    lowestPrice: 949,
    rating: 4.6,
    reviewCount: 128,
    badge: 'prijsdaling',
    priceHistory: [
      { date: '2025-09-01', price: 1099 },
      { date: '2025-11-01', price: 1049 },
      { date: '2026-01-01', price: 1019 },
      { date: '2026-02-01', price: 999 },
    ],
    shops: [
      { name: 'Bol.com', price: 999, url: shopSearchUrl('Bol.com', 'Google Pixel 9 Pro'), logo: 'BOL' },
      { name: 'Coolblue', price: 1019, url: shopSearchUrl('Coolblue', 'Google Pixel 9 Pro'), logo: 'CB' },
      { name: 'MediaMarkt', price: 1009, url: shopSearchUrl('MediaMarkt', 'Google Pixel 9 Pro'), logo: 'MM' },
    ],
    specs: {
      'Scherm': '6,3" LTPO OLED 120Hz',
      'Processor': 'Google Tensor G4',
      'RAM': '16 GB',
      'Opslag': '256 GB',
      'Camera': '50 MP + 48 MP + 48 MP',
      'Batterij': '4700 mAh',
      'OS': 'Android 15 (garantie 7jr)',
    },
  },
  {
    id: '12',
    name: 'Corsair Vengeance DDR5-6400 32GB',
    brand: 'Corsair',
    category: 'Geheugen',
    imageUrl: 'https://placehold.co/400x400/FFD700/black?text=DDR5+6400',
    currentPrice: 119,
    originalPrice: 169,
    lowestPrice: 109,
    rating: 4.4,
    reviewCount: 76,
    badge: 'deal',
    priceHistory: [
      { date: '2025-08-01', price: 169 },
      { date: '2025-10-01', price: 149 },
      { date: '2025-12-01', price: 129 },
      { date: '2026-02-01', price: 119 },
    ],
    shops: [
      { name: 'Azerty', price: 119, url: shopSearchUrl('Azerty', 'Corsair Vengeance DDR5-6400 32GB'), logo: 'AZ' },
      { name: 'Bol.com', price: 124, url: shopSearchUrl('Bol.com', 'Corsair Vengeance DDR5-6400 32GB'), logo: 'BOL' },
      { name: 'Alternate', price: 122, url: shopSearchUrl('Alternate', 'Corsair Vengeance DDR5-6400 32GB'), logo: 'ALT' },
    ],
    specs: {
      'Capaciteit': '2x 16 GB (32 GB kit)',
      'Type': 'DDR5',
      'Kloksnelheid': '6400 MHz',
      'Latency': 'CL32-39-39-76',
      'Spanning': '1,4 V',
      'Profiel': 'Intel XMP 3.0 / AMD EXPO',
      'Koeling': 'Aluminium heatspreader',
    },
  },
];

export const MOCK_ALERTS: Alert[] = [
  {
    id: 'a1',
    productId: '3',
    productName: 'Sony WH-1000XM6',
    targetPrice: 280,
    currentPrice: 279,
    originalPrice: 379,
    triggered: true,
    triggeredAt: '2026-02-20T10:30:00Z',
  },
  {
    id: 'a2',
    productId: '12',
    productName: 'Corsair Vengeance DDR5-6400 32GB',
    targetPrice: 105,
    currentPrice: 105,
    originalPrice: 169,
    triggered: true,
    triggeredAt: '2026-02-28T08:15:00Z',
  },
  {
    id: 'a3',
    productId: '1',
    productName: 'Samsung Galaxy S25 Ultra',
    targetPrice: 1099,
    currentPrice: 1199,
    originalPrice: 1399,
    triggered: false,
  },
  {
    id: 'a4',
    productId: '4',
    productName: 'LG OLED C4 55"',
    targetPrice: 999,
    currentPrice: 1149,
    originalPrice: 1499,
    triggered: false,
  },
  {
    id: 'a5',
    productId: '7',
    productName: 'Nvidia GeForce RTX 5080',
    targetPrice: 999,
    currentPrice: 1149,
    originalPrice: 1299,
    triggered: false,
  },
  {
    id: 'a6',
    productId: '8',
    productName: 'AMD Ryzen 9 9950X',
    targetPrice: 499,
    currentPrice: 549,
    originalPrice: 699,
    triggered: false,
  },
];

const CATEGORY_META: Record<string, { id: string; icon: string }> = {
  'Smartphones':          { id: 'smartphones',          icon: 'smartphone' },
  'Tablets':              { id: 'tablets',               icon: 'tablet-mac' },
  'Laptops':              { id: 'laptops',               icon: 'laptop' },
  'Desktops':             { id: 'desktops',              icon: 'desktop-windows' },
  'Monitoren':            { id: 'monitoren',             icon: 'monitor' },
  'Televisies':           { id: 'televisies',            icon: 'tv' },
  'Audio':                { id: 'audio',                 icon: 'headphones' },
  'Gameconsoles':         { id: 'gameconsoles',          icon: 'gamepad' },
  'Gaming':               { id: 'gaming',                icon: 'sports-esports' },
  'Netwerk':              { id: 'netwerk',               icon: 'router' },
  'Fotografie':           { id: 'fotografie',            icon: 'photo-camera' },
  'Huishoudelijk':        { id: 'huishoudelijk',         icon: 'home' },
  'Wearables':            { id: 'wearables',             icon: 'watch' },
  'Grafische kaarten':    { id: 'grafische-kaarten',     icon: 'memory' },
  'Processors':           { id: 'processors',            icon: 'developer-board' },
  'Moerborden':           { id: 'moerborden',           icon: 'developer-board' },
  'Geheugen':             { id: 'geheugen',             icon: 'memory' },
  'Opslag (SSD)':         { id: 'opslag-ssd',            icon: 'sd-storage' },
  'Opslag (HDD)':         { id: 'opslag-hdd',            icon: 'album' },
  'Voedingen':            { id: 'voedingen',             icon: 'power' },
  'Computerbehuizingen':  { id: 'computerbehuizingen',   icon: 'desktop-windows' },
  'CPU-koelers':          { id: 'cpu-koelers',           icon: 'ac-unit' },
  'Ventilatoren':         { id: 'ventilatoren',          icon: 'air' },
  'Toetsenborden':        { id: 'toetsenborden',         icon: 'keyboard' },
  'Muizen':               { id: 'muizen',               icon: 'mouse' },
  'Webcams':              { id: 'webcams',              icon: 'videocam' },
  'Luidsprekers':         { id: 'luidsprekers',         icon: 'speaker' },
};

// Static categories - counts will be updated dynamically by product-api
export const MOCK_CATEGORIES: Category[] = Object.entries(CATEGORY_META).map(([name, meta]) => ({
  id: meta.id,
  name,
  icon: meta.icon,
  count: 0,
}));

// Re-export for backward compatibility
export const mock_products = MOCK_PRODUCTS;
export const mockProducts = MOCK_PRODUCTS;

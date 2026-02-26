export type ShopLink = {
  name: string;
  price: number;
  url: string;
  logo: string;
  verified?: boolean;
};

export type ProductVariant = {
  id: string;
  label: string;
  type: 'kleur' | 'opslag' | 'model' | 'configuratie';
  price: number;
  shops: ShopLink[];
  imageUrl?: string;
  ean?: string;
};

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
  shops: ShopLink[];
  specs: Record<string, string>;
  badge?: 'prijsdaling' | 'deal' | 'nieuw';
  ean?: string;
  disclaimer?: string;
  variants?: ProductVariant[];
};

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
  // ─── Smartphones ──────────────────────────────────────────────────────────────
  {
    id: 'sm-1',
    name: 'Samsung Galaxy S25 Ultra 256GB',
    brand: 'Samsung',
    category: 'Smartphones',
    imageUrl: 'https://image.coolblue.nl/max/500x500/products/1949164',
    currentPrice: 1349,
    originalPrice: 1449,
    lowestPrice: 1299,
    rating: 4.5,
    reviewCount: 142,
    badge: 'prijsdaling',
    ean: '8806095668420',
    priceHistory: [
      { date: '2025-02-01', price: 1449 },
      { date: '2025-06-01', price: 1399 },
      { date: '2025-09-01', price: 1349 },
      { date: '2025-12-01', price: 1299 },
      { date: '2026-02-01', price: 1349 },
    ],
    shops: [
      { name: 'Coolblue', price: 1349, url: 'https://www.coolblue.nl/product/958933/samsung-galaxy-s25-ultra-256gb-zwart-5g.html', logo: 'CB', verified: true },
      { name: 'Bol.com', price: 1349, url: 'https://www.bol.com/nl/nl/p/samsung-galaxy-s25-ultra-256gb-zwart-5g/9300000189439900/', logo: 'BOL', verified: true },
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
    variants: [
      { id: 'sm-1-zwart', label: 'Titanium Zwart', type: 'kleur', price: 1349, shops: [{ name: 'Coolblue', price: 1349, url: 'https://www.coolblue.nl/product/958933/samsung-galaxy-s25-ultra-256gb-zwart-5g.html', logo: 'CB', verified: true }] },
      { id: 'sm-1-grijs', label: 'Titanium Grijs', type: 'kleur', price: 1349, shops: [{ name: 'Coolblue', price: 1349, url: 'https://www.coolblue.nl/product/958934/samsung-galaxy-s25-ultra-256gb-grijs-5g.html', logo: 'CB', verified: true }] },
      { id: 'sm-1-zilver', label: 'Titanium Zilver', type: 'kleur', price: 1349, shops: [{ name: 'Coolblue', price: 1349, url: 'https://www.coolblue.nl/product/958935/samsung-galaxy-s25-ultra-256gb-zilver-5g.html', logo: 'CB', verified: true }] },
      { id: 'sm-1-wit', label: 'Titanium Wit', type: 'kleur', price: 1349, shops: [{ name: 'Coolblue', price: 1349, url: 'https://www.coolblue.nl/product/958936/samsung-galaxy-s25-ultra-256gb-wit-5g.html', logo: 'CB', verified: true }] },
    ],
  },
  {
    id: 'sm-2',
    name: 'Apple iPhone 16 Pro 256GB',
    brand: 'Apple',
    category: 'Smartphones',
    imageUrl: 'https://image.coolblue.nl/max/500x500/products/1940560',
    currentPrice: 1129,
    originalPrice: 1229,
    lowestPrice: 1099,
    rating: 4.7,
    reviewCount: 312,
    badge: 'prijsdaling',
    ean: '0195949667985',
    priceHistory: [
      { date: '2025-09-01', price: 1229 },
      { date: '2025-11-01', price: 1199 },
      { date: '2026-01-01', price: 1149 },
      { date: '2026-03-01', price: 1129 },
    ],
    shops: [
      { name: 'Apple Store', price: 1229, url: 'https://www.apple.com/nl/shop/buy-iphone/iphone-16-pro', logo: 'APL', verified: true },
      { name: 'Coolblue', price: 1129, url: 'https://www.coolblue.nl/product/953037/apple-iphone-16-pro-256gb-black-titanium.html', logo: 'CB', verified: true },
      { name: 'Bol.com', price: 1129, url: 'https://www.bol.com/nl/nl/p/apple-iphone-16-pro-256gb-zwart-titanium/9300000189439947/', logo: 'BOL', verified: true },
    ],
    specs: {
      'Scherm': '6,3" Super Retina XDR OLED',
      'Processor': 'A18 Pro',
      'RAM': '8 GB',
      'Opslag': '256 GB',
      'Camera': '48 MP + 48 MP + 12 MP',
      'Batterij': '3582 mAh',
      'OS': 'iOS 18',
    },
    variants: [
      { id: 'sm-2-black', label: 'Black Titanium', type: 'kleur', price: 1129, shops: [{ name: 'Coolblue', price: 1129, url: 'https://www.coolblue.nl/product/953037/apple-iphone-16-pro-256gb-black-titanium.html', logo: 'CB', verified: true }] },
      { id: 'sm-2-desert', label: 'Desert Titanium', type: 'kleur', price: 1129, shops: [{ name: 'Coolblue', price: 1129, url: 'https://www.coolblue.nl/product/953035/apple-iphone-16-pro-256gb-desert-titanium.html', logo: 'CB', verified: true }] },
      { id: 'sm-2-natural', label: 'Natural Titanium', type: 'kleur', price: 1129, shops: [{ name: 'Coolblue', price: 1129, url: 'https://www.coolblue.nl/product/953036/apple-iphone-16-pro-256gb-natural-titanium.html', logo: 'CB', verified: true }] },
      { id: 'sm-2-white', label: 'White Titanium', type: 'kleur', price: 1129, shops: [{ name: 'Coolblue', price: 1129, url: 'https://www.coolblue.nl/product/953038/apple-iphone-16-pro-256gb-white-titanium.html', logo: 'CB', verified: true }] },
    ],
  },
  {
    id: 'sm-3',
    name: 'Google Pixel 9 Pro 256GB',
    brand: 'Google',
    category: 'Smartphones',
    imageUrl: 'https://image.coolblue.nl/max/500x500/products/1945200',
    currentPrice: 949,
    originalPrice: 1099,
    lowestPrice: 899,
    rating: 4.6,
    reviewCount: 128,
    badge: 'prijsdaling',
    priceHistory: [
      { date: '2025-09-01', price: 1099 },
      { date: '2025-11-01', price: 1049 },
      { date: '2026-01-01', price: 999 },
      { date: '2026-03-01', price: 949 },
    ],
    shops: [
      { name: 'Coolblue', price: 949, url: 'https://www.coolblue.nl/product/956831/google-pixel-9-pro-256gb-zwart-5g.html', logo: 'CB', verified: true },
      { name: 'MediaMarkt', price: 949, url: 'https://www.mediamarkt.nl/nl/product/_google-pixel-9-pro-256-gb-zwart-1870605.html', logo: 'MM', verified: true },
    ],
    specs: {
      'Scherm': '6,3" LTPO OLED 120Hz',
      'Processor': 'Google Tensor G4',
      'RAM': '16 GB',
      'Opslag': '256 GB',
      'Camera': '50 MP + 48 MP + 48 MP',
      'Batterij': '4700 mAh',
      'OS': 'Android 15',
    },
  },
  {
    id: 'sm-4',
    name: 'Samsung Galaxy S25 256GB',
    brand: 'Samsung',
    category: 'Smartphones',
    imageUrl: 'https://image.coolblue.nl/max/500x500/products/1949180',
    currentPrice: 899,
    originalPrice: 899,
    lowestPrice: 849,
    rating: 4.4,
    reviewCount: 98,
    badge: 'nieuw',
    priceHistory: [
      { date: '2025-02-01', price: 899 },
      { date: '2025-06-01', price: 879 },
      { date: '2025-11-01', price: 849 },
      { date: '2026-02-01', price: 899 },
    ],
    shops: [
      { name: 'Coolblue', price: 899, url: 'https://www.coolblue.nl/product/967062/samsung-galaxy-s25-256gb-zwart-5g.html', logo: 'CB', verified: true },
    ],
    specs: {
      'Scherm': '6,2" Dynamic AMOLED 2X',
      'Processor': 'Snapdragon 8 Elite',
      'RAM': '12 GB',
      'Opslag': '256 GB',
      'Camera': '50 MP + 12 MP + 10 MP',
      'Batterij': '4000 mAh',
      'OS': 'Android 15',
    },
  },

  // ─── Laptops ──────────────────────────────────────────────────────────────────
  {
    id: 'lp-1',
    name: 'Apple MacBook Pro 14" M4 16GB/512GB',
    brand: 'Apple',
    category: 'Laptops',
    imageUrl: 'https://image.coolblue.nl/max/500x500/products/1948100',
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
      { date: '2026-03-01', price: 1999 },
    ],
    shops: [
      { name: 'Apple Store', price: 1999, url: 'https://www.apple.com/nl/shop/buy-mac/macbook-pro/14-inch-m4', logo: 'APL', verified: true },
      { name: 'Coolblue', price: 1999, url: 'https://www.coolblue.nl/product/956915/apple-macbook-pro-14-inch-m4-10-core-cpu-10-core-gpu-16gb-512gb-spacezwart-qwerty.html', logo: 'CB', verified: true },
    ],
    specs: {
      'Scherm': '14,2" Liquid Retina XDR',
      'Processor': 'Apple M4 (10-core)',
      'RAM': '16 GB',
      'Opslag': '512 GB SSD',
      'GPU': '10-core GPU',
      'Batterij': 'Tot 24 uur',
      'OS': 'macOS Sequoia',
    },
    variants: [
      { id: 'lp-1-black', label: 'Space Zwart', type: 'kleur', price: 1999, shops: [{ name: 'Coolblue', price: 1999, url: 'https://www.coolblue.nl/product/956915/apple-macbook-pro-14-inch-m4-10-core-cpu-10-core-gpu-16gb-512gb-spacezwart-qwerty.html', logo: 'CB', verified: true }] },
    ],
  },
  {
    id: 'lp-2',
    name: 'Apple MacBook Pro 14" M4 Pro 24GB/512GB',
    brand: 'Apple',
    category: 'Laptops',
    imageUrl: 'https://image.coolblue.nl/max/500x500/products/1948110',
    currentPrice: 2499,
    originalPrice: 2499,
    lowestPrice: 2399,
    rating: 4.9,
    reviewCount: 67,
    badge: 'nieuw',
    priceHistory: [
      { date: '2025-11-01', price: 2499 },
      { date: '2025-12-01', price: 2449 },
      { date: '2026-02-01', price: 2499 },
    ],
    shops: [
      { name: 'Coolblue', price: 2499, url: 'https://www.coolblue.nl/product/956925/apple-macbook-pro-14-inch-m4-pro-12-core-cpu-16-core-gpu-24gb-512gb-spacezwart-qwerty.html', logo: 'CB', verified: true },
    ],
    specs: {
      'Scherm': '14,2" Liquid Retina XDR',
      'Processor': 'Apple M4 Pro (12-core CPU)',
      'RAM': '24 GB',
      'Opslag': '512 GB SSD',
      'GPU': '16-core GPU',
      'Batterij': 'Tot 24 uur',
      'OS': 'macOS Sequoia',
    },
  },
  {
    id: 'lp-3',
    name: 'Lenovo ThinkPad X1 Carbon Gen 12',
    brand: 'Lenovo',
    category: 'Laptops',
    imageUrl: 'https://image.coolblue.nl/max/500x500/products/1935000',
    currentPrice: 1649,
    originalPrice: 1899,
    lowestPrice: 1599,
    rating: 4.6,
    reviewCount: 52,
    badge: 'prijsdaling',
    priceHistory: [
      { date: '2025-09-01', price: 1899 },
      { date: '2025-11-01', price: 1799 },
      { date: '2026-01-01', price: 1699 },
      { date: '2026-03-01', price: 1649 },
    ],
    shops: [
      { name: 'Coolblue', price: 1649, url: 'https://www.coolblue.nl/product/941200/lenovo-thinkpad-x1-carbon-gen-12-21kc-i7-16gb-512gb.html', logo: 'CB', verified: true },
    ],
    specs: {
      'Processor': 'Intel Core Ultra 7 155U',
      'RAM': '16 GB LPDDR5x',
      'Opslag': '512 GB SSD',
      'Scherm': '14" 2880x1800 OLED',
      'Gewicht': '1,09 kg',
      'OS': 'Windows 11 Pro',
    },
  },

  // ─── Audio ────────────────────────────────────────────────────────────────────
  {
    id: 'au-1',
    name: 'Sony WH-1000XM5',
    brand: 'Sony',
    category: 'Audio',
    imageUrl: 'https://image.coolblue.nl/max/500x500/products/1889800',
    currentPrice: 225,
    originalPrice: 379,
    lowestPrice: 225,
    rating: 4.7,
    reviewCount: 3845,
    badge: 'deal',
    ean: '4548736143524',
    priceHistory: [
      { date: '2025-06-01', price: 379 },
      { date: '2025-09-01', price: 329 },
      { date: '2025-11-01', price: 279 },
      { date: '2026-01-01', price: 249 },
      { date: '2026-03-01', price: 225 },
    ],
    shops: [
      { name: 'Coolblue', price: 225, url: 'https://www.coolblue.nl/product/905648/sony-wh-1000xm5-zwart.html', logo: 'CB', verified: true },
      { name: 'MediaMarkt', price: 229, url: 'https://www.mediamarkt.nl/nl/product/_sony-wh-1000xm5-hoofdtelefoon-zwart-1724335.html', logo: 'MM', verified: true },
      { name: 'Bol.com', price: 225, url: 'https://www.bol.com/nl/nl/p/sony-wh-1000xm5-draadloze-koptelefoon-met-noise-cancelling-zwart/9300000096972714/', logo: 'BOL', verified: true },
    ],
    specs: {
      'Type': 'Over-ear',
      'Verbinding': 'Bluetooth 5.2',
      'ANC': 'Ja, adaptief',
      'Batterij': 'Tot 30 uur',
      'Gewicht': '250 g',
      'Driver': '30 mm',
    },
    variants: [
      { id: 'au-1-zwart', label: 'Zwart', type: 'kleur', price: 225, shops: [{ name: 'Coolblue', price: 225, url: 'https://www.coolblue.nl/product/905648/sony-wh-1000xm5-zwart.html', logo: 'CB', verified: true }] },
      { id: 'au-1-zilver', label: 'Zilver', type: 'kleur', price: 225, shops: [{ name: 'Coolblue', price: 225, url: 'https://www.coolblue.nl/product/905649/sony-wh-1000xm5-zilver.html', logo: 'CB', verified: true }] },
    ],
  },
  {
    id: 'au-2',
    name: 'Apple AirPods Pro 2 (USB-C)',
    brand: 'Apple',
    category: 'Audio',
    imageUrl: 'https://image.coolblue.nl/max/500x500/products/1920500',
    currentPrice: 249,
    originalPrice: 279,
    lowestPrice: 229,
    rating: 4.8,
    reviewCount: 1892,
    badge: 'deal',
    ean: '0194253939184',
    priceHistory: [
      { date: '2025-09-01', price: 279 },
      { date: '2025-11-01', price: 259 },
      { date: '2026-01-01', price: 249 },
      { date: '2026-03-01', price: 249 },
    ],
    shops: [
      { name: 'Apple Store', price: 249, url: 'https://www.apple.com/nl/shop/buy-airpods/airpods-pro-2', logo: 'APL', verified: true },
      { name: 'Coolblue', price: 249, url: 'https://www.coolblue.nl/product/932881/apple-airpods-pro-2-usb-c.html', logo: 'CB', verified: true },
    ],
    specs: {
      'Type': 'In-ear (true wireless)',
      'ANC': 'Ja, adaptief + Transparantiemodus',
      'Batterij': '6 uur (30 uur met case)',
      'Connectiviteit': 'Bluetooth 5.3, USB-C',
      'Waterbestendig': 'IP54',
      'Chip': 'H2',
    },
  },
  {
    id: 'au-3',
    name: 'JBL Charge 5',
    brand: 'JBL',
    category: 'Audio',
    imageUrl: 'https://image.coolblue.nl/max/500x500/products/1875200',
    currentPrice: 139,
    originalPrice: 189,
    lowestPrice: 129,
    rating: 4.5,
    reviewCount: 2156,
    badge: 'deal',
    priceHistory: [
      { date: '2025-08-01', price: 189 },
      { date: '2025-10-01', price: 169 },
      { date: '2025-12-01', price: 149 },
      { date: '2026-03-01', price: 139 },
    ],
    shops: [
      { name: 'Coolblue', price: 139, url: 'https://www.coolblue.nl/product/896123/jbl-charge-5-zwart.html', logo: 'CB', verified: true },
      { name: 'Bol.com', price: 145, url: 'https://www.bol.com/nl/nl/p/jbl-charge-5-bluetooth-speaker-zwart/9300000028938420/', logo: 'BOL', verified: true },
    ],
    specs: {
      'Type': 'Draagbare speaker',
      'Vermogen': '40 W',
      'Batterij': 'Tot 20 uur',
      'Waterbestendig': 'IP67',
      'Gewicht': '960 g',
    },
  },

  // ─── Televisies ───────────────────────────────────────────────────────────────
  {
    id: 'tv-1',
    name: 'LG OLED55C46LA (2024)',
    brand: 'LG',
    category: 'Televisies',
    imageUrl: 'https://image.coolblue.nl/max/500x500/products/1938500',
    currentPrice: 1149,
    originalPrice: 1549,
    lowestPrice: 1099,
    rating: 4.6,
    reviewCount: 178,
    badge: 'prijsdaling',
    priceHistory: [
      { date: '2025-06-01', price: 1549 },
      { date: '2025-09-01', price: 1399 },
      { date: '2025-12-01', price: 1249 },
      { date: '2026-03-01', price: 1149 },
    ],
    shops: [
      { name: 'Coolblue', price: 1149, url: 'https://www.coolblue.nl/product/946218/lg-oled55c46la-2024.html', logo: 'CB', verified: true },
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
    id: 'tv-2',
    name: 'Samsung QE65S95D (2024)',
    brand: 'Samsung',
    category: 'Televisies',
    imageUrl: 'https://image.coolblue.nl/max/500x500/products/1938600',
    currentPrice: 1999,
    originalPrice: 2699,
    lowestPrice: 1899,
    rating: 4.8,
    reviewCount: 94,
    badge: 'prijsdaling',
    priceHistory: [
      { date: '2025-06-01', price: 2699 },
      { date: '2025-09-01', price: 2399 },
      { date: '2025-12-01', price: 2099 },
      { date: '2026-03-01', price: 1999 },
    ],
    shops: [
      { name: 'Coolblue', price: 1999, url: 'https://www.coolblue.nl/product/943250/samsung-qe65s95d-2024.html', logo: 'CB', verified: true },
    ],
    specs: {
      'Scherm': '65" QD-OLED',
      'Resolutie': '4K UHD (3840x2160)',
      'HDR': 'HDR10+, Dolby Vision (IQ)',
      'Refresh rate': '144 Hz',
      'Smart TV': 'Tizen OS',
      'HDMI': '4x HDMI 2.1',
    },
  },
  {
    id: 'tv-3',
    name: 'LG 55" OLED evo C54 4K (2025)',
    brand: 'LG',
    category: 'Televisies',
    imageUrl: 'https://image.coolblue.nl/max/500x500/products/1960000',
    currentPrice: 1599,
    originalPrice: 1599,
    lowestPrice: 1599,
    rating: 4.5,
    reviewCount: 12,
    badge: 'nieuw',
    priceHistory: [
      { date: '2026-02-01', price: 1599 },
      { date: '2026-03-01', price: 1599 },
    ],
    shops: [
      { name: 'Coolblue', price: 1599, url: 'https://www.coolblue.nl/product/963247/lg-55-oled-evo-c54-4k-2025.html', logo: 'CB', verified: true },
    ],
    specs: {
      'Scherm': '55" OLED evo',
      'Resolutie': '4K UHD (3840x2160)',
      'HDR': 'Dolby Vision, HDR10',
      'Refresh rate': '120 Hz',
      'Smart TV': 'webOS',
      'HDMI': '4x HDMI 2.1',
    },
  },

  // ─── Monitoren ────────────────────────────────────────────────────────────────
  {
    id: 'mo-1',
    name: 'Samsung Odyssey OLED G8 LS32DG802S 32"',
    brand: 'Samsung',
    category: 'Monitoren',
    imageUrl: 'https://image.coolblue.nl/max/500x500/products/1940100',
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
      { date: '2026-03-01', price: 799 },
    ],
    shops: [
      { name: 'Coolblue', price: 829, url: 'https://www.coolblue.nl/product/948332/samsung-odyssey-oled-g8-ls32dg802suxen.html', logo: 'CB', verified: true },
    ],
    specs: {
      'Paneel': '32" QD-OLED',
      'Resolutie': '3840x2160 (4K)',
      'Refresh rate': '240 Hz',
      'Responstijd': '0,03 ms (GtG)',
      'HDR': 'DisplayHDR True Black 400',
      'Inputs': '2x HDMI 2.1, 1x DP 1.4, USB-C 90W',
    },
  },
  {
    id: 'mo-2',
    name: 'Dell U2724D UltraSharp 27"',
    brand: 'Dell',
    category: 'Monitoren',
    imageUrl: 'https://image.coolblue.nl/max/500x500/products/1930500',
    currentPrice: 389,
    originalPrice: 449,
    lowestPrice: 369,
    rating: 4.5,
    reviewCount: 145,
    badge: 'prijsdaling',
    priceHistory: [
      { date: '2025-09-01', price: 449 },
      { date: '2025-11-01', price: 419 },
      { date: '2026-01-01', price: 399 },
      { date: '2026-03-01', price: 389 },
    ],
    shops: [
      { name: 'Coolblue', price: 389, url: 'https://www.coolblue.nl/product/937210/dell-u2724d-ultrasharp.html', logo: 'CB', verified: true },
    ],
    specs: {
      'Paneel': '27" IPS Black',
      'Resolutie': '2560x1440 (QHD)',
      'Refresh rate': '120 Hz',
      'Kleurruimte': '98% DCI-P3',
      'USB-C': 'Ja (90W PD)',
      'Inputs': 'HDMI 2.1, DP 1.4, USB-C',
    },
  },

  // ─── Grafische kaarten ────────────────────────────────────────────────────────
  {
    id: 'gk-1',
    name: 'MSI GeForce RTX 4070 Super Ventus 3X 12G OC',
    brand: 'MSI',
    category: 'Grafische kaarten',
    imageUrl: 'https://image.coolblue.nl/max/500x500/products/1930000',
    currentPrice: 599,
    originalPrice: 699,
    lowestPrice: 579,
    rating: 4.6,
    reviewCount: 187,
    badge: 'prijsdaling',
    priceHistory: [
      { date: '2025-08-01', price: 699 },
      { date: '2025-10-01', price: 659 },
      { date: '2025-12-01', price: 629 },
      { date: '2026-03-01', price: 599 },
    ],
    shops: [
      { name: 'Alternate', price: 599, url: 'https://www.alternate.nl/MSI/GeForce-RTX-4070-SUPER-VENTUS-3X-12G-OC/html/product/100901', logo: 'ALT', verified: true },
    ],
    specs: {
      'GPU': 'AD104',
      'VRAM': '12 GB GDDR6X',
      'Boost klok': '2505 MHz',
      'CUDA Cores': '7168',
      'TDP': '220 W',
      'Aansluiting': 'PCIe 4.0 x16',
      'Outputs': '3x DP 1.4a, 1x HDMI 2.1',
    },
  },
  {
    id: 'gk-2',
    name: 'ASUS ROG Strix GeForce RTX 4070 Ti Super OC 16GB',
    brand: 'ASUS',
    category: 'Grafische kaarten',
    imageUrl: 'https://image.coolblue.nl/max/500x500/products/1940800',
    currentPrice: 949,
    originalPrice: 1099,
    lowestPrice: 899,
    rating: 4.7,
    reviewCount: 64,
    badge: 'deal',
    priceHistory: [
      { date: '2025-09-01', price: 1099 },
      { date: '2025-11-01', price: 999 },
      { date: '2026-01-01', price: 949 },
      { date: '2026-03-01', price: 949 },
    ],
    shops: [
      { name: 'Coolblue', price: 949, url: 'https://www.coolblue.nl/product/949658/asus-rog-strix-geforce-rtx-4070-ti-super-oc-16gb.html', logo: 'CB', verified: true },
    ],
    specs: {
      'GPU': 'AD103',
      'VRAM': '16 GB GDDR6X',
      'Boost klok': '2670 MHz',
      'CUDA Cores': '8448',
      'TDP': '285 W',
      'Aansluiting': 'PCIe 4.0 x16',
      'Outputs': '3x DP 1.4a, 2x HDMI 2.1',
    },
  },

  // ─── Processors ───────────────────────────────────────────────────────────────
  {
    id: 'pr-1',
    name: 'AMD Ryzen 7 9800X3D',
    brand: 'AMD',
    category: 'Processors',
    imageUrl: 'https://image.coolblue.nl/max/500x500/products/1948500',
    currentPrice: 479,
    originalPrice: 529,
    lowestPrice: 459,
    rating: 4.9,
    reviewCount: 156,
    badge: 'deal',
    priceHistory: [
      { date: '2025-11-01', price: 529 },
      { date: '2025-12-01', price: 509 },
      { date: '2026-01-01', price: 489 },
      { date: '2026-03-01', price: 479 },
    ],
    shops: [
      { name: 'Coolblue', price: 479, url: 'https://www.coolblue.nl/product/957550/amd-ryzen-7-9800x3d.html', logo: 'CB', verified: true },
    ],
    specs: {
      'Cores / Threads': '8 / 16',
      'Basis kloksnelheid': '4,7 GHz',
      'Max. boost': '5,2 GHz',
      'Cache': '96 MB (3D V-Cache)',
      'TDP': '120 W',
      'Socket': 'AM5',
      'Geheugen': 'DDR5-5600',
    },
  },
  {
    id: 'pr-2',
    name: 'AMD Ryzen 7 7800X3D',
    brand: 'AMD',
    category: 'Processors',
    imageUrl: 'https://image.coolblue.nl/max/500x500/products/1920000',
    currentPrice: 446,
    originalPrice: 489,
    lowestPrice: 349,
    rating: 4.8,
    reviewCount: 892,
    priceHistory: [
      { date: '2025-06-01', price: 389 },
      { date: '2025-09-01', price: 349 },
      { date: '2025-12-01', price: 399 },
      { date: '2026-03-01', price: 446 },
    ],
    shops: [
      { name: 'Coolblue', price: 446, url: 'https://www.coolblue.nl/product/928327/amd-ryzen-7-7800x3d.html', logo: 'CB', verified: true },
      { name: 'Alternate', price: 439, url: 'https://www.alternate.nl/AMD/Ryzen-7-7800X3D-4-2-GHz-5-0-GHz-Turbo-Boost-socket-AM5-processor/html/product/1898270', logo: 'ALT', verified: true },
    ],
    specs: {
      'Cores / Threads': '8 / 16',
      'Basis kloksnelheid': '4,2 GHz',
      'Max. boost': '5,0 GHz',
      'Cache': '96 MB (3D V-Cache)',
      'TDP': '120 W',
      'Socket': 'AM5',
      'Geheugen': 'DDR5-5200',
    },
  },

  // ─── Geheugen ─────────────────────────────────────────────────────────────────
  {
    id: 'ge-1',
    name: 'Corsair Vengeance DDR5-6400 32GB (2x16GB)',
    brand: 'Corsair',
    category: 'Geheugen',
    imageUrl: 'https://image.coolblue.nl/max/500x500/products/1930200',
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
      { date: '2026-03-01', price: 119 },
    ],
    shops: [
      { name: 'Alternate', price: 119, url: 'https://www.alternate.nl/Corsair/32-GB-DDR5-6400-Kit-werkgeheugen/html/product/181234', logo: 'ALT', verified: true },
    ],
    specs: {
      'Capaciteit': '2x 16 GB (32 GB kit)',
      'Type': 'DDR5',
      'Kloksnelheid': '6400 MHz',
      'Latency': 'CL32-39-39-76',
      'Spanning': '1,4 V',
      'Profiel': 'Intel XMP 3.0 / AMD EXPO',
    },
  },

  // ─── Wearables ────────────────────────────────────────────────────────────────
  {
    id: 'we-1',
    name: 'Apple Watch Series 10 46mm (GPS)',
    brand: 'Apple',
    category: 'Wearables',
    imageUrl: 'https://image.coolblue.nl/max/500x500/products/1942500',
    currentPrice: 429,
    originalPrice: 459,
    lowestPrice: 399,
    rating: 4.5,
    reviewCount: 211,
    priceHistory: [
      { date: '2025-09-01', price: 459 },
      { date: '2025-11-01', price: 449 },
      { date: '2026-03-01', price: 429 },
    ],
    shops: [
      { name: 'Coolblue', price: 429, url: 'https://www.coolblue.nl/product/953878/apple-watch-series-10-46mm-zwart-sportband-m-l.html', logo: 'CB', verified: true },
    ],
    specs: {
      'Scherm': '46mm LTPO OLED',
      'Processor': 'S10 chip',
      'Waterbestendig': 'WR50',
      'GPS': 'L1 + L5 precisie-GPS',
      'Batterij': 'Tot 18 uur',
      'OS': 'watchOS 11',
    },
  },
  {
    id: 'we-2',
    name: 'Samsung Galaxy Watch7 44mm (BT)',
    brand: 'Samsung',
    category: 'Wearables',
    imageUrl: 'https://image.coolblue.nl/max/500x500/products/1938700',
    currentPrice: 279,
    originalPrice: 329,
    lowestPrice: 269,
    rating: 4.3,
    reviewCount: 167,
    badge: 'prijsdaling',
    priceHistory: [
      { date: '2025-08-01', price: 329 },
      { date: '2025-10-01', price: 309 },
      { date: '2025-12-01', price: 289 },
      { date: '2026-03-01', price: 279 },
    ],
    shops: [
      { name: 'Coolblue', price: 279, url: 'https://www.coolblue.nl/product/943510/samsung-galaxy-watch7-44mm-bt-groen.html', logo: 'CB', verified: true },
    ],
    specs: {
      'Scherm': '1,47" Super AMOLED',
      'Processor': 'Exynos W1000',
      'Waterbestendig': '5ATM + IP68',
      'GPS': 'Dual-frequency',
      'Batterij': 'Tot 40 uur',
      'OS': 'Wear OS 5',
    },
  },

  // ─── Huishoudelijk ────────────────────────────────────────────────────────────
  {
    id: 'hh-1',
    name: 'Dyson V15 Detect Absolute (2023)',
    brand: 'Dyson',
    category: 'Huishoudelijk',
    imageUrl: 'https://image.coolblue.nl/max/500x500/products/1885000',
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
      { date: '2026-03-01', price: 649 },
    ],
    shops: [
      { name: 'Coolblue', price: 699, url: 'https://www.coolblue.nl/product/901083/dyson-v15-detect-absolute.html', logo: 'CB', verified: true },
    ],
    specs: {
      'Type': 'Steelstofzuiger (draadloos)',
      'Zuigkracht': '240 AW',
      'Accu': 'Tot 60 min',
      'Filter': 'HEPA',
      'Gewicht': '3,1 kg',
    },
  },
  {
    id: 'hh-2',
    name: 'Philips Airfryer XXL HD9285/90',
    brand: 'Philips',
    category: 'Huishoudelijk',
    imageUrl: 'https://image.coolblue.nl/max/500x500/products/1910000',
    currentPrice: 199,
    originalPrice: 249,
    lowestPrice: 179,
    rating: 4.4,
    reviewCount: 845,
    badge: 'deal',
    priceHistory: [
      { date: '2025-08-01', price: 249 },
      { date: '2025-10-01', price: 229 },
      { date: '2025-12-01', price: 209 },
      { date: '2026-03-01', price: 199 },
    ],
    shops: [
      { name: 'Coolblue', price: 199, url: 'https://www.coolblue.nl/product/920815/philips-airfryer-xxl-hd9285-90.html', logo: 'CB', verified: true },
    ],
    specs: {
      'Capaciteit': '7,3 liter (1,4 kg)',
      'Vermogen': '2225 W',
      'Temperatuur': '40-200 C',
      'Display': 'Digitaal touchscreen',
    },
  },

  // ─── Tablets ──────────────────────────────────────────────────────────────────
  {
    id: 'tb-1',
    name: 'Apple iPad Air 13" M2 (2024) 256GB Wi-Fi',
    brand: 'Apple',
    category: 'Tablets',
    imageUrl: 'https://image.coolblue.nl/max/500x500/products/1935500',
    currentPrice: 899,
    originalPrice: 899,
    lowestPrice: 849,
    rating: 4.7,
    reviewCount: 112,
    badge: 'nieuw',
    priceHistory: [
      { date: '2025-06-01', price: 899 },
      { date: '2025-09-01', price: 879 },
      { date: '2025-12-01', price: 899 },
      { date: '2026-03-01', price: 899 },
    ],
    shops: [
      { name: 'Coolblue', price: 899, url: 'https://www.coolblue.nl/product/943010/apple-ipad-air-13-inch-m2-256gb-wifi-spacegrijs-2024.html', logo: 'CB', verified: true },
    ],
    specs: {
      'Scherm': '13" Liquid Retina',
      'Processor': 'Apple M2',
      'Opslag': '256 GB',
      'Batterij': 'Tot 10 uur',
      'Camera': '12 MP',
      'OS': 'iPadOS 18',
    },
  },
  {
    id: 'tb-2',
    name: 'Samsung Galaxy Tab S9 FE 128GB Wi-Fi',
    brand: 'Samsung',
    category: 'Tablets',
    imageUrl: 'https://image.coolblue.nl/max/500x500/products/1920600',
    currentPrice: 349,
    originalPrice: 449,
    lowestPrice: 329,
    rating: 4.4,
    reviewCount: 234,
    badge: 'prijsdaling',
    priceHistory: [
      { date: '2025-08-01', price: 449 },
      { date: '2025-10-01', price: 399 },
      { date: '2025-12-01', price: 369 },
      { date: '2026-03-01', price: 349 },
    ],
    shops: [
      { name: 'Coolblue', price: 349, url: 'https://www.coolblue.nl/product/932510/samsung-galaxy-tab-s9-fe-128gb-wifi-grijs.html', logo: 'CB', verified: true },
    ],
    specs: {
      'Scherm': '10,9" TFT LCD 90Hz',
      'Processor': 'Exynos 1380',
      'RAM': '6 GB',
      'Opslag': '128 GB (uitbreidbaar)',
      'Batterij': '8000 mAh',
      'OS': 'Android 14 (One UI 6)',
      'Stylus': 'S Pen inbegrepen',
    },
  },

  // ─── Gameconsoles ─────────────────────────────────────────────────────────────
  {
    id: 'gc-1',
    name: 'Sony PlayStation 5 Slim (Disc Edition, 1TB)',
    brand: 'Sony',
    category: 'Gameconsoles',
    imageUrl: 'https://image.coolblue.nl/max/500x500/products/1920100',
    currentPrice: 519,
    originalPrice: 549,
    lowestPrice: 499,
    rating: 4.7,
    reviewCount: 4521,
    badge: 'prijsdaling',
    priceHistory: [
      { date: '2025-08-01', price: 549 },
      { date: '2025-10-01', price: 529 },
      { date: '2025-12-01', price: 499 },
      { date: '2026-03-01', price: 519 },
    ],
    shops: [
      { name: 'Bol.com', price: 518, url: 'https://www.bol.com/nl/nl/p/playstation-5-disc-edition-slim/9300000166374057/', logo: 'BOL', verified: true },
      { name: 'MediaMarkt', price: 519, url: 'https://www.mediamarkt.nl/nl/product/_sony-playstation-5-console-slim-disk-edition-1797014.html', logo: 'MM', verified: true },
      { name: 'Coolblue', price: 519, url: 'https://www.coolblue.nl/product/865866/playstation-5.html', logo: 'CB', verified: true },
    ],
    specs: {
      'CPU': 'AMD Zen 2, 8 cores, 3,5 GHz',
      'GPU': 'AMD RDNA 2, 10,28 TFLOPS',
      'RAM': '16 GB GDDR6',
      'SSD': '1 TB NVMe (uitbreidbaar)',
      'Resolutie': 'Tot 4K 120fps / 8K',
      'Schijf': 'Ultra HD Blu-ray',
    },
  },
  {
    id: 'gc-2',
    name: 'Nintendo Switch OLED',
    brand: 'Nintendo',
    category: 'Gameconsoles',
    imageUrl: 'https://image.coolblue.nl/max/500x500/products/1865000',
    currentPrice: 319,
    originalPrice: 349,
    lowestPrice: 299,
    rating: 4.6,
    reviewCount: 3241,
    priceHistory: [
      { date: '2025-08-01', price: 349 },
      { date: '2025-10-01', price: 339 },
      { date: '2025-12-01', price: 319 },
      { date: '2026-03-01', price: 319 },
    ],
    shops: [
      { name: 'Coolblue', price: 319, url: 'https://www.coolblue.nl/product/886497/nintendo-switch-oled-wit.html', logo: 'CB', verified: true },
      { name: 'MediaMarkt', price: 324, url: 'https://www.mediamarkt.nl/nl/product/_nintendo-switch-oled-wit-1701250.html', logo: 'MM', verified: true },
    ],
    specs: {
      'Scherm': '7" OLED (1280x720)',
      'Opslag': '64 GB (uitbreidbaar microSD)',
      'Batterij': 'Ca. 4,5-9 uur',
      'Docked': 'Tot 1080p 60fps',
      'Gewicht': '420 g (zonder Joy-Con)',
    },
  },

  // ─── Netwerk ──────────────────────────────────────────────────────────────────
  {
    id: 'nw-1',
    name: 'ASUS RT-AXE7800 Tri-Band WiFi 6E Router',
    brand: 'ASUS',
    category: 'Netwerk',
    imageUrl: 'https://image.coolblue.nl/max/500x500/products/1910300',
    currentPrice: 219,
    originalPrice: 279,
    lowestPrice: 199,
    rating: 4.4,
    reviewCount: 89,
    badge: 'deal',
    priceHistory: [
      { date: '2025-08-01', price: 279 },
      { date: '2025-10-01', price: 249 },
      { date: '2025-12-01', price: 229 },
      { date: '2026-03-01', price: 219 },
    ],
    shops: [
      { name: 'Coolblue', price: 219, url: 'https://www.coolblue.nl/product/920301/asus-rt-axe7800.html', logo: 'CB', verified: true },
    ],
    specs: {
      'WiFi': 'WiFi 6E (802.11ax)',
      'Banden': 'Tri-band (2.4/5/6 GHz)',
      'Snelheid': 'AXE7800 (574+4804+2402 Mbps)',
      'Poorten': '1x 2.5G WAN, 4x Gigabit LAN',
      'Mesh': 'AiMesh compatibel',
    },
  },

  // ─── Fotografie ───────────────────────────────────────────────────────────────
  {
    id: 'fo-1',
    name: 'Sony Alpha A7 IV (ILCE-7M4) Body',
    brand: 'Sony',
    category: 'Fotografie',
    imageUrl: 'https://image.coolblue.nl/max/500x500/products/1870500',
    currentPrice: 2199,
    originalPrice: 2499,
    lowestPrice: 2099,
    rating: 4.7,
    reviewCount: 276,
    badge: 'prijsdaling',
    priceHistory: [
      { date: '2025-08-01', price: 2499 },
      { date: '2025-10-01', price: 2399 },
      { date: '2025-12-01', price: 2299 },
      { date: '2026-03-01', price: 2199 },
    ],
    shops: [
      { name: 'Coolblue', price: 2199, url: 'https://www.coolblue.nl/product/896510/sony-alpha-a7-iv-body.html', logo: 'CB', verified: true },
    ],
    specs: {
      'Sensor': '33 MP Full-Frame CMOS',
      'ISO bereik': '100-51200',
      'Video': '4K 60fps / 4K 30fps (FF)',
      'AF': '759 fase-detectiepunten',
      'Stabilisatie': '5-assig IBIS (5,5 stops)',
      'Vatting': 'Sony E-mount',
    },
  },

  // ─── Opslag (SSD) ─────────────────────────────────────────────────────────────
  {
    id: 'ss-1',
    name: 'Samsung 990 Pro 2TB',
    brand: 'Samsung',
    category: 'Opslag (SSD)',
    imageUrl: 'https://image.coolblue.nl/max/500x500/products/1900500',
    currentPrice: 169,
    originalPrice: 264,
    lowestPrice: 149,
    rating: 4.8,
    reviewCount: 432,
    badge: 'deal',
    priceHistory: [
      { date: '2025-06-01', price: 264 },
      { date: '2025-09-01', price: 229 },
      { date: '2025-12-01', price: 189 },
      { date: '2026-03-01', price: 169 },
    ],
    shops: [
      { name: 'Coolblue', price: 169, url: 'https://www.coolblue.nl/product/913731/samsung-990-pro-2tb-nvme-ssd.html', logo: 'CB', verified: true },
      { name: 'Alternate', price: 164, url: 'https://www.alternate.nl/Samsung/990-PRO-2-TB-SSD/html/product/1864243', logo: 'ALT', verified: true },
    ],
    specs: {
      'Capaciteit': '2 TB',
      'Interface': 'NVMe PCIe 4.0 x4',
      'Formaat': 'M.2 2280',
      'Seq. lezen': '7450 MB/s',
      'Seq. schrijven': '6900 MB/s',
      'TBW': '1200 TB',
    },
    variants: [
      { id: 'ss-1-1tb', label: '1 TB', type: 'opslag', price: 99, shops: [{ name: 'Coolblue', price: 99, url: 'https://www.coolblue.nl/product/913730/samsung-990-pro-1tb-nvme-ssd.html', logo: 'CB', verified: true }] },
      { id: 'ss-1-2tb', label: '2 TB', type: 'opslag', price: 169, shops: [{ name: 'Coolblue', price: 169, url: 'https://www.coolblue.nl/product/913731/samsung-990-pro-2tb-nvme-ssd.html', logo: 'CB', verified: true }] },
      { id: 'ss-1-4tb', label: '4 TB', type: 'opslag', price: 299, shops: [{ name: 'Coolblue', price: 299, url: 'https://www.coolblue.nl/product/935770/samsung-990-pro-4tb-nvme-ssd.html', logo: 'CB', verified: true }] },
    ],
  },

  // ─── Toetsenborden ────────────────────────────────────────────────────────────
  {
    id: 'kb-1',
    name: 'Logitech MX Keys S',
    brand: 'Logitech',
    category: 'Toetsenborden',
    imageUrl: 'https://image.coolblue.nl/max/500x500/products/1910400',
    currentPrice: 99,
    originalPrice: 119,
    lowestPrice: 89,
    rating: 4.6,
    reviewCount: 567,
    badge: 'prijsdaling',
    priceHistory: [
      { date: '2025-08-01', price: 119 },
      { date: '2025-10-01', price: 109 },
      { date: '2025-12-01', price: 99 },
      { date: '2026-03-01', price: 99 },
    ],
    shops: [
      { name: 'Coolblue', price: 99, url: 'https://www.coolblue.nl/product/920401/logitech-mx-keys-s-zwart.html', logo: 'CB', verified: true },
    ],
    specs: {
      'Type': 'Draadloos (Bluetooth + Logi Bolt)',
      'Verlichting': 'Ja, adaptief',
      'Schakelaars': 'Scissor (low-profile)',
      'Batterij': 'Tot 10 dagen',
      'Multi-device': 'Tot 3 apparaten',
    },
  },

  // ─── Muizen ───────────────────────────────────────────────────────────────────
  {
    id: 'ms-1',
    name: 'Logitech MX Master 3S',
    brand: 'Logitech',
    category: 'Muizen',
    imageUrl: 'https://image.coolblue.nl/max/500x500/products/1890200',
    currentPrice: 89,
    originalPrice: 109,
    lowestPrice: 79,
    rating: 4.7,
    reviewCount: 1234,
    badge: 'deal',
    priceHistory: [
      { date: '2025-08-01', price: 109 },
      { date: '2025-10-01', price: 99 },
      { date: '2025-12-01', price: 89 },
      { date: '2026-03-01', price: 89 },
    ],
    shops: [
      { name: 'Coolblue', price: 89, url: 'https://www.coolblue.nl/product/908518/logitech-mx-master-3s-grafiet.html', logo: 'CB', verified: true },
    ],
    specs: {
      'Sensor': '8000 DPI (Darkfield)',
      'Verbinding': 'Bluetooth + Logi Bolt',
      'Batterij': 'Tot 70 dagen',
      'Knoppen': '7 (programmeerbaar)',
      'Scrollwiel': 'MagSpeed elektromagnetisch',
      'Multi-device': 'Tot 3 apparaten',
    },
  },

  // ─── Moederborden ─────────────────────────────────────────────────────────────
  {
    id: 'mb-1',
    name: 'ASUS ROG Strix B650E-F Gaming WiFi',
    brand: 'ASUS',
    category: 'Moederborden',
    imageUrl: 'https://image.coolblue.nl/max/500x500/products/1910500',
    currentPrice: 249,
    originalPrice: 299,
    lowestPrice: 229,
    rating: 4.5,
    reviewCount: 123,
    badge: 'prijsdaling',
    priceHistory: [
      { date: '2025-08-01', price: 299 },
      { date: '2025-10-01', price: 279 },
      { date: '2025-12-01', price: 259 },
      { date: '2026-03-01', price: 249 },
    ],
    shops: [
      { name: 'Coolblue', price: 249, url: 'https://www.coolblue.nl/product/920501/asus-rog-strix-b650e-f-gaming-wifi.html', logo: 'CB', verified: true },
    ],
    specs: {
      'Socket': 'AM5',
      'Chipset': 'AMD B650E',
      'Formaat': 'ATX',
      'Geheugen': '4x DDR5 (tot 7800 MHz OC)',
      'M.2 slots': '3x (1x PCIe 5.0)',
      'WiFi': 'Wi-Fi 6E + Bluetooth 5.3',
    },
  },

  // ─── Voedingen ────────────────────────────────────────────────────────────────
  {
    id: 'vo-1',
    name: 'Corsair RM850x Cybenetics Gold ATX3.1',
    brand: 'Corsair',
    category: 'Voedingen',
    imageUrl: 'https://image.coolblue.nl/max/500x500/products/1948600',
    currentPrice: 139,
    originalPrice: 159,
    lowestPrice: 129,
    rating: 4.8,
    reviewCount: 312,
    priceHistory: [
      { date: '2025-08-01', price: 159 },
      { date: '2025-10-01', price: 149 },
      { date: '2025-12-01', price: 139 },
      { date: '2026-03-01', price: 139 },
    ],
    shops: [
      { name: 'Coolblue', price: 139, url: 'https://www.coolblue.nl/product/956904/corsair-rm850x-cybenetics-gold-atx3-1-pcie5-1.html', logo: 'CB', verified: true },
      { name: 'Alternate', price: 135, url: 'https://www.alternate.nl/Corsair/RM850x-(2024)-850-Watt-voeding/html/product/100069063', logo: 'ALT', verified: true },
    ],
    specs: {
      'Vermogen': '850 W',
      'Certificering': 'Cybenetics Gold',
      'Modulariteit': 'Volledig modulair',
      'Standaard': 'ATX 3.1 / PCIe 5.1',
      'Connector': '12V-2x6 (12VHPWR)',
      'Garantie': '10 jaar',
    },
  },

  // ─── Computerbehuizingen ──────────────────────────────────────────────────────
  {
    id: 'cb-1',
    name: 'Fractal Design North Charcoal Black TG',
    brand: 'Fractal Design',
    category: 'Computerbehuizingen',
    imageUrl: 'https://image.coolblue.nl/max/500x500/products/1910600',
    currentPrice: 129,
    originalPrice: 149,
    lowestPrice: 119,
    rating: 4.7,
    reviewCount: 456,
    priceHistory: [
      { date: '2025-08-01', price: 149 },
      { date: '2025-10-01', price: 139 },
      { date: '2025-12-01', price: 129 },
      { date: '2026-03-01', price: 129 },
    ],
    shops: [
      { name: 'Alternate', price: 129, url: 'https://www.alternate.nl/Fractal-Design/North-midi-tower-behuizing/html/product/1858071', logo: 'ALT', verified: true },
    ],
    specs: {
      'Formaat': 'Mid-Tower ATX',
      'Moederbord': 'ATX, mATX, ITX',
      'GPU lengte': 'Tot 355 mm',
      'Ventilatoren': '2x 140mm vooraf (max. 6)',
      'Materiaal': 'Staal + Walnotenhout paneel',
      'USB': '1x USB-C, 2x USB-A 3.0',
    },
    variants: [
      { id: 'cb-1-black', label: 'Charcoal Black', type: 'kleur', price: 129, shops: [{ name: 'Alternate', price: 129, url: 'https://www.alternate.nl/Fractal-Design/North-midi-tower-behuizing/html/product/1858071', logo: 'ALT', verified: true }] },
      { id: 'cb-1-white', label: 'Chalk White', type: 'kleur', price: 129, shops: [{ name: 'Alternate', price: 129, url: 'https://www.alternate.nl/Fractal-Design/North-midi-tower-behuizing/html/product/1858074', logo: 'ALT', verified: true }] },
    ],
  },

  // ─── CPU-koelers ──────────────────────────────────────────────────────────────
  {
    id: 'ck-1',
    name: 'Noctua NH-D15 chromax.black',
    brand: 'Noctua',
    category: 'CPU-koelers',
    imageUrl: 'https://image.coolblue.nl/max/500x500/products/1845000',
    currentPrice: 120,
    originalPrice: 120,
    lowestPrice: 99,
    rating: 4.9,
    reviewCount: 2345,
    priceHistory: [
      { date: '2025-08-01', price: 119 },
      { date: '2025-10-01', price: 115 },
      { date: '2025-12-01', price: 109 },
      { date: '2026-03-01', price: 120 },
    ],
    shops: [
      { name: 'Coolblue', price: 120, url: 'https://www.coolblue.nl/product/852435/noctua-nh-d15-chromax-zwart.html', logo: 'CB', verified: true },
    ],
    specs: {
      'Type': 'Dual-tower luchtkoeler',
      'Ventilatoren': '2x NF-A15 PWM (140mm)',
      'Hoogte': '165 mm',
      'TDP': 'Tot 250 W',
      'Socket': 'AM4, AM5, LGA 1700, LGA 1851',
      'Geluid': 'Max. 24,6 dB(A)',
    },
  },

  // ─── Webcams ──────────────────────────────────────────────────────────────────
  {
    id: 'wc-1',
    name: 'Logitech Brio 4K Pro',
    brand: 'Logitech',
    category: 'Webcams',
    imageUrl: 'https://image.coolblue.nl/max/500x500/products/1870800',
    currentPrice: 169,
    originalPrice: 229,
    lowestPrice: 159,
    rating: 4.3,
    reviewCount: 456,
    badge: 'deal',
    priceHistory: [
      { date: '2025-08-01', price: 229 },
      { date: '2025-10-01', price: 199 },
      { date: '2025-12-01', price: 179 },
      { date: '2026-03-01', price: 169 },
    ],
    shops: [
      { name: 'Coolblue', price: 169, url: 'https://www.coolblue.nl/product/896801/logitech-brio-4k-pro.html', logo: 'CB', verified: true },
    ],
    specs: {
      'Resolutie': '4K Ultra HD (30fps)',
      'HDR': 'Ja',
      'Autofocus': 'Ja (infrarood)',
      'Zoom': '5x digitaal',
      'Microfoon': 'Dubbele omnidirectioneel',
    },
  },

  // ─── Printers ─────────────────────────────────────────────────────────────────
  {
    id: 'pt-1',
    name: 'HP OfficeJet Pro 9125e All-in-One',
    brand: 'HP',
    category: 'Printers',
    imageUrl: 'https://image.coolblue.nl/max/500x500/products/1920900',
    currentPrice: 229,
    originalPrice: 279,
    lowestPrice: 219,
    rating: 4.2,
    reviewCount: 189,
    badge: 'prijsdaling',
    priceHistory: [
      { date: '2025-08-01', price: 279 },
      { date: '2025-10-01', price: 259 },
      { date: '2025-12-01', price: 239 },
      { date: '2026-03-01', price: 229 },
    ],
    shops: [
      { name: 'Coolblue', price: 229, url: 'https://www.coolblue.nl/product/932901/hp-officejet-pro-9125e-all-in-one.html', logo: 'CB', verified: true },
    ],
    specs: {
      'Type': 'Inkjet All-in-One',
      'Functies': 'Printen, scannen, kopieren, faxen',
      'Printsnelheid': '22 ppm (zwart), 18 ppm (kleur)',
      'Dubbelzijdig': 'Ja (automatisch)',
      'WiFi': 'Ja (+ Wi-Fi Direct)',
    },
  },

  // ─── Luidsprekers ─────────────────────────────────────────────────────────────
  {
    id: 'ls-1',
    name: 'Sonos Era 300',
    brand: 'Sonos',
    category: 'Luidsprekers',
    imageUrl: 'https://image.coolblue.nl/max/500x500/products/1910700',
    currentPrice: 399,
    originalPrice: 499,
    lowestPrice: 379,
    rating: 4.5,
    reviewCount: 178,
    badge: 'deal',
    priceHistory: [
      { date: '2025-08-01', price: 499 },
      { date: '2025-10-01', price: 459 },
      { date: '2025-12-01', price: 429 },
      { date: '2026-03-01', price: 399 },
    ],
    shops: [
      { name: 'Coolblue', price: 399, url: 'https://www.coolblue.nl/product/920701/sonos-era-300-zwart.html', logo: 'CB', verified: true },
    ],
    specs: {
      'Type': 'Smart speaker (Dolby Atmos)',
      'Drivers': '6 (incl. upward-firing)',
      'Connectiviteit': 'WiFi 6, Bluetooth 5.0, USB-C',
      'Spraakassistent': 'Sonos Voice, Amazon Alexa',
      'AirPlay 2': 'Ja',
    },
  },

  // ─── Desktops ─────────────────────────────────────────────────────────────────
  {
    id: 'dt-1',
    name: 'Apple Mac Mini M4 (2024) 16GB/256GB',
    brand: 'Apple',
    category: 'Desktops',
    imageUrl: 'https://image.coolblue.nl/max/500x500/products/1948300',
    currentPrice: 679,
    originalPrice: 679,
    lowestPrice: 649,
    rating: 4.8,
    reviewCount: 89,
    badge: 'nieuw',
    priceHistory: [
      { date: '2025-11-01', price: 679 },
      { date: '2025-12-01', price: 679 },
      { date: '2026-01-01', price: 649 },
      { date: '2026-03-01', price: 679 },
    ],
    shops: [
      { name: 'Apple Store', price: 679, url: 'https://www.apple.com/nl/shop/buy-mac/mac-mini', logo: 'APL', verified: true },
      { name: 'Coolblue', price: 679, url: 'https://www.coolblue.nl/product/954350/apple-mac-mini-m4-16gb-256gb-2024.html', logo: 'CB', verified: true },
    ],
    specs: {
      'Processor': 'Apple M4 (10-core CPU)',
      'GPU': '10-core GPU',
      'RAM': '16 GB',
      'Opslag': '256 GB SSD',
      'Poorten': '5x USB-C, 1x HDMI, Ethernet',
      'OS': 'macOS Sequoia',
    },
    variants: [
      { id: 'dt-1-256', label: '256 GB', type: 'opslag', price: 679, shops: [{ name: 'Coolblue', price: 679, url: 'https://www.coolblue.nl/product/954350/apple-mac-mini-m4-16gb-256gb-2024.html', logo: 'CB', verified: true }] },
      { id: 'dt-1-512', label: '512 GB', type: 'opslag', price: 899, shops: [{ name: 'Coolblue', price: 899, url: 'https://www.coolblue.nl/product/954352/apple-mac-mini-m4-16gb-512gb-2024.html', logo: 'CB', verified: true }] },
    ],
  },

  // ─── Ventilatoren ─────────────────────────────────────────────────────────────
  {
    id: 'vn-1',
    name: 'Noctua NF-A12x25 PWM chromax.black',
    brand: 'Noctua',
    category: 'Ventilatoren',
    imageUrl: 'https://image.coolblue.nl/max/500x500/products/1870900',
    currentPrice: 32,
    originalPrice: 35,
    lowestPrice: 29,
    rating: 4.9,
    reviewCount: 3456,
    priceHistory: [
      { date: '2025-08-01', price: 35 },
      { date: '2025-10-01', price: 33 },
      { date: '2025-12-01', price: 32 },
      { date: '2026-03-01', price: 32 },
    ],
    shops: [
      { name: 'Coolblue', price: 32, url: 'https://www.coolblue.nl/product/896901/noctua-nf-a12x25-pwm-chromax-black.html', logo: 'CB', verified: true },
    ],
    specs: {
      'Formaat': '120 mm',
      'Toerental': '450-2000 RPM',
      'Luchtstroom': '102,1 m3/h',
      'Geluid': 'Max. 22,6 dB(A)',
      'Aansluiting': '4-pin PWM',
    },
  },

  // ─── Gaming ───────────────────────────────────────────────────────────────────
  {
    id: 'gm-1',
    name: 'SteelSeries Arctis Nova Pro Wireless',
    brand: 'SteelSeries',
    category: 'Gaming',
    imageUrl: 'https://image.coolblue.nl/max/500x500/products/1870400',
    currentPrice: 299,
    originalPrice: 379,
    lowestPrice: 279,
    rating: 4.5,
    reviewCount: 678,
    badge: 'deal',
    priceHistory: [
      { date: '2025-08-01', price: 379 },
      { date: '2025-10-01', price: 349 },
      { date: '2025-12-01', price: 319 },
      { date: '2026-03-01', price: 299 },
    ],
    shops: [
      { name: 'Coolblue', price: 299, url: 'https://www.coolblue.nl/product/896401/steelseries-arctis-nova-pro-wireless.html', logo: 'CB', verified: true },
    ],
    specs: {
      'Type': 'Over-ear gaming headset',
      'Verbinding': '2.4 GHz + Bluetooth (simultaan)',
      'ANC': 'Ja, 4-mic hybride',
      'Batterij': '2x 12 uur (hot-swap)',
      'Driver': '40 mm neodymium',
    },
  },
  {
    id: 'gm-2',
    name: 'Razer DeathAdder V3 Pro',
    brand: 'Razer',
    category: 'Gaming',
    imageUrl: 'https://image.coolblue.nl/max/500x500/products/1910450',
    currentPrice: 129,
    originalPrice: 159,
    lowestPrice: 119,
    rating: 4.6,
    reviewCount: 432,
    badge: 'prijsdaling',
    priceHistory: [
      { date: '2025-08-01', price: 159 },
      { date: '2025-10-01', price: 149 },
      { date: '2025-12-01', price: 139 },
      { date: '2026-03-01', price: 129 },
    ],
    shops: [
      { name: 'Coolblue', price: 129, url: 'https://www.coolblue.nl/product/920451/razer-deathadder-v3-pro-zwart.html', logo: 'CB', verified: true },
    ],
    specs: {
      'Sensor': 'Focus Pro 30K',
      'DPI': 'Tot 30.000',
      'Verbinding': 'HyperSpeed Wireless + Bluetooth',
      'Batterij': 'Tot 90 uur',
      'Gewicht': '63 g',
    },
  },

  // ─── Opslag (HDD) ─────────────────────────────────────────────────────────────
  {
    id: 'hd-1',
    name: 'Western Digital WD Red Plus 4TB (WD40EFPX)',
    brand: 'Western Digital',
    category: 'Opslag (HDD)',
    imageUrl: 'https://image.coolblue.nl/max/500x500/products/1870500',
    currentPrice: 99,
    originalPrice: 129,
    lowestPrice: 89,
    rating: 4.5,
    reviewCount: 876,
    badge: 'deal',
    priceHistory: [
      { date: '2025-08-01', price: 129 },
      { date: '2025-10-01', price: 119 },
      { date: '2025-12-01', price: 109 },
      { date: '2026-03-01', price: 99 },
    ],
    shops: [
      { name: 'Coolblue', price: 99, url: 'https://www.coolblue.nl/product/896501/western-digital-wd-red-plus-4tb-wd40efpx.html', logo: 'CB', verified: true },
    ],
    specs: {
      'Capaciteit': '4 TB',
      'Interface': 'SATA 6 Gb/s',
      'Formaat': '3,5"',
      'Toerental': '5400 RPM (CMR)',
      'Cache': '256 MB',
      'Gebruik': 'NAS (1-8 bays)',
    },
  },

  // ─── Kabels & Adapters ────────────────────────────────────────────────────────
  {
    id: 'ka-1',
    name: 'Anker 765 USB-C naar USB-C Kabel (140W, 1,8m)',
    brand: 'Anker',
    category: 'Kabels & Adapters',
    imageUrl: 'https://image.coolblue.nl/max/500x500/products/1910550',
    currentPrice: 19,
    originalPrice: 25,
    lowestPrice: 17,
    rating: 4.7,
    reviewCount: 1234,
    priceHistory: [
      { date: '2025-08-01', price: 25 },
      { date: '2025-10-01', price: 22 },
      { date: '2025-12-01', price: 20 },
      { date: '2026-03-01', price: 19 },
    ],
    shops: [
      { name: 'Coolblue', price: 19, url: 'https://www.coolblue.nl/product/920551/anker-765-usb-c-naar-usb-c-kabel-140w-1-8m.html', logo: 'CB', verified: true },
    ],
    specs: {
      'Type': 'USB-C naar USB-C',
      'Vermogen': '140W (USB PD 3.1)',
      'Data': 'USB 2.0 (480 Mbps)',
      'Lengte': '1,8 meter',
      'Materiaal': 'Nylon gevlochten',
    },
  },
  {
    id: 'ka-2',
    name: 'Apple USB-C Digital AV Multiport Adapter',
    brand: 'Apple',
    category: 'Kabels & Adapters',
    imageUrl: 'https://image.coolblue.nl/max/500x500/products/1910560',
    currentPrice: 69,
    originalPrice: 79,
    lowestPrice: 65,
    rating: 4.3,
    reviewCount: 567,
    priceHistory: [
      { date: '2025-08-01', price: 79 },
      { date: '2025-10-01', price: 75 },
      { date: '2025-12-01', price: 69 },
      { date: '2026-03-01', price: 69 },
    ],
    shops: [
      { name: 'Apple Store', price: 69, url: 'https://www.apple.com/nl/shop/product/MW5M3ZM/A/usb-c-digital-av-multiport-adapter', logo: 'APL', verified: true },
    ],
    specs: {
      'Inputs': '1x USB-C',
      'Outputs': '1x HDMI 2.0, 1x USB-A 3.1, 1x USB-C (PD)',
      'Video': 'Tot 4K 60Hz',
      'PD doorvoer': 'Tot 100W',
    },
  },
];

export const MOCK_ALERTS: Alert[] = [
  { id: 'a1', productId: 'au-1', productName: 'Sony WH-1000XM5', targetPrice: 200, currentPrice: 225, originalPrice: 379, triggered: false },
  { id: 'a2', productId: 'ge-1', productName: 'Corsair Vengeance DDR5-6400 32GB', targetPrice: 105, currentPrice: 119, originalPrice: 169, triggered: false },
  { id: 'a3', productId: 'sm-1', productName: 'Samsung Galaxy S25 Ultra 256GB', targetPrice: 1199, currentPrice: 1349, originalPrice: 1449, triggered: false },
  { id: 'a4', productId: 'tv-1', productName: 'LG OLED55C46LA (2024)', targetPrice: 999, currentPrice: 1149, originalPrice: 1549, triggered: false },
  { id: 'a5', productId: 'gk-1', productName: 'MSI GeForce RTX 4070 Super', targetPrice: 499, currentPrice: 599, originalPrice: 699, triggered: false },
  { id: 'a6', productId: 'pr-1', productName: 'AMD Ryzen 7 9800X3D', targetPrice: 399, currentPrice: 479, originalPrice: 529, triggered: false },
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
  'Moederborden':         { id: 'moederborden',          icon: 'developer-board' },
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
  'Printers':             { id: 'printers',             icon: 'print' },
  'Kabels & Adapters':    { id: 'kabels-adapters',      icon: 'cable' },
};

export const MOCK_CATEGORIES: Category[] = Object.entries(CATEGORY_META).map(([name, meta]) => ({
  id: meta.id,
  name,
  icon: meta.icon,
  count: 0,
}));

export const PRICE_DISCLAIMER = 'Prijzen zijn indicatief en kunnen afwijken. Bekijk de winkel voor de actuele prijs.';

export const mock_products = MOCK_PRODUCTS;
export const mockProducts = MOCK_PRODUCTS;

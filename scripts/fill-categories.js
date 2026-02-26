/**
 * Simple fix - just add more products to specific categories
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data/categories');

const RETAILERS = [
  { name: 'Coolblue', baseUrl: 'https://www.coolblue.nl', logo: 'CB', searchPath: '/zoeken?query=' },
  { name: 'Bol.com', baseUrl: 'https://www.bol.com', logo: 'BOL', searchPath: '/nl/nl/s/?search=' },
  { name: 'MediaMarkt', baseUrl: 'https://www.mediamarkt.nl', logo: 'MM', searchPath: '/nl/zoeken/?search=' },
  { name: 'Azerty', baseUrl: 'https://azerty.nl', logo: 'AZ', searchPath: '/?q=' },
  { name: 'Alternate', baseUrl: 'https://www.alternate.nl', logo: 'ALT', searchPath: '/html/searchresult.shtml?search=' },
];

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generatePriceHistory(basePrice) {
  const history = [];
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

function generateShops(productName, basePrice) {
  const shops = [];
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

function addProducts(categorySlug, categoryName, minPrice, maxPrice, brands, models, count) {
  const filePath = path.join(DATA_DIR, `${categorySlug}.json`);
  
  let products = [];
  if (fs.existsSync(filePath)) {
    products = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }
  
  const currentCount = products.length;
  const needToAdd = count - currentCount;
  
  console.log(`${categoryName}: ${currentCount} -> ${count} (adding ${needToAdd})`);
  
  if (needToAdd <= 0) return;
  
  for (let i = 0; i < needToAdd; i++) {
    const brand = randomElement(brands);
    const model = randomElement(models);
    const variant = randomElement(['', ' Pro', ' Plus', ' Max', ' Ultra', ' Lite', ' SE', ' 2025']);
    const name = `${brand} ${model}${variant}`.trim();
    const price = randomBetween(minPrice, maxPrice);
    const history = generatePriceHistory(price);
    const prices = history.map(p => p.price);
    
    let badge;
    const rand = Math.random();
    if (rand < 0.12) badge = 'deal';
    else if (rand < 0.25) badge = 'prijsdaling';
    else if (rand < 0.32) badge = 'nieuw';
    
    products.push({
      id: `${categorySlug}-${currentCount + i + 1}`,
      name,
      brand,
      category: categoryName,
      imageUrl: `https://placehold.co/600x400/1a1a1a/ffffff?text=${encodeURIComponent(name.substring(0, 20))}`,
      previewUrl: `https://placehold.co/320x240/1a1a1a/ffffff?text=${encodeURIComponent(name.substring(0, 15))}`,
      currentPrice: price,
      originalPrice: Math.max(...prices),
      lowestPrice: Math.min(...prices),
      rating: Math.round((3.2 + Math.random() * 1.7) * 10) / 10,
      reviewCount: randomBetween(3, 800),
      priceHistory: history.slice(-14),
      shops: generateShops(name, price),
      specs: { Kwaliteit: 'Hoog', Materiaal: 'Premium' },
      badge,
    });
  }
  
  fs.writeFileSync(filePath, JSON.stringify(products, null, 0));
}

// Fill categories
addProducts('moedborden', 'Moedborden', 69, 799, ['ASUS', 'MSI', 'Gigabyte', 'ASRock'], ['ROG MAXIMUS Z890', 'MEG Z790 ACE', 'X670E AORUS MASTER', 'ROG STRIX B650-A', 'MPG B760I EDGE', 'PRIME Z790-A', 'B650 Gaming X AX'], 3448);
addProducts('opslag-hdd', 'Opslag (HDD)', 39, 399, ['Seagate', 'WD', 'Toshiba'], ['Barracuda 4TB', 'WD Black 4TB', 'Red Plus 4TB', 'SkyHawk 4TB', 'Ultrastar 8TB', 'IronWolf 8TB', 'Caviar Blue 2TB'], 3448);
addProducts('opslag-ssd', 'Opslag (SSD)', 29, 499, ['Samsung', 'WD', 'Crucial', 'Kingston', 'Seagate', 'Sabrent'], ['990 PRO 2TB', 'SN850X 2TB', 'WD_BLACK SN850X', 'P5 Plus 2TB', 'FireCuda 530', 'Acer Predator GM7', 'Kingston KC3000'], 3448);

console.log('\nDone!');

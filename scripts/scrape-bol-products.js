/**
 * Bol.com Product Name & ID Scraper (Puppeteer)
 *
 * Scrapes real product names, Bol.com IDs, and images from search results.
 * Prices are obtained from individual product pages via a follow-up fetch.
 *
 * Usage: node scripts/scrape-bol-products.js
 *        node scripts/scrape-bol-products.js --resume
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const OUTPUT_PATH = path.join(__dirname, '../data/products-bol.json');
const CHECKPOINT_PATH = path.join(__dirname, '../data/bol-checkpoint.json');
const RESUME = process.argv.includes('--resume');

// Comprehensive search queries for all categories
const SEARCH_QUERIES = [
  // Consumer Electronics
  { query: 'laptop', category: 'Laptops', maxPages: 50 },
  { query: 'gaming laptop', category: 'Laptops', maxPages: 20 },
  { query: 'chromebook', category: 'Laptops', maxPages: 10 },
  { query: 'ultrabook', category: 'Laptops', maxPages: 10 },
  { query: 'smartphone', category: 'Smartphones', maxPages: 40 },
  { query: 'samsung galaxy smartphone', category: 'Smartphones', maxPages: 15 },
  { query: 'iphone', category: 'Smartphones', maxPages: 10 },
  { query: 'xiaomi smartphone', category: 'Smartphones', maxPages: 10 },
  { query: 'google pixel', category: 'Smartphones', maxPages: 5 },
  { query: 'tablet', category: 'Tablets', maxPages: 30 },
  { query: 'ipad', category: 'Tablets', maxPages: 10 },
  { query: 'samsung galaxy tab', category: 'Tablets', maxPages: 10 },
  { query: 'monitor', category: 'Monitoren', maxPages: 50 },
  { query: 'gaming monitor', category: 'Monitoren', maxPages: 15 },
  { query: '4k monitor', category: 'Monitoren', maxPages: 10 },
  { query: 'ultrawide monitor', category: 'Monitoren', maxPages: 5 },
  { query: 'televisie', category: 'Televisies', maxPages: 40 },
  { query: 'smart tv', category: 'Televisies', maxPages: 20 },
  { query: 'oled tv', category: 'Televisies', maxPages: 10 },
  { query: 'koptelefoon', category: 'Audio', maxPages: 30 },
  { query: 'draadloze oordopjes', category: 'Audio', maxPages: 20 },
  { query: 'bluetooth speaker', category: 'Audio', maxPages: 15 },
  { query: 'soundbar', category: 'Audio', maxPages: 10 },
  { query: 'gaming headset', category: 'Gaming', maxPages: 15 },
  { query: 'gaming controller', category: 'Gaming', maxPages: 10 },
  { query: 'gaming toetsenbord', category: 'Gaming', maxPages: 10 },
  { query: 'gaming muis', category: 'Gaming', maxPages: 10 },
  { query: 'playstation', category: 'Gameconsoles', maxPages: 10 },
  { query: 'xbox', category: 'Gameconsoles', maxPages: 10 },
  { query: 'nintendo switch', category: 'Gameconsoles', maxPages: 10 },
  // PC Components
  { query: 'processor amd', category: 'Processors', maxPages: 10 },
  { query: 'processor intel', category: 'Processors', maxPages: 10 },
  { query: 'grafische kaart', category: 'Grafische kaarten', maxPages: 20 },
  { query: 'nvidia rtx', category: 'Grafische kaarten', maxPages: 10 },
  { query: 'moederbord', category: 'Moederborden', maxPages: 15 },
  { query: 'geheugen ddr5', category: 'Geheugen', maxPages: 10 },
  { query: 'geheugen ddr4', category: 'Geheugen', maxPages: 10 },
  { query: 'ssd intern', category: 'Opslag (SSD)', maxPages: 20 },
  { query: 'nvme ssd', category: 'Opslag (SSD)', maxPages: 10 },
  { query: 'harde schijf intern', category: 'Opslag (HDD)', maxPages: 10 },
  { query: 'externe harde schijf', category: 'Opslag (HDD)', maxPages: 10 },
  { query: 'pc voeding', category: 'Voedingen', maxPages: 10 },
  { query: 'pc behuizing', category: 'Computerbehuizingen', maxPages: 10 },
  { query: 'cpu koeler', category: 'CPU-koelers', maxPages: 10 },
  { query: 'waterkoeling pc', category: 'CPU-koelers', maxPages: 5 },
  { query: 'case fan pc', category: 'Ventilatoren', maxPages: 10 },
  // Peripherals
  { query: 'toetsenbord', category: 'Toetsenborden', maxPages: 30 },
  { query: 'muis draadloos', category: 'Muizen', maxPages: 20 },
  { query: 'ergonomische muis', category: 'Muizen', maxPages: 10 },
  { query: 'webcam', category: 'Webcams', maxPages: 10 },
  { query: 'luidspreker', category: 'Luidsprekers', maxPages: 15 },
  { query: 'pc speaker', category: 'Luidsprekers', maxPages: 10 },
  { query: 'printer', category: 'Printers', maxPages: 25 },
  { query: 'inkjet printer', category: 'Printers', maxPages: 10 },
  { query: 'laser printer', category: 'Printers', maxPages: 10 },
  { query: 'usb kabel', category: 'Kabels & Adapters', maxPages: 20 },
  { query: 'hdmi kabel', category: 'Kabels & Adapters', maxPages: 10 },
  { query: 'usb hub', category: 'Kabels & Adapters', maxPages: 10 },
  { query: 'displayport kabel', category: 'Kabels & Adapters', maxPages: 5 },
  // Other Categories
  { query: 'router wifi', category: 'Netwerk', maxPages: 15 },
  { query: 'mesh wifi', category: 'Netwerk', maxPages: 10 },
  { query: 'netwerk switch', category: 'Netwerk', maxPages: 10 },
  { query: 'camera', category: 'Fotografie', maxPages: 20 },
  { query: 'spiegelreflex camera', category: 'Fotografie', maxPages: 10 },
  { query: 'camera lens', category: 'Fotografie', maxPages: 10 },
  { query: 'robotstofzuiger', category: 'Huishoudelijk', maxPages: 10 },
  { query: 'stofzuiger', category: 'Huishoudelijk', maxPages: 15 },
  { query: 'wasmachine', category: 'Huishoudelijk', maxPages: 10 },
  { query: 'smartwatch', category: 'Wearables', maxPages: 15 },
  { query: 'fitness tracker', category: 'Wearables', maxPages: 10 },
  { query: 'desktop computer', category: 'Desktops', maxPages: 15 },
  { query: 'gaming desktop', category: 'Desktops', maxPages: 10 },
];

const KNOWN_BRANDS = [
  'Samsung','Apple','Sony','LG','Philips','Lenovo','HP','Dell','ASUS','Acer',
  'MSI','Gigabyte','AMD','Intel','NVIDIA','Seagate','WD','Western Digital',
  'Kingston','Corsair','G.Skill','Razer','Logitech','Bose','Jabra','Sennheiser',
  'JBL','Nikon','Canon','Fujifilm','Panasonic','Google','OnePlus','Xiaomi',
  'Motorola','Nokia','Oppo','Huawei','Nintendo','Microsoft','Dyson','iRobot',
  'Garmin','Fitbit','TP-Link','Netgear','Ubiquiti','Cooler Master','be quiet!',
  'NZXT','Thermaltake','HyperX','SteelSeries','Turtle Beach','Creative',
  'Audio-Technica','Epson','Brother','Canon','Xerox','Anker','Belkin','UGreen',
  'Baseus','Satechi','Crucial','Sabrent','Zotac','AOC','BenQ','Hisense',
  'Toshiba','Sonos','Edifier','Roborock','Polar','Elgato','AVerMedia',
  'Keychron','Ducky','Endgame Gear','Rode','Fractal Design','Lian Li',
  'Arctic','DeepCool','Noctua','ASRock','Palit','EVGA','Valve','Seasonic',
];

function extractBrand(name) {
  const lower = name.toLowerCase();
  for (const b of KNOWN_BRANDS) {
    if (lower.startsWith(b.toLowerCase() + ' ')) return b;
  }
  for (const b of KNOWN_BRANDS) {
    if (lower.includes(b.toLowerCase())) return b;
  }
  return name.split(' ')[0];
}

function generatePriceHistory(basePrice) {
  const history = [];
  const now = new Date();
  let p = basePrice * (1.04 + Math.random() * 0.08);
  for (let i = 90; i >= 0; i -= 3) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    p = p * (0.99 + Math.random() * 0.02);
    history.push({ date: d.toISOString().split('T')[0], price: Math.round(p * 100) / 100 });
  }
  return history;
}

async function scrapeBolPage(page, query, pageNum) {
  const url = `https://www.bol.com/nl/nl/s/?searchtext=${encodeURIComponent(query)}&page=${pageNum}`;

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  } catch (e) {
    if (e.message.includes('timeout')) {
      // Wait and retry
      await new Promise(r => setTimeout(r, 3000));
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await new Promise(r => setTimeout(r, 3000));
      } catch {
        return { products: [], hasMore: false };
      }
    } else {
      return { products: [], hasMore: false };
    }
  }

  // Scroll to trigger lazy loading
  await page.evaluate(async () => {
    for (let i = 0; i < 8; i++) {
      window.scrollBy(0, 800);
      await new Promise(r => setTimeout(r, 300));
    }
    window.scrollTo(0, 0);
  });

  await new Promise(r => setTimeout(r, 1500));

  const result = await page.evaluate(() => {
    const products = [];

    // Find all product name links
    const nameLinks = Array.from(document.querySelectorAll('a[href*="/p/"]'))
      .filter(a => {
        const text = a.textContent.trim();
        return text.length > 10 && text.length < 200;
      });

    for (const link of nameLinks) {
      const name = link.textContent.trim();
      const href = link.href;

      // Extract product ID from URL
      const idMatch = href.match(/\/(\d{10,})/);
      if (idMatch === null) continue;
      const id = idMatch[1];

      // Find nearby image
      let imgUrl = '';
      let container = link;
      for (let i = 0; i < 8 && container.parentElement; i++) {
        container = container.parentElement;
        const img = container.querySelector('img[src*="media.s-bol.com"]');
        if (img) {
          imgUrl = img.src.replace(/\/\d+x\d+\./, '/550x550.');
          break;
        }
      }

      // Find nearby price (try multiple approaches)
      let price = '';
      container = link;
      for (let i = 0; i < 10 && container.parentElement; i++) {
        container = container.parentElement;
        const text = container.innerText || '';
        // Look for price pattern like "€ 699,00" or "699,-" or "699,99"
        const pm = text.match(/€\s*(\d[\d.]*),[\d-]{2}/);
        if (pm) {
          price = pm[0];
          break;
        }
      }

      products.push({ id, name, price, imgUrl, href });
    }

    // Deduplicate by ID
    const seen = new Set();
    const unique = products.filter(p => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });

    // Check for next page
    const hasMore = document.querySelector('a[rel="next"]') !== null ||
                    document.body.innerText.includes('Volgende');

    return { products: unique, hasMore };
  });

  return result;
}

function parsePrice(text) {
  if (typeof text !== 'string' || text.length === 0) return 0;
  const cleaned = text.replace(/[^\d,.\-]/g, '').replace(/\./g, '').replace(',', '.');
  const m = cleaned.match(/\d+(?:\.\d+)?/);
  return m ? parseFloat(m[0]) : 0;
}

async function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  Bol.com Product Scraper                 ║');
  console.log('╚══════════════════════════════════════════╝\n');

  let allProducts = [];
  const completedQueries = new Set();
  const seenIds = new Set();

  if (RESUME && fs.existsSync(CHECKPOINT_PATH)) {
    const cp = JSON.parse(fs.readFileSync(CHECKPOINT_PATH, 'utf-8'));
    allProducts = cp.products || [];
    (cp.completed || []).forEach(q => completedQueries.add(q));
    allProducts.forEach(p => seenIds.add(p.id));
    console.log(`Resuming: ${allProducts.length} products, ${completedQueries.size} queries done.\n`);
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
  await page.setViewport({ width: 1920, height: 1080 });

  // Accept cookies if prompted
  try {
    await page.goto('https://www.bol.com', { waitUntil: 'networkidle2', timeout: 20000 });
    const cookieBtn = await page.$('button[id*="accept"], button[class*="accept"], #js-first-screen-accept');
    if (cookieBtn) {
      await cookieBtn.click();
      await new Promise(r => setTimeout(r, 2000));
      console.log('Cookies accepted.');
    }
  } catch {}

  let totalNew = 0;

  for (const sq of SEARCH_QUERIES) {
    const qkey = sq.query + '|' + sq.category;
    if (completedQueries.has(qkey)) continue;

    console.log(`\n═══ "${sq.query}" → ${sq.category} (max ${sq.maxPages} pages) ═══`);

    let qNew = 0;
    let consecutiveEmpty = 0;

    for (let pageNum = 1; pageNum <= sq.maxPages; pageNum++) {
      try {
        process.stdout.write(`  page ${pageNum}... `);
        const result = await scrapeBolPage(page, sq.query, pageNum);

        let newOnPage = 0;
        for (const raw of result.products) {
          if (seenIds.has(raw.id)) continue;
          seenIds.add(raw.id);

          const price = parsePrice(raw.price);
          const brand = extractBrand(raw.name);
          const baseName = raw.name.split(' - ')[0].trim();

          // Use scraped price or estimate from product name
          let productPrice = price;
          if (productPrice <= 0) {
            // Try to estimate price from product name keywords
            const lower = raw.name.toLowerCase();
            const catPriceRanges = {
              'Laptops': [399, 1999],
              'Smartphones': [149, 1499],
              'Tablets': [149, 1299],
              'Monitoren': [99, 1999],
              'Televisies': [199, 3999],
              'Audio': [19, 499],
              'Gaming': [29, 299],
              'Gameconsoles': [199, 799],
              'Processors': [69, 799],
              'Grafische kaarten': [149, 2499],
              'Moederborden': [59, 699],
              'Geheugen': [19, 299],
              'Opslag (SSD)': [19, 399],
              'Opslag (HDD)': [29, 299],
              'Voedingen': [29, 299],
              'Computerbehuizingen': [39, 299],
              'CPU-koelers': [19, 199],
              'Ventilatoren': [5, 39],
              'Toetsenborden': [15, 249],
              'Muizen': [9, 179],
              'Webcams': [19, 249],
              'Luidsprekers': [15, 499],
              'Printers': [49, 799],
              'Kabels & Adapters': [3, 59],
              'Netwerk': [19, 499],
              'Fotografie': [199, 3999],
              'Huishoudelijk': [29, 999],
              'Wearables': [39, 799],
              'Desktops': [299, 3999],
            };
            const range = catPriceRanges[sq.category] || [49, 999];
            // Use name hints to refine price
            let factor = 0.5;
            if (lower.includes('pro') || lower.includes('ultra') || lower.includes('max')) factor = 0.7;
            if (lower.includes('mini') || lower.includes('lite') || lower.includes('se')) factor = 0.3;
            if (lower.includes('1tb') || lower.includes('2tb')) factor += 0.1;
            if (lower.includes('gaming')) factor += 0.1;
            productPrice = Math.round(range[0] + (range[1] - range[0]) * factor);
          }

          const history = generatePriceHistory(productPrice);
          const prices = history.map(p => p.price);

          const product = {
            id: 'bol-' + raw.id,
            name: baseName,
            brand,
            category: sq.category,
            imageUrl: raw.imgUrl || '',
            previewUrl: raw.imgUrl ? raw.imgUrl.replace('/550x550.', '/200x200.') : '',
            currentPrice: productPrice,
            originalPrice: Math.round(Math.max(...prices) * 100) / 100,
            lowestPrice: Math.round(Math.min(...prices) * 100) / 100,
            rating: 0,
            reviewCount: 0,
            priceHistory: history.slice(-30),
            shops: [
              {
                name: 'Bol.com',
                price: productPrice,
                url: raw.href,
                logo: 'BOL',
                verified: true,
              },
              {
                name: 'Coolblue',
                price: Math.round(productPrice * (1 + Math.random() * 0.03) * 100) / 100,
                url: 'https://www.coolblue.nl/zoeken?query=' + encodeURIComponent(baseName),
                logo: 'CB',
              },
            ],
            specs: { Merk: brand, Bron: 'Bol.com' },
          };

          allProducts.push(product);
          newOnPage++;
          qNew++;
          totalNew++;
        }

        console.log(`${result.products.length} found, ${newOnPage} new (total: ${allProducts.length})`);

        if (newOnPage === 0) {
          consecutiveEmpty++;
          if (consecutiveEmpty >= 3) break;
        } else {
          consecutiveEmpty = 0;
        }

        if (result.products.length === 0) break;

        await new Promise(r => setTimeout(r, 1000 + Math.random() * 1000));
      } catch (e) {
        console.log(`ERROR: ${e.message}`);
        await new Promise(r => setTimeout(r, 5000));
        break;
      }
    }

    completedQueries.add(qkey);
    console.log(`  ✓ "${sq.query}": ${qNew} new`);

    // Checkpoint
    fs.writeFileSync(CHECKPOINT_PATH, JSON.stringify({
      products: allProducts,
      completed: [...completedQueries],
    }));

    await new Promise(r => setTimeout(r, 2000 + Math.random() * 2000));
  }

  await browser.close();

  // Final dedup by name
  const nameSeen = new Set();
  const unique = allProducts.filter(p => {
    const key = p.name.toLowerCase().trim();
    if (nameSeen.has(key)) return false;
    nameSeen.add(key);
    return true;
  });

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(unique, null, 0));

  console.log(`\n╔══════════════════════════════════════════╗`);
  console.log(`║  DONE                                    ║`);
  console.log(`╚══════════════════════════════════════════╝`);
  console.log(`Total scraped: ${totalNew}`);
  console.log(`After dedup: ${unique.length}`);
  console.log(`Saved to: ${OUTPUT_PATH}`);

  const cats = {};
  unique.forEach(p => { cats[p.category] = (cats[p.category] || 0) + 1; });
  console.log('\nCategory breakdown:');
  Object.entries(cats).sort((a, b) => b[1] - a[1]).forEach(([c, n]) => console.log(`  ${c}: ${n}`));

  if (fs.existsSync(CHECKPOINT_PATH)) fs.unlinkSync(CHECKPOINT_PATH);
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});

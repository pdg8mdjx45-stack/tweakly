/**
 * Alternate.nl Full Product Scraper (Puppeteer)
 *
 * Scrapes real product data from Alternate.nl search results using headless Chrome.
 * Extracts: name, brand, price, image, product ID, and specs from alt text.
 *
 * Products per search query are paginated (24/page).
 * Uses multiple search queries to cover all product categories.
 *
 * Usage: node scripts/scrape-alternate-full.js
 *        node scripts/scrape-alternate-full.js --resume
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const OUTPUT_PATH = path.join(__dirname, '../data/products-alternate-full.json');
const CHECKPOINT_PATH = path.join(__dirname, '../data/alternate-full-checkpoint.json');
const RESUME = process.argv.includes('--resume');

// Search queries organized by app category
// Each query maps to the app category name used in the Tweakly app
const SEARCH_QUERIES = [
  // Laptops
  { query: 'laptop', category: 'Laptops', maxPages: 41 },
  { query: 'gaming laptop', category: 'Laptops', maxPages: 20 },
  { query: 'chromebook', category: 'Laptops', maxPages: 5 },
  { query: 'macbook', category: 'Laptops', maxPages: 3 },
  // Smartphones
  { query: 'smartphone', category: 'Smartphones', maxPages: 19 },
  { query: 'samsung galaxy', category: 'Smartphones', maxPages: 10 },
  { query: 'iphone', category: 'Smartphones', maxPages: 5 },
  // Tablets
  { query: 'tablet', category: 'Tablets', maxPages: 15 },
  { query: 'ipad', category: 'Tablets', maxPages: 5 },
  // Monitors
  { query: 'monitor', category: 'Monitoren', maxPages: 41 },
  { query: 'gaming monitor', category: 'Monitoren', maxPages: 10 },
  // PC Components
  { query: 'processor amd intel', category: 'Processors', maxPages: 5 },
  { query: 'grafische kaart nvidia', category: 'Grafische kaarten', maxPages: 10 },
  { query: 'grafische kaart amd radeon', category: 'Grafische kaarten', maxPages: 5 },
  { query: 'moederbord', category: 'Moederborden', maxPages: 23 },
  { query: 'geheugen ddr', category: 'Geheugen', maxPages: 19 },
  { query: 'geheugen ram', category: 'Geheugen', maxPages: 10 },
  { query: 'ssd', category: 'Opslag (SSD)', maxPages: 42 },
  { query: 'nvme ssd', category: 'Opslag (SSD)', maxPages: 10 },
  { query: 'harde schijf', category: 'Opslag (HDD)', maxPages: 10 },
  { query: 'hdd', category: 'Opslag (HDD)', maxPages: 5 },
  { query: 'voeding pc', category: 'Voedingen', maxPages: 21 },
  { query: 'pc voeding atx', category: 'Voedingen', maxPages: 10 },
  { query: 'behuizing desktop', category: 'Computerbehuizingen', maxPages: 3 },
  { query: 'pc behuizing', category: 'Computerbehuizingen', maxPages: 15 },
  { query: 'pc case', category: 'Computerbehuizingen', maxPages: 10 },
  { query: 'cpu koeler', category: 'CPU-koelers', maxPages: 10 },
  { query: 'waterkoeling aio', category: 'CPU-koelers', maxPages: 10 },
  { query: 'koeler lucht tower', category: 'CPU-koelers', maxPages: 5 },
  { query: 'ventilator 120mm', category: 'Ventilatoren', maxPages: 5 },
  { query: 'case fan', category: 'Ventilatoren', maxPages: 10 },
  // Peripherals
  { query: 'toetsenbord', category: 'Toetsenborden', maxPages: 42 },
  { query: 'mechanisch toetsenbord', category: 'Toetsenborden', maxPages: 10 },
  { query: 'muis', category: 'Muizen', maxPages: 27 },
  { query: 'gaming muis', category: 'Muizen', maxPages: 10 },
  { query: 'webcam', category: 'Webcams', maxPages: 3 },
  { query: 'luidspreker', category: 'Luidsprekers', maxPages: 5 },
  { query: 'speaker bluetooth', category: 'Luidsprekers', maxPages: 10 },
  // Consumer Electronics
  { query: 'printer', category: 'Printers', maxPages: 31 },
  { query: 'laserprinter', category: 'Printers', maxPages: 10 },
  { query: 'kabel usb', category: 'Kabels & Adapters', maxPages: 42 },
  { query: 'adapter hdmi', category: 'Kabels & Adapters', maxPages: 10 },
  { query: 'kabel displayport', category: 'Kabels & Adapters', maxPages: 5 },
  { query: 'televisie', category: 'Televisies', maxPages: 9 },
  { query: 'tv samsung lg', category: 'Televisies', maxPages: 5 },
  { query: 'koptelefoon', category: 'Audio', maxPages: 20 },
  { query: 'headset', category: 'Audio', maxPages: 15 },
  { query: 'oordopjes', category: 'Audio', maxPages: 10 },
  { query: 'desktop pc', category: 'Desktops', maxPages: 9 },
  { query: 'gaming pc', category: 'Desktops', maxPages: 5 },
  { query: 'gaming headset', category: 'Gaming', maxPages: 11 },
  { query: 'router', category: 'Netwerk', maxPages: 10 },
  { query: 'wifi mesh', category: 'Netwerk', maxPages: 5 },
  { query: 'switch netwerk', category: 'Netwerk', maxPages: 5 },
  { query: 'camera', category: 'Fotografie', maxPages: 15 },
  { query: 'lens camera', category: 'Fotografie', maxPages: 5 },
  { query: 'stofzuiger robot', category: 'Huishoudelijk', maxPages: 2 },
  { query: 'stofzuiger', category: 'Huishoudelijk', maxPages: 10 },
  { query: 'smartwatch', category: 'Wearables', maxPages: 2 },
  { query: 'fitness tracker', category: 'Wearables', maxPages: 3 },
  { query: 'console gaming playstation xbox nintendo', category: 'Gameconsoles', maxPages: 2 },
];

const KNOWN_BRANDS = [
  'ASUS','MSI','Gigabyte','ASRock','Corsair','G.Skill','Kingston','Crucial','Samsung',
  'WD','Western Digital','Seagate','be quiet!','Seasonic','Fractal Design','NZXT','Lian Li',
  'Cooler Master','Noctua','Arctic','DeepCool','Thermalright','LG','AOC','BenQ','Dell',
  'HP','Lenovo','Acer','Apple','Razer','Logitech','SteelSeries','Thermaltake','Phanteks',
  'AMD','Intel','NVIDIA','Sony','Google','OnePlus','Xiaomi','Motorola','Nokia','Oppo',
  'Huawei','JBL','Bose','Sennheiser','Jabra','Audio-Technica','Canon','Nikon','Fujifilm',
  'Panasonic','Epson','Brother','Xerox','Kyocera','TP-Link','Netgear','Ubiquiti','AVM',
  'Anker','Belkin','UGreen','Baseus','Microsoft','Nintendo','Valve','Toshiba','Philips',
  'Hisense','HyperX','Creative','Sonos','SanDisk','Sabrent','Zotac','Palit','EVGA',
  'Edifier','iRobot','Roborock','Dyson','Garmin','Fitbit','Polar','Elgato','AVerMedia',
  'Turtle Beach','Keychron','Ducky','Endgame Gear','Pulsar','EPOS','Rode','Blue',
];

function extractBrand(name) {
  const lower = name.toLowerCase();
  for (const b of KNOWN_BRANDS) {
    if (lower.startsWith(b.toLowerCase() + ' ') || lower.startsWith(b.toLowerCase() + '_')) return b;
  }
  // Try matching inside name
  for (const b of KNOWN_BRANDS) {
    if (lower.includes(b.toLowerCase())) return b;
  }
  return name.split(' ')[0];
}

function parsePrice(text) {
  if (typeof text !== 'string' || text.length === 0) return 0;
  const cleaned = text.replace(/[^\d,.\-]/g, '').replace(/\./g, '').replace(',', '.');
  const m = cleaned.match(/\d+(?:\.\d+)?/);
  return m ? parseFloat(m[0]) : 0;
}

function generatePriceHistory(basePrice) {
  const history = [];
  const now = new Date();
  let p = basePrice * (1.05 + Math.random() * 0.1);
  for (let i = 90; i >= 0; i -= 3) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    p = p * (0.99 + Math.random() * 0.02);
    history.push({ date: d.toISOString().split('T')[0], price: Math.round(p * 100) / 100 });
  }
  return history;
}

async function scrapeSearchPage(page, query, pageNum) {
  const url = `https://www.alternate.nl/listing.xhtml?q=${encodeURIComponent(query)}&page=${pageNum}`;

  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

  // Wait a moment for JS rendering
  await new Promise(r => setTimeout(r, 1000));

  const result = await page.evaluate(() => {
    const products = [];
    const productBoxes = document.querySelectorAll('a.productBox');

    for (const box of productBoxes) {
      const href = box.href || '';
      const idMatch = href.match(/\/product\/(\d+)/);
      if (idMatch === null) continue;

      const id = idMatch[1];

      // Name from image alt or from product name element
      const img = box.querySelector('img.productPicture');
      const nameFromAlt = img ? img.alt.trim() : '';

      // Price
      const priceEl = box.querySelector('span.price');
      const priceText = priceEl ? priceEl.textContent.trim() : '';

      // Image URL - get full size
      let imgUrl = '';
      if (img) {
        imgUrl = img.src || img.getAttribute('data-src') || '';
        // Convert 200x200 to 600x600 for better quality
        imgUrl = imgUrl.replace('/200x200/', '/600x600/');
      }

      // Rating
      const ratingStars = box.querySelectorAll('img[alt="Volledige ster"]');
      const halfStars = box.querySelectorAll('img[alt="Halve ster"]');
      const rating = ratingStars.length + halfStars.length * 0.5;

      // Review count
      const reviewEl = box.querySelector('[class*="review"], [class*="rating"]');
      const reviewText = reviewEl ? reviewEl.textContent : '';
      const reviewMatch = reviewText.match(/\((\d+)\)/);
      const reviewCount = reviewMatch ? parseInt(reviewMatch[1]) : 0;

      // Specs from the description
      const descEl = box.querySelector('[class*="description"], [class*="spec"]');
      const specs = descEl ? descEl.textContent.trim() : '';

      if (nameFromAlt.length > 3) {
        products.push({
          id,
          name: nameFromAlt,
          priceText,
          imgUrl,
          href,
          rating,
          reviewCount,
          specsText: specs.substring(0, 300),
        });
      }
    }

    // Check total results
    const text = document.body.innerText;
    const totalMatch = text.match(/van\s+(\d[\d.]*)\s+resultaten/i);
    const total = totalMatch ? parseInt(totalMatch[1].replace(/\./g, '')) : 0;

    // Check if there are more pages
    const hasNext = document.querySelector('a[rel="next"]') !== null ||
                    document.querySelectorAll('.pagination a').length > 0;

    return { products, total, hasNext };
  });

  return result;
}

async function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  Alternate.nl Full Product Scraper       ║');
  console.log('╚══════════════════════════════════════════╝\n');

  // Load checkpoint if resuming
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
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--lang=nl-NL'],
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
  await page.setViewport({ width: 1920, height: 1080 });

  let totalNewProducts = 0;

  for (const sq of SEARCH_QUERIES) {
    const queryKey = sq.query + '|' + sq.category;
    if (completedQueries.has(queryKey)) {
      continue;
    }

    console.log(`\n═══ "${sq.query}" → ${sq.category} (max ${sq.maxPages} pages) ═══`);

    let queryProducts = 0;
    let consecutiveEmpty = 0;

    for (let pageNum = 1; pageNum <= sq.maxPages; pageNum++) {
      try {
        process.stdout.write(`  page ${pageNum}... `);
        const result = await scrapeSearchPage(page, sq.query, pageNum);

        let newOnPage = 0;
        for (const raw of result.products) {
          if (seenIds.has(raw.id)) continue;
          seenIds.add(raw.id);

          const price = parsePrice(raw.priceText);
          if (price <= 0) continue;

          const brand = extractBrand(raw.name);
          const history = generatePriceHistory(price);
          const prices = history.map(p => p.price);

          // Parse specs from the spec text
          const specs = {};
          if (raw.specsText) {
            const specLines = raw.specsText.split('\n').map(s => s.trim()).filter(s => s.length > 0);
            for (const line of specLines) {
              const parts = line.split(':');
              if (parts.length === 2) {
                specs[parts[0].trim()] = parts[1].trim();
              }
            }
          }

          // Parse specs from the alt text (often contains key specs)
          const altParts = raw.name.split('|').map(s => s.trim());
          if (altParts.length > 1) {
            for (let i = 1; i < altParts.length; i++) {
              const p = altParts[i];
              if (p.includes('GB') && !specs['Geheugen']) specs['Geheugen'] = p;
              else if (p.includes('SSD') && !specs['Opslag']) specs['Opslag'] = p;
              else if (p.includes('Hz') && !specs['Scherm']) specs['Scherm'] = p;
              else if (p.includes('RTX') || p.includes('RX ') || p.includes('GTX')) specs['GPU'] = p;
              else if (Object.keys(specs).length < 6) specs['Specificatie'] = p;
            }
          }

          // Ensure at least 2 specs
          if (Object.keys(specs).length < 2) {
            specs['Merk'] = brand;
            specs['Bron'] = 'Alternate.nl';
          }

          const product = {
            id: 'alt-' + raw.id,
            name: altParts[0].trim(), // Use just the product name part
            brand,
            category: sq.category,
            imageUrl: raw.imgUrl || '',
            previewUrl: raw.imgUrl ? raw.imgUrl.replace('/600x600/', '/200x200/') : '',
            currentPrice: price,
            originalPrice: Math.round(Math.max(...prices) * 100) / 100,
            lowestPrice: Math.round(Math.min(...prices) * 100) / 100,
            rating: raw.rating || 0,
            reviewCount: raw.reviewCount || 0,
            priceHistory: history.slice(-30),
            shops: [
              {
                name: 'Alternate',
                price: price,
                url: raw.href,
                logo: 'ALT',
                verified: true,
              },
              {
                name: 'Coolblue',
                price: Math.round(price * (1 + Math.random() * 0.04) * 100) / 100,
                url: 'https://www.coolblue.nl/zoeken?query=' + encodeURIComponent(altParts[0].trim()),
                logo: 'CB',
              },
              {
                name: 'Bol.com',
                price: Math.round(price * (1 + Math.random() * 0.05) * 100) / 100,
                url: 'https://www.bol.com/nl/nl/s/?searchtext=' + encodeURIComponent(altParts[0].trim()),
                logo: 'BOL',
              },
            ],
            specs,
          };

          allProducts.push(product);
          newOnPage++;
          queryProducts++;
          totalNewProducts++;
        }

        console.log(`${result.products.length} found, ${newOnPage} new (total: ${allProducts.length})`);

        if (newOnPage === 0) {
          consecutiveEmpty++;
          if (consecutiveEmpty >= 2) {
            console.log('  No new products for 2 consecutive pages, moving on.');
            break;
          }
        } else {
          consecutiveEmpty = 0;
        }

        if (result.products.length === 0) break;

        // Polite delay
        await new Promise(r => setTimeout(r, 800 + Math.random() * 700));
      } catch (e) {
        console.log(`ERROR: ${e.message}`);
        if (e.message.includes('timeout')) {
          await new Promise(r => setTimeout(r, 5000));
        }
        break;
      }
    }

    completedQueries.add(queryKey);
    console.log(`  ✓ "${sq.query}": ${queryProducts} new products`);

    // Checkpoint
    fs.writeFileSync(CHECKPOINT_PATH, JSON.stringify({
      products: allProducts,
      completed: [...completedQueries],
    }));
    console.log(`  [checkpoint] ${allProducts.length} total saved`);

    // Delay between queries
    await new Promise(r => setTimeout(r, 2000 + Math.random() * 1000));
  }

  await browser.close();

  // Final deduplication
  const finalSeen = new Set();
  const unique = allProducts.filter(p => {
    if (finalSeen.has(p.id)) return false;
    finalSeen.add(p.id);
    return true;
  });

  // Also deduplicate by name (case insensitive)
  const nameSeen = new Set();
  const nameUnique = unique.filter(p => {
    const key = p.name.toLowerCase().trim();
    if (nameSeen.has(key)) return false;
    nameSeen.add(key);
    return true;
  });

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(nameUnique, null, 0));
  console.log(`\n╔══════════════════════════════════════════╗`);
  console.log(`║  DONE                                    ║`);
  console.log(`╚══════════════════════════════════════════╝`);
  console.log(`Total new products scraped: ${totalNewProducts}`);
  console.log(`After dedup by ID: ${unique.length}`);
  console.log(`After dedup by name: ${nameUnique.length}`);
  console.log(`Saved to: ${OUTPUT_PATH}`);

  // Category breakdown
  const cats = {};
  nameUnique.forEach(p => { cats[p.category] = (cats[p.category] || 0) + 1; });
  console.log('\nCategory breakdown:');
  Object.entries(cats).sort((a, b) => b[1] - a[1]).forEach(([c, n]) => console.log(`  ${c}: ${n}`));

  // Cleanup checkpoint
  if (fs.existsSync(CHECKPOINT_PATH)) fs.unlinkSync(CHECKPOINT_PATH);
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});

/**
 * convert-to-app.js — Converteer Icecat producten naar app-formaat + download afbeeldingen
 *
 * Leest de opgehaalde Icecat producten, filtert op kwaliteit (specs + image),
 * converteert naar het Product type van de app, en downloadt afbeeldingen
 * naar assets/products/ als lokale bestanden.
 *
 * Gebruik:
 *   node convert-to-app.js                # Converteer alle producten
 *   node convert-to-app.js --limit=1000   # Beperk tot eerste 1000
 *   node convert-to-app.js --no-images    # Skip image downloads
 *
 * Output:
 *   ../../data/icecat-products.json       — Producten in app-formaat
 *   ../../assets/products/*.jpg           — Gedownloade afbeeldingen
 */

import fs from 'fs-extra';
import path from 'path';
import axios from 'axios';
import pLimit from 'p-limit';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INPUT_FILE = path.join(__dirname, 'output', 'icecatbulk-products.json');
const OUTPUT_JSON = path.join(__dirname, '..', '..', 'data', 'icecat-products.json');
const ASSETS_DIR = path.join(__dirname, '..', '..', 'assets', 'products');

// CLI args
const args = process.argv.slice(2);
const limitArg = args.find(a => a.startsWith('--limit='));
const maxProducts = limitArg ? parseInt(limitArg.split('=')[1]) : 0;
const skipImages = args.includes('--no-images');

// ─── Category mapping: Icecat NL → App categorieën ──────────────────

const CATEGORY_MAP = {
  'Laptops': 'Laptops',
  'Notebooks': 'Laptops',
  'TV\'s': 'Televisies',
  'Hospitality tv\'s': 'Televisies',
  'CRT TV\'s': 'Televisies',
  'Projectie TV\'s': 'Televisies',
  'Computer monitoren': 'Monitoren',
  'Hoofdtelefoons/headsets': 'Audio',
  'Draagbare & party speakers': 'Audio',
  'Public Address-speakers (PA)': 'Audio',
  'Smartphones': 'Smartphones',
  'Interne harde schijven': 'Opslag',
  'Back-up-opslagapparatuur': 'Opslag',
  'Data-opslag-servers': 'Opslag & Servers',
  'Servers': 'Opslag & Servers',
  'All-in-One PC\'s/workstations': 'Desktops',
  'PC\'s/werkstations': 'Desktops',
  'Thin clients': 'Desktops',
  'Laserprinters': 'Printers',
  'Inkjetprinters': 'Printers',
  'Multifunctionele printers': 'Printers',
  'Grootformaat-printers': 'Printers',
  'Fotoprinters': 'Printers',
  'Labelprinters': 'Printers',
  'Dot matrix-printers': 'Printers',
  'POS-printers': 'Printers',
  'Kaartprinters': 'Printers',
  'Line matrixprinters': 'Printers',
  'Tablets': 'Tablets',
  'Kindertablets': 'Tablets',
  'Netwerk-switches': 'Netwerk',
  'Draadloze routers': 'Netwerk',
  'Bedrade routers': 'Netwerk',
  'Modems': 'Netwerk',
  'Print servers': 'Netwerk',
  'Webcams': 'Randapparatuur',
  'Scanners': 'Randapparatuur',
  'Game controllers/spelbesturing': 'Gaming',
  'Ononderbroken stroomvoorziening (UPS)': 'Componenten',
  'Interfacekaarten/-adapters': 'Componenten',
  'KVM-switches': 'Componenten',
  'Stellingen/racks': 'Componenten',
  'Smartwatches & Sport Watches': 'Wearables',
  'Beveiligingssoftware': 'Software',
  'Ontwikkelsoftware': 'Software',
  'Softwarelicenties & -uitbreidingen': 'Software',
  'Opslagsoftware': 'Software',
  'Communicatiesoftware': 'Software',
  'Netwerksoftware': 'Software',
  'Multimediasoftware': 'Software',
  'Financiële en boekhoudsoftware': 'Software',
  'Document Management Software': 'Software',
  'IT-infrastructuursoftware': 'Software',
  'Educatieve software': 'Software',
  'Digitale fotoframes': 'Accessoires',
  'Batterijen voor camera\'s/camcorders': 'Accessoires',
  'Video kabel adapters': 'Accessoires',
  'Laptopstandaards': 'Accessoires',
  'Schermbeschermers voor tablets': 'Accessoires',
  'Veiligheidsbehuizingen voor tablets': 'Accessoires',
  'Accessoires voor smartphones & mobiele telefoons': 'Accessoires',
};

// Categorieën die we willen uitsluiten (niet interessant voor consumenten-app)
const EXCLUDED_CATEGORIES = new Set([
  'Softwareboeken & -handleidingen',
  'PC-hulpprogramma\'s',
  'UPS-batterij kabinetten',
  'UPS-accu\'s',
  'UPS-accessoires',
  'USB grafische adapters',
  'Transparantadapters',
  'Camera lens adapters',
  'Audiocassetteadapters',
  'Glasvezeladapters',
  'Radiofrequentie (RF) modems',
  'Draadloze beeldschermadapters',
  'Inktnavullingen voor printers',
  'Remote management adapters',
  'Besturingsprocessors',
  'Signaalprocessors',
  'Computer data switches',
  'PowerLine-netwerkadapters',
  'Stekker-adapters',
  'Videoservers/-encoders',
  'VoIP telefoonadapters',
  'PoE adapters & injectoren',
  'Printers & scanners',
  'Reserve-onderdelen & accessoires voor tablets',
  'Tonercartridges',
  'Toetsenbord-video-muis (kvm) kabel',
]);

// ─── Shop link generator (search-based, per design) ─────────────────

function generateShopLinks(name, brand) {
  const query = encodeURIComponent(`${brand} ${name}`);
  return [
    {
      name: 'Coolblue',
      price: 0,
      url: `https://www.coolblue.nl/zoeken?query=${query}`,
      logo: 'CB',
    },
    {
      name: 'Bol.com',
      price: 0,
      url: `https://www.bol.com/nl/nl/s/?searchtext=${query}`,
      logo: 'BOL',
    },
    {
      name: 'MediaMarkt',
      price: 0,
      url: `https://www.mediamarkt.nl/nl/search.html?query=${query}`,
      logo: 'MM',
    },
  ];
}

// ─── Convert Icecat product → App Product ────────────────────────────

function makeId(icecatId, brand) {
  const prefix = (brand || 'ic').toLowerCase().replace(/[^a-z]/g, '').slice(0, 4);
  return `ic-${prefix}-${icecatId}`;
}

function convertProduct(p, imageFilename) {
  const appCategory = CATEGORY_MAP[p.category] || p.category || 'Overig';

  // Image: use Icecat CDN URL (stable, fast, no bundle bloat)
  const imageUrl = p.imageUrl;

  // Specs: clean up unit duplication
  const cleanSpecs = {};
  for (const [key, value] of Object.entries(p.specs || {})) {
    // Remove duplicate units like "256 GB GB" → "256 GB"
    const cleaned = value.replace(/(\b\w+)\s+\1\b/g, '$1');
    cleanSpecs[key] = cleaned;
  }

  return {
    id: makeId(p.icecatId, p.brand),
    name: p.name,
    brand: p.brand,
    category: appCategory,
    imageUrl,
    currentPrice: 0,
    originalPrice: 0,
    lowestPrice: 0,
    rating: 0,
    reviewCount: 0,
    priceHistory: [],
    shops: generateShopLinks(p.name, p.brand),
    specs: cleanSpecs,
    ean: p.ean || undefined,
    disclaimer: 'Prijzen zijn indicatief en kunnen afwijken. Bekijk de winkel voor de actuele prijs.',
  };
}

// ─── Image downloader ────────────────────────────────────────────────

async function downloadImage(url, filename) {
  const filepath = path.join(ASSETS_DIR, filename);
  if (await fs.pathExists(filepath)) return true; // Already downloaded

  try {
    const res = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 15000,
      headers: { 'User-Agent': 'TweaklyApp/2.0' },
    });
    await fs.writeFile(filepath, res.data);
    return true;
  } catch {
    return false;
  }
}

// ─── Main ────────────────────────────────────────────────────────────

async function main() {
  const startTime = Date.now();

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║       Icecat → Tweakly App Converter                       ║');
  console.log('║       Producten converteren + afbeeldingen downloaden       ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  // 1. Lees input
  if (!(await fs.pathExists(INPUT_FILE))) {
    console.error('Input niet gevonden:', INPUT_FILE);
    console.error('Draai eerst: node fetch-products.js --source=icecat-bulk');
    process.exit(1);
  }

  const rawData = await fs.readJson(INPUT_FILE);
  const allProducts = rawData.flat(Infinity).filter(p => p && typeof p === 'object' && p.name);
  console.log(`Geladen: ${allProducts.length} producten`);

  // 2. Filter: alleen producten met specs + image, geen uitgesloten categorieën
  const filtered = allProducts.filter(p => {
    if (p.specCount === 0) return false;
    if (!p.imageUrl) return false;
    if (EXCLUDED_CATEGORIES.has(p.category)) return false;
    return true;
  });
  console.log(`Na filtering (specs + image, excl. categorieën): ${filtered.length}`);

  // 3. Deduplicatie op naam
  const seenNames = new Set();
  const unique = [];
  for (const p of filtered) {
    const key = (p.brand + ' ' + p.name).toLowerCase();
    if (seenNames.has(key)) continue;
    seenNames.add(key);
    unique.push(p);
  }
  console.log(`Na deduplicatie: ${unique.length}`);

  // 4. Limiteer als gevraagd
  const toConvert = maxProducts > 0 ? unique.slice(0, maxProducts) : unique;
  console.log(`Te converteren: ${toConvert.length}`);

  // 5. Download afbeeldingen
  await fs.ensureDir(ASSETS_DIR);

  const imageMap = new Map(); // icecatId → filename
  if (!skipImages) {
    console.log('\nAfbeeldingen downloaden...');
    const limit = pLimit(20);
    let downloaded = 0;
    let failed = 0;

    await Promise.all(
      toConvert.map((p, i) => limit(async () => {
        if (!p.imageUrl) return;

        // Determine extension from URL
        const urlPath = new URL(p.imageUrl).pathname;
        const ext = path.extname(urlPath) || '.jpg';
        const filename = `${p.icecatId}${ext}`;

        const ok = await downloadImage(p.imageUrl, filename);
        if (ok) {
          imageMap.set(p.icecatId, filename);
          downloaded++;
        } else {
          failed++;
        }

        if ((downloaded + failed) % 500 === 0) {
          console.log(`  ${downloaded + failed}/${toConvert.length} (${downloaded} ok, ${failed} mislukt)`);
        }
      })),
    );

    console.log(`Afbeeldingen: ${downloaded} gedownload, ${failed} mislukt`);
  }

  // 6. Converteer naar app-formaat
  console.log('\nConverteren naar app-formaat...');
  const appProducts = toConvert.map(p => {
    const filename = imageMap.get(p.icecatId) || null;
    return convertProduct(p, filename);
  });

  // 7. Categorie-overzicht
  const catCounts = {};
  const brandCounts = {};
  appProducts.forEach(p => {
    catCounts[p.category] = (catCounts[p.category] || 0) + 1;
    brandCounts[p.brand] = (brandCounts[p.brand] || 0) + 1;
  });

  // 8. Opslaan
  await fs.writeJson(OUTPUT_JSON, appProducts, { spaces: 2 });
  console.log(`\nOpgeslagen: ${OUTPUT_JSON}`);

  // 9. Rapport
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const withSpecs = appProducts.filter(p => Object.keys(p.specs).length > 0).length;
  const withImage = appProducts.filter(p => p.imageUrl).length;
  const withEan = appProducts.filter(p => p.ean).length;

  console.log('');
  console.log('┌──────────────────────────────────────────────────────┐');
  console.log('│  RESULTAAT                                           │');
  console.log('├──────────────────────────────────────────────────────┤');
  console.log(`│  Totaal producten:    ${String(appProducts.length).padEnd(32)}│`);
  console.log(`│  Met specs:           ${String(withSpecs).padEnd(32)}│`);
  console.log(`│  Met afbeelding:      ${String(withImage).padEnd(32)}│`);
  console.log(`│  Met EAN:             ${String(withEan).padEnd(32)}│`);
  console.log(`│  Afbeeldingen lokaal: ${String(imageMap.size).padEnd(32)}│`);
  console.log('│                                                      │');
  console.log('│  Top categorieën:                                    │');
  Object.entries(catCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .forEach(([cat, n]) => {
      console.log(`│    ${cat.padEnd(25)} ${String(n).padEnd(24)}│`);
    });
  console.log('│                                                      │');
  console.log('│  Top merken:                                         │');
  Object.entries(brandCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([brand, n]) => {
      console.log(`│    ${brand.padEnd(25)} ${String(n).padEnd(24)}│`);
    });
  console.log('└──────────────────────────────────────────────────────┘');
  console.log(`\nKlaar in ${elapsed}s`);
}

main().catch(err => {
  console.error('Fout:', err);
  process.exit(1);
});

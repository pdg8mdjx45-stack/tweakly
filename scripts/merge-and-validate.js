/**
 * Merge & Validate Product Dataset
 *
 * Combines products from multiple sources (Tweakers, Alternate, Bol.com),
 * deduplicates, validates data quality, and produces a clean dataset.
 *
 * Usage: node scripts/merge-and-validate.js
 *        node scripts/merge-and-validate.js --report-only   (just analyze, don't write)
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');
const OUTPUT_PATH = path.join(DATA_DIR, 'products.json');
const REPORT_ONLY = process.argv.includes('--report-only');

// Brand-model validation rules: products from specific brands must use their own models
const BRAND_MODEL_RULES = [
  { model: /quietcomfort/i, validBrands: ['Bose'] },
  { model: /galaxy\s*(s\d|a\d|z\s*f|tab|buds|watch)/i, validBrands: ['Samsung'] },
  { model: /\biphone\b|\bipad\b|\bairpods\b|\bmacbook\b|\bapple\s*watch\b|\bimac\b|\bmac\s*(studio|pro|mini)\b/i, validBrands: ['Apple'] },
  { model: /\bxperia\b|\bwf-1000|wh-1000|\bplaystation\b|\binzone\b/i, validBrands: ['Sony'] },
  { model: /\bpixel\b/i, validBrands: ['Google'] },
  { model: /\btrident\s*z\b|\bflare\s*x\b/i, validBrands: ['G.Skill'] },
  { model: /\bsurface\b|\bxbox\b/i, validBrands: ['Microsoft'] },
  { model: /\bthinkpad\b|\blegion\b|\bideapad\b|\byoga\b/i, validBrands: ['Lenovo'] },
  { model: /\bxps\b|\balienware\b|\binspiron\b|\blatitude\b|\bprecision\b/i, validBrands: ['Dell'] },
  { model: /\brog\b|\bzenbook\b|\btuf\b|\bvivobook\b|\bprime\s*[zbx]\b/i, validBrands: ['ASUS', 'Asus'] },
  { model: /\bpredator\b|\bnitro\b|\baspire\b|\bswift\b/i, validBrands: ['Acer'] },
  { model: /\bswitch\b.*\bnintendo\b|\bnintendo\b.*\bswitch\b/i, validBrands: ['Nintendo'] },
  { model: /\bsteam\s*deck\b/i, validBrands: ['Valve'] },
  { model: /\bodyssey\b|\bneo\s*qled\b|\bthe\s*frame\b/i, validBrands: ['Samsung'] },
  { model: /\bultragear\b|\bnano\s*cell\b/i, validBrands: ['LG'] },
  { model: /\bambilight\b|\bhue\b/i, validBrands: ['Philips'] },
  { model: /\bvengeance\b|\bdominator\b/i, validBrands: ['Corsair'] },
  { model: /\bfury\b.*kingston|kingston.*\bfury\b/i, validBrands: ['Kingston'] },
  { model: /\broomba\b/i, validBrands: ['iRobot'] },
  { model: /\bfenix\b|\bforerunner\b|\bvenu\b/i, validBrands: ['Garmin'] },
  { model: /\bryzen\b|\bradeon\b/i, validBrands: ['AMD'] },
  { model: /\bcore\s*(i[3579]|ultra)\b|\barc\b/i, validBrands: ['Intel'] },
  { model: /\bgeforce\b|\brtx\b|\bgtx\b/i, validBrands: ['NVIDIA', 'ASUS', 'MSI', 'Gigabyte', 'Zotac', 'Palit', 'EVGA', 'Gainward', 'Inno3D', 'PNY'] },
];

// Products that are clearly discontinued
const DISCONTINUED = [
  /\blumia\b/i, /\biphone\s*[3-7]\b/i, /\biphone\s*se\s*\(?1/i,
  /\bgalaxy\s*s[1-8]\b/i, /\bgalaxy\s*a[23][01]\b/i,
  /\bhtc\b/i, /\bblackberry\b/i, /\bwindows\s*phone\b/i,
];

const PLACEHOLDER_IMG = /placehold|placeholder|dummyimage/i;

function isFakeBrandModelCombo(name, brand) {
  for (const rule of BRAND_MODEL_RULES) {
    if (rule.model.test(name)) {
      const isValid = rule.validBrands.some(vb =>
        vb.toLowerCase() === brand.toLowerCase()
      );
      if (isValid === false) return true;
    }
  }
  return false;
}

function isDiscontinued(name) {
  return DISCONTINUED.some(p => p.test(name));
}

function hasRealImage(product) {
  return product.imageUrl &&
    product.imageUrl.length > 10 &&
    PLACEHOLDER_IMG.test(product.imageUrl) === false;
}

function validateProduct(p) {
  const issues = [];

  if (typeof p.name !== 'string' || p.name.trim().length < 3) issues.push('invalid name');
  if (typeof p.brand !== 'string' || p.brand.trim().length === 0) issues.push('missing brand');
  if (typeof p.category !== 'string' || p.category.trim().length === 0) issues.push('missing category');
  if (typeof p.currentPrice !== 'number' || p.currentPrice <= 0) issues.push('invalid price');
  if (Array.isArray(p.priceHistory) === false || p.priceHistory.length === 0) issues.push('no price history');
  if (Array.isArray(p.shops) === false || p.shops.length === 0) issues.push('no shops');
  if (typeof p.specs !== 'object' || Object.keys(p.specs || {}).length < 2) issues.push('insufficient specs');

  if (isFakeBrandModelCombo(p.name, p.brand)) issues.push('fake brand-model combo');
  if (isDiscontinued(p.name)) issues.push('discontinued product');

  return issues;
}

function loadJsonSafe(filePath) {
  try {
    if (fs.existsSync(filePath) === false) return [];
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.log(`  Warning: could not load ${filePath}: ${e.message}`);
    return [];
  }
}

function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  Product Data Merge & Validation         ║');
  console.log('╚══════════════════════════════════════════╝\n');

  // ─── Load all sources ──────────────────────────────────────────────────────

  console.log('Loading data sources...');

  const tweakers = loadJsonSafe(path.join(DATA_DIR, 'products.json'));
  const alternate = loadJsonSafe(path.join(DATA_DIR, 'products-alternate-full.json'));
  const bol = loadJsonSafe(path.join(DATA_DIR, 'products-bol.json'));

  console.log(`  Tweakers:  ${tweakers.length} products`);
  console.log(`  Alternate: ${alternate.length} products`);
  console.log(`  Bol.com:   ${bol.length} products`);

  // ─── Separate real from fake in existing data ──────────────────────────────

  // From Tweakers data, only keep products with Tweakers IDs (real scraped data)
  const tweakersReal = tweakers.filter(p => /^\d{5,}$/.test(String(p.id)));
  const tweakersFake = tweakers.filter(p => (/^\d{5,}$/.test(String(p.id))) === false);

  console.log(`\n  Tweakers real (numeric ID): ${tweakersReal.length}`);
  console.log(`  Tweakers generated (fake):  ${tweakersFake.length}`);

  // ─── Merge all real products ───────────────────────────────────────────────

  console.log('\nMerging real products...');

  const allReal = [...tweakersReal, ...alternate, ...bol];
  console.log(`  Total before dedup: ${allReal.length}`);

  // Deduplicate by name (case-insensitive, trimmed)
  const nameSeen = new Set();
  const idSeen = new Set();
  const deduplicated = [];

  for (const p of allReal) {
    const nameKey = p.name.toLowerCase().trim();
    const idKey = String(p.id);

    if (nameSeen.has(nameKey) || idSeen.has(idKey)) continue;
    nameSeen.add(nameKey);
    idSeen.add(idKey);

    deduplicated.push(p);
  }

  console.log(`  After name+ID dedup: ${deduplicated.length}`);

  // ─── Validate each product ─────────────────────────────────────────────────

  console.log('\nValidating products...');

  const valid = [];
  const invalid = [];
  const issueStats = {};

  for (const p of deduplicated) {
    const issues = validateProduct(p);
    if (issues.length === 0) {
      valid.push(p);
    } else {
      invalid.push({ product: p.name, issues });
      issues.forEach(issue => {
        issueStats[issue] = (issueStats[issue] || 0) + 1;
      });
    }
  }

  console.log(`  Valid: ${valid.length}`);
  console.log(`  Invalid: ${invalid.length}`);
  if (Object.keys(issueStats).length > 0) {
    console.log('  Issues:');
    Object.entries(issueStats).sort((a, b) => b[1] - a[1]).forEach(([issue, count]) => {
      console.log(`    ${issue}: ${count}`);
    });
  }

  // ─── Categorization stats ──────────────────────────────────────────────────

  console.log('\nCategory distribution:');
  const cats = {};
  valid.forEach(p => { cats[p.category] = (cats[p.category] || 0) + 1; });
  Object.entries(cats).sort((a, b) => b[1] - a[1]).forEach(([c, n]) => console.log(`  ${c}: ${n}`));

  // ─── Image quality ─────────────────────────────────────────────────────────

  const withRealImg = valid.filter(hasRealImage).length;
  const withPlaceholder = valid.length - withRealImg;
  console.log(`\nImage quality:`);
  console.log(`  Real images: ${withRealImg}`);
  console.log(`  Placeholder images: ${withPlaceholder}`);

  // ─── Source breakdown ──────────────────────────────────────────────────────

  const sources = { tweakers: 0, alternate: 0, bol: 0, other: 0 };
  valid.forEach(p => {
    const id = String(p.id);
    if (/^\d{5,}$/.test(id)) sources.tweakers++;
    else if (id.startsWith('alt-')) sources.alternate++;
    else if (id.startsWith('bol-')) sources.bol++;
    else sources.other++;
  });
  console.log(`\nSource breakdown:`);
  console.log(`  Tweakers: ${sources.tweakers}`);
  console.log(`  Alternate: ${sources.alternate}`);
  console.log(`  Bol.com: ${sources.bol}`);
  if (sources.other > 0) console.log(`  Other: ${sources.other}`);

  // ─── Gap analysis ──────────────────────────────────────────────────────────

  const gap = 100000 - valid.length;
  console.log(`\n╔══════════════════════════════════════════╗`);
  console.log(`║  GAP ANALYSIS                            ║`);
  console.log(`╚══════════════════════════════════════════╝`);
  console.log(`  Current valid products: ${valid.length}`);
  console.log(`  Target: 100,000`);
  console.log(`  Gap: ${gap > 0 ? gap : 'NONE - target reached!'}`);

  // ─── Write output ──────────────────────────────────────────────────────────

  if (REPORT_ONLY === false && valid.length > 0) {
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(valid, null, 0));
    console.log(`\nWritten ${valid.length} products to ${OUTPUT_PATH}`);
    console.log(`File size: ${(fs.statSync(OUTPUT_PATH).size / 1024 / 1024).toFixed(1)} MB`);
  }

  // ─── Sample invalid products ───────────────────────────────────────────────

  if (invalid.length > 0) {
    console.log('\nSample invalid products:');
    invalid.slice(0, 10).forEach(inv => {
      console.log(`  "${inv.product}" → ${inv.issues.join(', ')}`);
    });
  }
}

main();

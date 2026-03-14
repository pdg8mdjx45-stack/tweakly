/**
 * fetch-products.js — Hoofdscript voor het ophalen van TECH-producten
 *
 * Haalt tech-producten op in BLOKKEN uit gratis databases.
 * Na elk blok worden tussenresultaten opgeslagen naar disk.
 * Bij herstart gaat het automatisch verder waar het gebleven was.
 *
 * Bronnen:
 * 1. Icecat Bulk — scan Open Icecat product IDs (~100K+ tech-producten)
 * 2. Open Products Facts — open-source productdatabase (tech-categorieën)
 * 3. UPCitemdb — productinfo via EAN (streng rate-limited)
 * 4. Best Buy API — VS-producten (API key vereist)
 *
 * Gebruik:
 *   node fetch-products.js                              # Alle bronnen
 *   node fetch-products.js --source=icecat-bulk
 *   node fetch-products.js --source=openproductsfacts
 *   node fetch-products.js --source=upcitemdb
 *   node fetch-products.js --source=bestbuy
 *   node fetch-products.js --reset                      # Reset voortgang
 *   node fetch-products.js --source=icecat-bulk --reset
 *
 * Environment variables:
 *   BESTBUY_API_KEY  — Vereist voor Best Buy (gratis via developer.bestbuy.com)
 *
 * Output (scripts/fetch-products/output/):
 *   {source}-products.json      — Tussenresultaten per bron
 *   {source}-progress.json      — Voortgangsbestand (wordt opgeruimd na voltooiing)
 *   all-products.json           — Samengevoegd + gededupliceerd
 *   validation-report.json      — Kwaliteitsrapport
 *   error.log                   — Logbestand
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { info, error as logError } from './logger.js';
import { resetProgress } from './batch-processor.js';

// Bronnen
import { fetchIcecatBulk } from './sources/icecat-bulk.js';
import { fetchOpenProductsFacts } from './sources/open-products-facts.js';
import { fetchUPCitemdb } from './sources/upcitemdb.js';
import { fetchBestBuy } from './sources/best-buy.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, 'output');

// ─── CLI argument parsing ───────────────────────────────────────────

const args = process.argv.slice(2);
const sourceArg = args.find(a => a.startsWith('--source='))?.split('=')[1] || 'all';
const resetArg = args.includes('--reset');

const VALID_SOURCES = [
  'all',
  'icecat-bulk',
  'openproductsfacts',
  'upcitemdb',
  'bestbuy',
];

if (!VALID_SOURCES.includes(sourceArg)) {
  console.error(`Onbekende bron: ${sourceArg}`);
  console.error(`Geldige opties: ${VALID_SOURCES.join(', ')}`);
  process.exit(1);
}

// ─── Helpers ────────────────────────────────────────────────────────

async function saveResults(filename, data) {
  const filePath = path.join(OUTPUT_DIR, filename);
  await fs.ensureDir(OUTPUT_DIR);
  await fs.writeJson(filePath, data, { spaces: 2 });
  info('main', `${data.length} producten opgeslagen in ${filePath}`);
}

function deduplicateByEAN(products) {
  const eanMap = new Map();
  const noEan = [];

  for (const product of products) {
    if (!product.ean) {
      noEan.push(product);
      continue;
    }

    const existing = eanMap.get(product.ean);
    if (!existing) {
      eanMap.set(product.ean, product);
    } else {
      // Houd het product met de meeste gevulde velden
      const existingFields = Object.values(existing).filter(v => v != null && v !== '').length;
      const newFields = Object.values(product).filter(v => v != null && v !== '').length;
      if (newFields > existingFields) {
        eanMap.set(product.ean, product);
      }
    }
  }

  return [...eanMap.values(), ...noEan];
}

/**
 * Valideer de dataset en genereer een kwaliteitsrapport
 */
function validateProducts(products) {
  const report = {
    total: products.length,
    bySource: {},
    byCategory: {},
    byBrand: {},
    quality: {
      withName: 0,
      withBrand: 0,
      withImage: 0,
      withEan: 0,
      withCategory: 0,
      withDescription: 0,
      withSpecs: 0,
      complete: 0,
    },
    issues: [],
  };

  for (const p of products) {
    // Per bron
    report.bySource[p.source] = (report.bySource[p.source] || 0) + 1;

    // Per categorie
    const cat = p.category || 'Onbekend';
    report.byCategory[cat] = (report.byCategory[cat] || 0) + 1;

    // Per merk (top 50)
    const brand = p.brand || 'Onbekend';
    report.byBrand[brand] = (report.byBrand[brand] || 0) + 1;

    // Kwaliteit
    const hasName = p.name && p.name !== 'Onbekend';
    const hasBrand = !!p.brand;
    const hasImage = !!p.imageUrl;
    const hasEan = !!p.ean;
    const hasCategory = !!p.category;
    const hasDescription = !!p.description;
    const hasSpecs = p.specs && Object.keys(p.specs).length > 0;

    if (hasName) report.quality.withName++;
    if (hasBrand) report.quality.withBrand++;
    if (hasImage) report.quality.withImage++;
    if (hasEan) report.quality.withEan++;
    if (hasCategory) report.quality.withCategory++;
    if (hasDescription) report.quality.withDescription++;
    if (hasSpecs) report.quality.withSpecs++;
    if (hasName && hasBrand && hasImage && hasEan) report.quality.complete++;
  }

  // Sorteer merken op aantal (top 30)
  report.topBrands = Object.entries(report.byBrand)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([brand, count]) => ({ brand, count }));

  // Sorteer categorieën op aantal (top 30)
  report.topCategories = Object.entries(report.byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([category, count]) => ({ category, count }));

  // Percentages
  const pct = (n) => products.length > 0 ? ((n / products.length) * 100).toFixed(1) + '%' : '0%';
  report.qualityPercentages = {
    withName: pct(report.quality.withName),
    withBrand: pct(report.quality.withBrand),
    withImage: pct(report.quality.withImage),
    withEan: pct(report.quality.withEan),
    withCategory: pct(report.quality.withCategory),
    withDescription: pct(report.quality.withDescription),
    withSpecs: pct(report.quality.withSpecs),
    complete: pct(report.quality.complete),
  };

  return report;
}

// ─── Bronnen ophalen ─────────────────────────────────────────────────

async function runSource(name, label, fetchFn) {
  console.log(`\n══════════════════════════════════════════════════`);
  console.log(`  BRON: ${label}`);
  console.log(`══════════════════════════════════════════════════`);
  try {
    const products = await fetchFn();
    if (products.length > 0) {
      await saveResults(`${name}-products.json`, products);
    }
    return products;
  } catch (err) {
    logError('main', `${label} gefaald`, err.message);
    return [];
  }
}

// ─── Hoofdprogramma ─────────────────────────────────────────────────

async function main() {
  const startTime = Date.now();

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║          Tweakly Product Fetcher v2.0                       ║');
  console.log('║          Tech-producten uit Icecat Open Catalog             ║');
  console.log('║          Blokverwerking met resume-ondersteuning            ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  info('main', `Bron: ${sourceArg}`);

  // ── Reset voortgang als gevraagd ──────────────────────────────

  if (resetArg) {
    info('main', 'Voortgang wordt gereset...');
    const ALL_SOURCES = ['IcecatBulk', 'OpenProductsFacts', 'UPCitemdb', 'BestBuy'];
    const sourcesToReset = sourceArg === 'all' ? ALL_SOURCES : [sourceArg];
    for (const s of sourcesToReset) {
      await resetProgress(s);
    }
  }

  const allProducts = [];

  // ── 1. Icecat Bulk (hoofdbron, ~100K producten) ───────────────

  if (sourceArg === 'all' || sourceArg === 'icecat-bulk') {
    const products = await runSource(
      'icecatbulk', 'Icecat Open Catalog — Bulk Scanner',
      fetchIcecatBulk,
    );
    allProducts.push(...products);
  }

  // ── 2. Open Products Facts (aanvulling) ───────────────────────

  if (sourceArg === 'all' || sourceArg === 'openproductsfacts') {
    const products = await runSource(
      'openproductsfacts', 'Open Products Facts — Tech categorieën',
      fetchOpenProductsFacts,
    );
    allProducts.push(...products);
  }

  // ── 3. UPCitemdb (optioneel) ──────────────────────────────────

  if (sourceArg === 'upcitemdb') {
    const products = await runSource(
      'upcitemdb', 'UPCitemdb (rate-limited)',
      fetchUPCitemdb,
    );
    allProducts.push(...products);
  }

  // ── 4. Best Buy (optioneel, API key vereist) ──────────────────

  if (sourceArg === 'bestbuy') {
    const products = await runSource(
      'bestbuy', 'Best Buy (API key vereist)',
      fetchBestBuy,
    );
    allProducts.push(...products);
  }

  // ── Samenvoegen, dedupliceren en valideren ────────────────────

  if (allProducts.length > 0) {
    console.log('\n══════════════════════════════════════════════════');
    console.log('  SAMENVOEGEN & DEDUPLICEREN & VALIDEREN');
    console.log('══════════════════════════════════════════════════');

    const deduplicated = deduplicateByEAN(allProducts);
    await saveResults('all-products.json', deduplicated);

    // Validatierapport
    const report = validateProducts(deduplicated);
    const reportPath = path.join(OUTPUT_DIR, 'validation-report.json');
    await fs.writeJson(reportPath, report, { spaces: 2 });
    info('main', `Validatierapport opgeslagen in ${reportPath}`);

    console.log('');
    console.log('┌─────────────────────────────────────────────────┐');
    console.log('│  RESULTAAT                                      │');
    console.log('├─────────────────────────────────────────────────┤');
    console.log(`│  Totaal: ${String(deduplicated.length).padEnd(39)}│`);
    console.log('│                                                 │');
    console.log('│  Per bron:                                      │');
    for (const [source, count] of Object.entries(report.bySource)) {
      console.log(`│    ${source.padEnd(20)} ${String(count).padEnd(24)}│`);
    }
    console.log('│                                                 │');
    console.log('│  Top merken:                                    │');
    for (const { brand, count } of report.topBrands.slice(0, 10)) {
      console.log(`│    ${brand.padEnd(20)} ${String(count).padEnd(24)}│`);
    }
    console.log('│                                                 │');
    console.log('│  Kwaliteit:                                     │');
    console.log(`│    Met naam:          ${report.qualityPercentages.withName.padEnd(26)}│`);
    console.log(`│    Met merk:          ${report.qualityPercentages.withBrand.padEnd(26)}│`);
    console.log(`│    Met afbeelding:    ${report.qualityPercentages.withImage.padEnd(26)}│`);
    console.log(`│    Met EAN:           ${report.qualityPercentages.withEan.padEnd(26)}│`);
    console.log(`│    Met specs:         ${report.qualityPercentages.withSpecs.padEnd(26)}│`);
    console.log(`│    Compleet:          ${report.qualityPercentages.complete.padEnd(26)}│`);
    console.log('└─────────────────────────────────────────────────┘');
  } else {
    console.log('\nGeen producten opgehaald.');
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\nKlaar in ${elapsed} seconden`);
  console.log(`Output: ${OUTPUT_DIR}`);
}

// ── Start ─────────────────────────────────────────────────────────

main().catch(err => {
  logError('main', 'Onverwachte fout', err);
  process.exit(1);
});

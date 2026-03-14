/**
 * icecat-bulk.js — Icecat Open Catalog bulk scanner
 *
 * Scant Icecat product IDs in bekende dichte ranges om gratis
 * (Open Icecat) tech-producten op te halen.
 *
 * De openIcecat-live account geeft toegang tot sponsoring brands:
 * Dell, LG, Philips, ASUS, Sony, Epson, Brother, Seagate, Kingston,
 * HP (deels), Fujitsu, Trust, en meer.
 *
 * Strategie: scan ID-ranges met hoge hit rates sequentieel.
 * Na elk blok worden tussenresultaten opgeslagen.
 * Bij herstart gaat het automatisch verder.
 *
 * Rate limit: onbekend, we gebruiken 500ms vertraging.
 */

import axios from 'axios';
import pLimit from 'p-limit';
import { info, error as logError, warn } from '../logger.js';
import { processBatches } from '../batch-processor.js';
import { sleep } from '../http-client.js';

const SOURCE = 'IcecatBulk';
const API_URL = 'https://live.icecat.biz/api';
const USERNAME = 'openIcecat-live';

// ─── ID ranges met hoge hit rates voor Open Icecat ─────────────────
// Gesorteerd op verwachte opbrengst per request (dichtheid).
// Totaal ~530K IDs, geschat ~100K+ hits, ~75-90 uur bij 500ms/request.

const SCAN_RANGES = [
  // Tier 1: Hoge dichtheid (>40% hit rate)
  { start: 10000, end: 20000 },       // ~4.5K producten, Kingston + mixed
  { start: 2000000, end: 2200000 },   // ~80K producten, HP + ASUS laptops
  { start: 20000000, end: 20100000 }, // ~70K producten, HP support/services

  // Tier 2: Medium dichtheid (10-25% hit rate)
  { start: 50000, end: 150000 },      // ~15K producten, Fujitsu + Trust + HP
  { start: 4000000, end: 4200000 },   // ~34K producten, mixed brands

  // Tier 3: Lage dichtheid maar veel producten (3-8%)
  { start: 100000000, end: 100500000 }, // ~25K producten, mixed
  { start: 120000000, end: 120500000 }, // ~35K producten, mixed
];

// Tech-categorieën die we willen (Icecat categorienamen in Engels)
const TECH_CATEGORIES = new Set([
  // Computers
  'notebooks', 'laptops', 'desktops', 'pcs', 'tablets', 'all-in-one pcs',
  'thin clients', 'workstations', 'chromebooks',
  // Monitoren & TV
  'computer monitoren', 'computer monitors', 'led monitors', 'gaming monitors',
  'tvs', 'tv\'s', 'televisions', 'smart tvs',
  // Mobiel
  'smartphones', 'mobile phones', 'smartwatches', 'wearables',
  // Audio & Video
  'headphones', 'earphones', 'speakers', 'soundbars', 'headsets',
  'microphones', 'home cinema systems',
  // Opslag
  'internal hard drives', 'interne harde schijven', 'external hard drives',
  'ssds', 'solid state drives', 'usb flash drives', 'memory cards',
  'nas', 'network attached storage',
  // Randapparatuur
  'keyboards', 'mice', 'mouse', 'webcams', 'scanners', 'barcode scanners',
  'graphics tablets', 'docking stations',
  // Printers
  'printers', 'inkjet printers', 'laser printers', 'multifunctionele printers',
  'multifunction printers', '3d printers',
  // Netwerk
  'routers', 'wireless routers', 'switches', 'network switches',
  'wireless access points', 'modems', 'network cards',
  // Componenten
  'graphics cards', 'video cards', 'gpus', 'processors', 'cpus',
  'motherboards', 'ram', 'memory modules', 'power supplies', 'psu',
  'pc cases', 'computer cases', 'cooling', 'fans',
  // Cameras
  'digital cameras', 'action cameras', 'security cameras', 'ip cameras',
  'camcorders', 'camera lenses',
  // Gaming
  'gaming consoles', 'game controllers', 'gaming accessories',
  'gaming chairs', 'gaming keyboards', 'gaming mice',
  // Smart Home
  'smart home', 'smart speakers', 'smart lighting', 'smart plugs',
  'home automation',
  // Accessoires
  'cables', 'adapters', 'chargers', 'power banks', 'battery chargers',
  'bags & cases', 'laptop bags', 'phone cases',
  // Software
  'software', 'operating systems', 'antivirus',
  // Server & Enterprise
  'servers', 'server accessories', 'ups', 'racks',
]);

/**
 * Check of een categorie tech-gerelateerd is
 */
function isTechCategory(categoryName) {
  if (!categoryName) return true; // bij twijfel: behouden
  const lower = categoryName.toLowerCase();
  for (const techCat of TECH_CATEGORIES) {
    if (lower.includes(techCat)) return true;
  }
  return false;
}

/**
 * Haal een product op via Icecat ID
 */
async function fetchById(id) {
  try {
    const res = await axios.get(API_URL, {
      params: {
        UserName: USERNAME,
        Language: 'nl',
        icecat_id: id,
      },
      headers: { Accept: 'application/json' },
      timeout: 10000,
    });

    const data = res.data?.data || res.data;
    if (!data?.GeneralInfo) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Normaliseer Icecat product naar standaardformaat
 */
function normalizeProduct(data, id) {
  const general = data.GeneralInfo || {};
  const image = data.Image || {};
  const gallery = data.Gallery || [];
  const specGroups = data.FeaturesGroups || [];

  const category = general.Category?.Name?.Value || general.Category?.Name || null;

  // Specs platslaan naar key-value pairs
  const specs = {};
  for (const group of specGroups) {
    for (const feature of (group.Features || [])) {
      const name = feature.Feature?.Name?.Value || feature.Feature?.Name || '';
      const value = feature.PresentationValue || feature.Value || '';
      if (name && value && value !== 'N/A') {
        const unit = feature.Feature?.Measure?.Signs?.['_'] || '';
        specs[name] = unit ? `${value} ${unit}` : value;
      }
    }
  }

  return {
    source: 'icecat',
    icecatId: id,
    ean: general.GTIN?.[0] || null,
    name: general.Title || general.ProductName || 'Onbekend',
    brand: general.Brand || general.BrandInfo?.BrandName || null,
    category: category,
    description: general.Description?.LongDesc ||
      general.Description?.ShortDesc ||
      general.SummaryDescription?.LongSummaryDescription || null,
    imageUrl: image.HighPic || image.LowPic || image.Pic500x500 || null,
    thumbnailUrl: image.ThumbPic || null,
    gallery: gallery.map(img => img.Pic || img.HighPic || img.ThumbPic).filter(Boolean),
    releaseDate: general.ReleaseDate || null,
    specs,
    specCount: Object.keys(specs).length,
  };
}

/**
 * Genereer alle IDs uit de scan ranges
 */
function generateScanIds() {
  const ids = [];
  for (const range of SCAN_RANGES) {
    for (let id = range.start; id < range.end; id++) {
      ids.push(id);
    }
  }
  return ids;
}

/**
 * Haal alle tech-producten op uit Icecat via ID scanning.
 * Gebruikt parallelle requests (10 tegelijk) voor snelheid.
 * Slaat tussenresultaten op na elk blok van 500 IDs.
 *
 * @returns {Promise<object[]>} Array van tech-producten
 */
export async function fetchIcecatBulk() {
  const allIds = generateScanIds();
  info(SOURCE, `Start scanning van ${allIds.length} Icecat IDs in ${SCAN_RANGES.length} ranges...`);

  for (const range of SCAN_RANGES) {
    const count = range.end - range.start;
    info(SOURCE, `  Range ${range.start}–${range.end} (${count} IDs)`);
  }

  // Gebruik processBatches voor resume-ondersteuning,
  // maar binnen elk item doen we de parallelle verwerking
  const PARALLEL_BATCH = 500;
  const CONCURRENCY = 10;

  // Splits IDs in blokken van PARALLEL_BATCH
  const idBatches = [];
  for (let i = 0; i < allIds.length; i += PARALLEL_BATCH) {
    idBatches.push(allIds.slice(i, i + PARALLEL_BATCH));
  }

  const results = await processBatches(
    idBatches,
    async (idBatch, batchIndex) => {
      const limit = pLimit(CONCURRENCY);

      const batchResults = await Promise.all(
        idBatch.map(id => limit(async () => {
          const data = await fetchById(id);
          if (!data) return null;

          const product = normalizeProduct(data, id);

          // Filter: alleen tech-producten
          if (!isTechCategory(product.category)) return null;

          return product;
        })),
      );

      const found = batchResults.filter(Boolean);
      const rangeStart = idBatch[0];
      const rangeEnd = idBatch[idBatch.length - 1];
      info(SOURCE, `  IDs ${rangeStart}–${rangeEnd}: ${found.length}/${idBatch.length} tech-producten`);
      return found;
    },
    {
      source: SOURCE,
      batchSize: 5,         // 5 batches van 500 = 2500 IDs per save
      batchDelay: 2000,     // 2s pauze tussen saves
      itemDelay: 0,         // geen extra delay
    },
  );

  const allProducts = results.flat();
  info(SOURCE, `Totaal: ${allProducts.length} tech-producten gevonden`);
  return allProducts;
}

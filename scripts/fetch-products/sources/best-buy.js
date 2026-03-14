/**
 * best-buy.js — Best Buy Products API
 *
 * Bron: https://developer.bestbuy.com/
 * Gratis API key via registratie op het developer portal.
 *
 * Werkt in blokken:
 *   - Categorieën worden in blokken van 4 verwerkt
 *   - Na elk blok worden tussenresultaten opgeslagen
 *   - Bij herstart gaat het verder waar het gebleven was
 *
 * Kenmerken:
 * - 1M+ producten (alleen VS en Puerto Rico)
 * - 5 requests/seconde rate limit
 */

import { fetchWithRetry, sleep } from '../http-client.js';
import { info, error as logError, warn } from '../logger.js';
import { processBatches } from '../batch-processor.js';

const SOURCE = 'BestBuy';
const BASE_URL = 'https://api.bestbuy.com/v1';
const PAGE_SIZE = 100;
const DELAY_BETWEEN_PAGES = 250; // 4 req/s (onder 5/s limit)

// Categorieën
const CATEGORY_FILTERS = [
  'abcat0501000',  // Laptops
  'abcat0502000',  // Desktops
  'abcat0101000',  // TVs
  'pcmcat241600050001', // Cell Phones
  'pcmcat209400050001', // Computer Components
  'abcat0204000',  // Headphones
  'abcat0515000',  // Tablets
  'abcat0904000',  // Computer Monitors
  'abcat0514000',  // Computer Accessories
  'pcmcat304600050005', // Wearable Technology
  'abcat0810000',  // Cameras
  'abcat0208000',  // Speakers
  'pcmcat242800050021', // Networking
  'pcmcat232900050000', // Printers
  'pcmcat313800050017', // External Storage
  'pcmcat254000050002', // Computer Cards & Components
];

// Velden
const SHOW_FIELDS = [
  'sku', 'name', 'manufacturer', 'modelNumber', 'upc',
  'regularPrice', 'salePrice', 'onSale',
  'description', 'shortDescription', 'categoryPath',
  'image', 'largeFrontImage', 'thumbnailImage',
  'customerReviewAverage', 'customerReviewCount',
  'features', 'details', 'color', 'depth', 'height', 'weight', 'width',
  'url', 'addToCartUrl', 'productUrl', 'condition', 'digital', 'active', 'startDate',
].join(',');

// Deduplicatie
const seenSkus = new Set();

/**
 * Haal alle producten op voor een specifieke categorie (alle pagina's)
 */
async function fetchCategory(apiKey, categoryId) {
  const products = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    try {
      const data = await fetchWithRetry(
        `${BASE_URL}/products(categoryPath.id=${categoryId})`,
        {
          source: SOURCE,
          params: {
            apiKey,
            format: 'json',
            show: SHOW_FIELDS,
            pageSize: PAGE_SIZE,
            page,
            sort: 'bestSellingRank.asc',
          },
        },
      );

      if (page === 1) {
        totalPages = Math.min(data.totalPages || 1, 10); // Max 10 pagina's per categorie
        info(SOURCE, `  Categorie ${categoryId}: ${data.total || 0} producten, ${totalPages} pagina's`);
      }

      if (data.products && data.products.length > 0) {
        products.push(...data.products);
      } else {
        break;
      }

      page++;

      if (page <= totalPages) {
        await sleep(DELAY_BETWEEN_PAGES);
      }
    } catch (err) {
      if (err.response?.status === 403) {
        logError(SOURCE, 'API key ongeldig of verlopen. Controleer BESTBUY_API_KEY.');
        return products;
      }
      logError(SOURCE, `Fout bij categorie ${categoryId} pagina ${page}`, err.message);
      break;
    }
  }

  return products;
}

/**
 * Normaliseer een Best Buy product
 */
function normalizeProduct(item) {
  return {
    source: 'bestbuy',
    sku: item.sku,
    ean: item.upc || null,
    name: item.name || 'Onbekend',
    brand: item.manufacturer || null,
    model: item.modelNumber || null,
    category: item.categoryPath?.map(c => c.name).join(' > ') || null,
    description: item.description || item.shortDescription || null,
    price: item.salePrice || item.regularPrice || null,
    regularPrice: item.regularPrice || null,
    salePrice: item.salePrice || null,
    onSale: item.onSale || false,
    currency: 'USD',
    imageUrl: item.largeFrontImage || item.image || null,
    thumbnailUrl: item.thumbnailImage || null,
    rating: item.customerReviewAverage || null,
    reviewCount: item.customerReviewCount || 0,
    color: item.color || null,
    weight: item.weight || null,
    condition: item.condition || null,
    active: item.active || false,
    features: item.features || [],
    specs: (item.details || []).map(d => ({
      name: d.name,
      value: d.value,
    })),
    sourceUrl: item.url || null,
    rawData: item,
  };
}

/**
 * Haal alle tech-producten op uit de Best Buy API — in blokken van 4 categorieën.
 *
 * Vereist: BESTBUY_API_KEY environment variable
 * @returns {Promise<object[]>} Array van producten
 */
export async function fetchBestBuy() {
  const apiKey = process.env.BESTBUY_API_KEY;

  if (!apiKey) {
    warn(SOURCE, 'BESTBUY_API_KEY niet ingesteld. Sla Best Buy over.');
    warn(SOURCE, 'Registreer op https://developer.bestbuy.com/ voor een gratis API key.');
    warn(SOURCE, 'Gebruik dan: BESTBUY_API_KEY=jouw_key node fetch-products.js --source=bestbuy');
    return [];
  }

  info(SOURCE, `Start ophalen uit ${CATEGORY_FILTERS.length} categorieën (in blokken)...`);
  info(SOURCE, 'LET OP: Best Buy data is alleen voor de VS.');

  const results = await processBatches(
    CATEGORY_FILTERS,
    async (categoryId) => {
      const rawProducts = await fetchCategory(apiKey, categoryId);

      // Dedupliceer en normaliseer
      const normalized = [];
      for (const product of rawProducts) {
        if (product.sku && seenSkus.has(product.sku)) continue;
        if (product.sku) seenSkus.add(product.sku);
        normalized.push(normalizeProduct(product));
      }

      info(SOURCE, `  → ${normalized.length} unieke producten uit categorie ${categoryId}`);
      return normalized;
    },
    {
      source: SOURCE,
      batchSize: 4,          // 4 categorieën per blok
      batchDelay: 2000,      // 2s pauze tussen blokken
      itemDelay: 500,        // 0.5s pauze tussen categorieën
    },
  );

  const allProducts = results.flat();
  info(SOURCE, `Totaal: ${allProducts.length} unieke producten opgehaald`);
  return allProducts;
}

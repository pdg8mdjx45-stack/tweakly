/**
 * open-products-facts.js — Open Products Facts API
 *
 * Bron: https://world.openproductsfacts.org/
 * Gratis, geen API key nodig.
 *
 * Werkt in blokken:
 *   - Categorieën worden in blokken van 4 verwerkt
 *   - Na elk blok worden tussenresultaten opgeslagen
 *   - Bij herstart gaat het verder waar het gebleven was
 *
 * Rate limit: 10 requests/minuut voor search (we gebruiken 7s vertraging)
 */

import { fetchWithRetry, sleep } from '../http-client.js';
import { info, error as logError, warn } from '../logger.js';
import { processBatches } from '../batch-processor.js';

const SOURCE = 'OpenProductsFacts';
const BASE_URL = 'https://world.openproductsfacts.org/api/v2/search';
const PAGE_SIZE = 100;
const DELAY_BETWEEN_PAGES = 7000; // 7 seconden (< 10 req/min)

// Categorieën die relevant zijn voor tech/elektronica
const CATEGORIES = [
  'electronics',
  'smartphones',
  'computers',
  'tablets',
  'headphones',
  'cameras',
  'televisions',
  'audio',
  'gaming',
  'printers',
  'monitors',
  'keyboards',
  'mice',
  'storage',
  'networking',
  'wearables',
];

// Velden die we willen ophalen
const FIELDS = [
  'code',
  'product_name',
  'brands',
  'categories',
  'categories_tags',
  'image_url',
  'image_front_url',
  'quantity',
  'countries',
  'countries_tags',
  'stores',
  'url',
].join(',');

// Deduplicatie-set wordt gedeeld over alle categorieën
const seenCodes = new Set();

/**
 * Haal alle producten op voor één categorie (alle pagina's)
 */
async function fetchCategory(category) {
  const products = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    try {
      const data = await fetchWithRetry(BASE_URL, {
        source: SOURCE,
        params: {
          categories_tags_en: category,
          fields: FIELDS,
          page_size: PAGE_SIZE,
          page,
          json: 1,
        },
      });

      if (page === 1) {
        totalPages = data.page_count || 1;
        info(SOURCE, `  Categorie "${category}": ${data.count || 0} producten, ${totalPages} pagina's`);
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
      logError(SOURCE, `Fout bij categorie "${category}" pagina ${page}`, err.message);
      break;
    }
  }

  return products;
}

/**
 * Normaliseer een enkel product
 */
function normalizeProduct(product) {
  if (!product.product_name && !product.code) return null;
  if (product.code && seenCodes.has(product.code)) return null;
  if (product.code) seenCodes.add(product.code);

  return {
    source: 'openproductsfacts',
    ean: product.code || null,
    name: product.product_name || 'Onbekend',
    brand: product.brands || null,
    category: product.categories || null,
    categoryTags: product.categories_tags || [],
    imageUrl: product.image_url || product.image_front_url || null,
    countries: product.countries || null,
    stores: product.stores || null,
    sourceUrl: product.url || null,
    rawData: product,
  };
}

/**
 * Haal alle tech-producten op uit Open Products Facts — in blokken per categorie.
 *
 * @returns {Promise<object[]>} Array van producten
 */
export async function fetchOpenProductsFacts() {
  info(SOURCE, `Start ophalen uit ${CATEGORIES.length} categorieën (in blokken)...`);

  // Verwerk categorieën in blokken van 4
  const results = await processBatches(
    CATEGORIES,
    async (category) => {
      const rawProducts = await fetchCategory(category);
      const normalized = rawProducts
        .map(normalizeProduct)
        .filter(Boolean);

      info(SOURCE, `  → ${normalized.length} unieke producten uit "${category}"`);
      return normalized;
    },
    {
      source: SOURCE,
      batchSize: 4,          // 4 categorieën per blok
      batchDelay: 3000,      // 3s pauze tussen blokken
      itemDelay: 2000,       // 2s pauze tussen categorieën
    },
  );

  // results is een array van arrays, flatten
  const allProducts = results.flat();
  info(SOURCE, `Totaal: ${allProducts.length} unieke producten opgehaald`);
  return allProducts;
}

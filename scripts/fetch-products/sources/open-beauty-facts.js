/**
 * open-beauty-facts.js — Open Beauty Facts API
 *
 * Bron: https://world.openbeautyfacts.org/
 * Gratis, geen API key nodig. ~64.000 producten.
 *
 * Werkt in blokken:
 *   - Pagineert door de gehele database (100 per pagina)
 *   - Na elk blok worden tussenresultaten opgeslagen
 *   - Bij herstart gaat het verder waar het gebleven was
 *
 * Rate limit: ~10 requests/minuut (we gebruiken 7s vertraging)
 */

import { fetchWithRetry, sleep } from '../http-client.js';
import { info, error as logError, warn } from '../logger.js';
import { processBatches } from '../batch-processor.js';

const SOURCE = 'OpenBeautyFacts';
const BASE_URL = 'https://world.openbeautyfacts.org/cgi/search.pl';
const PAGE_SIZE = 100;

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

const seenCodes = new Set();

/**
 * Bepaal het totaal aantal pagina's
 */
async function getTotalPages() {
  const data = await fetchWithRetry(BASE_URL, {
    source: SOURCE,
    params: {
      search_terms: '',
      action: 'process',
      json: 1,
      page_size: PAGE_SIZE,
      page: 1,
      fields: 'code',
    },
  });

  const total = data.count || 0;
  const pages = Math.ceil(total / PAGE_SIZE);
  info(SOURCE, `Database bevat ${total} producten (${pages} pagina's)`);
  return pages;
}

/**
 * Haal een enkele pagina op
 */
async function fetchPage(page) {
  try {
    const data = await fetchWithRetry(BASE_URL, {
      source: SOURCE,
      params: {
        search_terms: '',
        action: 'process',
        json: 1,
        page_size: PAGE_SIZE,
        page,
        fields: FIELDS,
      },
    });
    return data.products || [];
  } catch (err) {
    logError(SOURCE, `Fout bij pagina ${page}`, err.message);
    return [];
  }
}

/**
 * Normaliseer een product naar standaardformaat
 */
function normalizeProduct(product) {
  if (!product.product_name && !product.code) return null;
  if (product.code && seenCodes.has(product.code)) return null;
  if (product.code) seenCodes.add(product.code);

  return {
    source: 'openbeautyfacts',
    ean: product.code || null,
    name: product.product_name || 'Onbekend',
    brand: product.brands || null,
    category: product.categories || null,
    categoryTags: product.categories_tags || [],
    imageUrl: product.image_url || product.image_front_url || null,
    countries: product.countries || null,
    stores: product.stores || null,
    sourceUrl: product.url || null,
  };
}

/**
 * Haal alle producten op uit Open Beauty Facts — in blokken per pagina.
 *
 * @param {number} maxPages - Maximaal aantal pagina's (0 = alles)
 * @returns {Promise<object[]>} Array van producten
 */
export async function fetchOpenBeautyFacts(maxPages = 0) {
  const totalPages = await getTotalPages();
  const pagesToFetch = maxPages > 0 ? Math.min(maxPages, totalPages) : totalPages;

  info(SOURCE, `Start ophalen van ${pagesToFetch} pagina's...`);

  // Maak een array van paginanummers
  const pageNumbers = Array.from({ length: pagesToFetch }, (_, i) => i + 1);

  const results = await processBatches(
    pageNumbers,
    async (page) => {
      const rawProducts = await fetchPage(page);
      const normalized = rawProducts.map(normalizeProduct).filter(Boolean);
      info(SOURCE, `  Pagina ${page}/${pagesToFetch}: ${normalized.length} producten`);
      return normalized;
    },
    {
      source: SOURCE,
      batchSize: 5,         // 5 pagina's per blok
      batchDelay: 10000,    // 10s pauze tussen blokken
      itemDelay: 7000,      // 7s pauze tussen pagina's
    },
  );

  const allProducts = results.flat();
  info(SOURCE, `Totaal: ${allProducts.length} unieke producten opgehaald`);
  return allProducts;
}

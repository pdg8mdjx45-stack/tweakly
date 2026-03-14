/**
 * upcitemdb.js — UPCitemdb API
 *
 * Bron: https://www.upcitemdb.com/
 * Gratis trial-tier: 100 requests/dag, max 20 searches.
 *
 * Werkt in blokken:
 *   - Zoektermen worden in blokken van 5 verwerkt
 *   - Na elk blok worden tussenresultaten opgeslagen
 *   - Bij herstart gaat het verder waar het gebleven was
 *
 * Rate limits (gratis):
 * - 6 lookups/minuut
 * - 2 searches/30 seconden
 * - Max 1 gelijktijdige connectie
 */

import { fetchWithRetry, sleep } from '../http-client.js';
import { info, error as logError, warn } from '../logger.js';
import { processBatches } from '../batch-processor.js';

const SOURCE = 'UPCitemdb';
const SEARCH_URL = 'https://api.upcitemdb.com/prod/trial/search';
const LOOKUP_URL = 'https://api.upcitemdb.com/prod/trial/lookup';

// Zoektermen voor tech-producten
const SEARCH_TERMS = [
  'laptop',
  'smartphone',
  'tablet',
  'monitor',
  'keyboard',
  'mouse',
  'headphones',
  'SSD',
  'graphics card',
  'processor CPU',
  'motherboard',
  'RAM memory',
  'smartwatch',
  'router wifi',
  'webcam',
  'speaker bluetooth',
  'power supply',
  'gaming console',
  'earbuds wireless',
  'external hard drive',
];

// Deduplicatie-set
const seenEans = new Set();

/**
 * Zoek producten op trefwoord
 */
async function searchProducts(query) {
  try {
    const data = await fetchWithRetry(SEARCH_URL, {
      source: SOURCE,
      params: { s: query, type: 'product' },
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    if (data?.items && data.items.length > 0) {
      info(SOURCE, `  Zoekopdracht "${query}": ${data.items.length} resultaten`);
      return data.items;
    }

    info(SOURCE, `  Zoekopdracht "${query}": geen resultaten`);
    return [];
  } catch (err) {
    if (err.response?.status === 429) {
      warn(SOURCE, `Rate limit bereikt bij "${query}". Dagelijks limiet mogelijk op.`);
      return null;
    }
    logError(SOURCE, `Fout bij zoeken "${query}"`, err.message);
    return [];
  }
}

/**
 * Zoek producten op EAN/UPC code (max 2 codes per request)
 */
async function lookupByUPC(codes) {
  const upcString = Array.isArray(codes) ? codes.join(',') : codes;

  try {
    const data = await fetchWithRetry(LOOKUP_URL, {
      source: SOURCE,
      params: { upc: upcString },
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    if (data?.items && data.items.length > 0) return data.items;
    return [];
  } catch (err) {
    if (err.response?.status === 429) {
      warn(SOURCE, 'Rate limit bereikt. Stop met lookups.');
      return null;
    }
    logError(SOURCE, `Fout bij lookup ${upcString}`, err.message);
    return [];
  }
}

/**
 * Normaliseer een UPCitemdb product
 */
function normalizeProduct(item) {
  return {
    source: 'upcitemdb',
    ean: item.ean || item.upc || null,
    upc: item.upc || null,
    name: item.title || 'Onbekend',
    brand: item.brand || null,
    model: item.model || null,
    category: item.category || null,
    description: item.description || null,
    color: item.color || null,
    size: item.size || null,
    weight: item.weight || null,
    imageUrl: item.images?.[0] || null,
    images: item.images || [],
    lowestPrice: item.lowest_recorded_price || null,
    highestPrice: item.highest_recorded_price || null,
    offers: (item.offers || []).map(o => ({
      merchant: o.merchant,
      domain: o.domain,
      price: o.price,
      currency: o.currency,
      availability: o.availability,
      link: o.link,
      updatedAt: o.updated_t,
    })),
    rawData: item,
  };
}

/**
 * Haal tech-producten op via search queries — in blokken van 5.
 */
export async function fetchUPCitemdb() {
  info(SOURCE, `Start zoeken met ${SEARCH_TERMS.length} trefwoorden (in blokken)...`);
  info(SOURCE, 'LET OP: Gratis tier = max 20 searches + 100 requests totaal per dag.');

  let rateLimited = false;

  const results = await processBatches(
    SEARCH_TERMS,
    async (term) => {
      if (rateLimited) return [];

      const items = await searchProducts(term);

      if (items === null) {
        rateLimited = true;
        warn(SOURCE, 'Rate limit bereikt, rest van dit blok wordt overgeslagen.');
        return [];
      }

      // Dedupliceer en normaliseer
      const normalized = [];
      for (const item of items) {
        const ean = item.ean || item.upc;
        if (ean && seenEans.has(ean)) continue;
        if (ean) seenEans.add(ean);
        normalized.push(normalizeProduct(item));
      }

      return normalized;
    },
    {
      source: SOURCE,
      batchSize: 5,          // 5 zoektermen per blok
      batchDelay: 5000,      // 5s pauze tussen blokken
      itemDelay: 16000,      // 16s pauze tussen searches (rate limit)
    },
  );

  const allProducts = results.flat();
  info(SOURCE, `Totaal: ${allProducts.length} unieke producten opgehaald`);
  return allProducts;
}

/**
 * Verrijk bestaande producten met UPCitemdb data via EAN lookup — in blokken.
 *
 * @param {string[]} eans - Lijst van EAN-codes
 * @returns {Promise<object[]>} Verrijkte producten
 */
export async function fetchUPCitemdbByEANs(eans) {
  info(SOURCE, `Start lookup van ${eans.length} EAN-codes (in blokken)...`);
  info(SOURCE, 'LET OP: Max 100 lookups/dag, 2 EANs per request.');

  // Groepeer EANs in paren (max 2 per request)
  const pairs = [];
  for (let i = 0; i < eans.length; i += 2) {
    pairs.push(eans.slice(i, i + 2));
  }

  let rateLimited = false;

  const results = await processBatches(
    pairs,
    async (pair) => {
      if (rateLimited) return [];

      const items = await lookupByUPC(pair);

      if (items === null) {
        rateLimited = true;
        return [];
      }

      return items.map(normalizeProduct);
    },
    {
      source: 'UPCitemdb-lookup',
      batchSize: 10,         // 10 paren (= 20 EANs) per blok
      batchDelay: 5000,      // 5s pauze tussen blokken
      itemDelay: 11000,      // 11s pauze tussen lookups (rate limit)
    },
  );

  const allProducts = results.flat();
  info(SOURCE, `Totaal: ${allProducts.length} producten opgehaald via lookup`);
  return allProducts;
}

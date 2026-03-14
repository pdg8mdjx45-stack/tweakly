/**
 * open-food-facts.js — Open Food Facts API
 *
 * Bron: https://world.openfoodfacts.org/
 * Gratis, geen API key nodig. 4.4M+ producten — de grootste open productdatabase.
 *
 * We halen selectief producten op per land (Nederland) en categorie om
 * tot een bruikbare dataset van ~50K+ producten te komen.
 *
 * Werkt in blokken:
 *   - Pagineert door categorieën (100 per pagina)
 *   - Na elk blok worden tussenresultaten opgeslagen
 *   - Bij herstart gaat het verder waar het gebleven was
 *
 * Rate limit: ~10 requests/minuut (we gebruiken 7s vertraging)
 */

import { fetchWithRetry, sleep } from '../http-client.js';
import { info, error as logError, warn } from '../logger.js';
import { processBatches } from '../batch-processor.js';

const SOURCE = 'OpenFoodFacts';
const BASE_URL = 'https://world.openfoodfacts.org/cgi/search.pl';
const PAGE_SIZE = 100;
const MAX_PAGES_PER_CATEGORY = 50; // max 5000 producten per categorie

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
  'nutrition_grades',
  'ecoscore_grade',
  'nova_group',
].join(',');

// Populaire food-categorieën voor een brede dataset
const CATEGORIES = [
  // Dranken
  'beverages',
  'waters',
  'juices',
  'sodas',
  'coffees',
  'teas',
  'beers',
  'wines',
  'energy-drinks',
  'milks',
  // Zuivel
  'dairies',
  'cheeses',
  'yogurts',
  'butters',
  'creams',
  // Brood & Granen
  'breads',
  'cereals',
  'pastas',
  'rices',
  'flour',
  // Vlees & Vis
  'meats',
  'poultry',
  'fish',
  'seafood',
  // Groenten & Fruit
  'fruits',
  'vegetables',
  'salads',
  'frozen-fruits',
  'frozen-vegetables',
  // Snacks & Snoep
  'snacks',
  'chips',
  'chocolates',
  'candies',
  'cookies',
  'biscuits',
  'ice-creams',
  // Kant-en-klaar
  'meals',
  'pizzas',
  'soups',
  'sauces',
  'condiments',
  'spreads',
  // Overig
  'oils',
  'spices',
  'nuts',
  'dried-fruits',
  'baby-foods',
  'pet-foods',
  'supplements',
];

const seenCodes = new Set();

/**
 * Haal producten op voor één categorie (max pages)
 */
async function fetchCategory(category) {
  const products = [];
  let page = 1;
  let totalPages = 1;

  while (page <= Math.min(totalPages, MAX_PAGES_PER_CATEGORY)) {
    try {
      const data = await fetchWithRetry(BASE_URL, {
        source: SOURCE,
        params: {
          search_terms: '',
          tagtype_0: 'categories',
          tag_contains_0: 'contains',
          tag_0: category,
          action: 'process',
          json: 1,
          page_size: PAGE_SIZE,
          page,
          fields: FIELDS,
        },
      });

      if (page === 1) {
        const total = data.count || 0;
        totalPages = Math.ceil(total / PAGE_SIZE);
        const capped = Math.min(totalPages, MAX_PAGES_PER_CATEGORY);
        info(SOURCE, `  Categorie "${category}": ${total} producten, ${capped}/${totalPages} pagina's`);
      }

      if (data.products && data.products.length > 0) {
        products.push(...data.products);
      } else {
        break;
      }

      page++;

      if (page <= Math.min(totalPages, MAX_PAGES_PER_CATEGORY)) {
        await sleep(7000);
      }
    } catch (err) {
      logError(SOURCE, `Fout bij categorie "${category}" pagina ${page}`, err.message);
      break;
    }
  }

  return products;
}

/**
 * Normaliseer een product
 */
function normalizeProduct(product) {
  if (!product.product_name && !product.code) return null;
  if (product.code && seenCodes.has(product.code)) return null;
  if (product.code) seenCodes.add(product.code);

  return {
    source: 'openfoodfacts',
    ean: product.code || null,
    name: product.product_name || 'Onbekend',
    brand: product.brands || null,
    category: product.categories || null,
    categoryTags: product.categories_tags || [],
    imageUrl: product.image_url || product.image_front_url || null,
    countries: product.countries || null,
    stores: product.stores || null,
    sourceUrl: product.url || null,
    nutritionGrade: product.nutrition_grades || null,
    ecoScore: product.ecoscore_grade || null,
    novaGroup: product.nova_group || null,
  };
}

/**
 * Haal producten op uit Open Food Facts — in blokken per categorie.
 *
 * @returns {Promise<object[]>} Array van producten
 */
export async function fetchOpenFoodFacts() {
  info(SOURCE, `Start ophalen uit ${CATEGORIES.length} categorieën...`);

  const results = await processBatches(
    CATEGORIES,
    async (category) => {
      const rawProducts = await fetchCategory(category);
      const normalized = rawProducts.map(normalizeProduct).filter(Boolean);
      info(SOURCE, `  → ${normalized.length} unieke producten uit "${category}"`);
      return normalized;
    },
    {
      source: SOURCE,
      batchSize: 3,          // 3 categorieën per blok
      batchDelay: 5000,      // 5s pauze tussen blokken
      itemDelay: 2000,       // 2s pauze tussen categorieën
    },
  );

  const allProducts = results.flat();
  info(SOURCE, `Totaal: ${allProducts.length} unieke producten opgehaald`);
  return allProducts;
}

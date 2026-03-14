/**
 * icecat.js — Icecat Open Catalog API
 *
 * Bron: https://icecat.com/
 * Gratis toegang via Open Icecat (shopname=openIcecat-live).
 *
 * Werkt in blokken:
 *   - EAN-codes worden in blokken van 25 verwerkt
 *   - Na elk blok worden tussenresultaten opgeslagen
 *   - Bij herstart gaat het verder waar het gebleven was
 *
 * De Icecat API is per-product lookup only (geen category browse).
 * We gebruiken EAN-codes uit andere bronnen als input.
 *
 * Rate limit: onbekend voor gratis tier, we gebruiken 2s vertraging.
 */

import { fetchWithRetry } from '../http-client.js';
import { info, error as logError, warn } from '../logger.js';
import { processBatches } from '../batch-processor.js';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOURCE = 'Icecat';
const API_URL = 'https://live.icecat.biz/api';
const SHOPNAME = 'openIcecat-live';

/**
 * Haal productdetails op via EAN/GTIN code
 */
async function fetchByEAN(ean, lang = 'EN') {
  try {
    const data = await fetchWithRetry(API_URL, {
      source: SOURCE,
      maxRetries: 1,
      params: {
        shopname: SHOPNAME,
        lang,
        GTIN: ean,
        content: '',
      },
    });

    if (data?.data?.GeneralInfo) return data.data;
    if (data?.GeneralInfo) return data;

    return null;
  } catch (err) {
    const status = err.response?.status;
    if (status === 400 || status === 403 || status === 404) {
      return null;
    }
    logError(SOURCE, `Fout bij ophalen EAN ${ean}`, err.message);
    return null;
  }
}

/**
 * Normaliseer Icecat response naar standaard product formaat
 */
function normalizeIcecatProduct(data, ean = null) {
  const general = data.GeneralInfo || {};
  const image = data.Image || {};
  const gallery = data.Gallery || [];
  const specs = data.FeaturesGroups || [];

  return {
    source: 'icecat',
    icecatId: general.IcecatId || null,
    ean: ean || general.GTIN?.[0] || null,
    name: general.Title || general.ProductName || 'Onbekend',
    brand: general.Brand || null,
    brandLogo: general.BrandLogo || null,
    category: general.Category?.Name?.Value || null,
    categoryId: general.Category?.CategoryID || null,
    description: general.Description?.LongDesc || general.Description?.ShortDesc || null,
    summaryDescription: general.SummaryDescription?.LongSummaryDescription || null,
    imageUrl: image.HighPic || image.LowPic || null,
    thumbnailUrl: image.ThumbPic || null,
    gallery: gallery.map(img => img.Pic || img.ThumbPic).filter(Boolean),
    releaseDate: general.ReleaseDate || null,
    specs: specs.map(group => ({
      groupName: group.FeatureGroup?.Name?.Value || 'Overig',
      features: (group.Features || []).map(f => ({
        name: f.Feature?.Name?.Value || '',
        value: f.PresentationValue || f.Value || '',
        unit: f.Feature?.Measure?.Signs?.['_'] || '',
      })),
    })),
    rawData: data,
  };
}

/**
 * Haal Icecat productdata op voor een lijst van EAN-codes — in blokken.
 *
 * @param {string[]} eans - Lijst van EAN/GTIN codes
 * @returns {Promise<object[]>} Array van genormaliseerde producten
 */
export async function fetchIcecatByEANs(eans) {
  info(SOURCE, `Start ophalen van ${eans.length} producten via EAN (in blokken)...`);

  const results = await processBatches(
    eans,
    async (ean, index) => {
      const data = await fetchByEAN(ean);
      if (data) {
        const product = normalizeIcecatProduct(data, ean);
        info(SOURCE, `  ✓ Gevonden: ${product.name}`);
        return product;
      }
      return null;
    },
    {
      source: SOURCE,
      batchSize: 25,         // 25 EAN-lookups per blok
      batchDelay: 5000,      // 5s pauze tussen blokken
      itemDelay: 2000,       // 2s pauze tussen lookups
    },
  );

  return results;
}

/**
 * Hoofdfunctie: haal producten op via Icecat.
 *
 * Gebruikt EAN-codes uit bestaande bronnen als input.
 *
 * @param {string[]} eanSources - Optionele lijst van EAN-codes.
 * @returns {Promise<object[]>} Array van producten
 */
export async function fetchIcecat(eanSources = []) {
  if (eanSources.length === 0) {
    info(SOURCE, 'Geen EAN-codes meegegeven, zoek in bestaande data...');

    const opfFile = path.join(__dirname, '..', 'output', 'openproductsfacts-products.json');
    if (await fs.pathExists(opfFile)) {
      const opfData = await fs.readJson(opfFile);
      const opfEans = opfData
        .map(p => p.ean)
        .filter(ean => ean && ean.length >= 8);
      info(SOURCE, `${opfEans.length} EAN-codes gevonden in Open Products Facts data`);
      eanSources.push(...opfEans);
    }

    const productsFile = path.join(__dirname, '..', '..', 'data', 'products.json');
    if (await fs.pathExists(productsFile)) {
      const productsData = await fs.readJson(productsFile);
      const existingEans = productsData
        .map(p => p.ean)
        .filter(ean => ean && ean.length >= 8);
      info(SOURCE, `${existingEans.length} EAN-codes gevonden in products.json`);
      eanSources.push(...existingEans);
    }

    eanSources = [...new Set(eanSources)];
  }

  if (eanSources.length === 0) {
    warn(SOURCE, 'Geen EAN-codes beschikbaar. Voer eerst Open Products Facts uit, of geef EANs mee.');
    return [];
  }

  info(SOURCE, `Totaal ${eanSources.length} unieke EAN-codes om op te zoeken`);
  return fetchIcecatByEANs(eanSources);
}

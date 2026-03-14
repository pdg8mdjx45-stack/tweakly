/**
 * batch-processor.js — Blokverwerking met tussentijds opslaan en resume
 *
 * Verwerkt items in configureerbare blokken (batches).
 * Na elk blok:
 *   - Sla tussenresultaten op naar disk
 *   - Toon voortgangsoverzicht met stats
 *   - Pauzeer even voordat het volgende blok start
 *
 * Bij herstart: laad de voortgang en ga verder waar je gebleven was.
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { info, warn } from './logger.js';
import { sleep } from './http-client.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, 'output');

/**
 * @typedef {object} BatchConfig
 * @property {string} source        - Bronnaam (voor logging + bestandsnamen)
 * @property {number} batchSize     - Aantal items per blok (default: 25)
 * @property {number} batchDelay    - Pauze in ms tussen blokken (default: 3000)
 * @property {number} itemDelay     - Pauze in ms tussen items binnen een blok (default: 0)
 */

/**
 * Verwerk een lijst items in blokken.
 *
 * @param {any[]} items                          - Lijst van items om te verwerken
 * @param {(item: any, index: number) => Promise<any|null>} processFn
 *   - Verwerkfunctie per item. Return null om item over te slaan.
 * @param {BatchConfig} config                   - Configuratie
 * @returns {Promise<any[]>}                     - Alle succesvolle resultaten
 */
export async function processBatches(items, processFn, config) {
  const {
    source,
    batchSize = 25,
    batchDelay = 3000,
    itemDelay = 0,
  } = config;

  await fs.ensureDir(OUTPUT_DIR);

  // ── Voortgangsbestand laden (resume support) ────────────────────
  const progressFile = path.join(OUTPUT_DIR, `${source.toLowerCase()}-progress.json`);
  const partialFile = path.join(OUTPUT_DIR, `${source.toLowerCase()}-products.json`);

  let startIndex = 0;
  let results = [];

  if (await fs.pathExists(progressFile)) {
    const progress = await fs.readJson(progressFile);
    startIndex = progress.processedCount || 0;

    // Laad eerder opgeslagen tussenresultaten
    if (await fs.pathExists(partialFile)) {
      results = await fs.readJson(partialFile);
    }

    info(source, `▶ Hervat bij item ${startIndex + 1}/${items.length} (${results.length} producten al opgehaald)`);
  }

  if (startIndex >= items.length) {
    info(source, `✓ Alle ${items.length} items al verwerkt (${results.length} producten)`);
    return results;
  }

  const totalBatches = Math.ceil((items.length - startIndex) / batchSize);
  info(source, `┌─ Start verwerking: ${items.length - startIndex} items in ${totalBatches} blokken van ${batchSize}`);

  let currentBatch = 0;

  for (let i = startIndex; i < items.length; i += batchSize) {
    currentBatch++;
    const batchItems = items.slice(i, i + batchSize);
    const batchEnd = Math.min(i + batchSize, items.length);
    const batchResults = [];

    info(source, `│`);
    info(source, `├─ Blok ${currentBatch}/${totalBatches} [items ${i + 1}–${batchEnd} van ${items.length}]`);

    // ── Verwerk items in dit blok ───────────────────────────────
    for (let j = 0; j < batchItems.length; j++) {
      const globalIndex = i + j;
      const result = await processFn(batchItems[j], globalIndex);

      if (result !== null && result !== undefined) {
        batchResults.push(result);
      }

      // Pauze tussen items (als geconfigureerd)
      if (itemDelay > 0 && j < batchItems.length - 1) {
        await sleep(itemDelay);
      }
    }

    // ── Tussenresultaten opslaan ────────────────────────────────
    results.push(...batchResults);

    await fs.writeJson(partialFile, results, { spaces: 2 });
    await fs.writeJson(progressFile, {
      source,
      totalItems: items.length,
      processedCount: batchEnd,
      resultCount: results.length,
      lastUpdated: new Date().toISOString(),
    });

    // ── Blok-samenvatting ───────────────────────────────────────
    const pct = ((batchEnd / items.length) * 100).toFixed(1);
    info(source, `│  ✓ Blok ${currentBatch} klaar: +${batchResults.length} producten | Totaal: ${results.length} | Voortgang: ${pct}%`);

    // ── Pauze tussen blokken ────────────────────────────────────
    if (batchEnd < items.length) {
      info(source, `│  ⏸ Pauze ${(batchDelay / 1000).toFixed(0)}s voor volgend blok...`);
      await sleep(batchDelay);
    }
  }

  // ── Voortgangsbestand opruimen na succesvolle voltooiing ──────
  await fs.remove(progressFile);

  info(source, `│`);
  info(source, `└─ Klaar: ${results.length} producten uit ${items.length} items`);

  return results;
}

/**
 * Reset de voortgang van een bron zodat deze opnieuw van voren af aan begint.
 *
 * @param {string} source - Bronnaam
 */
export async function resetProgress(source) {
  const progressFile = path.join(OUTPUT_DIR, `${source.toLowerCase()}-progress.json`);
  if (await fs.pathExists(progressFile)) {
    await fs.remove(progressFile);
    info(source, 'Voortgang gereset — volgende run begint opnieuw');
  }
}

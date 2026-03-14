/**
 * split-categories.js — Split icecat-products.json per categorie
 *
 * Output: data/products/{slug}.json + data/products/manifest.json
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INPUT = path.join(__dirname, '..', '..', 'data', 'icecat-products.json');
const OUTPUT_DIR = path.join(__dirname, '..', '..', 'data', 'products');

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function main() {
  const data = await fs.readJson(INPUT);
  await fs.ensureDir(OUTPUT_DIR);

  const byCategory = {};
  for (const p of data) {
    const cat = p.category || 'Overig';
    if (byCategory[cat] === undefined) byCategory[cat] = [];
    byCategory[cat].push(p);
  }

  const manifest = { categories: [], totalProducts: data.length };

  for (const [cat, products] of Object.entries(byCategory)) {
    const slug = slugify(cat);
    const filePath = path.join(OUTPUT_DIR, `${slug}.json`);
    await fs.writeJson(filePath, products);
    const stat = await fs.stat(filePath);
    const sizeKB = Math.round(stat.size / 1024);
    manifest.categories.push({ name: cat, slug, count: products.length, sizeKB });
    console.log(`${cat.padEnd(25)} ${String(products.length).padStart(6)} producten  ${sizeKB} KB`);
  }

  manifest.categories.sort((a, b) => b.count - a.count);
  await fs.writeJson(path.join(OUTPUT_DIR, 'manifest.json'), manifest, { spaces: 2 });

  console.log(`\nTotaal: ${data.length} producten in ${Object.keys(byCategory).length} categorieën`);
  console.log(`Output: ${OUTPUT_DIR}`);
}

main();

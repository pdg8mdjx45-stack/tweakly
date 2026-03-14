/**
 * serve-products.js — Eenvoudige Express REST API voor opgehaalde producten
 *
 * Maakt de verzamelde productdata beschikbaar als REST API.
 *
 * Gebruik:
 *   npm install express   # (alleen nodig als je de server wilt draaien)
 *   node serve-products.js
 *
 * Endpoints:
 *   GET /api/products                          — Alle producten (gepagineerd)
 *   GET /api/products?page=1&limit=50          — Paginatie
 *   GET /api/products?source=icecat            — Filter op bron
 *   GET /api/products?brand=Samsung            — Filter op merk
 *   GET /api/products?q=laptop                 — Zoeken op naam
 *   GET /api/products?category=smartphones     — Filter op categorie
 *   GET /api/products/:ean                     — Product op EAN-code
 *   GET /api/sources                           — Beschikbare bronnen + aantallen
 *   GET /api/stats                             — Statistieken
 */

import { createServer } from 'http';
import { URL } from 'url';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, 'output', 'all-products.json');
const PORT = process.env.PORT || 3001;

// ── Data laden ──────────────────────────────────────────────────

let products = [];

async function loadData() {
  if (await fs.pathExists(DATA_FILE)) {
    products = await fs.readJson(DATA_FILE);
    console.log(`Geladen: ${products.length} producten uit ${DATA_FILE}`);
  } else {
    console.error(`Data bestand niet gevonden: ${DATA_FILE}`);
    console.error('Voer eerst het fetch-script uit: node fetch-products.js');
    process.exit(1);
  }
}

// ── Request handler ──────────────────────────────────────────────

function handleRequest(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  // ── GET /api/stats ──
  if (pathname === '/api/stats') {
    const bySource = {};
    const byBrand = {};
    for (const p of products) {
      bySource[p.source] = (bySource[p.source] || 0) + 1;
      if (p.brand) byBrand[p.brand] = (byBrand[p.brand] || 0) + 1;
    }

    return json(res, {
      total: products.length,
      bySource,
      topBrands: Object.entries(byBrand)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([brand, count]) => ({ brand, count })),
    });
  }

  // ── GET /api/sources ──
  if (pathname === '/api/sources') {
    const bySource = {};
    for (const p of products) {
      bySource[p.source] = (bySource[p.source] || 0) + 1;
    }
    return json(res, bySource);
  }

  // ── GET /api/products/:ean ──
  const eanMatch = pathname.match(/^\/api\/products\/(\d{8,14})$/);
  if (eanMatch) {
    const ean = eanMatch[1];
    const found = products.filter(p => p.ean === ean);
    if (found.length === 0) {
      return json(res, { error: 'Product niet gevonden' }, 404);
    }
    return json(res, found.length === 1 ? found[0] : found);
  }

  // ── GET /api/products ──
  if (pathname === '/api/products') {
    let filtered = [...products];

    // Filters
    const source = url.searchParams.get('source');
    if (source) filtered = filtered.filter(p => p.source === source);

    const brand = url.searchParams.get('brand');
    if (brand) filtered = filtered.filter(p =>
      p.brand?.toLowerCase().includes(brand.toLowerCase())
    );

    const q = url.searchParams.get('q');
    if (q) {
      const query = q.toLowerCase();
      filtered = filtered.filter(p =>
        p.name?.toLowerCase().includes(query) ||
        p.brand?.toLowerCase().includes(query) ||
        p.category?.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query)
      );
    }

    const category = url.searchParams.get('category');
    if (category) {
      const cat = category.toLowerCase();
      filtered = filtered.filter(p =>
        p.category?.toLowerCase().includes(cat) ||
        p.categoryTags?.some(t => t.toLowerCase().includes(cat))
      );
    }

    // Paginatie
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get('limit') || '50')));
    const start = (page - 1) * limit;
    const paged = filtered.slice(start, start + limit);

    return json(res, {
      total: filtered.length,
      page,
      limit,
      pages: Math.ceil(filtered.length / limit),
      products: paged,
    });
  }

  // ── 404 ──
  return json(res, {
    error: 'Niet gevonden',
    endpoints: [
      'GET /api/products',
      'GET /api/products/:ean',
      'GET /api/sources',
      'GET /api/stats',
    ],
  }, 404);
}

function json(res, data, status = 200) {
  res.writeHead(status);
  res.end(JSON.stringify(data, null, 2));
}

// ── Server starten ──────────────────────────────────────────────

await loadData();

const server = createServer(handleRequest);
server.listen(PORT, () => {
  console.log(`\nTweakly Product API draait op http://localhost:${PORT}`);
  console.log(`\nEndpoints:`);
  console.log(`  GET http://localhost:${PORT}/api/products`);
  console.log(`  GET http://localhost:${PORT}/api/products?q=laptop`);
  console.log(`  GET http://localhost:${PORT}/api/products?source=icecat`);
  console.log(`  GET http://localhost:${PORT}/api/products/:ean`);
  console.log(`  GET http://localhost:${PORT}/api/sources`);
  console.log(`  GET http://localhost:${PORT}/api/stats`);
  console.log(`\nDruk op Ctrl+C om te stoppen.`);
});

/**
 * test-icecat-bulk.js — Test het Icecat bulk scanning
 *
 * Scant 1000 IDs uit de dichtste range om snelheid + kwaliteit te meten.
 */

import axios from 'axios';
import pLimit from 'p-limit';

const BASE = 'https://live.icecat.biz/api';
const CONCURRENCY = 10;
const limit = pLimit(CONCURRENCY);

const TECH_KEYWORDS = [
  'monitor', 'laptop', 'printer', 'keyboard', 'muis', 'mouse',
  'geheugen', 'memory', 'processor', 'videokaart', 'graphics', 'server', 'pc',
  'werkstation', 'workstation', 'tablet', 'smartphone', 'tv', 'camera', 'speaker',
  'headphone', 'headset', 'router', 'switch', 'storage', 'harde', 'hard drive',
  'ssd', 'schijf', 'disk', 'tonercartridge', 'toner', 'inkt', 'ink', 'scanner',
  'projector', 'beamer', 'ups', 'netwerk', 'network', 'kabel', 'cable',
  'docking', 'adapter', 'charger', 'lader', 'oplader', 'accu', 'battery',
  'software', 'licentie', 'license', 'rack', 'garantie', 'support',
];

function isTech(cat) {
  if (!cat) return true;
  const lower = cat.toLowerCase();
  return TECH_KEYWORDS.some(kw => lower.includes(kw));
}

const startTime = Date.now();
const ids = Array.from({ length: 1000 }, (_, i) => 10000 + i);

console.log('=== Test: 1000 IDs parallel (10 concurrent) ===\n');

const results = await Promise.all(
  ids.map(id => limit(async () => {
    try {
      const res = await axios.get(BASE, {
        params: { UserName: 'openIcecat-live', Language: 'nl', icecat_id: id },
        headers: { Accept: 'application/json' },
        timeout: 10000,
      });
      const d = res.data?.data || res.data;
      const g = d?.GeneralInfo || {};
      const cat = g.Category?.Name?.Value || '';
      if (!isTech(cat)) return null;
      return {
        id,
        name: g.Title || 'N/A',
        brand: g.Brand || 'N/A',
        category: cat,
        hasSpecs: (d.FeaturesGroups || []).length > 0,
        hasImage: !!(d.Image?.HighPic),
        ean: g.GTIN?.[0] || null,
      };
    } catch {
      return null;
    }
  })),
);

const found = results.filter(Boolean);
const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
const idsPerSec = (1000 / parseFloat(elapsed)).toFixed(0);

console.log(`Gevonden: ${found.length}/1000 tech-producten`);
console.log(`Tijd: ${elapsed}s (${idsPerSec} IDs/s)`);

const brands = {};
const categories = {};
found.forEach(r => {
  brands[r.brand] = (brands[r.brand] || 0) + 1;
  categories[r.category] = (categories[r.category] || 0) + 1;
});

console.log('\nTop merken:');
Object.entries(brands).sort((a, b) => b[1] - a[1]).slice(0, 10)
  .forEach(([b, c]) => console.log(`  ${String(c).padStart(4)}  ${b}`));

console.log('\nTop categorieën:');
Object.entries(categories).sort((a, b) => b[1] - a[1]).slice(0, 10)
  .forEach(([c, n]) => console.log(`  ${String(n).padStart(4)}  ${c}`));

console.log(`\nKwaliteit:`);
console.log(`  Met specs:  ${found.filter(r => r.hasSpecs).length}/${found.length}`);
console.log(`  Met image:  ${found.filter(r => r.hasImage).length}/${found.length}`);
console.log(`  Met EAN:    ${found.filter(r => r.ean).length}/${found.length}`);

// Extrapolatie voor volledige run
const totalIds = 10000 + 100000 + 200000 + 200000 + 500000 + 500000;
const estHours = (totalIds / parseFloat(idsPerSec)) / 3600;
console.log(`\n--- Extrapolatie ---`);
console.log(`Snelheid:      ~${idsPerSec} IDs/seconde`);
console.log(`Totaal te scannen: ${totalIds.toLocaleString()} IDs`);
console.log(`Geschatte tijd:    ~${estHours.toFixed(1)} uur`);

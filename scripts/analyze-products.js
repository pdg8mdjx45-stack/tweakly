const data = require('../data/products.json');
const ph = /placehold/i;

// Separate real-image vs placeholder products
const realImg = data.filter(p => p.imageUrl && ph.test(p.imageUrl) === false);
const placeholderImg = data.filter(p => ph.test(p.imageUrl || '') || (p.imageUrl || '') === '');

console.log('=== BASELINE ANALYSIS ===');
console.log('Total products:', data.length);
console.log('With real images:', realImg.length);
console.log('With placeholder images:', placeholderImg.length);
console.log('Target: 100,000');
console.log('');

// ID patterns
const tweakersIds = data.filter(p => /^\d{5,}$/.test(String(p.id)));
const generatedIds = data.filter(p => /^[a-z].*-\d+$/.test(String(p.id)));
console.log('Tweakers-style IDs (numeric 5+ digits):', tweakersIds.length);
console.log('Generated-style IDs (category-NNN):', generatedIds.length);
console.log('');

// Unique names
const nameSet = new Set();
const dupNames = [];
data.forEach(p => {
  const key = p.name.toLowerCase().trim();
  if (nameSet.has(key)) {
    dupNames.push(p);
  }
  nameSet.add(key);
});
console.log('Unique product names:', nameSet.size);
console.log('Duplicate entries (by name):', dupNames.length);
console.log('');

// Sample some Tweakers products
console.log('=== SAMPLE TWEAKERS PRODUCTS ===');
tweakersIds.slice(0, 5).forEach(p => {
  console.log(`  ${p.id} | ${p.brand} | ${p.name} | €${p.currentPrice} | ${p.category}`);
  console.log(`    Image: ${(p.imageUrl || '').substring(0, 80)}`);
  console.log(`    Specs: ${JSON.stringify(p.specs).substring(0, 120)}`);
});

console.log('');
console.log('=== SAMPLE GENERATED PRODUCTS ===');
generatedIds.slice(0, 5).forEach(p => {
  console.log(`  ${p.id} | ${p.brand} | ${p.name} | €${p.currentPrice} | ${p.category}`);
  console.log(`    Image: ${(p.imageUrl || '').substring(0, 80)}`);
});

// Categories with Tweakers data
console.log('');
console.log('=== TWEAKERS PRODUCTS PER CATEGORY ===');
const tweakersCats = {};
tweakersIds.forEach(p => { tweakersCats[p.category] = (tweakersCats[p.category] || 0) + 1; });
Object.entries(tweakersCats).sort((a, b) => b[1] - a[1]).forEach(([c, n]) => console.log(`  ${c}: ${n}`));
console.log('  TOTAL:', tweakersIds.length);

// Check shops quality on real products
console.log('');
console.log('=== SHOP LINK QUALITY (Tweakers products) ===');
let withTweakersLink = 0;
let withRetailLinks = 0;
tweakersIds.slice(0, 100).forEach(p => {
  if ((p.shops || []).some(s => s.url && s.url.includes('tweakers.net'))) withTweakersLink++;
  if ((p.shops || []).some(s => s.url && (s.url.includes('coolblue') || s.url.includes('bol.com') || s.url.includes('mediamarkt')))) withRetailLinks++;
});
console.log(`  Of first 100 Tweakers products:`);
console.log(`  With tweakers.net links: ${withTweakersLink}`);
console.log(`  With retail search links: ${withRetailLinks}`);

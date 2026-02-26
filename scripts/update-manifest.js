// Script to update manifest.json with all category files
const fs = require('fs');
const path = require('path');

const categoriesDir = path.join(__dirname, '../data/categories');
const manifestPath = path.join(categoriesDir, 'manifest.json');

// Get all JSON files except manifest.json
const files = fs.readdirSync(categoriesDir)
  .filter(f => f.endsWith('.json') && f !== 'manifest.json');

const categories = [];
let totalProducts = 0;

files.forEach(file => {
  const filePath = path.join(categoriesDir, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const name = file.replace('.json', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  
  const stats = fs.statSync(filePath);
  
  categories.push({
    name,
    slug: file.replace('.json', ''),
    count: data.length,
    sizeBytes: stats.size
  });
  
  totalProducts += data.length;
});

const manifest = {
  version: '1',
  updatedAt: new Date().toISOString(),
  categories,
  totalProducts
};

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log(`✅ Updated manifest.json with ${categories.length} categories and ${totalProducts} total products`);


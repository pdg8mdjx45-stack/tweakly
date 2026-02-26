const fs = require('fs');
const files = fs.readdirSync('data/categories').filter(f => f.endsWith('.json') && f !== 'manifest.json');
let total = 0;
files.forEach(f => {
  const data = JSON.parse(fs.readFileSync('data/categories/' + f, 'utf-8'));
  console.log(f.replace('.json', '') + ': ' + data.length);
  total += data.length;
});
console.log('TOTAL: ' + total);


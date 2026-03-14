const axios = require('axios');

const BASE_URL = 'https://tweakers.net';
let cookies = '';

function mc(existing, sc) {
  if (!sc) return existing;
  const h = Array.isArray(sc) ? sc : [sc];
  const m = {};
  existing.split(';').forEach(p => { const [k,v] = p.trim().split('='); if(k) m[k.trim()]=(v||'').trim(); });
  h.forEach(x => { const kv = x.split(';')[0].trim(); const [k,v] = kv.split('='); if(k) m[k.trim()]=(v||'').trim(); });
  return Object.entries(m).map(([k,v]) => k+'='+v).join('; ');
}

async function go() {
  const http = axios.create({
    baseURL: BASE_URL,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'nl-NL,nl;q=0.9',
    },
    timeout: 15000,
    maxRedirects: 10,
    validateStatus: s => s < 500,
  });

  console.log('Testing Tweakers.net connectivity...');

  const r1 = await http.get('/');
  cookies = mc(cookies, r1.headers['set-cookie']);
  console.log('Homepage:', r1.status);

  const gate = r1.data.includes('DPG Media Privacy Gate');
  console.log('Consent wall:', gate);

  if (gate) {
    const match = r1.data.match(/decodeURIComponent\('([^']+)'\)/);
    if (match) {
      const cb = decodeURIComponent(match[1]);
      console.log('Accepting consent...');
      const r2 = await http.get(cb, { headers: { Cookie: cookies }, baseURL: '' });
      cookies = mc(cookies, r2.headers['set-cookie']);
      console.log('Consent accepted:', r2.status);
    } else {
      console.log('No callback URL found in consent page');
    }
  }

  // Test category page
  console.log('\nTesting category page...');
  const r3 = await http.get('/laptops/vergelijken/?page=1&sort=populariteit', {
    headers: { Cookie: cookies },
  });
  console.log('Category page:', r3.status);
  const productCount = (r3.data.match(/data-productdata/g) || []).length;
  console.log('Products found:', productCount);

  if (productCount > 0) {
    // Test price API
    console.log('\nTesting price API...');
    const r4 = await http.get('/ajax/price_chart/2257448/nl/', {
      headers: { Cookie: cookies, Accept: 'application/json' },
    });
    console.log('Price API:', r4.status);
    if (r4.data && r4.data.dataset && r4.data.dataset.source) {
      console.log('Price points:', r4.data.dataset.source.length);
      console.log('Sample:', r4.data.dataset.source.slice(-3));
    }
  }

  console.log('\nDone. Scraper connectivity:', productCount > 0 ? 'WORKING' : 'BLOCKED');
}

go().catch(e => console.error('Error:', e.message));

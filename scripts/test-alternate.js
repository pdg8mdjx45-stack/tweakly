const puppeteer = require('puppeteer');

async function test() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

  // Test several Alternate.nl category pages
  const categories = [
    { name: 'Processors', url: 'https://www.alternate.nl/Processor/html/listings/1448862479' },
    { name: 'GPU', url: 'https://www.alternate.nl/Grafische-kaart/html/listings/1448862497' },
    { name: 'Laptops', url: 'https://www.alternate.nl/Laptop/html/listings/1448862625' },
  ];

  for (const cat of categories) {
    console.log(`\nTesting ${cat.name}: ${cat.url}`);
    try {
      await page.goto(cat.url, { waitUntil: 'networkidle2', timeout: 30000 });

      const title = await page.title();
      console.log('  Title:', title);

      // Try to find product listings
      const products = await page.evaluate(() => {
        // Try various selectors
        const selectors = [
          '.listingContainer .productBox',
          '.product-listing .product',
          'article[class*="product"]',
          '[class*="listing"] [class*="product"]',
          '.productBox',
          'a[href*="/product/"]',
        ];

        for (const sel of selectors) {
          const els = document.querySelectorAll(sel);
          if (els.length > 0) {
            return {
              selector: sel,
              count: els.length,
              samples: Array.from(els).slice(0, 3).map(el => ({
                text: el.textContent.trim().substring(0, 100),
                href: el.querySelector('a')?.href || el.href || '',
              }))
            };
          }
        }

        // Fallback: show page structure
        return {
          selector: 'none found',
          count: 0,
          bodyText: document.body.innerText.substring(0, 500),
          bodyLength: document.body.innerHTML.length,
        };
      });

      console.log('  Products:', JSON.stringify(products, null, 2));
    } catch (e) {
      console.log('  Error:', e.message);
    }
  }

  // Also try the search endpoint
  console.log('\n--- Testing search ---');
  try {
    await page.goto('https://www.alternate.nl/listing.xhtml?q=laptop', { waitUntil: 'networkidle2', timeout: 30000 });
    const searchResult = await page.evaluate(() => {
      const links = document.querySelectorAll('a[href*="/product/"], a[href*="/p/"]');
      return {
        productLinks: links.length,
        bodyLength: document.body.innerHTML.length,
        title: document.title,
        sampleText: document.body.innerText.substring(0, 500),
      };
    });
    console.log('Search result:', JSON.stringify(searchResult, null, 2));
  } catch (e) {
    console.log('Search error:', e.message);
  }

  await browser.close();
  console.log('\nDone.');
}

test().catch(e => {
  console.error('Fatal:', e.message);
  process.exit(1);
});

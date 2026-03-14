const puppeteer = require('puppeteer');

async function test() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

  // Test search with different queries to see how many products each returns
  const queries = [
    'laptop', 'smartphone', 'monitor', 'processor', 'grafische kaart',
    'moederbord', 'geheugen ddr', 'ssd', 'harde schijf', 'voeding pc',
    'behuizing desktop', 'koeler cpu', 'ventilator pc', 'toetsenbord',
    'muis', 'webcam', 'luidspreker', 'printer', 'kabel usb', 'televisie',
    'koptelefoon', 'tablet', 'desktop pc', 'gaming headset', 'router',
    'camera', 'stofzuiger robot', 'smartwatch', 'console gaming',
  ];

  let totalAvailable = 0;

  for (const q of queries) {
    try {
      await page.goto('https://www.alternate.nl/listing.xhtml?q=' + encodeURIComponent(q), {
        waitUntil: 'networkidle2',
        timeout: 20000,
      });

      const result = await page.evaluate(() => {
        // Look for "X van Y resultaten" text
        const text = document.body.innerText;
        const match = text.match(/(\d+)\s+van\s+(\d[\d.]*)\s+resultaten/i);
        const totalMatch = text.match(/van\s+(\d[\d.]*)\s+resultaten/i);
        const total = totalMatch ? parseInt(totalMatch[1].replace(/\./g, '')) : 0;

        // Count product links on page
        const links = document.querySelectorAll('a[href*="/p/"], a[href*="/product/"]');

        // Get first product sample
        const firstProduct = document.querySelector('.listing-product, .productBox, [class*="listing"] a');

        return {
          total,
          onPage: links.length,
          firstProductText: firstProduct ? firstProduct.textContent.trim().substring(0, 80) : '',
        };
      });

      console.log(`  ${q}: ${result.total} total, ${result.onPage} on page`);
      totalAvailable += result.total;

      // Small delay
      await new Promise(r => setTimeout(r, 500));
    } catch (e) {
      console.log(`  ${q}: ERROR - ${e.message}`);
    }
  }

  console.log('\n=== TOTAL AVAILABLE: ' + totalAvailable + ' ===');

  // Now test pagination - get page 2 of laptops
  console.log('\nTesting pagination...');
  try {
    await page.goto('https://www.alternate.nl/listing.xhtml?q=laptop&page=2', {
      waitUntil: 'networkidle2',
      timeout: 20000,
    });

    const p2result = await page.evaluate(() => {
      const links = document.querySelectorAll('a[href*="/p/"]');
      return {
        productCount: links.length,
        title: document.title,
        bodySnippet: document.body.innerText.substring(0, 300),
      };
    });
    console.log('Page 2:', JSON.stringify(p2result, null, 2));
  } catch (e) {
    console.log('Pagination error:', e.message);
  }

  // Test extracting full product details from a search result
  console.log('\nTesting product extraction...');
  try {
    await page.goto('https://www.alternate.nl/listing.xhtml?q=laptop', {
      waitUntil: 'networkidle2',
      timeout: 20000,
    });

    const products = await page.evaluate(() => {
      const results = [];
      // Find all product containers
      const containers = document.querySelectorAll('.listingContainer a, .product-card, [class*="listing-product"]');

      // Try a more generic approach - find all links with /p/ in href
      const productLinks = document.querySelectorAll('a[href*="/p/"]');

      for (const link of Array.from(productLinks).slice(0, 5)) {
        const container = link.closest('[class*="listing"]') || link.parentElement;
        if (container === null) continue;

        const name = container.querySelector('span[class*="name"], [class*="title"], h2, h3')?.textContent?.trim() || link.textContent?.trim() || '';
        const priceEl = container.querySelector('[class*="price"], .price');
        const price = priceEl ? priceEl.textContent.trim() : '';
        const img = container.querySelector('img')?.src || '';
        const href = link.href || '';

        // Extract product ID from URL
        const idMatch = href.match(/\/p\/(\d+)/);
        const id = idMatch ? idMatch[1] : '';

        if (name.length > 5) {
          results.push({ id, name: name.substring(0, 100), price, img: img.substring(0, 100), href: href.substring(0, 100) });
        }
      }

      return results;
    });

    console.log('Extracted products:', JSON.stringify(products, null, 2));
  } catch (e) {
    console.log('Extraction error:', e.message);
  }

  await browser.close();
  console.log('\nDone.');
}

test().catch(e => {
  console.error('Fatal:', e.message);
  process.exit(1);
});

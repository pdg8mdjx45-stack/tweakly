const puppeteer = require('puppeteer');

async function test() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox'],
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

  await page.goto('https://www.alternate.nl/listing.xhtml?q=laptop', {
    waitUntil: 'networkidle2',
    timeout: 30000,
  });

  // Dump the DOM structure around product listings
  const structure = await page.evaluate(() => {
    const body = document.body.innerHTML;

    // Find all elements with href containing /p/
    const allLinks = document.querySelectorAll('a');
    const productLinks = [];
    for (const a of allLinks) {
      const href = a.href || '';
      if (href.includes('/p/') || href.includes('/product/')) {
        // Get the ancestor chain
        let el = a;
        const ancestors = [];
        for (let i = 0; i < 5 && el.parentElement; i++) {
          el = el.parentElement;
          ancestors.push({
            tag: el.tagName,
            class: el.className.substring(0, 80),
            id: el.id,
          });
        }

        productLinks.push({
          href: href.substring(0, 120),
          text: a.textContent.trim().substring(0, 80),
          class: a.className.substring(0, 80),
          ancestors: ancestors.slice(0, 3),
        });
      }
    }

    // Also find price elements near product links
    const priceEls = document.querySelectorAll('[class*="price"], [class*="Price"]');
    const prices = Array.from(priceEls).slice(0, 10).map(el => ({
      tag: el.tagName,
      class: el.className.substring(0, 60),
      text: el.textContent.trim().substring(0, 40),
    }));

    // Find image elements near products
    const imgs = document.querySelectorAll('img[src*="cdn"], img[data-src*="cdn"], img[loading="lazy"]');
    const images = Array.from(imgs).slice(0, 5).map(el => ({
      src: (el.src || el.getAttribute('data-src') || '').substring(0, 120),
      alt: (el.alt || '').substring(0, 60),
      class: el.className.substring(0, 60),
    }));

    return {
      productLinksCount: productLinks.length,
      sampleLinks: productLinks.slice(0, 5),
      prices,
      images,
    };
  });

  console.log(JSON.stringify(structure, null, 2));

  await browser.close();
}

test().catch(console.error);

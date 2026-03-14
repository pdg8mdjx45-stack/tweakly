const puppeteer = require('puppeteer');

async function test() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--lang=nl-NL'],
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'nl-NL,nl;q=0.9' });
  await page.setViewport({ width: 1920, height: 1080 });

  console.log('Step 1: Visit homepage first...');
  await page.goto('https://tweakers.net/', {
    waitUntil: 'networkidle2',
    timeout: 30000,
  });

  let title = await page.title();
  console.log('Homepage title:', title);

  // Check for consent iframe/modal
  const pageContent = await page.content();
  const hasIframe = pageContent.includes('iframe');
  const hasCMP = pageContent.includes('cmp') || pageContent.includes('consent') || pageContent.includes('privacy');
  console.log('Has iframe:', hasIframe, '| Has CMP/consent:', hasCMP);

  // Check for any clickable consent buttons
  const buttons = await page.evaluate(() => {
    const btns = document.querySelectorAll('button, a.button, [role="button"]');
    return Array.from(btns).map(b => ({
      text: b.textContent.trim().substring(0, 50),
      id: b.id,
      class: b.className.substring(0, 50),
    }));
  });
  console.log('Buttons found:', buttons.length);
  buttons.slice(0, 10).forEach(b => console.log('  ', JSON.stringify(b)));

  // Check for consent in iframes
  const frames = page.frames();
  console.log('Frames:', frames.length);
  for (const frame of frames) {
    const fUrl = frame.url();
    if (fUrl && fUrl !== 'about:blank' && fUrl !== page.url()) {
      console.log('  Frame URL:', fUrl.substring(0, 100));
    }
  }

  // Save the page content for debugging
  const fs = require('fs');
  const bodyLength = await page.evaluate(() => document.body.innerHTML.length);
  console.log('Body length:', bodyLength);

  // Get visible text
  const visibleText = await page.evaluate(() => {
    return document.body.innerText.substring(0, 1000);
  });
  console.log('\n--- Visible text (first 1000 chars) ---');
  console.log(visibleText);
  console.log('--- end ---\n');

  // Take screenshot
  await page.screenshot({ path: 'data/debug-puppeteer-homepage.png', fullPage: false });
  console.log('Screenshot saved');

  // Now try navigating to pricewatch
  console.log('\nStep 2: Navigate to pricewatch...');
  await page.goto('https://tweakers.net/laptops/vergelijken/', {
    waitUntil: 'networkidle2',
    timeout: 30000,
  });

  title = await page.title();
  console.log('Pricewatch title:', title);

  const bodyLength2 = await page.evaluate(() => document.body.innerHTML.length);
  console.log('Body length:', bodyLength2);

  const productCount = await page.evaluate(() => {
    return document.querySelectorAll('[data-productdata]').length;
  });
  console.log('Products:', productCount);

  const visibleText2 = await page.evaluate(() => {
    return document.body.innerText.substring(0, 1000);
  });
  console.log('\n--- Visible text ---');
  console.log(visibleText2);
  console.log('--- end ---');

  await page.screenshot({ path: 'data/debug-puppeteer-pricewatch.png', fullPage: false });
  console.log('Screenshot saved');

  await browser.close();
  console.log('\nDone.');
}

test().catch(e => {
  console.error('Fatal:', e.message);
  process.exit(1);
});

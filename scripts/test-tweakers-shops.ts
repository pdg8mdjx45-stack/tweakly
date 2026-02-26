import axios from 'axios';
import * as cheerio from 'cheerio';

async function testShops() {
  const url = 'https://tweakers.net/pricewatch/1918360/';
  const { data } = await axios.get(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    }
  });

  const $ = cheerio.load(data);
  const shops: any[] = [];

  $('.shop-listing table.shop-listing, table.shop-listing tbody tr').each((_, el) => {
    // try to find shops
    const name = $(el).find('.shop-name a').text().trim() || $(el).find('.shop-name').text().trim();
    const priceText = $(el).find('.shop-price').text().trim();
    const url = $(el).find('.shop-name a').attr('href') || $(el).find('.shop-price a').attr('href');
    if (name && priceText) {
      shops.push({ name, priceText, url });
    }
  });

  console.log('Shops found via shop-listing class:');
  console.log(shops.slice(0, 5));
  
  // Let's try to find all tr elements that might be shop rows
  const fallbackShops: any[] = [];
  $('tr').each((_, el) => {
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if (text.includes('€')) {
        const a = $(el).find('a').first();
        if (a.length > 0) {
           fallbackShops.push({
             text: text.substring(0, 50),
             href: a.attr('href')
           });
        }
    }
  });
  console.log('Fallback tr rows:');
  console.log(fallbackShops.slice(0, 5));
}

testShops().catch(console.error);

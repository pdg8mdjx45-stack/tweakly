/**
 * Test Google Shopping API
 * Run: npx ts-node --project tsconfig.scraper.json scripts/test-google-shopping.ts
 */

const API_KEY = 'VP9f7wNzwHEev6veFuLr5PT9';

async function testGoogleShopping() {
  const queries = [
    'samsung galaxy s25',
    'iphone 16 pro',
    'macbook air m3',
    'sony wh-1000xm5',
    'ps5 slim'
  ];

  for (const query of queries) {
    console.log(`\n🔍 Testing: "${query}"`);
    
    const params = new URLSearchParams({
      engine: 'google_shopping',
      q: query,
      api_key: API_KEY,
      num: '5',
      gl: 'nl',
      hl: 'nl',
    });

    const url = `https://www.searchapi.io/api/v1/search?${params.toString()}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.shopping_results && data.shopping_results.length > 0) {
        console.log(`✅ Found ${data.shopping_results.length} results:`);
        data.shopping_results.slice(0, 3).forEach((item: any, i: number) => {
          console.log(`   ${i + 1}. ${item.title?.slice(0, 60)}...`);
          console.log(`      💰 €${item.price} (${item.currency})`);
          console.log(`      🏪 ${item.store_name}`);
          console.log(`      🔗 ${item.link?.slice(0, 50)}...`);
        });
      } else {
        console.log(`❌ No results:`, data);
      }
    } catch (error: any) {
      console.log(`❌ Error: ${error.message}`);
    }
  }
}

testGoogleShopping();

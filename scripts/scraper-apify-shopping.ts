import { ApifyClient } from 'apify-client';
import * as fs from 'fs';
import * as path from 'path';

// Define our standard product schema based on mock-data
interface Shop {
  name: string;
  price: number;
  url: string;
  logo: string;
}

interface PricePoint {
  date: string;
  price: number;
}

interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  imageUrl: string;
  previewUrl: string;
  currentPrice: number;
  originalPrice: number;
  lowestPrice: number;
  rating: number;
  reviewCount: number;
  priceHistory: PricePoint[];
  shops: Shop[];
  specs: Record<string, string>;
}

const API_TOKEN = process.env.APIFY_API_TOKEN || '';

// Use a Google Shopping Scraper Actor
// ntf/google-shopping-scraper is a reliable choice for typical Google Shopping scraping.
const ACTOR_ID = 'ntf/google-shopping-scraper';

const apifyClient = new ApifyClient({ token: API_TOKEN });

// Target a few known products specifically from our set
const TEST_QUERIES = [
  'Samsung Galaxy S25 Ultra 256GB kopen',
  'Apple MacBook Pro 14 M4 kopen'
];

async function runGoogleShoppingScraper() {
  console.log('=== Apify Google Shopping Live Price Scraper ===\n');
  const allProducts: Product[] = [];

  for (let i = 0; i < TEST_QUERIES.length; i++) {
    const query = TEST_QUERIES[i];
    console.log(`[${i+1}/${TEST_QUERIES.length}] Querying Google Shopping directly for: "${query}"...`);

    try {
      // Define Actor input based on the specific Actor's schema
      // Often requires googleDomain, gl (country), hl (language), searchQueries
      const actorInput = {
        searchQueries: query,
        gl: 'nl', // Netherlands
        hl: 'nl', // Dutch
        googleDomain: 'google.nl',
        maxPostsPerQuery: 5,
      };

      // Run the actor
      console.log(`  Starting actor ${ACTOR_ID}...`);
      const run = await apifyClient.actor(ACTOR_ID).call(actorInput);
      
      console.log(`  ✅ Actor run finished! Run ID: ${run.id}`);
      
      // Fetch results
      const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();
      
      if (items.length === 0) {
        console.log(`  Warnings: No items found for "${query}"`);
        continue;
      }

      console.log(`  Retrieved ${items.length} items from Google Shopping.`);

      // Convert from Apify format to App format
      // Note: the schema below depends on ntf/google-shopping-scraper output structure.
      // Usually it returns an array of products { title, exactPrice, link, seller, imageUrl ... }
      
      // Let's take the first result as our main product to map
      const mainElement: any = items[0]; 
      
      let price = mainElement.price || mainElement.exactPrice || 0;
      if (typeof price === 'string') {
        price = parseFloat(price.replace(/[^\d.,]/g, '').replace(',', '.'));
      }

      const shops: Shop[] = [];
      // Main shop
      if (mainElement.seller && mainElement.link) {
          shops.push({
            name: mainElement.seller,
            price: price,
            url: mainElement.link,
            logo: mainElement.seller.substring(0, 3).toUpperCase()
          });
      }

      // Sometime Google groups other sellers too
      if (mainElement.merchants && Array.isArray(mainElement.merchants)) {
          mainElement.merchants.forEach((merch: any) => {
              let merchPrice = merch.price || price;
              if (typeof merchPrice === 'string') {
                 merchPrice = parseFloat(merchPrice.replace(/[^\d.,]/g, '').replace(',', '.'));
              }
              shops.push({
                  name: merch.name || 'Unknown',
                  price: merchPrice,
                  url: merch.link || '',
                  logo: (merch.name || 'UNK').substring(0, 3).toUpperCase()
              })
          });
      }

      const brandMatch = mainElement.title?.match(/Samsung|Apple/i);
      const brand = brandMatch ? brandMatch[0] : 'Unknown';

      const appProduct: Product = {
        id: `apvs_${Date.now()}_${i}`,
        name: mainElement.title || query,
        brand: brand,
        category: 'Live Apify Fetch',
        imageUrl: mainElement.thumbnailUrl || mainElement.imageUrl || '',
        previewUrl: mainElement.thumbnailUrl || mainElement.imageUrl || '',
        currentPrice: price,
        originalPrice: price,
        lowestPrice: price,
        rating: typeof mainElement.rating === 'number' ? mainElement.rating : 4.5,
        reviewCount: typeof mainElement.reviews === 'number' ? mainElement.reviews : 42,
        priceHistory: [{ date: new Date().toISOString().split('T')[0], price }],
        shops: shops,
        specs: {
            'Bron': 'Google Shopping (Live via Apify)',
        }
      };

      allProducts.push(appProduct);
      
    } catch (e: any) {
       console.error(`  Error during Apify run:`, e.message);
    }
  }

  // Save the mapping
  const outDir = path.join(__dirname, '../data');
  if (!fs.existsSync(outDir)) { fs.mkdirSync(outDir); }
  
  const outPath = path.join(outDir, 'products-apify-live.json');
  fs.writeFileSync(outPath, JSON.stringify(allProducts, null, 2));

  console.log(`\n🎉 Success! Extracted ${allProducts.length} full product entries via Apify.`);
  console.log(`💾 Live data saved to: ${outPath}`);
}

runGoogleShoppingScraper().catch((err) => {
  console.error('Fatal initialization error:', err);
  process.exit(1);
});

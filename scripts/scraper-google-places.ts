import { ApifyClient } from "apify-client";
import * as fs from 'fs';
import * as path from 'path';

// Using the known Apify token from existing scripts in the project
const API_TOKEN = 'REMOVED_SECRET';

const apifyClient = new ApifyClient({ token: API_TOKEN });

// Define the input for the Actor (from user's request)
const actorInput = {
    searchStringsArray: ["ramen"],
    locationQuery: "New York, USA",
    maxCrawledPlacesPerSearch: 10,
    language: "en",
};

async function runGooglePlacesScraper() {
    console.log("=== Apify Google Places Scraper ===");
    console.log("Running the Actor...");
    
    // We use .call() instead of .start() to wait for the run to finish and get results immediately.
    // .start() only starts it as a background job.
    const actorRun = await apifyClient
        .actor("compass/crawler-google-places")
        .call(actorInput);

    console.log(`🚀 Actor run finished! Run ID: ${actorRun.id}`);
    console.log(`💾 Check your run here: https://console.apify.com/actors/runs/${actorRun.id}`);

    // Fetch results
    console.log(`📥 Fetching dataset items...`);
    const { items } = await apifyClient.dataset(actorRun.defaultDatasetId).listItems();
    
    console.log(`✅ Retrieved ${items.length} items from Google Places.`);

    // Save the mapping to `data` folder
    const outDir = path.join(__dirname, '../data');
    if (!fs.existsSync(outDir)) { fs.mkdirSync(outDir, { recursive: true }); }
    
    const outPath = path.join(outDir, 'google-places-results.json');
    fs.writeFileSync(outPath, JSON.stringify(items, null, 2));

    console.log(`💾 Scraped location data saved to: ${outPath}`);
}

runGooglePlacesScraper().catch((err) => {
    console.error('Fatal execution error:', err);
    process.exit(1);
});

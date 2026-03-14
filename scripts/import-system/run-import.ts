/**
 * CLI Runner — Import prijzen van webshop feeds
 *
 * Gebruik:
 *   npx ts-node --project tsconfig.scraper.json scripts/import-system/run-import.ts --shop coolblue
 *   npx ts-node --project tsconfig.scraper.json scripts/import-system/run-import.ts --all
 *   npx ts-node --project tsconfig.scraper.json scripts/import-system/run-import.ts --snapshot
 *   npx ts-node --project tsconfig.scraper.json scripts/import-system/run-import.ts --upload
 *
 * Opties:
 *   --shop <slug>    Import één specifieke shop feed
 *   --all            Import alle geconfigureerde shop feeds
 *   --snapshot       Maak dagelijkse prijs snapshot (voor prijsgrafieken)
 *   --upload         Upload bestaande productdata naar v2 schema
 *   --dry-run        Geen DB writes, alleen statistieken
 *   --verbose        Uitgebreide logging
 *   --create-new     Maak nieuwe producten aan bij geen match
 *   --delay <ms>     Delay tussen requests (default: 2000ms)
 *
 * Environment:
 *   SUPABASE_SERVICE_KEY  — Vereist voor alle operaties
 *   BOL_FEED_URL          — Bol.com feed URL
 *   COOLBLUE_FEED_URL     — Coolblue feed URL
 *   (etc. — zie shop-feeds.ts)
 */

import { FeedImporter, printStats } from './feed-importer';
import { ALL_SHOP_FEEDS, getShopFeed, getAvailableShops } from './shop-feeds';
import type { ImportStats } from './types';

async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  const shopSlug = getArg(args, '--shop');
  const runAll = args.includes('--all');
  const runSnapshot = args.includes('--snapshot');
  const runUpload = args.includes('--upload');
  const dryRun = args.includes('--dry-run');
  const verbose = args.includes('--verbose');
  const createNew = args.includes('--create-new');
  const delayStr = getArg(args, '--delay');
  const delay = delayStr ? parseInt(delayStr, 10) : undefined;

  // Service key
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!serviceKey) {
    console.error('❌ SUPABASE_SERVICE_KEY environment variable ontbreekt!\n');
    console.error('Stel in via:');
    console.error('  export SUPABASE_SERVICE_KEY=eyJ...\n');
    console.error('  of (Windows):');
    console.error('  set SUPABASE_SERVICE_KEY=eyJ...\n');
    process.exit(1);
  }

  // Validate arguments
  if (!shopSlug && !runAll && !runSnapshot && !runUpload) {
    printUsage();
    process.exit(1);
  }

  // Upload mode
  if (runUpload) {
    console.log('📦 Product upload naar v2 schema...\n');
    // Dynamic import to keep this file lightweight
    const uploadModule = await import('./upload-products-v2');
    return;
  }

  // Snapshot mode
  if (runSnapshot) {
    console.log('📸 Dagelijkse prijs snapshot...\n');
    const snapshotModule = await import('./daily-snapshot');
    return;
  }

  // Import mode
  const importer = new FeedImporter({
    serviceKey,
    dryRun,
    verbose,
    createNewProducts: createNew,
    requestDelay: delay,
  });

  const allStats: ImportStats[] = [];

  if (runAll) {
    console.log(`🔄 Alle ${ALL_SHOP_FEEDS.length} shop feeds importeren...\n`);
    console.log(`   Shops: ${getAvailableShops().join(', ')}\n`);

    for (const config of ALL_SHOP_FEEDS) {
      console.log(`\n━━━ ${config.shopSlug} ━━━`);
      const stats = await importer.importFeed(config);
      allStats.push(stats);
      printStats(stats);
    }
  } else if (shopSlug) {
    const config = getShopFeed(shopSlug);
    if (!config) {
      console.error(`❌ Onbekende shop: '${shopSlug}'\n`);
      console.error(`Beschikbare shops: ${getAvailableShops().join(', ')}`);
      process.exit(1);
    }

    console.log(`🔄 Feed importeren voor ${shopSlug}...\n`);
    const stats = await importer.importFeed(config);
    allStats.push(stats);
    printStats(stats);
  }

  // Summary als er meerdere shops zijn
  if (allStats.length > 1) {
    console.log('═══ TOTAAL OVERZICHT ═══');
    const totals = {
      feedItems: 0,
      matched: 0,
      newProducts: 0,
      pricesUpdated: 0,
      skipped: 0,
      errors: 0,
    };

    for (const s of allStats) {
      totals.feedItems += s.totalFeedItems;
      totals.matched += s.matchedByEan + s.matchedByMpn + s.matchedByFuzzy;
      totals.newProducts += s.newProducts;
      totals.pricesUpdated += s.pricesUpdated;
      totals.skipped += s.skipped;
      totals.errors += s.errors;
    }

    console.log(`  Feed items:       ${totals.feedItems}`);
    console.log(`  Gematcht:         ${totals.matched}`);
    console.log(`  Nieuwe producten: ${totals.newProducts}`);
    console.log(`  Prijzen geupsert: ${totals.pricesUpdated}`);
    console.log(`  Overgeslagen:     ${totals.skipped}`);
    console.log(`  Fouten:           ${totals.errors}`);
  }

  if (dryRun) {
    console.log('\n⚠️  DRY RUN — geen data is gewijzigd in de database');
  }
}

function getArg(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  if (idx === -1 || idx >= args.length - 1) return undefined;
  return args[idx + 1];
}

function printUsage(): void {
  console.log(`
Tweakly Feed Import CLI

Gebruik:
  npx ts-node scripts/import-system/run-import.ts [opties]

Opties:
  --shop <slug>    Import één shop feed (${getAvailableShops().join(', ')})
  --all            Import alle shop feeds
  --snapshot       Maak dagelijkse prijs snapshot
  --upload         Upload productdata naar v2 schema
  --dry-run        Geen DB writes, alleen statistieken
  --verbose        Uitgebreide logging
  --create-new     Maak nieuwe producten aan bij geen match
  --delay <ms>     Delay tussen requests (default: 2000ms)

Environment:
  SUPABASE_SERVICE_KEY  — Vereist (Supabase service role key)
  BOL_FEED_URL          — Bol.com affiliate feed URL
  COOLBLUE_FEED_URL     — Coolblue affiliate feed URL
  ALTERNATE_FEED_URL    — Alternate feed URL
  AMAZON_FEED_URL       — Amazon PA-API endpoint
  MEDIAMARKT_FEED_URL   — MediaMarkt feed URL (Awin)
  MEGEKKO_FEED_URL      — Megekko API endpoint
  AZERTY_FEED_URL       — Azerty feed URL
`);
}

main().catch(err => {
  console.error('Fatal error:', err.message || err);
  process.exit(1);
});

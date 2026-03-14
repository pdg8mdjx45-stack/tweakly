/**
 * Daily Price Snapshot
 *
 * Roept de record_daily_prices() database functie aan om
 * een dagelijkse snapshot van alle shop_prices op te slaan in price_history.
 *
 * Dit maakt prijsgrafieken met historische data mogelijk.
 *
 * Bedoeld om als cron job te draaien (1x per dag, bijv. 's nachts om 02:00).
 *
 * Usage:
 *   npx ts-node --project tsconfig.scraper.json scripts/import-system/daily-snapshot.ts
 *
 * Of via de CLI runner:
 *   npx ts-node --project tsconfig.scraper.json scripts/import-system/run-import.ts --snapshot
 *
 * Cron voorbeeld (Linux/Mac):
 *   0 2 * * * cd /path/to/tweakly && SUPABASE_SERVICE_KEY=eyJ... npx ts-node scripts/import-system/daily-snapshot.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://glnpdfbnyijdzvulzbfv.supabase.co';

async function main() {
  const serviceKey = process.argv[2] || process.env.SUPABASE_SERVICE_KEY;
  if (!serviceKey) {
    console.error('SUPABASE_SERVICE_KEY ontbreekt!');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, serviceKey);

  console.log(`[${new Date().toISOString()}] Dagelijkse prijs snapshot starten...`);

  // Controleer hoeveel actieve prijzen er zijn
  const { count: priceCount } = await supabase
    .from('shop_prices')
    .select('*', { count: 'exact', head: true })
    .eq('in_stock', true);

  console.log(`  ${priceCount || 0} actieve shop_prices gevonden`);

  if (!priceCount || priceCount === 0) {
    console.log('  Geen prijzen om te snapshotten. Klaar.');
    return;
  }

  // Roep de DB functie aan
  const { error } = await supabase.rpc('record_daily_prices');

  if (error) {
    console.error(`  Snapshot fout: ${error.message}`);
    process.exit(1);
  }

  // Verificatie: hoeveel nieuwe records vandaag?
  const today = new Date().toISOString().split('T')[0];
  const { count: historyCount } = await supabase
    .from('price_history')
    .select('*', { count: 'exact', head: true })
    .eq('recorded_at', today);

  console.log(`  ${historyCount || 0} prijshistorie records aangemaakt voor ${today}`);
  console.log(`[${new Date().toISOString()}] Snapshot klaar!`);
}

main().catch(err => {
  console.error('Snapshot fatal error:', err.message || err);
  process.exit(1);
});

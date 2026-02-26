/**
 * Upload split category files to Supabase Storage.
 *
 * Usage:
 *   npx ts-node --project tsconfig.scraper.json scripts/upload-to-supabase.ts
 *
 * Prerequisites:
 *   1. Go to Supabase dashboard → Storage → Create bucket "products" (public)
 *   2. Set SUPABASE_SERVICE_KEY env var (Settings → API → service_role key)
 *      or pass as argument: npx ts-node scripts/upload-to-supabase.ts <service_role_key>
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = 'https://glnpdfbnyijdzvulzbfv.supabase.co';
const CATEGORIES_DIR = path.join(__dirname, '../data/categories');
const BUCKET = 'products';
const REMOTE_PREFIX = 'v1';

async function main() {
  const serviceKey = process.argv[2] || process.env.SUPABASE_SERVICE_KEY;
  if (!serviceKey) {
    console.error('Supabase service_role key ontbreekt!');
    console.error('');
    console.error('Gebruik:');
    console.error('  npx ts-node --project tsconfig.scraper.json scripts/upload-to-supabase.ts <service_role_key>');
    console.error('');
    console.error('Of stel de env var in:');
    console.error('  set SUPABASE_SERVICE_KEY=eyJ...');
    console.error('');
    console.error('Je vindt de service_role key in Supabase Dashboard:');
    console.error('  → Settings → API → Project API keys → service_role (secret)');
    process.exit(1);
  }

  if (!fs.existsSync(CATEGORIES_DIR)) {
    console.error('data/categories/ niet gevonden! Run eerst:');
    console.error('  npx ts-node --project tsconfig.scraper.json scripts/split-and-upload.ts');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, serviceKey);

  // Ensure bucket exists (ignore error if it already exists)
  const { error: bucketError } = await supabase.storage.createBucket(BUCKET, {
    public: true,
    allowedMimeTypes: ['application/json'],
    fileSizeLimit: 10 * 1024 * 1024, // 10 MB max per file
  });
  if (bucketError && !bucketError.message.includes('already exists')) {
    console.error('Bucket aanmaken mislukt:', bucketError.message);
    process.exit(1);
  }

  const files = fs.readdirSync(CATEGORIES_DIR).filter(f => f.endsWith('.json'));
  console.log(`Uploading ${files.length} files to Supabase Storage...\n`);

  let uploaded = 0;
  let failed = 0;

  for (const fileName of files) {
    const localPath = path.join(CATEGORIES_DIR, fileName);
    const content = fs.readFileSync(localPath);
    const remotePath = `${REMOTE_PREFIX}/${fileName}`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(remotePath, content, {
        contentType: 'application/json',
        upsert: true, // overwrite if exists
      });

    if (error) {
      console.error(`  FOUT: ${remotePath} — ${error.message}`);
      failed++;
    } else {
      const sizeKB = (content.length / 1024).toFixed(0);
      console.log(`  ${remotePath} (${sizeKB} KB)`);
      uploaded++;
    }
  }

  console.log(`\nKlaar! ${uploaded} bestanden geupload, ${failed} mislukt.`);
  console.log(`\nPublieke URL:`);
  console.log(`  ${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${REMOTE_PREFIX}/{bestand}.json`);
}

main().catch(console.error);

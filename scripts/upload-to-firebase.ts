/**
 * Upload split category files to Firebase Storage.
 *
 * Usage:
 *   npx ts-node --project tsconfig.scraper.json scripts/upload-to-firebase.ts
 *
 * Prerequisites:
 *   npm install firebase-admin
 *   Place serviceAccountKey.json in project root
 *   (Firebase Console → Project Settings → Service accounts → Generate new private key)
 */

import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

const SERVICE_ACCOUNT_PATH = path.join(__dirname, '../tweakly-e6a6f-firebase private key sdk.json');
const CATEGORIES_DIR = path.join(__dirname, '../data/categories');
const BUCKET_NAME = 'tweakly-e6a6f.appspot.com';

async function main() {
  if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    console.error('serviceAccountKey.json niet gevonden!');
    console.error('Download het van Firebase Console:');
    console.error('  → Project Settings → Service accounts → Generate new private key');
    console.error(`  → Sla op als: ${SERVICE_ACCOUNT_PATH}`);
    process.exit(1);
  }

  if (!fs.existsSync(CATEGORIES_DIR)) {
    console.error('data/categories/ niet gevonden! Run eerst:');
    console.error('  npx ts-node --project tsconfig.scraper.json scripts/split-and-upload.ts');
    process.exit(1);
  }

  // Initialize Firebase Admin
  const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf-8'));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: BUCKET_NAME,
  });

  const bucket = admin.storage().bucket();
  const files = fs.readdirSync(CATEGORIES_DIR).filter(f => f.endsWith('.json'));

  console.log(`Uploading ${files.length} files to Firebase Storage...\n`);

  for (const fileName of files) {
    const localPath = path.join(CATEGORIES_DIR, fileName);
    const remotePath = `products/v1/${fileName}`;
    const content = fs.readFileSync(localPath);

    await bucket.file(remotePath).save(content, {
      metadata: {
        contentType: 'application/json',
        cacheControl: 'public, max-age=3600',
      },
    });

    const sizeKB = (content.length / 1024).toFixed(0);
    console.log(`  ${remotePath} (${sizeKB} KB)`);
  }

  console.log(`\nDone! ${files.length} files uploaded to gs://${BUCKET_NAME}/products/v1/`);
  console.log(`\nPublic URL format:`);
  console.log(`  https://firebasestorage.googleapis.com/v0/b/${BUCKET_NAME}/o/products%2Fv1%2F{file}?alt=media`);
}

main().catch(console.error);

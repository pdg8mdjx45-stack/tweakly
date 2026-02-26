/**
 * Script om alle Firebase Authentication gebruikers te verwijderen
 * 
 * Gebruik: npx ts-node scripts/delete-all-users.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load service account key
const serviceAccountPath = path.join(__dirname, '..', 'tweakly-e6a6f-firebase private key sdk.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

// Dynamic import voor firebase-admin
async function deleteAllUsers() {
  const { default: admin } = await import('firebase-admin');
  
  // Initialize Firebase Admin
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  const auth = admin.auth();
  
  console.log('Ophalen van alle gebruikers...');
  
  // Haal alle gebruikers op
  const listUsersResult = await auth.listUsers();
  
  console.log(`Aantal gebruikers gevonden: ${listUsersResult.users.length}`);
  
  if (listUsersResult.users.length === 0) {
    console.log('Geen gebruikers om te verwijderen.');
    return;
  }
  
  // Verwijder elke gebruiker
  for (const user of listUsersResult.users) {
    console.log(`Verwijderen van: ${user.email || user.uid}...`);
    try {
      await auth.deleteUser(user.uid);
      console.log(`✓ Verwijderd: ${user.email || user.uid}`);
    } catch (error) {
      console.error(`✗ Fout bij verwijderen van ${user.email || user.uid}:`, error);
    }
  }
  
  console.log('\nKlaar! Alle gebruikers zijn verwijderd.');
  
  // Controleer of er nog gebruikers zijn
  const remainingUsers = await auth.listUsers();
  if (remainingUsers.users.length > 0) {
    console.log(`Nog ${remainingUsers.users.length} gebruikers over - deze worden nu verwijderd...`);
    await deleteAllUsers(); // Recursief verwijderen (voor batch van 1000+)
  }
}

deleteAllUsers().catch(console.error);

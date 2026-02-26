/**
 * Test Apify API Token
 * Simple script to verify the Apify token works
 */

import axios from 'axios';

const APIFY_API_KEY = 'REMOVED_SECRET';

async function testApify() {
  console.log('=== Testing Apify Token ===\n');
  
  // Test 1: Check account info
  console.log('1. Getting account info...');
  try {
    const accountResponse = await axios.get(
      `https://api.apify.com/v2/users/me?token=${APIFY_API_KEY}`,
      { timeout: 10000 }
    );
    console.log(`   Account: ${accountResponse.data.data.username}`);
    console.log(`   Plan: ${accountResponse.data.data.plan}`);
  } catch (err: any) {
    console.log(`   Error: ${err.message}`);
  }
  
  // Test 2: Try Apify proxy
  console.log('\n2. Testing Apify proxy...');
  try {
    const proxyUrl = `https://proxy.apify.com?url=${encodeURIComponent('https://www.microcenter.com')}&token=${APIFY_API_KEY}`;
    const proxyResponse = await axios.get(proxyUrl, { timeout: 30000 });
    console.log(`   Status: ${proxyResponse.status}`);
    console.log(`   Response length: ${proxyResponse.data.length} bytes`);
    console.log(`   Title: ${proxyResponse.data.includes('<title>') ? proxyResponse.data.match(/<title>([^<]+)<\/title>/)?.[1] : 'N/A'}`);
  } catch (err: any) {
    console.log(`   Error: ${err.message}`);
    if (err.response) {
      console.log(`   Status: ${err.response.status}`);
      console.log(`   Data: ${err.response.data}`);
    }
  }
  
  // Test 3: List available actors
  console.log('\n3. Listing actors...');
  try {
    const actorsResponse = await axios.get(
      `https://api.apify.com/v2/acts?token=${APIFY_API_KEY}`,
      { timeout: 10000 }
    );
    console.log(`   Found ${actorsResponse.data.data.count} actors`);
    for (const actor of actorsResponse.data.data.items.slice(0, 5)) {
      console.log(`   - ${actor.id}: ${actor.name}`);
    }
  } catch (err: any) {
    console.log(`   Error: ${err.message}`);
  }
}

testApify().catch(console.error);


#!/usr/bin/env node

import { hash, verify } from '@node-rs/argon2';

async function main() {
  console.log('🔍 Testing API key authentication...\n');

  // This is the API key from the seed script
  const testApiKey = 'ak_dev_duncan_test_f39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

  // This is the hash from the database
  const storedHash = '$argon2id$v=19$m=19456,t=2,p=1$obwmRnti5OLidzOMykcoqA$5+mkFs0cQzNsF8u+EJ6/CsCTNJpNgBFb2mDXGsQCsDU';

  console.log('Test API Key:', testApiKey);
  console.log('Stored Hash:', storedHash);
  console.log('');

  // Test verification
  try {
    const isValid = await verify(storedHash, testApiKey);
    console.log('✅ Verification result:', isValid);
  } catch (error) {
    console.log('❌ Verification failed:', error);
  }

  // Test creating a new hash for comparison
  console.log('\n🔧 Creating new hash for verification...');
  try {
    const newHash = await hash(testApiKey, {
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });
    console.log('New Hash:', newHash);

    const isNewValid = await verify(newHash, testApiKey);
    console.log('✅ New hash verification:', isNewValid);
  } catch (error) {
    console.log('❌ New hash creation/verification failed:', error);
  }
}

main().catch(console.error);
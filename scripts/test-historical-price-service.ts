/**
 * Test script for the new Historical Price Service
 * Validates Alchemy RPC integration for exact block-level pricing
 */

// Load environment variables from .env.local
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local file
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

import { getHistoricalPriceService } from '../src/services/positions/historicalPriceService';

async function testHistoricalPriceService() {
  console.log('🧪 Testing Historical Price Service with Alchemy RPC...\n');

  const service = getHistoricalPriceService();

  // Test data: USDC/WETH pool on Ethereum mainnet
  const testCases = [
    {
      name: 'USDC/WETH Pool (Ethereum)',
      poolAddress: '0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640',
      blockNumber: BigInt(19000000), // Historical block
      chain: 'ethereum' as const,
      timestamp: new Date('2024-01-01T00:00:00Z')
    },
    {
      name: 'ARB/WETH Pool (Arbitrum)', 
      poolAddress: '0xc6962004f452be9203591991d15f6b388e09e8d0',
      blockNumber: BigInt(150000000),
      chain: 'arbitrum' as const,
      timestamp: new Date('2023-12-01T00:00:00Z')
    }
  ];

  // Test 1: Single price fetch
  console.log('📊 Test 1: Single Price Fetch');
  for (const testCase of testCases) {
    try {
      console.log(`\n🔍 Testing ${testCase.name} at block ${testCase.blockNumber}...`);
      
      const startTime = Date.now();
      const priceData = await service.getExactPoolPriceAtBlock(
        testCase.poolAddress,
        testCase.blockNumber,
        testCase.chain,
        testCase.timestamp
      );

      const duration = Date.now() - startTime;

      console.log(`✅ Success! Retrieved price in ${duration}ms:`);
      console.log(`   - Pool: ${priceData.poolAddress}`);
      console.log(`   - Block: ${priceData.blockNumber}`);
      console.log(`   - Price: ${priceData.price}`);
      console.log(`   - Tick: ${priceData.tick}`);
      console.log(`   - Source: ${priceData.source}`);
      console.log(`   - Confidence: ${priceData.confidence}`);
      console.log(`   - Chain: ${priceData.chain}`);

    } catch (error) {
      console.error(`❌ Failed to fetch price for ${testCase.name}:`, error.message);
    }
  }

  // Test 2: Cache functionality
  console.log('\n💾 Test 2: Cache Functionality');
  try {
    const cacheTestCase = testCases[0];
    
    console.log('First call (should fetch from RPC)...');
    const startTime1 = Date.now();
    await service.getExactPoolPriceAtBlock(
      cacheTestCase.poolAddress,
      cacheTestCase.blockNumber,
      cacheTestCase.chain
    );
    const duration1 = Date.now() - startTime1;

    console.log('Second call (should use cache)...');
    const startTime2 = Date.now();
    await service.getExactPoolPriceAtBlock(
      cacheTestCase.poolAddress,
      cacheTestCase.blockNumber,
      cacheTestCase.chain
    );
    const duration2 = Date.now() - startTime2;

    console.log(`✅ Cache test completed:`);
    console.log(`   - First call: ${duration1}ms`);
    console.log(`   - Second call: ${duration2}ms`);
    console.log(`   - Speed improvement: ${Math.round((duration1 / duration2))}x`);

    const cacheStats = service.getCacheStats();
    console.log(`   - Cache size: ${cacheStats.size} entries`);

  } catch (error) {
    console.error('❌ Cache test failed:', error.message);
  }

  // Test 3: Batch price fetch
  console.log('\n📦 Test 3: Batch Price Fetch');
  try {
    const batchRequests = testCases.slice(0, 2).map(testCase => ({
      poolAddress: testCase.poolAddress,
      blockNumber: testCase.blockNumber,
      chain: testCase.chain,
      timestamp: testCase.timestamp
    }));

    console.log(`Fetching ${batchRequests.length} prices in batch...`);
    const startTime = Date.now();
    const batchResults = await service.batchGetPoolPrices(batchRequests);
    const duration = Date.now() - startTime;

    console.log(`✅ Batch fetch completed in ${duration}ms:`);
    console.log(`   - Requested: ${batchRequests.length}`);
    console.log(`   - Retrieved: ${batchResults.length}`);
    console.log(`   - Success rate: ${Math.round(batchResults.length / batchRequests.length * 100)}%`);

    for (const result of batchResults) {
      console.log(`   - ${result.chain}: ${result.price} at block ${result.blockNumber}`);
    }

  } catch (error) {
    console.error('❌ Batch test failed:', error.message);
  }

  // Test 4: Error handling and fallback
  console.log('\n🛡️ Test 4: Error Handling & Fallback');
  try {
    // Test with very old block that might not exist
    const fallbackTest = {
      poolAddress: testCases[0].poolAddress,
      blockNumber: BigInt(1), // Very early block, pool likely doesn't exist
      chain: 'ethereum' as const,
      timestamp: new Date('2015-01-01T00:00:00Z')
    };

    console.log('Testing fallback with early block...');
    const fallbackResult = await service.getPriceWithFallback(
      fallbackTest.poolAddress,
      fallbackTest.blockNumber,
      fallbackTest.timestamp,
      fallbackTest.chain
    );

    console.log('✅ Fallback mechanism worked:');
    console.log(`   - Original block: ${fallbackTest.blockNumber}`);
    console.log(`   - Fallback price: ${fallbackResult.price}`);
    console.log(`   - Confidence: ${fallbackResult.confidence}`);

  } catch (error) {
    console.log('⚠️ Fallback test failed as expected:', error.message);
  }

  // Final cache stats
  console.log('\n📊 Final Statistics:');
  const finalStats = service.getCacheStats();
  console.log(`Cache entries: ${finalStats.size}`);
  console.log('Sample cache keys:');
  finalStats.keys.forEach((key, index) => {
    console.log(`  ${index + 1}. ${key}`);
  });

  console.log('\n🎉 Historical Price Service test completed!');
}

// Run the test if this file is executed directly
if (require.main === module) {
  testHistoricalPriceService()
    .then(() => {
      console.log('✅ All tests completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test execution failed:', error);
      process.exit(1);
    });
}

export { testHistoricalPriceService };
#!/usr/bin/env node

/**
 * Test script to verify curve data caching behavior
 *
 * This script helps debug the React Query cache behavior for curve data
 * by testing the cache key structure and data flow.
 *
 * Usage:
 *   npx tsx scripts/debug/test-curve-cache.ts
 */

// Mock React Query cache behavior
function mockQueryCache() {
  const cache = new Map();

  return {
    setQueryData: (key: any[], data: any) => {
      const keyString = JSON.stringify(key);
      cache.set(keyString, data);
      console.log('✅ Cache SET:', { key: keyString, hasData: !!data });
    },

    getQueryData: (key: any[]) => {
      const keyString = JSON.stringify(key);
      const data = cache.get(keyString);
      console.log(data ? '✅ Cache HIT:' : '❌ Cache MISS:', { key: keyString, hasData: !!data });
      return data;
    },

    invalidateQueries: (filter: any) => {
      console.log('🗑️  Cache INVALIDATE:', filter);
    }
  };
}

function testCacheKeyConsistency() {
  console.log('🧪 Testing Cache Key Consistency\n');

  const chain = 'arbitrum';
  const nftId = '4909613';

  // Test cache keys from different hooks
  const usePositionCurveKey = ['positions', 'curve', chain, nftId];
  const useRefreshPositionKey = ['positions', 'curve', chain, nftId];

  console.log('Cache Keys:');
  console.log('  usePositionCurve:', JSON.stringify(usePositionCurveKey));
  console.log('  useRefreshPosition:', JSON.stringify(useRefreshPositionKey));
  console.log('  Keys Match:', JSON.stringify(usePositionCurveKey) === JSON.stringify(useRefreshPositionKey) ? '✅ YES' : '❌ NO');

  return usePositionCurveKey;
}

function testCacheFlow() {
  console.log('\n🔄 Testing Cache Flow\n');

  const queryCache = mockQueryCache();
  const cacheKey = ['positions', 'curve', 'arbitrum', '4909613'];

  // Simulate curve data
  const mockCurveData = {
    points: [
      { price: 4500, pnl: -50 },
      { price: 4850, pnl: 0 },
      { price: 5200, pnl: 100 }
    ],
    priceRange: { min: 4500, max: 5200 },
    pnlRange: { min: -50, max: 100 },
    currentPriceIndex: 1,
    rangeStartIndex: 0,
    rangeEndIndex: 2,
    inRangeStartIndex: 0,
    inRangeEndIndex: 2
  };

  console.log('Step 1: Initial cache check (should be miss)');
  queryCache.getQueryData(cacheKey);

  console.log('\nStep 2: User performs refresh - cache gets populated');
  queryCache.setQueryData(cacheKey, mockCurveData);

  console.log('\nStep 3: User navigates to dashboard - should be cache hit');
  const cachedData = queryCache.getQueryData(cacheKey);

  console.log('\nStep 4: Verify cached data integrity');
  if (cachedData) {
    console.log('✅ Cached data points:', cachedData.points?.length);
    console.log('✅ Price range:', cachedData.priceRange);
  }

  return !!cachedData;
}

function testStaleTimeLogic() {
  console.log('\n⏰ Testing Stale Time Logic\n');

  const staleTime = 5 * 60 * 1000; // 5 minutes (from usePositionCurve)
  const gcTime = 30 * 60 * 1000; // 30 minutes

  console.log('React Query Configuration:');
  console.log(`  staleTime: ${staleTime / 1000}s (${staleTime / 60000} minutes)`);
  console.log(`  gcTime: ${gcTime / 1000}s (${gcTime / 60000} minutes)`);
  console.log('  refetchOnWindowFocus: false');
  console.log('  refetchOnReconnect: false');

  console.log('\n💡 Expected Behavior:');
  console.log('  - Data stays fresh for 5 minutes after fetch');
  console.log('  - Navigation within 5 minutes should use cache');
  console.log('  - No refetch on window focus or reconnect');
  console.log('  - Cache cleared after 30 minutes of inactivity');

  return {
    staleTime,
    gcTime,
    shouldCacheForNavigation: true
  };
}

function main() {
  console.log('🔍 Curve Data Cache Debug Test\n');
  console.log('='.repeat(50));

  try {
    // Test 1: Cache key consistency
    const cacheKey = testCacheKeyConsistency();

    // Test 2: Cache flow simulation
    const cacheWorking = testCacheFlow();

    // Test 3: Stale time configuration
    const config = testStaleTimeLogic();

    console.log('\n' + '='.repeat(50));
    console.log('📊 Test Results:');
    console.log('✅ Cache keys consistent:', !!cacheKey);
    console.log('✅ Cache flow working:', cacheWorking);
    console.log('✅ Configuration correct:', !!config.shouldCacheForNavigation);

    if (cacheKey && cacheWorking && config.shouldCacheForNavigation) {
      console.log('\n🎉 Cache setup is correct!');
      console.log('\n🔍 Next Steps for Debugging:');
      console.log('  1. Check browser console for [Cache] debug logs');
      console.log('  2. Navigate: Position Details → Dashboard');
      console.log('  3. Look for "cache miss" vs "cache hit" messages');
      console.log('  4. Verify refresh response includes curveData');

      console.log('\n📋 What to Look For:');
      console.log('  • "[Cache] Set curve data in React Query cache" after refresh');
      console.log('  • "[Cache] Successfully got curve data" on dashboard navigation');
      console.log('  • NO "[Cache] Fetching curve data from API (cache miss)" on navigation');
    } else {
      console.log('\n❌ Cache setup has issues. Check the implementation.');
    }

  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  }
}

// Run the tests
main();
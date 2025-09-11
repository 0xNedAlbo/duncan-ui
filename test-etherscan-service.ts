/**
 * Test EtherscanEventService for NFT position 4865121 on Arbitrum
 * Expected: 2 INCREASE_LIQUIDITY + 4 COLLECT events
 */

import { getEtherscanEventService } from './src/services/events/etherscanEventService';

async function testEtherscanService() {
    console.log('🧪 Testing EtherscanEventService for NFT 4865121 on Arbitrum...\n');

    const service = getEtherscanEventService();
    
    try {
        // Test parameters
        const chain = 'arbitrum';
        const tokenId = '4865121';
        
        console.log('📊 Test Parameters:');
        console.log(`  Chain: ${chain}`);
        console.log(`  Token ID: ${tokenId}`);
        console.log(`  Expected: 2 INCREASE_LIQUIDITY + 4 COLLECT events\n`);

        // Check API key
        const hasApiKey = service.validateApiKey(chain);
        console.log(`🔑 API Key available: ${hasApiKey ? '✅' : '❌'}`);
        if (!hasApiKey) {
            console.log('💡 Set ARBISCAN_API_KEY in your .env.local file');
            return;
        }

        // Fetch events
        console.log('🔍 Fetching events...');
        const startTime = Date.now();
        
        const result = await service.fetchPositionEvents(chain, tokenId, {
            fromBlock: 'earliest',
            toBlock: 'latest',
            eventTypes: ['INCREASE_LIQUIDITY', 'DECREASE_LIQUIDITY', 'COLLECT']
        });

        const duration = Date.now() - startTime;

        console.log('\n📋 Results:');
        console.log(`  Total events: ${result.events.length}`);
        console.log(`  Total fetched: ${result.totalFetched}`);
        console.log(`  Duplicates removed: ${result.duplicatesRemoved}`);
        console.log(`  Errors: ${result.errors.length}`);
        console.log(`  Duration: ${duration}ms\n`);

        if (result.errors.length > 0) {
            console.log('❌ Errors:');
            result.errors.forEach(error => console.log(`  - ${error}`));
            console.log('');
        }

        // Analyze event types
        const eventCounts = result.events.reduce((acc, event) => {
            acc[event.eventType] = (acc[event.eventType] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        console.log('📊 Event Type Breakdown:');
        Object.entries(eventCounts).forEach(([type, count]) => {
            console.log(`  ${type}: ${count}`);
        });

        // Check against expected results
        const expectedIncrease = 2;
        const expectedCollect = 4;
        const actualIncrease = eventCounts['INCREASE_LIQUIDITY'] || 0;
        const actualCollect = eventCounts['COLLECT'] || 0;

        console.log('\n🎯 Expected vs Actual:');
        console.log(`  INCREASE_LIQUIDITY: ${actualIncrease}/${expectedIncrease} ${actualIncrease === expectedIncrease ? '✅' : '❌'}`);
        console.log(`  COLLECT: ${actualCollect}/${expectedCollect} ${actualCollect === expectedCollect ? '✅' : '❌'}`);

        // Show event details
        if (result.events.length > 0) {
            console.log('\n📄 Event Details:');
            result.events.forEach((event, index) => {
                console.log(`\n${index + 1}. ${event.eventType}`);
                console.log(`   TX: ${event.transactionHash}`);
                console.log(`   Block: ${event.blockNumber} (${event.blockTimestamp.toISOString()})`);
                console.log(`   Token ID: ${event.tokenId}`);
                
                if (event.eventType === 'INCREASE_LIQUIDITY') {
                    console.log(`   Liquidity: ${event.liquidity}`);
                    console.log(`   Amount0: ${event.amount0}`);
                    console.log(`   Amount1: ${event.amount1}`);
                } else if (event.eventType === 'DECREASE_LIQUIDITY') {
                    console.log(`   Liquidity: ${event.liquidity}`);
                    console.log(`   Amount0: ${event.amount0}`);
                    console.log(`   Amount1: ${event.amount1}`);
                } else if (event.eventType === 'COLLECT') {
                    console.log(`   Amount0: ${event.amount0}`);
                    console.log(`   Amount1: ${event.amount1}`);
                    console.log(`   Recipient: ${event.recipient}`);
                }
            });
        }

        const success = actualIncrease === expectedIncrease && actualCollect === expectedCollect;
        console.log(`\n${success ? '🎉 SUCCESS!' : '⚠️ MISMATCH'} Test ${success ? 'passed' : 'failed'}`);

    } catch (error) {
        console.error('❌ Test failed:', error);
        
        if (error instanceof Error) {
            if (error.message.includes('API key')) {
                console.log('\n💡 Make sure ARBISCAN_API_KEY is set in your .env.local file');
            }
        }
    }
}

// Run the test if this file is executed directly
if (require.main === module) {
    testEtherscanService()
        .then(() => {
            console.log('\n✅ Test completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Test failed:', error);
            process.exit(1);
        });
}

export { testEtherscanService };
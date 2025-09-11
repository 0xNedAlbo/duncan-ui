/**
 * Test script for EtherscanEventService
 * Tests the new event fetching with a known transaction
 */

const { getEtherscanEventService } = require('./src/services/events/etherscanEventService.ts');

async function testEtherscanEvents() {
    console.log('🧪 Testing EtherscanEventService...\n');

    const service = getEtherscanEventService();
    
    // Test parameters - your actual Arbitrum position
    const testParams = {
        chain: 'arbitrum', // Your position is on Arbitrum
        tokenId: '4891913', // Your actual NFT tokenId
        transactionHash: '0x3c04a261a4f25c45a46175f14cd09929b99071e8f97d2e6076d82a830af2de46' // Your known transaction
    };

    try {
        console.log('📊 Test Parameters:');
        console.log('  Chain:', testParams.chain);
        console.log('  Token ID:', testParams.tokenId);
        console.log('  Expected Transaction:', testParams.transactionHash);
        console.log('');

        // Fetch events
        console.log('🔍 Fetching events via Etherscan API...');
        const startTime = Date.now();
        
        const result = await service.fetchPositionEvents(
            testParams.chain,
            testParams.tokenId,
            {
                fromBlock: 'earliest',
                toBlock: 'latest',
                eventTypes: ['INCREASE_LIQUIDITY', 'DECREASE_LIQUIDITY', 'COLLECT']
            }
        );

        const duration = Date.now() - startTime;

        console.log('✅ Results:');
        console.log('  Events Found:', result.events.length);
        console.log('  Query Duration:', duration, 'ms');
        console.log('  Errors:', result.errors.length);
        console.log('');

        if (result.errors.length > 0) {
            console.log('❌ Errors:');
            result.errors.forEach(error => console.log('  -', error));
            console.log('');
        }

        if (result.events.length > 0) {
            console.log('📋 Event Details:');
            result.events.forEach((event, index) => {
                console.log(`  ${index + 1}. ${event.eventType}`);
                console.log(`     Transaction: ${event.transactionHash}`);
                console.log(`     Block: ${event.blockNumber}`);
                console.log(`     Timestamp: ${event.timestamp.toISOString()}`);
                console.log(`     Token ID: ${event.tokenId}`);
                
                if (event.eventType === 'INCREASE_LIQUIDITY' || event.eventType === 'DECREASE_LIQUIDITY') {
                    console.log(`     Liquidity: ${event.liquidity}`);
                    console.log(`     Amount0: ${event.amount0}`);
                    console.log(`     Amount1: ${event.amount1}`);
                } else if (event.eventType === 'COLLECT') {
                    console.log(`     Amount0: ${event.amount0}`);
                    console.log(`     Amount1: ${event.amount1}`);
                    console.log(`     Recipient: ${event.recipient}`);
                }
                console.log('');
            });

            // Check if our expected transaction is found
            const foundTransaction = result.events.find(
                event => event.transactionHash.toLowerCase() === testParams.transactionHash.toLowerCase()
            );

            if (foundTransaction) {
                console.log('🎉 SUCCESS: Found the expected transaction!');
                console.log('   Event Type:', foundTransaction.eventType);
                console.log('   Transaction Hash:', foundTransaction.transactionHash);
            } else {
                console.log('⚠️  Expected transaction not found in results.');
                console.log('   This might mean:');
                console.log('   - Wrong tokenId for this transaction');
                console.log('   - Transaction is for a different event type');
                console.log('   - API filtering issue');
            }
        } else {
            console.log('❌ No events found. This could mean:');
            console.log('   - Wrong tokenId');
            console.log('   - Wrong chain');
            console.log('   - API configuration issue');
            console.log('   - No events exist for this position');
        }

    } catch (error) {
        console.error('❌ Test failed:', error);
        console.error('   Error details:', error.message);
        
        if (error.message.includes('ETHERSCAN_API_KEY')) {
            console.log('');
            console.log('💡 Tip: Make sure ETHERSCAN_API_KEY is set in your .env.local file');
        }
    }
}

// Run the test
if (require.main === module) {
    testEtherscanEvents();
}

module.exports = { testEtherscanEvents };
/**
 * Debug DECREASE_LIQUIDITY event parsing
 * Investigate the transaction: 0x40295ff46fac854504a1f3c24a766a3d8024f7a81bc4fe1bc6884bd9132d5c3d
 */

import { getEtherscanEventService } from './src/services/events/etherscanEventService';

async function debugDecreaseEvent() {
    console.log('🔍 Debugging DECREASE_LIQUIDITY event parsing...\n');

    const service = getEtherscanEventService();
    
    try {
        // Fetch events for the problematic transaction block range
        const result = await service.fetchPositionEvents('arbitrum', '4865121', {
            fromBlock: 378080759, // Specific block with the issue
            toBlock: 378080759,
            eventTypes: ['DECREASE_LIQUIDITY', 'COLLECT'] // Focus on the problematic events
        });

        console.log(`📊 Found ${result.events.length} events in block 378080759:`);
        
        result.events.forEach((event, index) => {
            console.log(`\n${index + 1}. ${event.eventType}`);
            console.log(`   TX: ${event.transactionHash}`);
            console.log(`   Block: ${event.blockNumber}`);
            console.log(`   Log Index: ${event.logIndex}`);
            console.log(`   Transaction Index: ${event.transactionIndex}`);
            
            if (event.eventType === 'DECREASE_LIQUIDITY') {
                console.log(`   ⚠️  DECREASE EVENT DATA:`);
                console.log(`   Liquidity: ${event.liquidity || 'MISSING'}`);
                console.log(`   Amount0: ${event.amount0 || 'MISSING'}`);
                console.log(`   Amount1: ${event.amount1 || 'MISSING'}`);
            } else if (event.eventType === 'COLLECT') {
                console.log(`   ✅ COLLECT EVENT DATA:`);
                console.log(`   Amount0: ${event.amount0}`);
                console.log(`   Amount1: ${event.amount1}`);
                console.log(`   Recipient: ${event.recipient}`);
            }
        });

        // Let's also manually inspect what the raw API returns
        console.log('\n🔧 Manual API inspection...');
        
        // Check if both events are in the same transaction
        const decreaseEvents = result.events.filter(e => e.eventType === 'DECREASE_LIQUIDITY');
        const collectEvents = result.events.filter(e => e.eventType === 'COLLECT');
        
        console.log(`\nTransaction analysis:`);
        console.log(`- DECREASE events: ${decreaseEvents.length}`);
        console.log(`- COLLECT events: ${collectEvents.length}`);
        
        if (decreaseEvents.length > 0 && collectEvents.length > 0) {
            const sameTransaction = decreaseEvents[0].transactionHash === collectEvents[0].transactionHash;
            console.log(`- Same transaction: ${sameTransaction ? '✅' : '❌'}`);
            
            if (sameTransaction) {
                console.log(`- DECREASE log index: ${decreaseEvents[0].logIndex}`);
                console.log(`- COLLECT log index: ${collectEvents[0].logIndex}`);
                console.log(`- Event order: ${decreaseEvents[0].logIndex < collectEvents[0].logIndex ? 'DECREASE → COLLECT' : 'COLLECT → DECREASE'}`);
            }
        }

    } catch (error) {
        console.error('❌ Debug failed:', error);
    }
}

debugDecreaseEvent()
    .then(() => {
        console.log('\n✅ Debug completed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Debug failed:', error);
        process.exit(1);
    });
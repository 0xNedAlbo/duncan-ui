/**
 * Test EtherscanEventService with real Arbitrum position
 */

import { describe, it, expect } from 'vitest';
import { getEtherscanEventService } from './etherscanEventService';

describe('EtherscanEventService - Real Data Test', () => {
  it('should debug Collect events for Arbitrum tokenId 4865121', async () => {
    const service = getEtherscanEventService();
    
    // Your actual position data
    const chain = 'arbitrum';
    const tokenId = '4865121';
    const expectedTxHash = '0x3c04a261a4f25c45a46175f14cd09929b99071e8f97d2e6076d82a830af2de46';

    console.log('🔍 Testing with real Arbitrum position:', {
      chain,
      tokenId,
      expectedTxHash
    });

    try {
      // First test: only Collect events
      console.log('🔍 Testing ONLY Collect events...');
      const collectResult = await service.fetchPositionEvents(
        chain,
        tokenId,
        {
          fromBlock: 'earliest',
          toBlock: 'latest',
          eventTypes: ['COLLECT']
        }
      );

      console.log('📊 Collect-only Results:', {
        eventsFound: collectResult.events.length,
        queryDuration: collectResult.queryDuration,
        errors: collectResult.errors
      });

      if (collectResult.events.length > 0) {
        console.log('📋 Collect Events found:');
        collectResult.events.forEach((event, i) => {
          console.log(`  ${i + 1}. ${event.eventType} - ${event.transactionHash}`);
          console.log(`     Block: ${event.blockNumber}, Time: ${event.timestamp.toISOString()}`);
          console.log(`     Fee Collected - Amount0: ${event.amount0}, Amount1: ${event.amount1}`);
          console.log(`     Recipient: ${event.recipient}`);
        });
      } else {
        console.log('❌ No Collect events found. This could indicate:');
        console.log('   - Wrong event signature');
        console.log('   - Events don\'t exist for this position');
        console.log('   - Different contract emits Collect events');
      }

      // Second test: all events
      console.log('\n🔍 Testing ALL event types...');
      const result = await service.fetchPositionEvents(
        chain,
        tokenId,
        {
          fromBlock: 'earliest',
          toBlock: 'latest',
          eventTypes: ['INCREASE_LIQUIDITY', 'DECREASE_LIQUIDITY', 'COLLECT']
        }
      );

      console.log('📊 Results:', {
        eventsFound: result.events.length,
        queryDuration: result.queryDuration,
        errors: result.errors
      });

      if (result.events.length > 0) {
        console.log('📋 Events found:');
        result.events.forEach((event, i) => {
          console.log(`  ${i + 1}. ${event.eventType} - ${event.transactionHash}`);
          console.log(`     Block: ${event.blockNumber}, Time: ${event.timestamp.toISOString()}`);
          
          if (event.eventType === 'COLLECT') {
            console.log(`     Fee Collected - Amount0: ${event.amount0}, Amount1: ${event.amount1}`);
            console.log(`     Recipient: ${event.recipient}`);
          } else if (event.eventType === 'INCREASE_LIQUIDITY') {
            console.log(`     Liquidity: ${event.liquidity}`);
            console.log(`     Amount0: ${event.amount0}, Amount1: ${event.amount1}`);
          }
        });

        // Check for expected transaction
        const foundExpectedTx = result.events.find(
          event => event.transactionHash.toLowerCase() === expectedTxHash.toLowerCase()
        );

        if (foundExpectedTx) {
          console.log('🎉 SUCCESS: Found expected transaction!', foundExpectedTx.eventType);
        } else {
          console.log('⚠️  Expected transaction not found in results');
        }
      }

      // At minimum, we expect to find some events for this position
      expect(result.events.length).toBeGreaterThan(0);
      
      // Check if we found the specific transaction
      const hasExpectedTx = result.events.some(
        event => event.transactionHash.toLowerCase() === expectedTxHash.toLowerCase()
      );
      
      if (hasExpectedTx) {
        console.log('✅ Expected transaction found in results!');
      }

    } catch (error) {
      console.error('❌ Test failed:', error);
      
      if (error instanceof Error && error.message.includes('ETHERSCAN_API_KEY')) {
        console.log('💡 Make sure ETHERSCAN_API_KEY is set in .env.local');
      }
      
      throw error;
    }
  }, 30000); // 30s timeout for API calls
});
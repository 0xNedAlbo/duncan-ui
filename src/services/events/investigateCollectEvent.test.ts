/**
 * Investigate the Collect event transaction to understand correct signature and contract
 */

import { describe, it, expect } from 'vitest';

describe('Collect Event Investigation', () => {
  it('should analyze the collect transaction 0x361c786da6bf6140981bfdbaddb442cb51a3a5d4168937466cf2e96bf3ca7f3a', async () => {
    const txHash = '0x361c786da6bf6140981bfdbaddb442cb51a3a5d4168937466cf2e96bf3ca7f3a';
    const apiKey = process.env.ETHERSCAN_API_KEY;
    
    if (!apiKey) {
      throw new Error('ETHERSCAN_API_KEY not set');
    }

    console.log('🔍 Investigating Collect transaction:', txHash);

    try {
      // Get transaction receipt to see all logs
      const receiptUrl = `https://api.etherscan.io/v2/api?module=proxy&action=eth_getTransactionReceipt&txhash=${txHash}&chainid=42161&apikey=${apiKey}`;
      
      console.log('📡 Fetching transaction receipt...');
      const response = await fetch(receiptUrl);
      const data = await response.json();

      if (data.result && data.result.logs) {
        console.log(`📋 Found ${data.result.logs.length} logs in transaction:`);
        
        data.result.logs.forEach((log: any, index: number) => {
          console.log(`\n🔸 Log ${index + 1}:`);
          console.log(`   Contract: ${log.address}`);
          console.log(`   Topics: ${log.topics.length} topics`);
          console.log(`   Topic0 (Event Signature): ${log.topics[0]}`);
          
          if (log.topics.length > 1) {
            console.log(`   Topic1: ${log.topics[1]}`);
          }
          if (log.topics.length > 2) {
            console.log(`   Topic2: ${log.topics[2]}`);
          }
          if (log.topics.length > 3) {
            console.log(`   Topic3: ${log.topics[3]}`);
          }
          
          console.log(`   Data: ${log.data}`);
          
          // Check if this looks like a Collect event
          if (log.topics[0] === '0x70935338e69775456a85ddef226c395fb668b63fa0115f5f20610b388e6ca9c0') {
            console.log('   🎯 This matches our current COLLECT signature!');
          }
          
          // Check if contract matches NFT Position Manager
          if (log.address.toLowerCase() === '0xc36442b4a4522e871399cd717abdd847ab11fe88') {
            console.log('   🎯 This is from NFT Position Manager!');
          }
          
          // Try to decode tokenId from topic1 if present
          if (log.topics.length > 1) {
            try {
              const tokenIdFromTopic = BigInt(log.topics[1]).toString();
              console.log(`   TokenID from Topic1: ${tokenIdFromTopic}`);
              
              if (tokenIdFromTopic === '4865121') {
                console.log('   🎯 This matches our test tokenId 4865121!');
              }
            } catch (e) {
              // Topic1 might not be a tokenId
            }
          }
        });

        // Look for Collect-like events
        const collectLikeEvents = data.result.logs.filter((log: any) => {
          // Look for events that might be Collect events
          return log.topics.some((topic: string) => {
            try {
              const tokenId = BigInt(topic).toString();
              return tokenId === '4865121';
            } catch {
              return false;
            }
          });
        });

        if (collectLikeEvents.length > 0) {
          console.log(`\n🎯 Found ${collectLikeEvents.length} events that reference tokenId 4865121:`);
          collectLikeEvents.forEach((event: any, index: number) => {
            console.log(`\n   Event ${index + 1}:`);
            console.log(`   Contract: ${event.address}`);
            console.log(`   Event Signature: ${event.topics[0]}`);
            console.log(`   All Topics:`, event.topics);
          });
        }

      } else {
        console.log('❌ No logs found in transaction or API error:', data);
      }

    } catch (error) {
      console.error('❌ Failed to investigate transaction:', error);
      throw error;
    }
  }, 30000); // 30s timeout
});
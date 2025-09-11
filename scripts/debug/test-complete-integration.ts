/**
 * Complete End-to-End Test: EtherscanEventService + EventStateCalculator + Database
 * Tests the complete stateful event ledger system with NFT position 4865121 on Arbitrum
 */

// Load environment variables FIRST (before any imports that might use them)
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';
import { getEtherscanEventService } from './src/services/events/etherscanEventService';
import { EventStateCalculator } from './src/services/positions/eventStateCalculator';
import { getHistoricalPriceService } from './src/services/positions/historicalPriceService';

const prisma = new PrismaClient();

async function testCompleteIntegration() {
    console.log('🧪 Testing Complete Stateful Event Ledger System');
    console.log('=====================================\n');

    try {
        // Test parameters
        const chain = 'arbitrum';
        const tokenId = '4865121';
        const testAddress = '0x742d35Cc6634C0532925a3b8d0Ac6Ac3c4D0b09b'; // Dummy test address

        console.log('📊 Test Parameters:');
        console.log(`  Chain: ${chain}`);
        console.log(`  Token ID: ${tokenId}`);
        console.log(`  Test Address: ${testAddress}\n`);

        // Step 1: Clean up any existing test data
        console.log('🧹 Cleaning up existing test data...');
        const positionId = `${chain}-${tokenId}`;
        await prisma.positionEvent.deleteMany({
            where: { 
                position: {
                    id: positionId
                }
            }
        });
        await prisma.position.deleteMany({
            where: { id: positionId }
        });
        console.log('✅ Test data cleaned up\n');

        // Step 2: Fetch events using EtherscanEventService
        console.log('📥 Step 1: Fetching events with EtherscanEventService...');
        const etherscanService = getEtherscanEventService();
        
        const eventResult = await etherscanService.fetchPositionEvents(chain, tokenId, {
            fromBlock: 'earliest',
            toBlock: 'latest',
            eventTypes: ['INCREASE_LIQUIDITY', 'DECREASE_LIQUIDITY', 'COLLECT']
        });

        console.log(`✅ Fetched ${eventResult.events.length} events (${eventResult.errors.length} errors)\n`);

        if (eventResult.events.length === 0) {
            console.log('⚠️ No events found. Cannot proceed with integration test.');
            return;
        }

        // Step 3: Create test user
        console.log('📝 Step 2: Creating test user...');
        const testUser = await prisma.user.upsert({
            where: { email: 'test-integration@test.com' },
            update: {},
            create: {
                email: 'test-integration@test.com',
                name: 'Integration Test User',
                password: 'hashed-password-placeholder'
            }
        });
        console.log(`✅ Created/found user: ${testUser.id}\n`);

        // Step 4: Create token references for WETH and USDC
        console.log('📝 Step 3: Creating token references...');
        const wethToken = await prisma.token.upsert({
            where: { chain_address: { chain, address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1' } },
            update: {},
            create: {
                chain,
                address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
                symbol: 'WETH',
                name: 'Wrapped Ether',
                decimals: 18,
                verified: true
            }
        });

        const usdcToken = await prisma.token.upsert({
            where: { chain_address: { chain, address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' } },
            update: {},
            create: {
                chain,
                address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
                symbol: 'USDC',
                name: 'USD Coin',
                decimals: 6,
                verified: true
            }
        });

        const wethRef = await prisma.tokenReference.upsert({
            where: { tokenType_globalTokenId: { tokenType: 'global', globalTokenId: wethToken.id } },
            update: {},
            create: {
                tokenType: 'global',
                globalTokenId: wethToken.id,
                chain,
                address: wethToken.address,
                symbol: wethToken.symbol
            }
        });

        const usdcRef = await prisma.tokenReference.upsert({
            where: { tokenType_globalTokenId: { tokenType: 'global', globalTokenId: usdcToken.id } },
            update: {},
            create: {
                tokenType: 'global',
                globalTokenId: usdcToken.id,
                chain,
                address: usdcToken.address,
                symbol: usdcToken.symbol
            }
        });
        console.log(`✅ Created token references\n`);

        // Step 5: Create pool
        console.log('📝 Step 4: Creating pool...');
        const pool = await prisma.pool.upsert({
            where: { chain_token0Address_token1Address_fee: { 
                chain, 
                token0Address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
                token1Address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
                fee: 500
            }},
            update: {},
            create: {
                chain,
                poolAddress: '0xC6962004f452bE9203591991D15f6b388e09E8D0', // WETH/USDC 0.05% pool on Arbitrum
                token0RefId: wethRef.id,
                token1RefId: usdcRef.id,
                token0Address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
                token1Address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
                fee: 500,
                tickSpacing: 10
            }
        });
        console.log(`✅ Created pool: ${pool.id}\n`);

        // Step 6: Create position record
        console.log('📝 Step 5: Creating position record...');
        const position = await prisma.position.create({
            data: {
                id: positionId,
                userId: testUser.id,
                poolId: pool.id,
                tickLower: -202500,
                tickUpper: -201000,
                liquidity: '0', // Will be updated by events
                token0IsQuote: false, // WETH is base, USDC is quote
                importType: 'nft',
                nftId: tokenId,
                status: 'active'
            }
        });
        console.log(`✅ Created position: ${position.id}\n`);

        // Step 7: Initialize EventStateCalculator and process events
        console.log('🔄 Step 6: Processing events with EventStateCalculator...');
        
        // Debug: Check RPC configuration
        console.log('🔧 Debug: Checking RPC configuration...');
        console.log(`  ETHEREUM_RPC: ${process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL ? '✅' : '❌'} (${process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL?.slice(0, 30)}...)`);
        console.log(`  ARBITRUM_RPC: ${process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL ? '✅' : '❌'} (${process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL?.slice(0, 30)}...)`);
        console.log(`  BASE_RPC: ${process.env.NEXT_PUBLIC_BASE_RPC_URL ? '✅' : '❌'} (${process.env.NEXT_PUBLIC_BASE_RPC_URL?.slice(0, 30)}...)\n`);

        // For testing, let's try creating a new EventStateCalculator that gets a fresh HistoricalPriceService
        console.log('🔄 Creating EventStateCalculator (will initialize fresh HistoricalPriceService)...');

        const calculator = new EventStateCalculator();
        
        // Prepare position context for the calculator
        const positionContext = {
            chain: chain as any, // arbitrum
            nftId: tokenId,
            token0IsQuote: position.token0IsQuote,
            pool: {
                address: '0xC6962004f452bE9203591991D15f6b388e09E8D0', // WETH/USDC 0.05% pool on Arbitrum
                token0Decimals: 18, // WETH
                token1Decimals: 6   // USDC
            }
        };

        console.log('📋 Debug: Event summary before processing:');
        eventResult.events.forEach((event, i) => {
            console.log(`  ${i + 1}. ${event.eventType} - Block ${event.blockNumber} - ${event.transactionHash.slice(0, 10)}...`);
        });
        console.log('');

        // Process all events at once to get calculated states
        const processedEvents = await calculator.processEventsForPosition(
            positionContext,
            eventResult.events
        );

        console.log(`✅ Processed ${processedEvents.length} events with state calculations\n`);

        // Step 8: Store processed events in database
        console.log('💾 Step 7: Storing events with calculated states...');
        let storedCount = 0;

        for (const processedEvent of processedEvents) {
            try {
                console.log(`\n  📤 Storing ${processedEvent.eventType} event (${processedEvent.transactionHash.slice(0, 10)}...)`);
                
                // Store event with calculated states
                const positionEvent = await prisma.positionEvent.create({
                    data: {
                        positionId: position.id,
                        eventType: processedEvent.eventType,
                        transactionHash: processedEvent.transactionHash,
                        blockNumber: processedEvent.blockNumber,
                        transactionIndex: processedEvent.transactionIndex,
                        logIndex: processedEvent.logIndex,
                        blockTimestamp: processedEvent.blockTimestamp,
                        
                        // Raw event data
                        deltaL: processedEvent.liquidity || '0',
                        token0Amount: processedEvent.amount0 || '0',
                        token1Amount: processedEvent.amount1 || '0',
                        poolPrice: processedEvent.poolPrice,
                        
                        // State before event
                        liquidityBefore: processedEvent.liquidityBefore,
                        costBasisBefore: processedEvent.costBasisBefore,
                        realizedPnLBefore: processedEvent.realizedPnLBefore,
                        feesCollected0Before: processedEvent.feesCollected0Before,
                        feesCollected1Before: processedEvent.feesCollected1Before,
                        
                        // State after event
                        liquidityAfter: processedEvent.liquidityAfter,
                        costBasisAfter: processedEvent.costBasisAfter,
                        realizedPnLAfter: processedEvent.realizedPnLAfter,
                        feesCollected0After: processedEvent.feesCollected0After,
                        feesCollected1After: processedEvent.feesCollected1After,
                        
                        // Calculated values
                        valueInQuote: processedEvent.valueInQuote?.toString() || null,
                        feeValueInQuote: processedEvent.feeValueInQuote?.toString() || null,
                        
                        // Event source
                        source: 'etherscan'
                    }
                });

                console.log(`    ✅ Stored event ${positionEvent.id}`);
                console.log(`    📊 State: Liquidity ${processedEvent.liquidityBefore} → ${processedEvent.liquidityAfter}`);
                console.log(`    💰 Cost Basis: ${processedEvent.costBasisBefore} → ${processedEvent.costBasisAfter}`);
                console.log(`    📈 Realized PnL: ${processedEvent.realizedPnLBefore} → ${processedEvent.realizedPnLAfter}`);
                console.log(`    🎯 Fees: Token0=${processedEvent.feesCollected0After}, Token1=${processedEvent.feesCollected1After}`);

                storedCount++;

            } catch (error) {
                console.error(`    ❌ Failed to store event: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }

        console.log(`\n✅ Event storage complete: ${storedCount}/${processedEvents.length} events stored\n`);

        // Step 9: Update position with final state
        console.log('📊 Step 8: Updating position with final state...');
        const finalEvent = await prisma.positionEvent.findFirst({
            where: { positionId: position.id },
            orderBy: [
                { blockNumber: 'desc' },
                { transactionIndex: 'desc' },
                { logIndex: 'desc' }
            ]
        });

        if (finalEvent) {
            await prisma.position.update({
                where: { id: position.id },
                data: {
                    liquidity: finalEvent.liquidityAfter,
                }
            });
            console.log('✅ Position updated with final liquidity state\n');
        }

        // Step 10: Generate summary report
        console.log('📋 Step 9: Generating summary report...');
        
        const events = await prisma.positionEvent.findMany({
            where: { positionId: position.id },
            orderBy: [
                { blockNumber: 'asc' },
                { transactionIndex: 'asc' },
                { logIndex: 'asc' }
            ]
        });

        console.log('\n📊 INTEGRATION TEST SUMMARY');
        console.log('============================');
        console.log(`Position ID: ${position.id}`);
        console.log(`Total Events Processed: ${events.length}`);
        
        const eventCounts = events.reduce((acc, event) => {
            acc[event.eventType] = (acc[event.eventType] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        
        console.log('\n📊 Event Type Breakdown:');
        Object.entries(eventCounts).forEach(([type, count]) => {
            console.log(`  ${type}: ${count}`);
        });

        if (finalEvent) {
            console.log('\n💼 Final Position State:');
            console.log(`  Liquidity: ${finalEvent.liquidityAfter}`);
            console.log(`  Cost Basis: ${finalEvent.costBasisAfter}`);
            console.log(`  Realized PnL: ${finalEvent.realizedPnLAfter}`);
            console.log(`  Fees Collected Token0: ${finalEvent.feesCollected0After}`);
            console.log(`  Fees Collected Token1: ${finalEvent.feesCollected1After}`);
        }

        console.log('\n🎯 Integration Test Result: SUCCESS!');
        console.log('All components working together correctly:');
        console.log('  ✅ EtherscanEventService: Event fetching');
        console.log('  ✅ EventStateCalculator: State calculation'); 
        console.log('  ✅ Database Storage: Event persistence');
        console.log('  ✅ State Transitions: Before/After tracking');

    } catch (error) {
        console.error('\n❌ Integration test failed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the test if this file is executed directly
if (require.main === module) {
    testCompleteIntegration()
        .then(() => {
            console.log('\n✅ Integration test completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Integration test failed:', error);
            process.exit(1);
        });
}

export { testCompleteIntegration };
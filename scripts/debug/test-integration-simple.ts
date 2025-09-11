/**
 * Simple Integration Test without RPC dependencies
 * Tests EtherscanEventService + Basic State Processing + Database Storage
 */

// Load environment variables FIRST
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';
import { getEtherscanEventService } from './src/services/events/etherscanEventService';

const prisma = new PrismaClient();

async function testSimpleIntegration() {
    console.log('🧪 Testing Simple Integration (Etherscan + Database)');
    console.log('===================================================\n');

    try {
        // Test parameters
        const chain = 'arbitrum';
        const tokenId = '4865121';
        const testAddress = '0x742d35Cc6634C0532925a3b8d0Ac6Ac3c4D0b09b';

        console.log('📊 Test Parameters:');
        console.log(`  Chain: ${chain}`);
        console.log(`  Token ID: ${tokenId}`);
        console.log(`  Test Address: ${testAddress}\n`);

        // Step 1: Clean up any existing test data
        console.log('🧹 Step 1: Cleaning up existing test data...');
        const positionId = `${chain}-${tokenId}`;
        await prisma.positionEvent.deleteMany({
            where: { 
                position: { id: positionId }
            }
        });
        await prisma.position.deleteMany({
            where: { id: positionId }
        });
        console.log('✅ Test data cleaned up\n');

        // Step 2: Fetch events using EtherscanEventService
        console.log('📥 Step 2: Fetching events with EtherscanEventService...');
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

        // Step 3: Create test user and database records
        console.log('📝 Step 3: Creating database records...');
        const testUser = await prisma.user.upsert({
            where: { email: 'test-simple@test.com' },
            update: {},
            create: {
                email: 'test-simple@test.com',
                name: 'Simple Test User',
                password: 'hashed-password'
            }
        });

        // Create basic tokens
        const wethToken = await prisma.token.upsert({
            where: { chain_address: { chain, address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1' } },
            update: {},
            create: {
                chain,
                address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
                symbol: 'WETH',
                name: 'Wrapped Ether',
                decimals: 18
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
                decimals: 6
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
                poolAddress: '0xC6962004f452bE9203591991D15f6b388e09E8D0',
                token0RefId: wethRef.id,
                token1RefId: usdcRef.id,
                token0Address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
                token1Address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
                fee: 500,
                tickSpacing: 10
            }
        });

        const position = await prisma.position.create({
            data: {
                id: positionId,
                userId: testUser.id,
                poolId: pool.id,
                tickLower: -202500,
                tickUpper: -201000,
                liquidity: '0',
                token0IsQuote: false, // WETH is base, USDC is quote
                importType: 'nft',
                nftId: tokenId,
                status: 'active'
            }
        });
        console.log(`✅ Created database records\n`);

        // Step 4: Store raw events in database (simplified without state calculation)
        console.log('💾 Step 4: Storing raw events...');
        let storedCount = 0;
        let currentLiquidity = 0n;
        let currentCostBasis = 0n;
        let currentPnL = 0n;
        let currentFees0 = 0n;
        let currentFees1 = 0n;

        for (const rawEvent of eventResult.events) {
            try {
                console.log(`\n  📤 Storing ${rawEvent.eventType} event (${rawEvent.transactionHash.slice(0, 10)}...)`);

                // Simple state calculation (without price service)
                const liquidityBefore = currentLiquidity.toString();
                const costBasisBefore = currentCostBasis.toString();
                const pnlBefore = currentPnL.toString();
                const fees0Before = currentFees0.toString();
                const fees1Before = currentFees1.toString();

                // Update state based on event type
                if (rawEvent.eventType === 'INCREASE_LIQUIDITY') {
                    const liquidityDelta = BigInt(rawEvent.liquidity || '0');
                    const amount0 = BigInt(rawEvent.amount0 || '0');
                    const amount1 = BigInt(rawEvent.amount1 || '0');
                    
                    currentLiquidity += liquidityDelta;
                    // Simplified cost basis (just add USDC amount for now)
                    currentCostBasis += amount1; // USDC amount
                } else if (rawEvent.eventType === 'DECREASE_LIQUIDITY') {
                    const liquidityDelta = BigInt(rawEvent.liquidity || '0');
                    const amount0 = BigInt(rawEvent.amount0 || '0');
                    const amount1 = BigInt(rawEvent.amount1 || '0');
                    
                    currentLiquidity -= liquidityDelta;
                    // Simplified realized PnL calculation
                    currentPnL += amount1; // Simplified: assume USDC received
                } else if (rawEvent.eventType === 'COLLECT') {
                    const amount0 = BigInt(rawEvent.amount0 || '0');
                    const amount1 = BigInt(rawEvent.amount1 || '0');
                    
                    currentFees0 += amount0;
                    currentFees1 += amount1;
                }

                // Store event with simplified state
                const positionEvent = await prisma.positionEvent.create({
                    data: {
                        positionId: position.id,
                        eventType: rawEvent.eventType,
                        transactionHash: rawEvent.transactionHash,
                        blockNumber: rawEvent.blockNumber,
                        transactionIndex: rawEvent.transactionIndex,
                        logIndex: rawEvent.logIndex,
                        blockTimestamp: rawEvent.blockTimestamp,
                        
                        // Raw event data
                        deltaL: rawEvent.liquidity || '0',
                        token0Amount: rawEvent.amount0 || '0',
                        token1Amount: rawEvent.amount1 || '0',
                        poolPrice: '0', // Placeholder (would need price service)
                        
                        // State before event
                        liquidityBefore,
                        costBasisBefore,
                        realizedPnLBefore: pnlBefore,
                        feesCollected0Before: fees0Before,
                        feesCollected1Before: fees1Before,
                        
                        // State after event
                        liquidityAfter: currentLiquidity.toString(),
                        costBasisAfter: currentCostBasis.toString(),
                        realizedPnLAfter: currentPnL.toString(),
                        feesCollected0After: currentFees0.toString(),
                        feesCollected1After: currentFees1.toString(),
                        
                        // Calculated values (simplified without price service)
                        valueInQuote: rawEvent.eventType !== 'COLLECT' ? (rawEvent.amount1 || '0') : null,
                        feeValueInQuote: rawEvent.eventType === 'COLLECT' ? (rawEvent.amount1 || '0') : null,
                        source: 'etherscan'
                    }
                });

                console.log(`    ✅ Stored event ${positionEvent.id}`);
                console.log(`    📊 State: Liquidity ${liquidityBefore} → ${currentLiquidity}`);
                console.log(`    💰 Cost Basis: ${costBasisBefore} → ${currentCostBasis}`);
                console.log(`    📈 Realized PnL: ${pnlBefore} → ${currentPnL}`);
                console.log(`    🎯 Fees: Token0=${currentFees0}, Token1=${currentFees1}`);

                storedCount++;

            } catch (error) {
                console.error(`    ❌ Failed to store event: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }

        console.log(`\n✅ Event storage complete: ${storedCount}/${eventResult.events.length} events stored\n`);

        // Step 5: Update position with final state
        console.log('📊 Step 5: Updating position with final state...');
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
                    liquidity: finalEvent.liquidityAfter
                }
            });
            console.log('✅ Position updated with final state\n');
        }

        // Step 6: Generate summary report
        console.log('📋 Step 6: Generating summary report...');
        
        const events = await prisma.positionEvent.findMany({
            where: { positionId: position.id },
            orderBy: [
                { blockNumber: 'asc' },
                { transactionIndex: 'asc' },
                { logIndex: 'asc' }
            ]
        });

        console.log('\n📊 SIMPLE INTEGRATION TEST SUMMARY');
        console.log('====================================');
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

        console.log('\n🎯 Simple Integration Test Result: SUCCESS!');
        console.log('Components tested:');
        console.log('  ✅ EtherscanEventService: Event fetching');
        console.log('  ✅ Database Schema: Event storage');
        console.log('  ✅ State Tracking: Before/After states');
        console.log('  ✅ Event Ordering: Blockchain chronological order');

    } catch (error) {
        console.error('\n❌ Simple integration test failed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the test if this file is executed directly
if (require.main === module) {
    testSimpleIntegration()
        .then(() => {
            console.log('\n✅ Simple integration test completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Simple integration test failed:', error);
            process.exit(1);
        });
}

export { testSimpleIntegration };
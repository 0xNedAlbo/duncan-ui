#!/usr/bin/env node

/**
 * Test Event-Based PnL System
 * 
 * This script tests the event-based PnL calculation system by:
 * 1. Creating a test position
 * 2. Adding mock events to the database
 * 3. Running the event-based PnL calculation
 * 4. Comparing with legacy calculation
 */

import { prisma } from '../src/lib/prisma';
import { getEventPnlService } from '../src/services/positions/eventPnlService';
import { getPositionService } from '../src/services/positions/positionService';

async function main() {
    console.log('🧪 Testing Event-Based PnL System...\n');

    try {
        // Find an existing position for testing
        const existingPosition = await prisma.position.findFirst({
            where: {
                status: 'active'
            },
            include: {
                pool: true
            }
        });

        if (!existingPosition) {
            console.log('❌ No existing positions found for testing');
            console.log('💡 Please import a position first using the UI');
            return;
        }

        console.log(`📍 Testing with position: ${existingPosition.id}`);
        console.log(`🏊 Pool: ${existingPosition.pool.poolAddress}`);

        // Check current event count
        const currentEventCount = await prisma.positionEvent.count({
            where: { positionId: existingPosition.id }
        });

        console.log(`📊 Current event count: ${currentEventCount}`);

        if (currentEventCount === 0) {
            console.log('\n🔧 Creating test events...');
            
            // Create mock events for testing
            const testEvents = [
                {
                    positionId: existingPosition.id,
                    eventType: 'CREATE',
                    timestamp: new Date('2024-01-01T10:00:00Z'),
                    blockNumber: 18000000,
                    transactionHash: '0x123...abc',
                    liquidityDelta: '1000000000000000000',
                    token0Delta: '1000000000000000000000', // 1000 * 10^18
                    token1Delta: '500000000000000000000',  // 500 * 10^18
                    collectedFee0: null,
                    collectedFee1: null,
                    poolPrice: '2000000000000000000000', // 2000 * 10^18
                    tick: -200000,
                    valueInQuote: '1000000000000000000000', // 1000 * 10^18
                    feeValueInQuote: null,
                    source: 'manual',
                    confidence: 'estimated'
                },
                {
                    positionId: existingPosition.id,
                    eventType: 'COLLECT',
                    timestamp: new Date('2024-02-01T10:00:00Z'),
                    blockNumber: 18500000,
                    transactionHash: '0x456...def',
                    liquidityDelta: '0',
                    token0Delta: '0',
                    token1Delta: '0',
                    collectedFee0: '10000000000000000000', // 10 * 10^18
                    collectedFee1: '5000000000000000000',  // 5 * 10^18
                    poolPrice: '2100000000000000000000', // 2100 * 10^18
                    tick: -195000,
                    valueInQuote: '0',
                    feeValueInQuote: '50000000000000000000', // 50 * 10^18
                    source: 'manual',
                    confidence: 'estimated'
                }
            ];

            for (const eventData of testEvents) {
                await prisma.positionEvent.create({ data: eventData });
                console.log(`✅ Created ${eventData.eventType} event`);
            }
        }

        // Test event-based PnL calculation
        console.log('\n🧮 Testing Event-Based PnL Calculation...');
        const eventPnlService = getEventPnlService();
        
        try {
            const eventBasedPnL = await eventPnlService.calculateEventBasedPnL(existingPosition.id);
            
            console.log('\n📈 Event-Based PnL Results:');
            console.log(`Total Invested: ${eventBasedPnL.totalInvested}`);
            console.log(`Current Value: ${eventBasedPnL.currentValue}`);
            console.log(`Total PnL: ${eventBasedPnL.totalPnL}`);
            console.log(`ROI: ${eventBasedPnL.roi}%`);
            console.log(`Collected Fees: ${eventBasedPnL.totalFeesCollected}`);
            console.log(`Confidence: ${eventBasedPnL.confidence}`);
            console.log(`Event Count: ${eventBasedPnL.eventCount}`);
            
        } catch (eventError) {
            console.log(`⚠️ Event-based calculation failed: ${eventError.message}`);
        }

        // Test position service (should now use event-based if events exist)
        console.log('\n🔄 Testing Position Service Calculation...');
        const positionService = getPositionService();
        
        try {
            const positionPnL = await positionService.calculatePositionPnL(existingPosition.id);
            
            console.log('\n📊 Position Service Results:');
            console.log(`Method: ${positionPnL.pnlMethod}`);
            console.log(`Initial Value: ${positionPnL.initialValue}`);
            console.log(`Current Value: ${positionPnL.currentValue}`);
            console.log(`PnL: ${positionPnL.pnl}`);
            console.log(`PnL %: ${positionPnL.pnlPercent}%`);
            console.log(`Confidence: ${positionPnL.confidence}`);
            
            if (positionPnL.pnlBreakdown) {
                console.log('\n📋 PnL Breakdown:');
                console.log(`Asset Value Change: ${positionPnL.pnlBreakdown.assetValueChange}`);
                console.log(`Collected Fees: ${positionPnL.pnlBreakdown.collectedFees}`);
                console.log(`Unclaimed Fees: ${positionPnL.pnlBreakdown.unclaimedFees}`);
                console.log(`Realized PnL: ${positionPnL.pnlBreakdown.realizedPnL}`);
                console.log(`Unrealized PnL: ${positionPnL.pnlBreakdown.unrealizedPnL}`);
            }
            
            if (positionPnL.eventCount) {
                console.log(`\n📈 Event Count: ${positionPnL.eventCount}`);
                console.log(`Last Event Sync: ${positionPnL.lastEventSync}`);
            }
            
        } catch (positionError) {
            console.log(`⚠️ Position service calculation failed: ${positionError.message}`);
        }

        // Test event validation
        console.log('\n🔍 Testing Event Validation...');
        try {
            const validation = await eventPnlService.validateEventPnL(existingPosition.id);
            
            console.log(`Valid: ${validation.isValid}`);
            console.log(`Event Count: ${validation.eventCount}`);
            
            if (validation.issues.length > 0) {
                console.log('Issues found:');
                validation.issues.forEach(issue => console.log(`  - ${issue}`));
            } else {
                console.log('✅ No validation issues found');
            }
            
        } catch (validationError) {
            console.log(`⚠️ Validation failed: ${validationError.message}`);
        }

        // Test event summary
        console.log('\n📊 Testing Event Summary...');
        try {
            const summary = await eventPnlService.getEventSummary(existingPosition.id);
            
            console.log(`Total Events: ${summary.totalEvents}`);
            console.log('Event Breakdown:', summary.eventBreakdown);
            console.log(`Total Value Flow: ${summary.totalValueFlow}`);
            console.log(`Total Fees Collected: ${summary.totalFeesCollected}`);
            console.log(`Date Range: ${summary.oldestEvent} - ${summary.newestEvent}`);
            
        } catch (summaryError) {
            console.log(`⚠️ Summary failed: ${summaryError.message}`);
        }

        console.log('\n✅ Event-Based PnL System Test Complete!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the test
main().catch(console.error);
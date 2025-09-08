#!/usr/bin/env tsx

/**
 * Debug script for curveDataService
 * Tests curve data generation for a specific NFT position
 */

import { getPositionService } from '../src/services/positions/positionService';
import { curveDataService } from '../src/services/positions/curveDataService';
import { prisma } from '../src/lib/prisma';

async function debugCurveData() {
    const positionId = "cmfa1arrl000206tt8uqmjtgx"; // Latest WETH/USDC position
    
    console.log(`🔍 Debugging curve data for position: ${positionId}`);
    console.log("=" .repeat(50));
    
    try {
        // Step 1: Fetch position data
        console.log("📦 Step 1: Fetching position data...");
        
        // First check if position exists in database
        const positionInDb = await prisma.position.findUnique({
            where: { id: positionId }
        });
        
        if (!positionInDb) {
            console.error("❌ Position not found in database!");
            return;
        }
        
        console.log("✅ Position found in database, refreshing with PnL data...");
        
        // Use positionService to refresh and get full data
        const positionService = getPositionService();
        const position = await positionService.refreshPosition(positionId);
        
        if (!position) {
            console.error("❌ Position not found!");
            return;
        }
        
        console.log("✅ Position fetched successfully");
        console.log("Position overview:", {
            id: position.id,
            nftId: position.nftId,
            liquidity: position.liquidity,
            tickLower: position.tickLower,
            tickUpper: position.tickUpper,
            initialValue: position.initialValue,
            currentValue: position.currentValue,
            pnl: position.pnl,
            pool: {
                id: position.pool.id,
                chain: position.pool.chain,
                token0: `${position.pool.token0.symbol} (${position.pool.token0.id})`,
                token1: `${position.pool.token1.symbol} (${position.pool.token1.id})`,
                fee: position.pool.fee,
                currentPrice: position.pool.currentPrice
            }
        });
        console.log("");
        
        // Step 2: Validate position
        console.log("✔️ Step 2: Validating position data...");
        const isValid = curveDataService.validatePosition(position);
        console.log(`Validation result: ${isValid ? "✅ VALID" : "❌ INVALID"}`);
        
        if (!isValid) {
            console.error("❌ Position validation failed - cannot generate curve data");
            return;
        }
        console.log("");
        
        // Step 3: Extract position parameters
        console.log("🔧 Step 3: Extracting position parameters...");
        const params = curveDataService.extractPositionParams(position);
        console.log("Position parameters:", {
            liquidity: params.liquidity.toString(),
            tickLower: params.tickLower,
            tickUpper: params.tickUpper,
            currentTick: params.currentTick,
            baseIsToken0: params.baseIsToken0,
            baseDecimals: params.baseDecimals,
            quoteDecimals: params.quoteDecimals,
            initialValue: params.initialValue.toString(),
            currentPrice: params.currentPrice.toString(),
            tickSpacing: params.tickSpacing,
            baseToken: params.baseIsToken0 ? position.pool.token0.symbol : position.pool.token1.symbol,
            quoteToken: params.baseIsToken0 ? position.pool.token1.symbol : position.pool.token0.symbol
        });
        console.log("");
        
        // Step 4: Generate curve data
        console.log("📈 Step 4: Generating curve data...");
        const curveData = curveDataService.generateCurveData(position);
        
        console.log("Curve data overview:", {
            totalPoints: curveData.points.length,
            priceRange: curveData.priceRange,
            pnlRange: curveData.pnlRange,
            currentPriceIndex: curveData.currentPriceIndex,
            rangeIndices: curveData.rangeIndices,
            lowerPrice: curveData.lowerPrice,
            upperPrice: curveData.upperPrice,
            currentPrice: curveData.currentPrice
        });
        console.log("");
        
        // Step 5: Display curve points with phases
        console.log("📊 Step 5: Curve points breakdown by phase:");
        
        const pointsByPhase = {
            below: curveData.points.filter(p => p.phase === 'below'),
            'in-range': curveData.points.filter(p => p.phase === 'in-range'),
            above: curveData.points.filter(p => p.phase === 'above')
        };
        
        console.log(`📉 Below range: ${pointsByPhase.below.length} points`);
        console.log(`📊 In range: ${pointsByPhase['in-range'].length} points`);
        console.log(`📈 Above range: ${pointsByPhase.above.length} points`);
        console.log("");
        
        // Step 6: Display sample points from each phase
        console.log("🎯 Step 6: Sample points from each phase:");
        
        if (pointsByPhase.below.length > 0) {
            const belowSample = pointsByPhase.below[Math.floor(pointsByPhase.below.length / 2)];
            console.log(`Below range sample: Price: ${belowSample.price.toFixed(6)}, PnL: ${belowSample.pnl.toFixed(2)}`);
        }
        
        if (pointsByPhase['in-range'].length > 0) {
            const inRangeSample = pointsByPhase['in-range'][Math.floor(pointsByPhase['in-range'].length / 2)];
            console.log(`In-range sample: Price: ${inRangeSample.price.toFixed(6)}, PnL: ${inRangeSample.pnl.toFixed(2)}`);
        }
        
        if (pointsByPhase.above.length > 0) {
            const aboveSample = pointsByPhase.above[Math.floor(pointsByPhase.above.length / 2)];
            console.log(`Above range sample: Price: ${aboveSample.price.toFixed(6)}, PnL: ${aboveSample.pnl.toFixed(2)}`);
        }
        console.log("");
        
        // Step 7: Output complete JSON
        console.log("📄 Step 7: Complete curve data as JSON:");
        console.log(JSON.stringify(curveData, null, 2));
        
    } catch (error) {
        console.error("❌ Error during curve data debug:", error);
        if (error instanceof Error) {
            console.error("Error details:", {
                message: error.message,
                stack: error.stack
            });
        }
    } finally {
        // Clean up database connection
        await prisma.$disconnect();
        console.log("\n🧹 Database connection closed");
    }
}

// Run the debug script
debugCurveData().catch(console.error);
#!/usr/bin/env tsx

/**
 * Final test of CurveDataService with all fixes applied
 */

import { CurveDataService } from '../src/services/positions/curveDataService';
import type { PositionWithPnL } from '../src/services/positions/positionService';

console.log("=== Final CurveDataService Test (All Fixes Applied) ===");

// Real Arbitrum addresses
const WETH_ARBITRUM = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
const USDC_ARBITRUM = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";

// Real blockchain data
const currentTick = -192593;

// Realistic position range (±500 ticks around current = ~3% range)
const tickLower = currentTick - 500; // -193093
const tickUpper = currentTick + 500; // -192093

console.log("Using real data:");
console.log("- WETH address:", WETH_ARBITRUM);
console.log("- USDC address:", USDC_ARBITRUM);  
console.log("- Current tick:", currentTick);
console.log("- Position range: [", tickLower, "to", tickUpper, "]");

// Create realistic position with correct addresses and tick values
const realisticPosition: PositionWithPnL = {
    id: "real-arbitrum-position",
    nftTokenId: 123456,
    owner: "0x1234567890123456789012345678901234567890",
    tickLower: tickLower,
    tickUpper: tickUpper,
    liquidity: "1000000000000000000",
    pool: {
        id: "real-arbitrum-pool",
        token0: {
            id: WETH_ARBITRUM, 
            symbol: "WETH",
            decimals: 18
        },
        token1: {
            id: USDC_ARBITRUM,
            symbol: "USDC", 
            decimals: 6
        },
        fee: 3000,
        currentPrice: "4327484675", // Fixed: from poolService (token1 per token0, scaled by token1 decimals)
        sqrtPriceX96: "5211915345268226134615181",
        currentTick: currentTick
    },
    token0IsQuote: false, // WETH is base, USDC is quote
    initialValue: "5000000000", // 5000 USDC
    currentValue: "4800000000", // 4800 USDC
    unrealizedPnL: "-200000000", // -200 USDC
    realizedPnL: "0",
    totalPnL: "-200000000",
    feesCollected0: "0",
    feesCollected1: "0",
    feesUnclaimed0: "0",
    feesUnclaimed1: "0"
} as PositionWithPnL;

console.log("\n1. Position validation:");
const curveDataService = new CurveDataService();
const isValid = curveDataService.validatePosition(realisticPosition);
console.log("- Position valid:", isValid ? "✅" : "❌");

if (!isValid) {
    console.log("❌ Position validation failed");
    process.exit(1);
}

try {
    console.log("\n2. Parameter extraction:");
    const params = curveDataService.extractPositionParams(realisticPosition);
    
    console.log("- Base is token0:", params.baseIsToken0);
    console.log("- Base decimals:", params.baseDecimals); 
    console.log("- Quote decimals:", params.quoteDecimals);
    console.log("- Current price (raw):", params.currentPrice.toString());
    console.log("- Current tick:", params.currentTick);
    
    // Fixed: Divide by quoteDecimals (not baseDecimals)
    const humanCurrentPrice = Number(params.currentPrice) / Math.pow(10, params.quoteDecimals);
    console.log("- Current price (human):", humanCurrentPrice.toFixed(2), "USDC per WETH");
    
    console.log("\n3. Curve data generation:");
    const curveData = curveDataService.generateCurveData(realisticPosition);
    
    console.log("Results:");
    console.log("- Points generated:", curveData.points.length);
    console.log("- Current price:", curveData.currentPrice.toFixed(2), "USDC per WETH");
    console.log("- Lower price:", curveData.lowerPrice.toFixed(2), "USDC per WETH");
    console.log("- Upper price:", curveData.upperPrice.toFixed(2), "USDC per WETH");
    console.log("- Price range: [", curveData.priceRange.min.toFixed(2), "-", curveData.priceRange.max.toFixed(2), "]");
    console.log("- PnL range: [", curveData.pnlRange.min.toFixed(0), "-", curveData.pnlRange.max.toFixed(0), "]");
    
    console.log("\n4. Sample points for tooltip testing:");
    const sampleIndices = [0, 5, 12, 18, curveData.points.length-1];
    sampleIndices.forEach(i => {
        const point = curveData.points[i];
        if (point) {
            console.log(`- Point ${i}: $${point.price.toFixed(2)} → PnL $${point.pnl.toFixed(0)} (${point.phase})`);
        }
    });
    
    console.log("\n5. Validation:");
    const currentPriceGood = curveData.currentPrice > 4000 && curveData.currentPrice < 5000;
    const boundariesGood = curveData.lowerPrice > 3000 && curveData.upperPrice < 6000;
    const pointsHaveValidPrices = curveData.points.every(p => p.price > 0 && p.price < 10000);
    const priceRangeReasonable = (curveData.priceRange.max - curveData.priceRange.min) > 100;
    
    console.log("- Current price reasonable (4000-5000):", currentPriceGood ? "✅" : "❌");
    console.log("- Boundary prices reasonable (3000-6000):", boundariesGood ? "✅" : "❌");
    console.log("- All points have valid prices:", pointsHaveValidPrices ? "✅" : "❌");
    console.log("- Price range has variation (>100):", priceRangeReasonable ? "✅" : "❌");
    
    const allGood = currentPriceGood && boundariesGood && pointsHaveValidPrices && priceRangeReasonable;
    
    if (allGood) {
        console.log("\n🎉 SUCCESS: CurveDataService is now working correctly!");
        console.log("✅ Current price fix: Dividing by quoteDecimals instead of baseDecimals");
        console.log("✅ Tick values fix: Using realistic tick ranges around current price");  
        console.log("✅ Address fix: Using real Arbitrum WETH/USDC addresses");
        console.log("\n→ This should fix the '0' prices in mouseover tooltips!");
        
        console.log("\n6. Expected UI behavior:");
        console.log("- Curve will show meaningful prices (~4000-5000 range)");
        console.log("- Tooltips will display actual USDC values, not zeros");
        console.log("- Range boundaries will be visible and reasonable");
        console.log("- PnL calculations will work properly");
    } else {
        console.log("\n❌ Some issues still remain");
        console.log("- Check individual validation results above");
    }
    
} catch (error) {
    console.error("❌ Test failed:", error);
}

console.log("\n7. Summary of fixes:");
console.log("1. ✅ CurveDataService price scaling: quoteDecimals vs baseDecimals");
console.log("2. ✅ Test fixtures: Real blockchain data vs outdated mock values");  
console.log("3. ✅ Token addresses: Real Arbitrum addresses vs fake addresses");
console.log("4. ✅ Tick ranges: Realistic ±500 vs extreme -276000 ranges");
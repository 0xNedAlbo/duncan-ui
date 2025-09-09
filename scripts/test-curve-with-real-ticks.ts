#!/usr/bin/env tsx

/**
 * Test CurveDataService with real blockchain tick values
 */

import { CurveDataService } from '../src/services/positions/curveDataService';
import type { PositionWithPnL } from '../src/services/positions/positionService';

console.log("=== Testing CurveDataService with Real Tick Values ===");

// Real blockchain data
const currentTick = -192593;
const tickSpacing = 60; // 0.3% fee tier

// Create a realistic range around current tick (±500 ticks = ~3% range)
const tickRange = 500;
const tickLower = currentTick - tickRange; // -193093
const tickUpper = currentTick + tickRange; // -192093

console.log("Real blockchain data:");
console.log("- Current tick:", currentTick);
console.log("- Position range: [", tickLower, "to", tickUpper, "]");
console.log("- Range width:", tickUpper - tickLower, "ticks");

// Mock position with realistic data
const mockPosition: PositionWithPnL = {
    id: "real-test-position",
    nftTokenId: 123456,
    owner: "0x1234567890123456789012345678901234567890",
    tickLower: tickLower,
    tickUpper: tickUpper,
    liquidity: "1000000000000000000",
    pool: {
        id: "real-test-pool",
        token0: {
            id: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
            symbol: "WETH",
            decimals: 18
        },
        token1: {
            id: "0xA0b86a33E542B5C85F3896d2A4Ca7AE8Bfed6a3", // USDC-like 
            symbol: "USDC",
            decimals: 6
        },
        fee: 3000,
        currentPrice: "4327484675", // 4327.48 USDC per WETH (from poolService)
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

const curveDataService = new CurveDataService();

try {
    console.log("\n1. Parameter extraction:");
    const params = curveDataService.extractPositionParams(mockPosition);
    console.log("- Base is token0:", params.baseIsToken0);
    console.log("- Base decimals:", params.baseDecimals, "(WETH)");
    console.log("- Quote decimals:", params.quoteDecimals, "(USDC)");
    console.log("- Current price (raw):", params.currentPrice.toString());
    console.log("- Current tick calculated:", params.currentTick);
    
    const humanCurrentPrice = Number(params.currentPrice) / Math.pow(10, params.quoteDecimals);
    console.log("- Current price (human):", humanCurrentPrice.toFixed(2), "USDC per WETH");
    
    console.log("\n2. Curve data generation:");
    const curveData = curveDataService.generateCurveData(mockPosition);
    
    console.log("Results:");
    console.log("- Points generated:", curveData.points.length);
    console.log("- Current price:", curveData.currentPrice.toFixed(2), "USDC per WETH");
    console.log("- Lower boundary:", curveData.lowerPrice.toFixed(2), "USDC per WETH");
    console.log("- Upper boundary:", curveData.upperPrice.toFixed(2), "USDC per WETH");
    console.log("- Price range: [", curveData.priceRange.min.toFixed(2), ",", curveData.priceRange.max.toFixed(2), "]");
    console.log("- PnL range: [", curveData.pnlRange.min.toFixed(0), ",", curveData.pnlRange.max.toFixed(0), "]");
    
    console.log("\n3. Sample curve points:");
    const samplePoints = [0, Math.floor(curveData.points.length/4), Math.floor(curveData.points.length/2), Math.floor(3*curveData.points.length/4), curveData.points.length-1];
    samplePoints.forEach(i => {
        const point = curveData.points[i];
        if (point) {
            console.log(`- Point ${i}: $${point.price.toFixed(2)} → PnL: $${point.pnl.toFixed(0)} (${point.phase})`);
        }
    });
    
    console.log("\n4. Validation:");
    const priceReasonable = curveData.currentPrice > 1000 && curveData.currentPrice < 10000;
    const rangeReasonable = curveData.lowerPrice > 100 && curveData.upperPrice < 50000;
    const hasVariedPrices = curveData.priceRange.max - curveData.priceRange.min > 100;
    
    console.log("- Current price reasonable:", priceReasonable ? "✅" : "❌");
    console.log("- Range boundaries reasonable:", rangeReasonable ? "✅" : "❌"); 
    console.log("- Price variation sufficient:", hasVariedPrices ? "✅" : "❌");
    
    if (priceReasonable && rangeReasonable && hasVariedPrices) {
        console.log("\n🎉 CurveDataService is working correctly with real tick data!");
        console.log("- Curve will display meaningful prices in tooltips");
        console.log("- Range boundaries are realistic");
        console.log("- PnL calculations should work properly");
    } else {
        console.log("\n❌ Issues still remain");
    }
    
} catch (error) {
    console.error("❌ Test failed:", error);
}

console.log("\n5. Real-world usage:");
console.log("- The fix (dividing by quoteDecimals) should resolve the '0' price issue");
console.log("- Mock test positions should use realistic tick ranges");
console.log("- Current tick -192593 corresponds to WETH prices around $4000-5000");
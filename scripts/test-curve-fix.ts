#!/usr/bin/env tsx

/**
 * Test the CurveDataService fix
 */

import { CurveDataService } from '../src/services/positions/curveDataService';
import type { PositionWithPnL } from '../src/services/positions/positionService';

// Mock position with realistic data
const mockPosition: PositionWithPnL = {
    id: "test-position",
    nftTokenId: 123456,
    owner: "0x1234567890123456789012345678901234567890",
    tickLower: -276320, 
    tickUpper: -276200,
    liquidity: "1000000000000000000",
    pool: {
        id: "test-pool",
        token0: {
            id: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
            symbol: "WETH",
            decimals: 18
        },
        token1: {
            id: "0xA0b86a33E542B5C85F3896d2A4Ca7AE8Bfed6a2", // USDC-like 
            symbol: "USDC",
            decimals: 6
        },
        fee: 3000,
        currentPrice: "4327484675", // 4327.48 USDC per WETH
        sqrtPriceX96: "5211915345268226134615181",
        currentTick: -202890
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

console.log("Testing CurveDataService after fix:");
console.log("==================================");

const curveDataService = new CurveDataService();

try {
    // Test parameter extraction
    const params = curveDataService.extractPositionParams(mockPosition);
    console.log("Extracted parameters:");
    console.log("- Current price (raw):", params.currentPrice.toString());
    console.log("- Quote decimals:", params.quoteDecimals);
    console.log("- Base decimals:", params.baseDecimals);
    
    const humanCurrentPrice = Number(params.currentPrice) / Math.pow(10, params.quoteDecimals);
    console.log("- Current price (human):", humanCurrentPrice.toFixed(2), "USDC per WETH");
    
    // Test curve data generation
    console.log("\nGenerating curve data...");
    const curveData = curveDataService.generateCurveData(mockPosition);
    
    console.log("\nCurve data results:");
    console.log("- Points generated:", curveData.points.length);
    console.log("- Current price:", curveData.currentPrice.toFixed(2));
    console.log("- Lower price:", curveData.lowerPrice.toFixed(2)); 
    console.log("- Upper price:", curveData.upperPrice.toFixed(2));
    console.log("- Price range:", curveData.priceRange.min.toFixed(2), "to", curveData.priceRange.max.toFixed(2));
    console.log("- PnL range:", curveData.pnlRange.min.toFixed(0), "to", curveData.pnlRange.max.toFixed(0));
    
    // Sample a few points to verify they have reasonable prices
    console.log("\nSample curve points:");
    curveData.points.slice(0, 5).forEach((point, i) => {
        console.log(`- Point ${i}: price=${point.price.toFixed(2)}, pnl=${point.pnl.toFixed(0)}, phase=${point.phase}`);
    });
    
    // Validation
    const pricesLookGood = curveData.currentPrice > 1000 && curveData.currentPrice < 10000;
    const hasVariedPrices = curveData.points.some(p => p.price > 0);
    
    console.log("\nValidation:");
    console.log("- Current price reasonable (1000-10000):", pricesLookGood ? "✅" : "❌");
    console.log("- Points have non-zero prices:", hasVariedPrices ? "✅" : "❌");
    console.log("- Price range width:", (curveData.priceRange.max - curveData.priceRange.min).toFixed(2));
    
    if (pricesLookGood && hasVariedPrices) {
        console.log("\n🎉 Fix successful! Prices are now displaying correctly.");
    } else {
        console.log("\n❌ Issue still persists.");
    }
    
} catch (error) {
    console.error("❌ Test failed:", error);
}
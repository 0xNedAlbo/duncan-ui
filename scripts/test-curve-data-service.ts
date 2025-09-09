#!/usr/bin/env tsx

/**
 * Test CurveDataService integration with new price functions
 */

import { CurveDataService } from '../src/services/positions/curveDataService';
import type { PositionWithPnL } from '../src/services/positions/positionService';

// Mock position data for testing
const mockPosition: PositionWithPnL = {
    id: "test-position",
    nftTokenId: 123456,
    owner: "0x1234567890123456789012345678901234567890",
    tickLower: -276320, // ~0.05 for ETH/USDC
    tickUpper: -276200, // ~0.051 for ETH/USDC  
    liquidity: "1000000000000000000", // 1 unit of liquidity
    pool: {
        id: "test-pool",
        token0: {
            id: "0xA0b86a33E6441B8F70C2d0F2f5d3b3a3E6441B8F",
            symbol: "WETH",
            decimals: 18
        },
        token1: {
            id: "0xA0b86a33E6441B8F70C2d0F2f5d3b3a3E6441B8G", 
            symbol: "USDC",
            decimals: 6
        },
        fee: 3000,
        currentPrice: "4327484675", // ~4327 USDC per WETH (from our test)
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

console.log("Testing CurveDataService integration:");
console.log("=====================================");

const curveDataService = new CurveDataService();

try {
    // Test position validation
    const isValid = curveDataService.validatePosition(mockPosition);
    console.log("Position validation:", isValid ? "✅ Valid" : "❌ Invalid");
    
    if (!isValid) {
        console.log("Position validation failed - stopping test");
        process.exit(1);
    }
    
    // Test parameter extraction
    const params = curveDataService.extractPositionParams(mockPosition);
    console.log("\nExtracted parameters:");
    console.log("- Base is token0:", params.baseIsToken0);
    console.log("- Base decimals:", params.baseDecimals);
    console.log("- Quote decimals:", params.quoteDecimals);
    console.log("- Current price (raw):", params.currentPrice.toString());
    console.log("- Current tick:", params.currentTick);
    console.log("- Tick range:", params.tickLower, "to", params.tickUpper);
    
    // Test curve data generation
    const curveData = curveDataService.generateCurveData(mockPosition);
    console.log("\nCurve data generation:");
    console.log("- Points generated:", curveData.points.length);
    console.log("- Current price (human):", curveData.currentPrice.toFixed(2));
    console.log("- Lower price (human):", curveData.lowerPrice.toFixed(2));
    console.log("- Upper price (human):", curveData.upperPrice.toFixed(2));
    console.log("- PnL range:", curveData.pnlRange.min.toFixed(2), "to", curveData.pnlRange.max.toFixed(2));
    
    // Validate price ranges make sense
    const pricesLookReasonable = curveData.currentPrice > 1000 && curveData.currentPrice < 10000;
    console.log("- Price range reasonable:", pricesLookReasonable ? "✅" : "❌");
    
    // Check phase distribution
    const phases = curveData.points.reduce((acc, point) => {
        acc[point.phase] = (acc[point.phase] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    
    console.log("\nPhase distribution:");
    console.log("- Below range:", phases['below'] || 0, "points");
    console.log("- In range:", phases['in-range'] || 0, "points");
    console.log("- Above range:", phases['above'] || 0, "points");
    
    console.log("\n✅ CurveDataService integration test completed successfully!");
    
} catch (error) {
    console.error("❌ CurveDataService integration test failed:", error);
    process.exit(1);
}
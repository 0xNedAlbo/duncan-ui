#!/usr/bin/env tsx

/**
 * Test tickToPrice function with real blockchain data
 */

import { tickToPrice, tickToSqrtRatioX96 } from '../src/lib/utils/uniswap-v3/price';
import JSBI from 'jsbi';

console.log("=== Testing tickToPrice with Real Blockchain Data ===");

// Real data from blockchain
const realTick = -192593;
const realSqrtPriceX96 = JSBI.BigInt("5211915345268226134615181");
const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"; // token0 (lower address)
const USDC = "0xA0b86a33E542B5C85F3896d2A4Ca7AE8Bfed6a2"; // token1 (higher address)

console.log("Real blockchain data:");
console.log("- Current tick:", realTick);
console.log("- sqrtPriceX96:", realSqrtPriceX96.toString());
console.log("- token0 (WETH):", WETH);
console.log("- token1 (USDC):", USDC);
console.log("- Expected: ~4327 USDC per WETH");

console.log("\n1. Verify tick -> sqrtRatioX96 conversion:");
const calculatedSqrtRatio = tickToSqrtRatioX96(realTick);
console.log("- Our function result:", calculatedSqrtRatio.toString());
console.log("- Real sqrtPriceX96:   ", realSqrtPriceX96.toString());
console.log("- Match:", calculatedSqrtRatio.toString() === realSqrtPriceX96.toString() ? "✅" : "❌");

console.log("\n2. Test tickToPrice function:");
try {
    // Since WETH is base and USDC is quote, and we want USDC per WETH
    const result = tickToPrice(realTick, WETH, USDC, 18);
    console.log("- Raw result:", result.toString());
    
    // Convert to human readable (USDC has 6 decimals)
    const humanReadable = Number(result) / Math.pow(10, 6);
    console.log("- Human readable:", humanReadable.toFixed(2), "USDC per WETH");
    
    // Check if it's in the expected range (~4327)
    const expectedPrice = 4327.48;
    const isReasonable = Math.abs(humanReadable - expectedPrice) / expectedPrice < 0.01; // Within 1%
    console.log("- Expected:", expectedPrice);
    console.log("- Actual:", humanReadable.toFixed(2)); 
    console.log("- Within 1%:", isReasonable ? "✅" : "❌");
    
    if (!isReasonable) {
        console.log("❌ tickToPrice function is returning incorrect values!");
        console.log("- The test fixtures need to be updated");
        console.log("- The function logic might be wrong");
        
        // Let's also test token ordering
        console.log("\nToken ordering check:");
        const baseIsToken0 = BigInt(WETH) < BigInt(USDC);
        console.log("- WETH < USDC:", baseIsToken0);
        console.log("- Expected: WETH should be token0 (lower address)");
        
        if (!baseIsToken0) {
            console.log("❌ Token ordering issue - WETH should be lower address");
        }
    } else {
        console.log("✅ tickToPrice function is working correctly!");
    }
    
} catch (error) {
    console.error("❌ Error calling tickToPrice:", error);
}

console.log("\n3. What the test should expect:");
console.log("- Use tick:", realTick);
console.log("- Expect result around:", "4327480000", "(4327.48 * 10^6)");
console.log("- Range check: 4000-5000 USDC per WETH");
console.log("- NOT 1000-3000 as in current test!");
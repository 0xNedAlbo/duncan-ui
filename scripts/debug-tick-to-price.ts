#!/usr/bin/env tsx

/**
 * Debug tick to price conversion in CurveDataService
 */

import { tickToPrice } from '../src/lib/utils/uniswap-v3/price';

console.log("=== Debugging Tick to Price Conversion ===");

// Test data from our mock position
const tickLower = -276320;
const tickUpper = -276200;
const baseTokenAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"; // WETH
const quoteTokenAddress = "0xA0b86a33E542B5C85F3896d2A4Ca7AE8Bfed6a2"; // USDC
const baseDecimals = 18; // WETH
const quoteDecimals = 6;  // USDC

console.log("Input parameters:");
console.log("- tickLower:", tickLower);
console.log("- tickUpper:", tickUpper);
console.log("- baseTokenAddress:", baseTokenAddress);
console.log("- quoteTokenAddress:", quoteTokenAddress);
console.log("- baseDecimals:", baseDecimals);
console.log("- quoteDecimals:", quoteDecimals);

try {
    console.log("\nTesting tickToPrice function:");
    
    const lowerPrice = tickToPrice(tickLower, baseTokenAddress, quoteTokenAddress, baseDecimals);
    const upperPrice = tickToPrice(tickUpper, baseTokenAddress, quoteTokenAddress, baseDecimals);
    
    console.log("Raw results:");
    console.log("- lowerPrice (raw):", lowerPrice.toString());
    console.log("- upperPrice (raw):", upperPrice.toString());
    
    console.log("\nHuman readable (divided by quoteDecimals = 10^6):");
    console.log("- lowerPrice (human):", (Number(lowerPrice) / Math.pow(10, quoteDecimals)).toFixed(8));
    console.log("- upperPrice (human):", (Number(upperPrice) / Math.pow(10, quoteDecimals)).toFixed(8));
    
    console.log("\nToken ordering check:");
    const baseIsToken0 = BigInt(baseTokenAddress) < BigInt(quoteTokenAddress);
    console.log("- baseIsToken0:", baseIsToken0);
    console.log("- This means:", baseIsToken0 ? "base=token0, quote=token1" : "base=token1, quote=token0");
    
} catch (error) {
    console.error("Error:", error);
}

console.log("\nExpected behavior:");
console.log("- tickToPrice should return quote per base (USDC per WETH)");
console.log("- Result should be scaled by quoteDecimals (6)");
console.log("- Reasonable range: ~50-10000 USDC per WETH for ticks around current price");
#!/usr/bin/env tsx

/**
 * Debug specific tick values used in the position
 */

import { tickToPrice } from '../src/lib/utils/uniswap-v3/price';

console.log("=== Debugging Specific Position Tick Values ===");

// Real values from the test
const currentTick = -192593;
const tickLower = -193093;  // current - 500
const tickUpper = -192093;  // current + 500

const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"; 
const USDC = "0xA0b86a33E542B5C85F3896d2A4Ca7AE8Bfed6a3"; 
const baseDecimals = 18;
const quoteDecimals = 6;

console.log("Testing these specific ticks:");
console.log("- tickLower:", tickLower);
console.log("- currentTick:", currentTick);
console.log("- tickUpper:", tickUpper);
console.log("");

console.log("Token setup:");
console.log("- WETH (base):", WETH);
console.log("- USDC (quote):", USDC);
console.log("- Want: USDC per WETH");

const baseIsToken0 = BigInt(WETH) < BigInt(USDC);
console.log("- baseIsToken0:", baseIsToken0);

try {
    console.log("\nTesting each tick:");
    
    // Test current tick
    console.log("\n1. Current tick:", currentTick);
    const currentPrice = tickToPrice(currentTick, WETH, USDC, baseDecimals);
    console.log("- Raw result:", currentPrice.toString());
    console.log("- Human readable:", (Number(currentPrice) / Math.pow(10, quoteDecimals)).toFixed(2));
    
    // Test lower tick  
    console.log("\n2. Lower tick:", tickLower);
    const lowerPrice = tickToPrice(tickLower, WETH, USDC, baseDecimals);
    console.log("- Raw result:", lowerPrice.toString());
    console.log("- Human readable:", (Number(lowerPrice) / Math.pow(10, quoteDecimals)).toFixed(2));
    
    // Test upper tick
    console.log("\n3. Upper tick:", tickUpper);  
    const upperPrice = tickToPrice(tickUpper, WETH, USDC, baseDecimals);
    console.log("- Raw result:", upperPrice.toString());
    console.log("- Human readable:", (Number(upperPrice) / Math.pow(10, quoteDecimals)).toFixed(2));
    
    console.log("\n4. Analysis:");
    const currentHuman = Number(currentPrice) / Math.pow(10, quoteDecimals);
    const lowerHuman = Number(lowerPrice) / Math.pow(10, quoteDecimals);
    const upperHuman = Number(upperPrice) / Math.pow(10, quoteDecimals);
    
    console.log("Expected: lower < current < upper");
    console.log("Actual:", lowerHuman.toFixed(2), "<", currentHuman.toFixed(2), "<", upperHuman.toFixed(2));
    
    const orderCorrect = lowerHuman < currentHuman && currentHuman < upperHuman;
    const rangeReasonable = lowerHuman > 100 && upperHuman < 100000;
    
    console.log("- Order correct:", orderCorrect ? "✅" : "❌");
    console.log("- Range reasonable:", rangeReasonable ? "✅" : "❌");
    
    if (!rangeReasonable) {
        console.log("\n🔍 Issue diagnosis:");
        console.log("- If all values are astronomical, there's likely a decimal scaling issue");
        console.log("- If order is wrong, there may be a token ordering issue");
        console.log("- Negative ticks should give reasonable prices for current ETH levels");
    }
    
} catch (error) {
    console.error("❌ Error:", error);
}

console.log("\nReference:");
console.log("- Current ETH price ~$4000-5000");
console.log("- tickLower should be slightly lower price (higher USDC/ETH)");
console.log("- tickUpper should be slightly higher price (lower USDC/ETH)");
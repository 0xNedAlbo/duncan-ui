#!/usr/bin/env tsx

/**
 * Find reasonable tick values for WETH/USDC around 4327 price
 */

import { tickToPrice, priceToTick } from '../src/lib/utils/uniswap-v3/price';

console.log("=== Finding Reasonable Ticks for WETH/USDC ===");

const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"; 
const USDC = "0xA0b86a33E542B5C85F3896d2A4Ca7AE8Bfed6a2"; 
const baseDecimals = 18; // WETH
const quoteDecimals = 6;  // USDC
const tickSpacing = 60; // 0.3% fee tier

// Current price: 4327.48 USDC per WETH
const currentPrice = BigInt("4327480000"); // 4327.48 * 10^6 (scaled by USDC decimals)

console.log("Target setup:");
console.log("- Current price: 4327.48 USDC per WETH");
console.log("- Scaled price:", currentPrice.toString());
console.log("- Want tick range around this price");

try {
    // Convert current price to tick
    console.log("\n1. Converting current price to tick:");
    const currentTick = priceToTick(currentPrice, tickSpacing, WETH, USDC, baseDecimals);
    console.log("- Current tick:", currentTick);
    
    // Create a reasonable range around current tick
    const tickRange = 1000; // +/- 1000 ticks  
    const tickLower = currentTick - tickRange;
    const tickUpper = currentTick + tickRange;
    
    console.log("\n2. Reasonable tick range:");
    console.log("- tickLower:", tickLower);
    console.log("- tickUpper:", tickUpper);
    
    // Convert back to prices
    console.log("\n3. Converting ticks back to prices:");
    const lowerPrice = tickToPrice(tickLower, WETH, USDC, baseDecimals);
    const upperPrice = tickToPrice(tickUpper, WETH, USDC, baseDecimals);
    
    console.log("Raw results:");
    console.log("- lowerPrice (raw):", lowerPrice.toString());
    console.log("- upperPrice (raw):", upperPrice.toString());
    
    console.log("\nHuman readable:");
    const lowerHuman = Number(lowerPrice) / Math.pow(10, quoteDecimals);
    const upperHuman = Number(upperPrice) / Math.pow(10, quoteDecimals);
    console.log("- lowerPrice:", lowerHuman.toFixed(2), "USDC per WETH");
    console.log("- upperPrice:", upperHuman.toFixed(2), "USDC per WETH");
    
    const reasonable = lowerHuman > 1000 && lowerHuman < 10000 && upperHuman > 1000 && upperHuman < 10000;
    console.log("- Range looks reasonable:", reasonable ? "✅" : "❌");
    
    if (reasonable) {
        console.log("\n✅ These ticks should work for testing CurveDataService");
        console.log(`- Use tickLower: ${tickLower}`);  
        console.log(`- Use tickUpper: ${tickUpper}`);
    }
    
} catch (error) {
    console.error("Error:", error);
}

console.log("\nNotes:");
console.log("- Original ticks (-276320, -276200) were likely incorrect");
console.log("- Should use ticks close to the current price tick");
console.log("- Uniswap V3 tick math: price = 1.0001^tick");
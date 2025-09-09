#!/usr/bin/env tsx

/**
 * Debug tick to price conversion with correct addresses
 */

import { tickToPrice } from '../src/lib/utils/uniswap-v3/price';

console.log("=== Debugging Tick to Price with Correct Addresses ===");

// Use real WETH/USDC addresses in correct order
const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"; // Higher address
const USDC = "0xA0b86a33E542B5C85F3896d2A4Ca7AE8Bfed6a2"; // Lower address

// In Uniswap pools, token0 = lower address, token1 = higher address
const token0Address = USDC; // token0 = USDC (lower address)
const token1Address = WETH; // token1 = WETH (higher address)

console.log("Correct token ordering:");
console.log("- token0 (lower):", token0Address, "(USDC)");
console.log("- token1 (higher):", token1Address, "(WETH)");

// For a WETH/USDC position where we want WETH as base and USDC as quote:
const baseTokenAddress = WETH; // We want WETH as base 
const quoteTokenAddress = USDC; // We want USDC as quote
const baseDecimals = 18; // WETH
const quoteDecimals = 6;  // USDC

const tickLower = -276320; // Very tight range around current price
const tickUpper = -276200;

console.log("\nDesired setup:");
console.log("- base (WETH):", baseTokenAddress);
console.log("- quote (USDC):", quoteTokenAddress);
console.log("- Want: USDC per WETH (quote per base)");

console.log("\nToken ordering check:");
const baseIsToken0 = BigInt(baseTokenAddress) < BigInt(quoteTokenAddress);
console.log("- baseIsToken0:", baseIsToken0, "(WETH < USDC?)", baseIsToken0 ? "YES" : "NO");

if (baseIsToken0) {
    console.log("- This means: base=token0 (WETH), quote=token1 (USDC)");  
    console.log("- tickToPrice will return token1/token0 = USDC/WETH ✅");
} else {
    console.log("- This means: base=token1 (WETH), quote=token0 (USDC)");
    console.log("- tickToPrice will return token0/token1 = USDC/WETH ✅");
}

try {
    console.log("\nTesting tickToPrice:");
    
    const lowerPrice = tickToPrice(tickLower, baseTokenAddress, quoteTokenAddress, baseDecimals);
    const upperPrice = tickToPrice(tickUpper, baseTokenAddress, quoteTokenAddress, baseDecimals);
    
    console.log("Raw results:");
    console.log("- lowerPrice (raw):", lowerPrice.toString());
    console.log("- upperPrice (raw):", upperPrice.toString());
    
    console.log("\nConverted to human readable:");
    const lowerHuman = Number(lowerPrice) / Math.pow(10, quoteDecimals);
    const upperHuman = Number(upperPrice) / Math.pow(10, quoteDecimals);
    console.log("- lowerPrice:", lowerHuman.toFixed(8), "USDC per WETH");
    console.log("- upperPrice:", upperHuman.toFixed(8), "USDC per WETH");
    
    const reasonable = lowerHuman > 0.001 && lowerHuman < 100000 && upperHuman > 0.001 && upperHuman < 100000;
    console.log("- Prices look reasonable:", reasonable ? "✅" : "❌");
    
} catch (error) {
    console.error("Error:", error);
}

console.log("\nConclusion:");
console.log("If prices still look wrong, the issue might be:");
console.log("1. The tick range is too far from current price");
console.log("2. The decimal scaling in the tickToPrice function");
console.log("3. The address comparison logic");
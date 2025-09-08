#!/usr/bin/env tsx

/**
 * Calculate currentPrice from sqrtPriceX96
 */

import { sqrtPriceX96ToPrice } from '../src/lib/contracts/uniswapV3Pool';

// From the database inspection
const sqrtPriceX96 = BigInt("5217497569124140394546365");
const token0Decimals = 18; // WETH
const token1Decimals = 6;  // USDC

console.log("Calculating price from sqrtPriceX96:");
console.log("=".repeat(50));
console.log("Input:");
console.log("- sqrtPriceX96:", sqrtPriceX96.toString());
console.log("- token0 (WETH) decimals:", token0Decimals);
console.log("- token1 (USDC) decimals:", token1Decimals);
console.log("");

try {
    const price = sqrtPriceX96ToPrice(sqrtPriceX96, token0Decimals, token1Decimals);
    
    console.log("Result:");
    console.log("- Price (raw):", price.toString());
    console.log("- This represents: 1 WETH = X USDC (in smallest unit)");
    
    // Convert to human readable
    const priceNumber = Number(price) / Math.pow(10, token1Decimals);
    console.log("- Human readable:", priceNumber.toFixed(2), "USDC per WETH");
    
    console.log("");
    console.log("Expected value according to user: 4280430883");
    console.log("Match?", price.toString() === "4280430883");
    
} catch (error) {
    console.error("Error calculating price:", error);
}
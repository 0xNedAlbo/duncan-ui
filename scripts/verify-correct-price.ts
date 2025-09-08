#!/usr/bin/env tsx

/**
 * Verify the correct price calculation
 */

const sqrtPriceX96 = BigInt("5217497569124140394546365");
const decimals0 = 18; // WETH
const decimals1 = 6;  // USDC

console.log("Correct price calculation for WETH/USDC:");
console.log("=".repeat(50));

// Step 1: Square the sqrtPrice
const sqrtPriceSquared = sqrtPriceX96 * sqrtPriceX96;
console.log("sqrtPriceSquared:", sqrtPriceSquared.toString());

// Step 2: Calculate Q192
const Q192 = 2n ** 192n;

// Step 3: The correct approach for negative decimal difference
// We need to multiply first to preserve precision, then divide
const decimalDifference = decimals1 - decimals0; // -12

// Correct calculation: multiply by 10^decimals1, divide by Q192, then divide by 10^decimals0
// This preserves precision during the calculation
const price = (sqrtPriceSquared * (10n ** BigInt(decimals1))) / Q192 / (10n ** BigInt(decimals0));

console.log("Calculated price:", price.toString());
console.log("Expected price:  ", "4280430883");
console.log("Match?", price.toString() === "4280430883");

// Human readable
const priceInUSDC = Number(price) / Math.pow(10, decimals1);
console.log("");
console.log("Human readable: 1 WETH =", priceInUSDC.toFixed(2), "USDC");

// Also verify with a different approach
console.log("");
console.log("Alternative verification:");
// Price = (sqrtPrice / 2^96)^2 * 10^(decimals1-decimals0)
const sqrtPriceFloat = Number(sqrtPriceX96) / (2 ** 96);
const priceFloat = sqrtPriceFloat * sqrtPriceFloat;
const adjustedPrice = priceFloat * Math.pow(10, decimalDifference);
console.log("Float calculation: 1 WETH =", (adjustedPrice * Math.pow(10, decimals1)).toFixed(0), "USDC (smallest unit)");
console.log("Float calculation: 1 WETH =", adjustedPrice.toFixed(2), "USDC");
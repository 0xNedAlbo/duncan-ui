#!/usr/bin/env tsx

/**
 * Debug price calculation step by step
 */

const sqrtPriceX96 = BigInt("5217497569124140394546365");
const decimals0 = 18; // WETH
const decimals1 = 6;  // USDC

console.log("Debugging sqrtPriceX96ToPrice calculation:");
console.log("=".repeat(50));

// Step 1: Square the sqrtPrice
const sqrtPriceSquared = sqrtPriceX96 * sqrtPriceX96;
console.log("Step 1 - Square the sqrtPrice:");
console.log("  sqrtPriceX96:", sqrtPriceX96.toString());
console.log("  sqrtPriceSquared:", sqrtPriceSquared.toString());
console.log("");

// Step 2: Calculate Q192
const Q192 = 2n ** 192n;
console.log("Step 2 - Calculate Q192 (2^192):");
console.log("  Q192:", Q192.toString());
console.log("");

// Step 3: Calculate decimal difference
const decimalDifference = decimals1 - decimals0;
console.log("Step 3 - Calculate decimal difference:");
console.log("  decimals1 (USDC):", decimals1);
console.log("  decimals0 (WETH):", decimals0);
console.log("  decimalDifference:", decimalDifference);
console.log("");

// Step 4: Apply decimal adjustment
console.log("Step 4 - Apply decimal adjustment:");
if (decimalDifference >= 0) {
    console.log("  Path: decimalDifference >= 0");
    const decimalAdjustment = 10n ** BigInt(decimalDifference);
    console.log("  decimalAdjustment (10^" + decimalDifference + "):", decimalAdjustment.toString());
    const price = (sqrtPriceSquared * decimalAdjustment) / Q192;
    console.log("  price = (sqrtPriceSquared * decimalAdjustment) / Q192");
    console.log("  price:", price.toString());
} else {
    console.log("  Path: decimalDifference < 0");
    const decimalAdjustment = 10n ** BigInt(-decimalDifference);
    console.log("  decimalAdjustment (10^" + (-decimalDifference) + "):", decimalAdjustment.toString());
    
    const denominator = Q192 * decimalAdjustment;
    console.log("  denominator = Q192 * decimalAdjustment:", denominator.toString());
    
    const price = sqrtPriceSquared / denominator;
    console.log("  price = sqrtPriceSquared / denominator");
    console.log("  price:", price.toString());
    
    // Check if division is causing truncation
    console.log("");
    console.log("Division check:");
    console.log("  sqrtPriceSquared < denominator?", sqrtPriceSquared < denominator);
    if (sqrtPriceSquared < denominator) {
        console.log("  ⚠️ WARNING: Integer division will result in 0!");
        console.log("  sqrtPriceSquared:", sqrtPriceSquared.toString());
        console.log("  denominator:      ", denominator.toString());
    }
}

console.log("");
console.log("Expected value: 4280430883");

// Try alternative calculation
console.log("");
console.log("Alternative calculation (preserve precision):");
// Price = sqrtPrice^2 / 2^192 * 10^(decimals1-decimals0)
// For WETH/USDC: price in USDC per WETH
// We need to preserve precision when decimals0 > decimals1

// Calculate raw price without decimal adjustment first
const rawPrice = sqrtPriceSquared / Q192;
console.log("  Raw price (sqrtPriceSquared / Q192):", rawPrice.toString());

// This gives us price in token1/token0 with original decimals
// Now adjust for decimal difference
if (decimalDifference < 0) {
    // Need to divide by 10^12 to convert from 18 decimals to 6 decimals
    const adjustedPrice = rawPrice / (10n ** BigInt(-decimalDifference));
    console.log("  Adjusted price (divide by 10^12):", adjustedPrice.toString());
}
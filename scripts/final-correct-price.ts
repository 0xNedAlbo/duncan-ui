#!/usr/bin/env tsx

/**
 * Final correct price calculation with full precision
 */

const sqrtPriceX96 = BigInt("5217497569124140394546365");
const Q192 = 2n ** 192n;
const Q96 = 2n ** 96n;
const token0Decimals = 18; // WETH
const token1Decimals = 6;  // USDC

console.log("Correct BigInt calculation with full precision:");
console.log("=".repeat(50));

// The key: we need to scale up MORE before dividing to preserve all digits
const sqrtP2 = sqrtPriceX96 ** 2n;

// Original broken approach: multiply by 10^12, but that's not enough
// We need to multiply by a larger factor to preserve the fractional parts

// Since we want the result in USDC smallest units (10^6), 
// and we're dealing with 18-6=12 decimal difference,
// Let's scale by 10^(12+6) = 10^18 to get the full precision
const scaleFactor = 10n ** 18n;
const price = (sqrtP2 * scaleFactor) / Q192 / (10n ** 6n);

console.log("Result:", price.toString());
console.log("Expected:", "4280430883");

// Human readable
const humanPrice = Number(price) / 1e6;
console.log("Human readable: 1 WETH =", humanPrice.toFixed(2), "USDC");

// Alternative: Let's do it exactly as the float calculation showed
// We need to preserve 6 more decimals for USDC units
console.log("\nAlternative calculation (preserving all decimals):");

// Method: multiply by 10^(token0Decimals) to preserve all precision
const priceWithFullPrecision = (sqrtP2 * (10n ** BigInt(token0Decimals))) / Q192;
console.log("Price with token0 decimals scale:", priceWithFullPrecision.toString());

// Now convert to token1 decimals (divide by 10^12 to go from 18 to 6 decimals)
const finalPrice = priceWithFullPrecision / (10n ** BigInt(token0Decimals - token1Decimals));
console.log("Final price in USDC units:", finalPrice.toString());
console.log("Match with expected?", finalPrice.toString() === "4280430883");
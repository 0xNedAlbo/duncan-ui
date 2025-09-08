#!/usr/bin/env tsx

/**
 * Test price calculation with correct decimal handling
 */

const sqrtPriceX96 = BigInt("5217497569124140394546365");
const Q192 = 2n ** 192n;
const token0Decimals = 18; // WETH
const token1Decimals = 6;  // USDC

console.log("Understanding the price calculation:");
console.log("=".repeat(50));

// The key insight: sqrtPriceX96 represents sqrt(token1/token0) * 2^96
// So price = (sqrtPriceX96/2^96)^2 = token1/token0

// Step 1: Square the value
const sqrtP2 = sqrtPriceX96 ** 2n;
console.log("sqrtP2:", sqrtP2.toString());

// Step 2: This is now (token1/token0) * 2^192
// We need to divide by 2^192 to get the raw ratio
const rawRatio = sqrtP2 / Q192;
console.log("Raw ratio (token1/token0):", rawRatio.toString());
console.log("This is extremely small because 1 WETH = many USDC but with wrong decimals");

// Step 3: Apply decimal adjustment
// The raw ratio is in terms of smallest units
// 1e18 wei / 1e6 USDC units = need to multiply by 10^12
const dec0 = BigInt(token0Decimals);
const dec1 = BigInt(token1Decimals);

// Method from the correct function:
if (dec0 >= dec1) {
    const pow = 10n ** (dec0 - dec1);
    const price = (sqrtP2 * pow) / Q192;
    console.log("\nCorrect calculation (dec0 >= dec1):");
    console.log("- Power adjustment: 10^" + (dec0 - dec1).toString());
    console.log("- Price = (sqrtP2 * 10^12) / Q192");
    console.log("- Result:", price.toString());
    
    // This gives us USDC per WETH in smallest USDC units
    const humanPrice = Number(price) / Math.pow(10, token1Decimals);
    console.log("- Human readable: 1 WETH =", humanPrice.toFixed(6), "USDC");
}

// Let's also verify by thinking about it differently
console.log("\nAlternative understanding:");
console.log("If sqrtPriceX96 = 5217497569124140394546365");
console.log("Then sqrtPrice = sqrtPriceX96 / 2^96");

const sqrtPrice = Number(sqrtPriceX96) / (2 ** 96);
console.log("sqrtPrice (float):", sqrtPrice);

const priceFloat = sqrtPrice * sqrtPrice;
console.log("price (token1/token0) float:", priceFloat);

// This is USDC/WETH in their native units (6 decimals / 18 decimals)
// To get USDC per 1 WETH, we need to adjust
const adjustedPrice = priceFloat * Math.pow(10, 18 - 6);
console.log("Adjusted price (USDC per WETH):", adjustedPrice.toFixed(6));
console.log("In smallest USDC units:", Math.floor(adjustedPrice * 1e6));

console.log("\nExpected from user: 4280430883");
console.log("That would be:", (4280430883 / 1e6).toFixed(2), "USDC per WETH");
#!/usr/bin/env tsx

/**
 * Debug the new logic step by step
 */

const sqrtPriceX96 = BigInt("5217497569124140394546365");
const token0Decimals = 18; // WETH
const token1Decimals = 6;  // USDC

console.log("Debugging the NEW FIXED calculation:");
console.log("=".repeat(50));

const sqrtPriceSquared = sqrtPriceX96 * sqrtPriceX96;
const Q192 = 2n ** 192n;
const dec0 = BigInt(token0Decimals);
const dec1 = BigInt(token1Decimals);

console.log("Steps:");
console.log("  dec0 (WETH):", dec0.toString());
console.log("  dec1 (USDC):", dec1.toString());

const maxDecimals = dec0 > dec1 ? dec0 : dec1;
console.log("  maxDecimals:", maxDecimals.toString());

const scaledPrice = (sqrtPriceSquared * (10n ** maxDecimals)) / Q192;
console.log("  scaledPrice = (sqrtPriceSquared * 10^" + maxDecimals.toString() + ") / Q192");
console.log("  scaledPrice:", scaledPrice.toString());

console.log("\nAdjustment logic:");
console.log("  maxDecimals > dec1?", maxDecimals > dec1);
console.log("  maxDecimals < dec1?", maxDecimals < dec1);

if (maxDecimals > dec1) {
    const adjustment = 10n ** (maxDecimals - dec1);
    console.log("  adjustment = 10^" + (maxDecimals - dec1).toString() + ":", adjustment.toString());
    const price = scaledPrice / adjustment;
    console.log("  price = scaledPrice / adjustment:", price.toString());
    
    console.log("\n  Division check:");
    console.log("  scaledPrice < adjustment?", scaledPrice < adjustment);
    if (scaledPrice < adjustment) {
        console.log("  ⚠️ STILL TRUNCATING!");
        console.log("  This means we need a DIFFERENT approach entirely");
    }
} else if (maxDecimals < dec1) {
    const adjustment = 10n ** (dec1 - maxDecimals);
    console.log("  adjustment = 10^" + (dec1 - maxDecimals).toString() + ":", adjustment.toString());
    const price = scaledPrice * adjustment;
    console.log("  price = scaledPrice * adjustment:", price.toString());
} else {
    console.log("  price = scaledPrice (no adjustment):", scaledPrice.toString());
}

console.log("\n=== ROOT CAUSE ANALYSIS ===");
console.log("The fundamental issue: The sqrt price represents a very small value");
console.log("For WETH/USDC: 1 WETH = ~4336 USDC, so 1 USDC = ~0.00023 WETH");
console.log("The sqrtPrice encodes the ratio USDC/WETH, which is very small");
console.log("When squared and adjusted for decimals, intermediate results are small");
console.log("");
console.log("CORRECT APPROACH: Don't truncate at all - keep MORE precision");
console.log("Expected result: 4336759547 (represents 4336.759547 USDC per WETH)");
console.log("So we need 9+ decimal places of precision in intermediate calculations");

// Try a much larger scaling factor
console.log("\n=== TRYING LARGER SCALE ===");
const LARGE_SCALE = 10n ** 30n; // Scale by 30 decimals
const veryScaledPrice = (sqrtPriceSquared * LARGE_SCALE) / Q192;
console.log("With 30 decimal scaling:", veryScaledPrice.toString());

// Then scale down appropriately  
const finalResult = veryScaledPrice / (10n ** (30n - dec1));
console.log("Final result (scaled back to USDC decimals):", finalResult.toString());
console.log("This should be close to 4336759547");
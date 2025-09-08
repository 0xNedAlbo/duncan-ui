#!/usr/bin/env tsx

/**
 * Debug the fixed calculation step by step
 */

const sqrtPriceX96 = BigInt("5217497569124140394546365");
const token0Decimals = 18; // WETH
const token1Decimals = 6;  // USDC

console.log("Debugging the FIXED calculation:");
console.log("=".repeat(50));

// Replicate the fixed calculation step by step
const sqrtPriceSquared = sqrtPriceX96 * sqrtPriceX96;
const Q192 = 2n ** 192n;

console.log("Step 1 - Square the sqrtPrice:");
console.log("  sqrtPriceSquared:", sqrtPriceSquared.toString());

console.log("\nStep 2 - Q192:");
console.log("  Q192:", Q192.toString());

const dec0 = BigInt(token0Decimals);
const dec1 = BigInt(token1Decimals);

console.log("\nStep 3 - Decimals:");
console.log("  dec0 (WETH):", dec0.toString());
console.log("  dec1 (USDC):", dec1.toString());

// First scale by token0 decimals to preserve maximum precision
const scaledPrice = (sqrtPriceSquared * (10n ** dec0)) / Q192;
console.log("\nStep 4 - Scale by token0 decimals:");
console.log("  scaledPrice = (sqrtPriceSquared * 10^18) / Q192");
console.log("  scaledPrice:", scaledPrice.toString());

// Then adjust to final token1 decimals
console.log("\nStep 5 - Adjust to token1 decimals:");
console.log("  dec0 >= dec1?", dec0 >= dec1);

if (dec0 >= dec1) {
    const adjustment = 10n ** (dec0 - dec1);
    console.log("  adjustment = 10^" + (dec0 - dec1).toString() + ":", adjustment.toString());
    const price = scaledPrice / adjustment;
    console.log("  price = scaledPrice / adjustment:", price.toString());
    
    // Check if division is causing issue
    console.log("\n  Division check:");
    console.log("  scaledPrice < adjustment?", scaledPrice < adjustment);
    if (scaledPrice < adjustment) {
        console.log("  ⚠️ WARNING: Division will truncate to 0!");
        console.log("  scaledPrice:  ", scaledPrice.toString());
        console.log("  adjustment:   ", adjustment.toString());
        console.log("  Need to avoid this division truncation!");
    }
} else {
    const adjustment = 10n ** (dec1 - dec0);
    console.log("  adjustment = 10^" + (dec1 - dec0).toString() + ":", adjustment.toString());
    const price = scaledPrice * adjustment;
    console.log("  price = scaledPrice * adjustment:", price.toString());
}

// The issue: we need to scale differently to avoid truncation
console.log("\n=== CORRECTED APPROACH ===");
console.log("Issue: After scaling by 10^18, dividing by 10^12 truncates");
console.log("Solution: Scale by smaller amount to preserve the fractional parts");

// Better approach: scale by exactly what we need for the output
// We want result in USDC units (6 decimals)
// So scale the numerator by 10^6 instead of going through 10^18
const betterScaledPrice = (sqrtPriceSquared * (10n ** dec1)) / Q192;
console.log("\nBetter calculation:");
console.log("  betterScaledPrice = (sqrtPriceSquared * 10^6) / Q192");
console.log("  betterScaledPrice:", betterScaledPrice.toString());
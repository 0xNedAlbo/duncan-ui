#!/usr/bin/env tsx

/**
 * Debug the precision calculation step by step
 */

import { Q192 } from '../src/lib/utils/uniswap-v3/constants';

const sqrtPriceX96 = BigInt("40396383607147620851397090925881670");
const token0Decimals = 8;  // WBTC
const token1Decimals = 18; // WETH

console.log("Debugging precision calculation:");
console.log("=".repeat(50));

// Step 1: Calculate sqrtP2
const sqrtP2 = sqrtPriceX96 ** 2n;
console.log("Step 1 - sqrtP2 calculation:");
console.log("- sqrtPriceX96:", sqrtPriceX96.toString());
console.log("- sqrtP2 (sqrtPriceX96^2):", sqrtP2.toString());
console.log("- Q192:", Q192.toString());

// Step 2: Check the current implementation logic
const dec0 = BigInt(token0Decimals);
const dec1 = BigInt(token1Decimals);
const PRECISION_SCALE = 30n;

console.log("\nStep 2 - Current implementation:");
console.log("- token0Decimals (dec0):", dec0.toString());
console.log("- token1Decimals (dec1):", dec1.toString());
console.log("- PRECISION_SCALE:", PRECISION_SCALE.toString());

const highPrecisionPrice = (sqrtP2 * (10n ** PRECISION_SCALE)) / Q192;
console.log("- highPrecisionPrice:", highPrecisionPrice.toString());

const targetScale = PRECISION_SCALE - dec1 + (dec0 - dec1);
console.log("- targetScale calculation:");
console.log("  PRECISION_SCALE - dec1 + (dec0 - dec1)");
console.log("  =", PRECISION_SCALE.toString(), "-", dec1.toString(), "+ (", dec0.toString(), "-", dec1.toString(), ")");
console.log("  =", PRECISION_SCALE.toString(), "-", dec1.toString(), "+", (dec0 - dec1).toString());
console.log("  =", targetScale.toString());

const result = highPrecisionPrice / (10n ** targetScale);
console.log("- Final result:", result.toString());

console.log("\nStep 3 - What the calculation should be:");
console.log("For token0 price in token1 units:");
console.log("- We want: price of 1 WBTC in WETH units");
console.log("- sqrtPriceX96 = sqrt(price1/price0) * 2^96");
console.log("- So price0/price1 = (2^96 / sqrtPriceX96)^2 = 2^192 / sqrtP2");
console.log("- This gives us the ratio in token terms");
console.log("- Then we need to adjust for decimals");

// Correct calculation
const basePrice = Q192 / sqrtP2; // This is token0/token1 ratio in raw units
console.log("- basePrice (Q192 / sqrtP2):", basePrice.toString());

// For WBTC in WETH: we want WETH units per WBTC unit
// 1 WBTC (8 decimals) = ? WETH (18 decimals)
// basePrice gives us raw ratio, we need to scale by 10^(18-8)
const correctPrice = basePrice * (10n ** BigInt(token1Decimals - token0Decimals));
console.log("- correctPrice (basePrice * 10^(18-8)):", correctPrice.toString());

// Human readable
const humanCorrectPrice = Number(correctPrice) / Math.pow(10, token1Decimals);
console.log("- Human readable: 1 WBTC =", humanCorrectPrice.toFixed(6), "WETH");

console.log("\nStep 4 - Let's also try the inverse:");
const inversePrice = sqrtP2 / Q192; // This is token1/token0 ratio
console.log("- inversePrice (sqrtP2 / Q192):", inversePrice.toString());
const inverseAdjusted = inversePrice * (10n ** BigInt(token0Decimals - token1Decimals));
console.log("- inverseAdjusted would be:", inverseAdjusted.toString(), "(this should be near 0 due to negative exponent)");
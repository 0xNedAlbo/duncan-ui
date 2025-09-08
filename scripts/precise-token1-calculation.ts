#!/usr/bin/env tsx

/**
 * Calculate token1 price with high precision to avoid truncation
 */

import { Q192 } from '../src/lib/utils/uniswap-v3/constants';
import JSBI from 'jsbi';

const sqrtPriceX96 = JSBI.BigInt("40396383607147620851397090925881670");
const token0Decimals = 8;  // WBTC
const token1Decimals = 18; // WETH

console.log("High-precision token1 price calculation:");
console.log("=".repeat(50));

const sqrtP2 = BigInt(sqrtPriceX96.toString()) ** 2n;
const dec0 = BigInt(token0Decimals);
const dec1 = BigInt(token1Decimals);

// Current calculation that fails due to integer division
const pow = 10n ** (dec1 - dec0); // 10^10
const numerator = Q192 * pow;
const denominator = sqrtP2;

console.log("Current calculation:");
console.log("- numerator:", numerator.toString());
console.log("- denominator:", denominator.toString());
console.log("- ratio (float):", Number(numerator) / Number(denominator));
console.log("- integer division result:", numerator / denominator);

// High-precision approach: multiply by additional scaling factor
const PRECISION_SCALE = 18n; // Add 18 decimal places for precision
const highPrecisionNumerator = numerator * (10n ** PRECISION_SCALE);
const highPrecisionResult = highPrecisionNumerator / denominator;

console.log("\nHigh-precision calculation:");
console.log("- PRECISION_SCALE:", PRECISION_SCALE.toString());
console.log("- highPrecisionNumerator:", highPrecisionNumerator.toString());
console.log("- highPrecisionResult:", highPrecisionResult.toString());

// Scale back to WBTC decimals (8)
const finalResult = highPrecisionResult / (10n ** PRECISION_SCALE);
console.log("- finalResult (scaled back):", finalResult.toString());

// Alternative: use the mathematical relationship
// If 1 WBTC = 25 WETH, then 1 WETH = 1/25 WBTC = 0.04 WBTC
console.log("\nVerification using token0 price:");
const token0PriceWei = 25n * (10n ** 18n); // 25 WETH per WBTC
const token0PriceScaled = 25n * (10n ** 8n); // Scale to WBTC decimals
console.log("- 1 WBTC = 25 WETH");
console.log("- So 1 WETH = 1/25 WBTC = 0.04 WBTC");
console.log("- In 8 decimals: 0.04 * 10^8 =", (BigInt(4) * (10n ** 6n)).toString());

// Direct calculation from known ratio
const directResult = (10n ** 8n) / 25n; // 1 WETH in WBTC units
console.log("- Direct calculation: 10^8 / 25 =", directResult.toString());

const humanReadable = Number(directResult) / Math.pow(10, 8);
console.log("- Human readable:", humanReadable.toFixed(8), "WBTC per WETH");
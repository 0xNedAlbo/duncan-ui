#!/usr/bin/env tsx

/**
 * Debug token1 price calculation (WETH in WBTC) step by step
 */

import { sqrtRatioX96ToToken1Price } from '../src/lib/utils/uniswap-v3/price';
import { Q192 } from '../src/lib/utils/uniswap-v3/constants';
import JSBI from 'jsbi';

const sqrtPriceX96 = JSBI.BigInt("40396383607147620851397090925881670");
const token0Decimals = 8;  // WBTC
const token1Decimals = 18; // WETH

console.log("Debugging token1 price calculation (WETH in WBTC):");
console.log("=".repeat(60));
console.log("Input:");
console.log("- sqrtPriceX96:", sqrtPriceX96.toString());
console.log("- token0Decimals (WBTC):", token0Decimals);
console.log("- token1Decimals (WETH):", token1Decimals);
console.log("");

// Step through the git version logic for sqrtRatioX96ToToken1Price
const sqrtP2 = BigInt(sqrtPriceX96.toString()) ** 2n;
const dec0 = BigInt(token0Decimals); // 8
const dec1 = BigInt(token1Decimals); // 18

console.log("Git version logic:");
console.log("- sqrtP2:", sqrtP2.toString());
console.log("- dec0 (WBTC):", dec0.toString());
console.log("- dec1 (WETH):", dec1.toString());
console.log("- Q192:", Q192.toString());

// Check which branch the git version takes
if (dec1 >= dec0) {
    console.log("- Taking branch: dec1 >= dec0 (18 >= 8) = true");
    const pow = 10n ** (dec1 - dec0); // 10^(18-8) = 10^10
    console.log("- pow = 10^(dec1-dec0) = 10^(18-8) =", pow.toString());
    
    const numerator = Q192 * pow;
    console.log("- numerator = Q192 * pow =", numerator.toString());
    console.log("- denominator = sqrtP2 =", sqrtP2.toString());
    
    const result = numerator / sqrtP2;
    console.log("- result = numerator / sqrtP2 =", result.toString());
} else {
    console.log("- Taking branch: dec0 > dec1");
    const pow = 10n ** (dec0 - dec1);
    console.log("- pow = 10^(dec0-dec1) =", pow.toString());
    const result = Q192 / (sqrtP2 * pow);
    console.log("- result = Q192 / (sqrtP2 * pow) =", result.toString());
}

// Test the actual function
const token1Price = sqrtRatioX96ToToken1Price(sqrtPriceX96, token0Decimals, token1Decimals);
console.log("\nFunction result:");
console.log("- token1Price:", token1Price.toString());

// Convert to human readable
const humanToken1Price = Number(token1Price) / Math.pow(10, token0Decimals);
console.log("- Human readable: 1 WETH =", humanToken1Price.toFixed(8), "WBTC");

// Verify reciprocal relationship with token0 price
const token0Price = 25n * (10n ** 18n); // 25 WETH per WBTC in wei
console.log("\nVerification:");
console.log("- token0Price (25 WETH per WBTC in wei):", token0Price.toString());
console.log("- Expected reciprocal: 1/25 = 0.04 WBTC per WETH");
console.log("- In WBTC decimals: 0.04 * 10^8 =", (0.04 * Math.pow(10, 8)).toString());
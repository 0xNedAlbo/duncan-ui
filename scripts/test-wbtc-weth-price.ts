#!/usr/bin/env tsx

/**
 * Test WBTC/WETH price calculation manually
 * sqrtPriceX96: 40396383607147620851397090925881670
 * token0: WBTC (8 decimals)
 * token1: WETH (18 decimals)
 */

import { sqrtRatioX96ToToken0Price, sqrtRatioX96ToToken1Price } from '../src/lib/utils/uniswap-v3/price';
import { Q192 } from '../src/lib/utils/uniswap-v3/constants';
import JSBI from 'jsbi';

const sqrtPriceX96 = JSBI.BigInt("40396383607147620851397090925881670");
const token0Decimals = 8;  // WBTC
const token1Decimals = 18; // WETH

console.log("Testing WBTC/WETH price calculation:");
console.log("=".repeat(50));
console.log("Input:");
console.log("- sqrtPriceX96:", sqrtPriceX96.toString());
console.log("- token0 (WBTC) decimals:", token0Decimals);
console.log("- token1 (WETH) decimals:", token1Decimals);
console.log("");

// Test our functions
console.log("Using our functions:");
const token0Price = sqrtRatioX96ToToken0Price(sqrtPriceX96, token0Decimals, token1Decimals);
const token1Price = sqrtRatioX96ToToken1Price(sqrtPriceX96, token0Decimals, token1Decimals);

console.log("- Token0 price (WBTC in WETH):", token0Price.toString());
console.log("- Token1 price (WETH in WBTC):", token1Price.toString());

// Let's also do manual calculation step by step
console.log("\nManual calculation step by step:");
const sqrtP2 = BigInt(sqrtPriceX96.toString()) ** 2n;
console.log("- sqrtP2 (sqrtPriceX96^2):", sqrtP2.toString());
console.log("- Q192:", Q192.toString());

// For token0 price: price = sqrtP2 / Q192, then adjust for decimals
const rawPrice = sqrtP2 / Q192;
console.log("- Raw price (sqrtP2 / Q192):", rawPrice.toString());

// Decimal adjustment: token0 in token1
// We want 1 WBTC = X WETH
// WBTC has 8 decimals, WETH has 18 decimals
// So we need to scale by 10^(18-8) = 10^10
const decimalAdjustment = 10n ** BigInt(token1Decimals - token0Decimals);
console.log("- Decimal adjustment factor (10^(18-8)):", decimalAdjustment.toString());

const adjustedPrice = rawPrice * decimalAdjustment;
console.log("- Adjusted price (raw * 10^10):", adjustedPrice.toString());

// Convert to human readable
const humanToken0Price = Number(token0Price) / Math.pow(10, token1Decimals);
const humanToken1Price = Number(token1Price) / Math.pow(10, token0Decimals);

console.log("\nHuman readable:");
console.log("- 1 WBTC =", humanToken0Price.toFixed(6), "WETH");
console.log("- 1 WETH =", humanToken1Price.toFixed(8), "WBTC");

// Verify reciprocal relationship
console.log("\nVerification:");
console.log("- 1 / token0Price * 10^(18-8) should approximately equal token1Price");
const expectedToken1Price = (10n ** BigInt(token0Decimals + token1Decimals)) / token0Price;
console.log("- Expected token1Price:", expectedToken1Price.toString());
console.log("- Actual token1Price:", token1Price.toString());
console.log("- Match?", expectedToken1Price === token1Price);
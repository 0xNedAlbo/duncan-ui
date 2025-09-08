#!/usr/bin/env tsx

/**
 * Test the consolidated fix - updated price functions with BigInt input
 */

import { sqrtToPrice0In1 } from '../src/lib/utils/uniswap-v3/price';

const sqrtPriceX96 = BigInt("5217497569124140394546365");
const token0Decimals = 18; // WETH
const token1Decimals = 6;  // USDC

console.log("Testing CONSOLIDATED FIXED price calculation:");
console.log("=".repeat(50));
console.log("Input:");
console.log("- sqrtPriceX96:", sqrtPriceX96.toString());
console.log("- token0 (WETH) decimals:", token0Decimals);
console.log("- token1 (USDC) decimals:", token1Decimals);
console.log("");

const price = sqrtToPrice0In1(sqrtPriceX96, token1Decimals);

console.log("Result:");
console.log("- Price of WETH in USDC (smallest unit):", price.toString());
console.log("- Expected value from user:", "4280430883");
console.log("- Our calculated value from float:", "4336759547");
console.log("");
console.log("Comparison:");
console.log("- Match with expected?", price.toString() === "4280430883");
console.log("- Match with calculated?", price.toString() === "4336759547");
console.log("- Difference from expected:", Number(price) - 4280430883);
console.log("- Difference from calculated:", Number(price) - 4336759547);

// Human readable
const humanPrice = Number(price) / Math.pow(10, token1Decimals);
console.log("");
console.log("Human readable: 1 WETH =", humanPrice.toFixed(2), "USDC");

// Expected human readable values for comparison
const expectedHuman = 4280430883 / Math.pow(10, token1Decimals);
const calculatedHuman = 4336759547 / Math.pow(10, token1Decimals);
console.log("Expected human:  1 WETH =", expectedHuman.toFixed(2), "USDC");
console.log("Calculated human: 1 WETH =", calculatedHuman.toFixed(2), "USDC");
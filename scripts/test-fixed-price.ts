#!/usr/bin/env tsx

/**
 * Test the fixed price calculation functions
 */

import { sqrtPriceX96ToPrice } from '../src/lib/contracts/uniswapV3Pool';

const sqrtPriceX96 = BigInt("5217497569124140394546365");
const token0Decimals = 18; // WETH
const token1Decimals = 6;  // USDC

console.log("Testing FIXED sqrtPriceX96ToPrice function:");
console.log("=".repeat(50));

const price = sqrtPriceX96ToPrice(sqrtPriceX96, token0Decimals, token1Decimals);

console.log("Result:", price.toString());
console.log("Expected:", "4280430883");
console.log("Match?", price.toString() === "4280430883");

// Human readable
const humanPrice = Number(price) / Math.pow(10, token1Decimals);
console.log("Human readable: 1 WETH =", humanPrice.toFixed(2), "USDC");

// Also test the values we calculated manually
console.log("\nManual calculation check:");
console.log("From earlier float calculation: ~4336759547");
console.log("Current result difference:", Number(price) - 4336759547);
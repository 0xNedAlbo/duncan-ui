#!/usr/bin/env tsx

/**
 * Debug the new functions
 */

import { sqrtToPrice0In1, sqrtToPrice1In0 } from '../src/lib/utils/uniswap-v3/price';
import { Q192 } from '../src/lib/utils/uniswap-v3/constants';

const sqrtPriceX96 = BigInt("5217497569124140394546365");
const token0Decimals = 18; // WETH
const token1Decimals = 6;  // USDC

console.log("Debug new functions:");
console.log("Input:", sqrtPriceX96.toString());

// Test token0 price in token1 units (WETH price in USDC)
const price0in1 = sqrtToPrice0In1(sqrtPriceX96, token1Decimals);
console.log("sqrtToPrice0In1(sqrtPriceX96, token1Decimals=6):", price0in1.toString());

// Test token1 price in token0 units (USDC price in WETH)
const price1in0 = sqrtToPrice1In0(sqrtPriceX96, token0Decimals);
console.log("sqrtToPrice1In0(sqrtPriceX96, token0Decimals=18):", price1in0.toString());

// Manual calculation
const sqrt = BigInt(sqrtPriceX96.toString());
const sqrtP2 = sqrt * sqrt;
console.log("Manual calculation:");
console.log("- sqrtP2:", sqrtP2.toString());
console.log("- Q192:", Q192.toString());

// For price0in1: (sqrtP2 * 10^token1Decimals) / Q192
const scale1 = 10n ** BigInt(token1Decimals);
console.log("- scale1 (10^6):", scale1.toString());
const numerator = sqrtP2 * scale1;
console.log("- sqrtP2 * scale1:", numerator.toString());
const result1 = numerator / Q192;
console.log("- Final price0in1:", result1.toString());

// For price1in0: (Q192 * 10^token0Decimals) / sqrtP2
const scale0 = 10n ** BigInt(token0Decimals);
console.log("- scale0 (10^18):", scale0.toString());
const numerator2 = Q192 * scale0;
console.log("- Q192 * scale0:", numerator2.toString());
const result2 = numerator2 / sqrtP2;
console.log("- Final price1in0:", result2.toString());
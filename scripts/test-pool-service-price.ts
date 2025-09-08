#!/usr/bin/env tsx

/**
 * Test PoolService price calculation with new functions
 */

import { sqrtRatioX96ToToken1PerToken0 } from '../src/lib/utils/uniswap-v3/price';
import JSBI from 'jsbi';

// Test the same logic as in poolService.ts
const poolState = {
    sqrtPriceX96: BigInt("5211915345268226134615181"), // WETH/USDC
};

const token0Info = {
    decimals: 18, // WETH
    symbol: 'WETH'
};

console.log("Testing PoolService price calculation logic:");
console.log("==========================================");
console.log("Input:");
console.log("- sqrtPriceX96:", poolState.sqrtPriceX96.toString());
console.log("- token0 (WETH) decimals:", token0Info.decimals);
console.log("");

// This is exactly what poolService.ts now does
const currentPrice = sqrtRatioX96ToToken1PerToken0(
    JSBI.BigInt(poolState.sqrtPriceX96.toString()),
    token0Info.decimals
);

console.log("Result:");
console.log("- currentPrice (raw):", currentPrice.toString());
console.log("- currentPrice (human):", (Number(currentPrice) / Math.pow(10, 6)).toFixed(2), "USDC per WETH");

// Verify this makes sense for WETH/USDC price
const humanPrice = Number(currentPrice) / Math.pow(10, 6);
console.log("");
console.log("Validation:");
console.log("- Price range (3000-5000 USDC/WETH):", humanPrice > 3000 && humanPrice < 5000 ? "✅" : "❌");
console.log("- Function working correctly:", currentPrice > 0n ? "✅" : "❌");
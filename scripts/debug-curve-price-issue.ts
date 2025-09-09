#!/usr/bin/env tsx

/**
 * Debug the curve price calculation issue
 */

import { sqrtRatioX96ToToken1PerToken0 } from '../src/lib/utils/uniswap-v3/price';
import JSBI from 'jsbi';

console.log("=== Debugging Curve Price Issue ===");

// Example: WETH/USDC pool (like in poolService)
const sqrtPriceX96 = "5211915345268226134615181"; // WETH/USDC from our tests
const token0Decimals = 18; // WETH
const token1Decimals = 6;  // USDC

console.log("\n1. PoolService calculation:");
console.log("Input:", { sqrtPriceX96, token0Decimals, token1Decimals });

// This is what poolService does:
const poolServicePrice = sqrtRatioX96ToToken1PerToken0(
    JSBI.BigInt(sqrtPriceX96),
    token0Decimals
);

console.log("poolService.currentPrice:", poolServicePrice.toString());
console.log("Human readable (USDC per WETH):", (Number(poolServicePrice) / Math.pow(10, token1Decimals)).toFixed(2));

console.log("\n2. Position interpretation:");

// Mock position structure
const position = {
    token0IsQuote: false, // WETH is base, USDC is quote
    pool: {
        token0: { decimals: token0Decimals, symbol: 'WETH' }, // base token
        token1: { decimals: token1Decimals, symbol: 'USDC' }, // quote token  
        currentPrice: poolServicePrice.toString()
    }
};

console.log("Position setup:");
console.log("- token0IsQuote:", position.token0IsQuote);
console.log("- base token:", position.token0IsQuote ? "token1" : "token0");
console.log("- quote token:", position.token0IsQuote ? "token0" : "token1");

// This is what CurveDataService does:
const baseIsToken0 = !position.token0IsQuote; // true
const baseDecimals = baseIsToken0 ? position.pool.token0.decimals : position.pool.token1.decimals; // 18
const quoteDecimals = position.token0IsQuote ? position.pool.token0.decimals : position.pool.token1.decimals; // 6

console.log("\nCurveDataService interpretation:");
console.log("- baseIsToken0:", baseIsToken0);
console.log("- baseDecimals:", baseDecimals);
console.log("- quoteDecimals:", quoteDecimals);

console.log("\n3. Price scaling in CurveDataService:");

const currentPrice = BigInt(position.pool.currentPrice);
console.log("currentPrice (raw):", currentPrice.toString());

// Current logic (line 150 & 186): divided by baseDecimals (WRONG?)
const currentScalingWrong = Number(currentPrice) / Math.pow(10, baseDecimals);
console.log("Current logic (÷ baseDecimals):", currentScalingWrong.toFixed(8));

// Correct logic should be: divided by quoteDecimals 
const currentScalingCorrect = Number(currentPrice) / Math.pow(10, quoteDecimals);
console.log("Correct logic (÷ quoteDecimals):", currentScalingCorrect.toFixed(2));

console.log("\n4. Analysis:");
console.log("Pool stores: token1 per token0 (USDC per WETH) scaled by token1Decimals");
console.log("CurveDataService expects: quote per base (USDC per WETH) scaled by quoteDecimals");
console.log("Since base=WETH=token0 and quote=USDC=token1:");
console.log("- Pool result is already in the right format!");
console.log("- But CurveDataService is scaling by baseDecimals (18) instead of quoteDecimals (6)");
console.log("- This makes prices ~1e12 times smaller, hence the zeros");

console.log("\n5. Solution:");
console.log("Change CurveDataService lines 150 & 186 to divide by quoteDecimals instead of baseDecimals");
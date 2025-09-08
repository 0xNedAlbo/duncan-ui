#!/usr/bin/env tsx

/**
 * Test WETH/USDC Pool Preise
 * sqrtPriceX96: 5211915345268226134615181
 * token0: WETH (18 decimals)
 * token1: USDC (6 decimals)
 */

import { sqrtRatioX96ToToken1PerToken0, sqrtRatioX96ToToken0PerToken1 } from '../src/lib/utils/uniswap-v3/price';
import JSBI from 'jsbi';

const sqrtPriceX96 = JSBI.BigInt("5211915345268226134615181");
const token0Decimals = 18; // WETH
const token1Decimals = 6;  // USDC

console.log("WETH/USDC Pool Preisberechnung:");
console.log("=".repeat(60));
console.log("Input:");
console.log("- sqrtPriceX96:", sqrtPriceX96.toString());
console.log("- token0: WETH (18 decimals)");
console.log("- token1: USDC (6 decimals)");
console.log("");

// Token1 per Token0 (USDC per WETH)
const usdcPerWeth = sqrtRatioX96ToToken1PerToken0(sqrtPriceX96, token0Decimals);
console.log("sqrtRatioX96ToToken1PerToken0 (USDC per WETH):");
console.log("- Raw result:", usdcPerWeth.toString());
console.log("- In USDC kleinste Einheit:", usdcPerWeth.toString());
console.log("- Human readable:", (Number(usdcPerWeth) / Math.pow(10, token1Decimals)).toFixed(2), "USDC per WETH");

// Token0 per Token1 (WETH per USDC)
const wethPerUsdc = sqrtRatioX96ToToken0PerToken1(sqrtPriceX96, token1Decimals);
console.log("");
console.log("sqrtRatioX96ToToken0PerToken1 (WETH per USDC):");
console.log("- Raw result:", wethPerUsdc.toString());
console.log("- In WETH kleinste Einheit (wei):", wethPerUsdc.toString());
console.log("- Human readable:", (Number(wethPerUsdc) / Math.pow(10, token0Decimals)).toFixed(10), "WETH per USDC");

// Erwartung: WETH Preis sollte um $3,500-$4,500 sein (Stand Ende 2024)
console.log("");
console.log("Plausibilitätsprüfung:");
const humanUsdcPerWeth = Number(usdcPerWeth) / Math.pow(10, token1Decimals);
console.log("- 1 WETH =", humanUsdcPerWeth.toFixed(2), "USDC");
console.log("- Ist das plausibel für ETH Preis? (3500-4500 USDC)", 
    humanUsdcPerWeth > 3000 && humanUsdcPerWeth < 5000 ? "✅" : "❌");

// Reciprocal Test
const humanWethPerUsdc = Number(wethPerUsdc) / Math.pow(10, token0Decimals);
const reciprocal = 1 / humanUsdcPerWeth;
console.log("");
console.log("Reciprocal-Verifikation:");
console.log("- 1 / (USDC per WETH) =", reciprocal.toFixed(10));
console.log("- WETH per USDC =", humanWethPerUsdc.toFixed(10));
console.log("- Match?", Math.abs(reciprocal - humanWethPerUsdc) < 0.0000001 ? "✅" : "❌");
#!/usr/bin/env tsx

/**
 * Test der neuen präzise benannten Funktionen
 * WBTC/WETH: sqrtPriceX96 = 40396383607147620851397090925881670
 * token0: WBTC (8 decimals)
 * token1: WETH (18 decimals)
 * Erwartung: ~25 WETH pro WBTC
 */

import { sqrtRatioX96ToToken1PerToken0, sqrtRatioX96ToToken0PerToken1 } from '../src/lib/utils/uniswap-v3/price';
import JSBI from 'jsbi';

const sqrtPriceX96 = JSBI.BigInt("40396383607147620851397090925881670");
const token0Decimals = 8;  // WBTC
const token1Decimals = 18; // WETH

console.log("Test der präzise benannten Funktionen (WBTC/WETH):");
console.log("=".repeat(60));
console.log("Input:");
console.log("- sqrtPriceX96:", sqrtPriceX96.toString());
console.log("- token0 (WBTC) decimals:", token0Decimals);
console.log("- token1 (WETH) decimals:", token1Decimals);
console.log("");

// Test: Token1 per Token0 (WETH per WBTC) - should be ~25
const wethPerWbtc = sqrtRatioX96ToToken1PerToken0(sqrtPriceX96, token0Decimals);
console.log("sqrtRatioX96ToToken1PerToken0 (WETH per WBTC):");
console.log("- Raw result:", wethPerWbtc.toString());
console.log("- Human readable:", (Number(wethPerWbtc) / Math.pow(10, token1Decimals)).toFixed(6), "WETH per WBTC");

// Test: Token0 per Token1 (WBTC per WETH) - should be ~0.04
const wbtcPerWeth = sqrtRatioX96ToToken0PerToken1(sqrtPriceX96, token1Decimals);
console.log("");
console.log("sqrtRatioX96ToToken0PerToken1 (WBTC per WETH):");
console.log("- Raw result:", wbtcPerWeth.toString());
console.log("- Human readable:", (Number(wbtcPerWeth) / Math.pow(10, token0Decimals)).toFixed(8), "WBTC per WETH");

console.log("");
console.log("Erwartungen:");
console.log("- WETH per WBTC sollte ~25 sein:", (Number(wethPerWbtc) / Math.pow(10, token1Decimals)) > 20 && (Number(wethPerWbtc) / Math.pow(10, token1Decimals)) < 30 ? "✅" : "❌");
console.log("- WBTC per WETH sollte ~0.04 sein:", (Number(wbtcPerWeth) / Math.pow(10, token0Decimals)) > 0.03 && (Number(wbtcPerWeth) / Math.pow(10, token0Decimals)) < 0.05 ? "✅" : "❌");

// Reciprocal-Test
const humanWethPerWbtc = Number(wethPerWbtc) / Math.pow(10, token1Decimals);
const humanWbtcPerWeth = Number(wbtcPerWeth) / Math.pow(10, token0Decimals);
const reciprocal = 1 / humanWethPerWbtc;

console.log("");
console.log("Reciprocal-Verifikation:");
console.log("- 1 / (WETH per WBTC) =", reciprocal.toFixed(8));
console.log("- WBTC per WETH =", humanWbtcPerWeth.toFixed(8));
console.log("- Match?", Math.abs(reciprocal - humanWbtcPerWeth) < 0.001 ? "✅" : "❌");
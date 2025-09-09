#!/usr/bin/env tsx

/**
 * Test tickToPrice with real Arbitrum WETH/USDC addresses
 */

import { tickToPrice, tickToSqrtRatioX96 } from '../src/lib/utils/uniswap-v3/price';
import JSBI from 'jsbi';

console.log("=== Testing with Real Arbitrum WETH/USDC Addresses ===");

// Real Arbitrum addresses
const WETH_ARBITRUM = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
const USDC_ARBITRUM = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";

// Real blockchain data
const realTick = -192593;
const realSqrtPriceX96 = JSBI.BigInt("5211915345268226134615181");

console.log("Real Arbitrum data:");
console.log("- WETH address:", WETH_ARBITRUM);
console.log("- USDC address:", USDC_ARBITRUM);
console.log("- Current tick:", realTick);
console.log("- sqrtPriceX96:", realSqrtPriceX96.toString());

console.log("\n1. Check token ordering:");
const wethBigInt = BigInt(WETH_ARBITRUM);
const usdcBigInt = BigInt(USDC_ARBITRUM);
const wethIsToken0 = wethBigInt < usdcBigInt;

console.log("- WETH BigInt:", wethBigInt.toString());
console.log("- USDC BigInt:", usdcBigInt.toString());
console.log("- WETH < USDC:", wethIsToken0);

if (wethIsToken0) {
    console.log("✅ WETH is token0, USDC is token1 (correct Uniswap ordering)");
} else {
    console.log("✅ USDC is token0, WETH is token1 (correct Uniswap ordering)");
}

console.log("\n2. Verify tick -> sqrtRatioX96 conversion:");
const calculatedSqrtRatio = tickToSqrtRatioX96(realTick);
console.log("- Our function result:", calculatedSqrtRatio.toString());
console.log("- Real sqrtPriceX96:   ", realSqrtPriceX96.toString());

const sqrtRatioMatch = calculatedSqrtRatio.toString() === realSqrtPriceX96.toString();
console.log("- Exact match:", sqrtRatioMatch ? "✅" : "❌");

if (!sqrtRatioMatch) {
    // Check if close (within 0.1%)
    const calculatedNum = Number(calculatedSqrtRatio.toString());
    const realNum = Number(realSqrtPriceX96.toString());
    const percentDiff = Math.abs(calculatedNum - realNum) / realNum * 100;
    console.log("- Percent difference:", percentDiff.toFixed(6), "%");
    console.log("- Close enough (<0.1%):", percentDiff < 0.1 ? "✅" : "❌");
}

console.log("\n3. Test tickToPrice function:");
try {
    // Test both directions to see which makes sense
    console.log("\n3a. WETH as base, USDC as quote (want USDC per WETH):");
    const usdcPerWeth = tickToPrice(realTick, WETH_ARBITRUM, USDC_ARBITRUM, 18);
    const usdcPerWethHuman = Number(usdcPerWeth) / Math.pow(10, 6);
    console.log("- Raw result:", usdcPerWeth.toString());
    console.log("- Human readable:", usdcPerWethHuman.toFixed(2), "USDC per WETH");
    console.log("- Reasonable (4000-5000):", usdcPerWethHuman > 4000 && usdcPerWethHuman < 5000 ? "✅" : "❌");
    
    console.log("\n3b. USDC as base, WETH as quote (want WETH per USDC):");
    const wethPerUsdc = tickToPrice(realTick, USDC_ARBITRUM, WETH_ARBITRUM, 6);
    const wethPerUsdcHuman = Number(wethPerUsdc) / Math.pow(10, 18);
    console.log("- Raw result:", wethPerUsdc.toString());
    console.log("- Human readable:", wethPerUsdcHuman.toFixed(8), "WETH per USDC");
    console.log("- Reasonable (0.0002-0.0003):", wethPerUsdcHuman > 0.0002 && wethPerUsdcHuman < 0.0003 ? "✅" : "❌");
    
    // Expected: ~4327 USDC per WETH
    const expectedUsdcPerWeth = 4327.48;
    const usdcPerWethCorrect = Math.abs(usdcPerWethHuman - expectedUsdcPerWeth) / expectedUsdcPerWeth < 0.01;
    
    console.log("\n4. Conclusion:");
    if (usdcPerWethCorrect) {
        console.log("✅ tickToPrice function works correctly!");
        console.log("- Use WETH as base, USDC as quote");
        console.log("- Expected result: ~4327480000 (4327.48 * 10^6)");
    } else {
        console.log("❌ tickToPrice function still has issues");
        console.log("- Expected: ~4327 USDC per WETH");
        console.log("- Got:", usdcPerWethHuman.toFixed(2));
    }
    
} catch (error) {
    console.error("❌ Error calling tickToPrice:", error);
}

console.log("\n5. Test fixture update needed:");
console.log("- Replace tick 202500 with", realTick);
console.log("- Use real Arbitrum addresses");  
console.log("- Expect range 4000-5000 USDC per WETH, not 1000-3000");
console.log("- Raw result should be around 4327480000");
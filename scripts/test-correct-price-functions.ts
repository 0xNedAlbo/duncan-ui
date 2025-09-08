#!/usr/bin/env tsx

/**
 * Test the correct price functions from uniswap-v3/price.ts
 */

import JSBI from 'jsbi';

const Q192 = 2n ** 192n;

// The functions from price.ts
function sqrtRatioX96ToToken0Price(
    sqrtRatioX96: JSBI,
    token0Decimals: number,
    token1Decimals: number
): bigint {
    const sqrtP2 = BigInt(sqrtRatioX96.toString()) ** 2n; // Q192-scaled
    const dec0 = BigInt(token0Decimals);
    const dec1 = BigInt(token1Decimals);

    if (dec0 >= dec1) {
        const pow = 10n ** (dec0 - dec1);
        return (sqrtP2 * pow) / Q192;
    } else {
        const pow = 10n ** (dec1 - dec0);
        return sqrtP2 / (Q192 * pow);
    }
}

// Test with our data
const sqrtPriceX96String = "5217497569124140394546365";
const sqrtPriceX96 = JSBI.BigInt(sqrtPriceX96String);
const token0Decimals = 18; // WETH
const token1Decimals = 6;  // USDC

console.log("Testing price calculation with correct functions:");
console.log("=".repeat(50));
console.log("Input:");
console.log("- sqrtPriceX96:", sqrtPriceX96String);
console.log("- token0 (WETH) decimals:", token0Decimals);
console.log("- token1 (USDC) decimals:", token1Decimals);
console.log("");

// Calculate price of token0 (WETH) in token1 (USDC) units
const priceToken0InToken1 = sqrtRatioX96ToToken0Price(sqrtPriceX96, token0Decimals, token1Decimals);

console.log("Result:");
console.log("- Price of WETH in USDC (smallest unit):", priceToken0InToken1.toString());
console.log("- Expected value from user:", "4280430883");
console.log("- Match?", priceToken0InToken1.toString() === "4280430883");

// Convert to human readable
const priceInUSDC = Number(priceToken0InToken1) / Math.pow(10, token1Decimals);
console.log("");
console.log("Human readable: 1 WETH =", priceInUSDC.toFixed(2), "USDC");

// Also check what the broken sqrtPriceX96ToPrice was doing
console.log("");
console.log("Comparing with broken sqrtPriceX96ToPrice:");

function brokenSqrtPriceX96ToPrice(
    sqrtPriceX96: bigint,
    decimals0: number,
    decimals1: number
): bigint {
    const sqrtPriceSquared = sqrtPriceX96 * sqrtPriceX96;
    const Q192 = 2n ** 192n;
    const decimalDifference = decimals1 - decimals0;
    
    let price: bigint;
    if (decimalDifference >= 0) {
        const decimalAdjustment = 10n ** BigInt(decimalDifference);
        price = (sqrtPriceSquared * decimalAdjustment) / Q192;
    } else {
        const decimalAdjustment = 10n ** BigInt(-decimalDifference);
        price = sqrtPriceSquared / (Q192 * decimalAdjustment);
    }
    
    return price;
}

const brokenPrice = brokenSqrtPriceX96ToPrice(BigInt(sqrtPriceX96String), token0Decimals, token1Decimals);
console.log("- Broken function result:", brokenPrice.toString());
console.log("- Issue: Integer division truncates to 0 when numerator < denominator");
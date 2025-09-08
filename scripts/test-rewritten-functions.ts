#!/usr/bin/env tsx

/**
 * Test der umgeschriebenen Funktionen
 * sqrtPriceX96: 40396383607147620851397090925881670
 * token0: WBTC (8 decimals)
 * token1: WETH (18 decimals)
 */

import { sqrtRatioX96ToToken0Price, sqrtRatioX96ToToken1Price } from '../src/lib/utils/uniswap-v3/price';
import JSBI from 'jsbi';

const sqrtPriceX96 = JSBI.BigInt("40396383607147620851397090925881670");
const token0Decimals = 8;  // WBTC
const token1Decimals = 18; // WETH

console.log("Test der umgeschriebenen Funktionen:");
console.log("=".repeat(50));
console.log("Input:");
console.log("- sqrtPriceX96:", sqrtPriceX96.toString());
console.log("- token0 (WBTC) decimals:", token0Decimals);
console.log("- token1 (WETH) decimals:", token1Decimals);
console.log("");

// Test neue Funktionen
const token0Price = sqrtRatioX96ToToken0Price(sqrtPriceX96, token0Decimals);
const token1Price = sqrtRatioX96ToToken1Price(sqrtPriceX96, token1Decimals);

console.log("Ergebnisse der neuen Funktionen:");
console.log("- Token0 price (WBTC in WETH kleinste Einheit):", token0Price.toString());
console.log("- Token1 price (WETH in WBTC kleinste Einheit):", token1Price.toString());

// Menschlich lesbare Werte
const humanToken0Price = Number(token0Price) / Math.pow(10, token1Decimals);
const humanToken1Price = Number(token1Price) / Math.pow(10, token0Decimals);

console.log("");
console.log("Menschlich lesbare Werte:");
console.log("- 1 WBTC =", humanToken0Price.toFixed(6), "WETH");
console.log("- 1 WETH =", humanToken1Price.toFixed(8), "WBTC");

// Vergleich mit erwarteten Werten
console.log("");
console.log("Vergleich mit erwarteten Werten:");
console.log("- Erwartet: 1 WBTC ≈ 25 WETH");
console.log("- Erwartet: 1 WETH ≈ 0.04 WBTC");
console.log("- Token0 price korrekt?", Math.abs(humanToken0Price - 25) < 1 ? "✅" : "❌");
console.log("- Token1 price korrekt?", Math.abs(humanToken1Price - 0.04) < 0.01 ? "✅" : "❌");

// Reciprocal-Test
console.log("");
console.log("Reciprocal-Verifikation:");
if (humanToken0Price > 0 && humanToken1Price > 0) {
    const reciprocal = 1 / humanToken0Price;
    console.log("- 1 / token0Price =", reciprocal.toFixed(8));
    console.log("- token1Price =", humanToken1Price.toFixed(8));
    console.log("- Match?", Math.abs(reciprocal - humanToken1Price) < 0.001 ? "✅" : "❌");
} else {
    console.log("- Einer der Preise ist 0, kann Reciprocal nicht testen");
}

// Detaillierte Berechnung für Debugging
console.log("");
console.log("Detaillierte Berechnung:");
const sqrt = BigInt(sqrtPriceX96.toString());
const sqrtP2 = sqrt * sqrt;
console.log("- sqrtP2:", sqrtP2.toString());

// Token0 price berechnung: (sqrtP2 * 10^8) / Q192
const scale0 = 10n ** BigInt(token0Decimals);
console.log("- scale0 (10^8):", scale0.toString());
const token0Calc = (sqrtP2 * scale0);
console.log("- sqrtP2 * scale0:", token0Calc.toString());

// Token1 price berechnung: (Q192 * 10^18) / sqrtP2
const scale1 = 10n ** BigInt(token1Decimals);
console.log("- scale1 (10^18):", scale1.toString());
const token1Calc = (scale1 * sqrtP2);
console.log("- Q192 * scale1:", token1Calc.toString());
import {
    encodeSqrtRatioX96,
    nearestUsableTick,
    TickMath,
} from "@uniswap/v3-sdk";
import JSBI from "jsbi";
import { Q192 } from "./constants";

/**
 * Price calculations and tick conversions for Uniswap V3
 * Pure functions with simple parameters - no custom data structures
 */

/**
 * Convert price to sqrtRatioX96 format
 * @param baseTokenAddress Address of base token
 * @param quoteTokenAddress Address of quote token
 * @param baseTokenDecimals Decimals of base token
 * @param price Price as quote per base (in quote token decimals)
 */
export function priceToSqrtRatioX96(
    baseTokenAddress: string,
    quoteTokenAddress: string,
    baseTokenDecimals: number,
    price: bigint
): JSBI {
    if (price <= 0n) {
        throw new Error("price must be a positive bigint");
    }

    // Determine token0/token1 ordering (lower address is token0)
    const baseIsToken0 = BigInt(baseTokenAddress) < BigInt(quoteTokenAddress);

    let amount0: bigint;
    let amount1: bigint;

    if (baseIsToken0) {
        // base = token0, quote = token1
        // price = token1 per token0
        amount0 = 10n ** BigInt(baseTokenDecimals);
        amount1 = price; // already in quote decimals
    } else {
        // base = token1, quote = token0
        // price needs to be inverted for the encoder
        amount0 = price;
        amount1 = 10n ** BigInt(baseTokenDecimals);
    }

    return encodeSqrtRatioX96(amount1.toString(), amount0.toString());
}

/**
 * Convert tick to price (quote per base)
 * @param tick The tick to convert
 * @param baseTokenAddress Address of base token
 * @param quoteTokenAddress Address of quote token
 * @param baseTokenDecimals Decimals of base token
 * @returns Price in quote token decimals
 */
export function tickToPrice(
    tick: number,
    baseTokenAddress: string,
    quoteTokenAddress: string,
    baseTokenDecimals: number
): bigint {
    const sqrtRatio = tickToSqrtRatioX96(tick);
    const baseIsToken0 = BigInt(baseTokenAddress) < BigInt(quoteTokenAddress);

    if (baseIsToken0) {
        // base = token0, quote = token1 → want price of token0 in token1 units
        return sqrtRatioX96ToToken1PerToken0(sqrtRatio, baseTokenDecimals);
    } else {
        // base = token1, quote = token0 → want price of token1 in token0 units
        return sqrtRatioX96ToToken0PerToken1(sqrtRatio, baseTokenDecimals);
    }
}

/**
 * Convert price to tick (with tick spacing snap)
 * @param price Price as quote per base (in quote token decimals)
 * @param tickSpacing Tick spacing for the fee tier
 * @param baseTokenAddress Address of base token
 * @param quoteTokenAddress Address of quote token
 * @param baseTokenDecimals Decimals of base token
 * @returns Nearest usable tick
 */
export function priceToTick(
    price: bigint,
    tickSpacing: number,
    baseTokenAddress: string,
    quoteTokenAddress: string,
    baseTokenDecimals: number
): number {
    const sqrt = priceToSqrtRatioX96(
        baseTokenAddress,
        quoteTokenAddress,
        baseTokenDecimals,
        price
    );
    const tickFloor = TickMath.getTickAtSqrtRatio(sqrt);
    return nearestUsableTick(tickFloor, tickSpacing);
}

/**
 * Find closest usable tick for a given price
 * @param price Price as quote per base (in quote token decimals)
 * @param tickSpacing Tick spacing for the fee tier
 * @param baseTokenAddress Address of base token
 * @param quoteTokenAddress Address of quote token
 * @param baseTokenDecimals Decimals of base token
 * @returns Closest usable tick
 */
export function priceToClosestUsableTick(
    price: bigint,
    tickSpacing: number,
    baseTokenAddress: string,
    quoteTokenAddress: string,
    baseTokenDecimals: number
): number {
    const sqrt = priceToSqrtRatioX96(
        baseTokenAddress,
        quoteTokenAddress,
        baseTokenDecimals,
        price
    );
    const t0 = TickMath.getTickAtSqrtRatio(sqrt); // floor

    if (t0 >= TickMath.MAX_TICK)
        return nearestUsableTick(TickMath.MAX_TICK, tickSpacing);
    if (t0 <= TickMath.MIN_TICK)
        return nearestUsableTick(TickMath.MIN_TICK, tickSpacing);

    const s0 = TickMath.getSqrtRatioAtTick(t0);
    const s1 = TickMath.getSqrtRatioAtTick(t0 + 1);

    const d0 = JSBI.greaterThanOrEqual(sqrt, s0)
        ? JSBI.subtract(sqrt, s0)
        : JSBI.subtract(s0, sqrt);
    const d1 = JSBI.greaterThanOrEqual(s1, sqrt)
        ? JSBI.subtract(s1, sqrt)
        : JSBI.subtract(sqrt, s1);

    const tClosest = JSBI.lessThan(d0, d1) ? t0 : t0 + 1;
    return nearestUsableTick(tClosest, tickSpacing);
}

/**
 * Convert tick to sqrtRatioX96
 * @param tick The tick to convert
 * @returns JSBI sqrtRatioX96
 */
export function tickToSqrtRatioX96(tick: number): JSBI {
    return TickMath.getSqrtRatioAtTick(tick);
}

export function sqrtRatioX96ToToken1PerToken0(
    sqrtRatioX96: JSBI,
    token0Decimals: number
): bigint {
    const sqrt = BigInt(sqrtRatioX96.toString());
    const sqrtP2 = sqrt * sqrt; // Q192-scaled
    const scale0 = 10n ** BigInt(token0Decimals);
    return (sqrtP2 * scale0) / Q192;
}

export function sqrtRatioX96ToToken0PerToken1(
    sqrtRatioX96: JSBI,
    token1Decimals: number
): bigint {
    const sqrt = BigInt(sqrtRatioX96.toString());
    const sqrtP2 = sqrt * sqrt; // Q192-scaled
    const scale1 = 10n ** BigInt(token1Decimals);
    return (Q192 * scale1) / sqrtP2;
}

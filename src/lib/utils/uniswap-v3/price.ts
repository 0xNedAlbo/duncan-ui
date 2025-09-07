import { encodeSqrtRatioX96, nearestUsableTick, TickMath } from "@uniswap/v3-sdk";
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
    // Determine token0/token1 ordering
    const baseIsToken0 = BigInt(baseTokenAddress) < BigInt(quoteTokenAddress);

    const s = BigInt(TickMath.getSqrtRatioAtTick(tick).toString()); // Q96
    const sqrtP2 = s * s; // Q192

    if (baseIsToken0) {
        // quote = token1, base = token0 → scale by base decimals
        const scale = 10n ** BigInt(baseTokenDecimals);
        return (sqrtP2 * scale) / Q192; // token1 per 1 token0, in token1 units
    } else {
        // quote = token0, base = token1 → reciprocal path
        const scale = 10n ** BigInt(baseTokenDecimals);
        return (Q192 * scale) / sqrtP2; // token0 per 1 token1, in token0 units
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

/**
 * Get price of token0 in token1 units from sqrtRatioX96
 * @param sqrtRatioX96 The sqrt price ratio
 * @param token0Decimals Decimals of token0
 * @param token1Decimals Decimals of token1
 * @returns Price as bigint in token1 decimals
 */
export function sqrtRatioX96ToToken0Price(
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

/**
 * Get price of token1 in token0 units from sqrtRatioX96  
 * @param sqrtRatioX96 The sqrt price ratio
 * @param token0Decimals Decimals of token0
 * @param token1Decimals Decimals of token1
 * @returns Price as bigint in token0 decimals
 */
export function sqrtRatioX96ToToken1Price(
    sqrtRatioX96: JSBI,
    token0Decimals: number,
    token1Decimals: number
): bigint {
    const sqrtP2 = BigInt(sqrtRatioX96.toString()) ** 2n; // Q192-scaled
    const dec0 = BigInt(token0Decimals);
    const dec1 = BigInt(token1Decimals);

    if (dec1 >= dec0) {
        const pow = 10n ** (dec1 - dec0);
        return (Q192 * pow) / sqrtP2;
    } else {
        const pow = 10n ** (dec0 - dec1);
        return Q192 / (sqrtP2 * pow);
    }
}
import { priceToTick } from "./price";
import { calculatePositionValue } from "./liquidity";

/**
 * Position calculations and analysis for Uniswap V3
 * Pure functions with simple parameters - no custom data structures
 */

export type RangeStatus =
    | "in-range"
    | "out-of-range-below"
    | "out-of-range-above"
    | "unknown";

export type PositionPhase = "below" | "in-range" | "above";

export interface PnLPoint {
    price: bigint;
    positionValue: bigint;
    pnl: bigint;
    pnlPercent: number;
    phase: PositionPhase;
}

/**
 * Determine range status for a position
 * @param tickCurrent Current price tick
 * @param tickLower Lower bound tick
 * @param tickUpper Upper bound tick
 * @returns Range status
 */
export function determineRangeStatus(
    tickCurrent: number,
    tickLower: number,
    tickUpper: number
): RangeStatus {
    if (tickCurrent >= tickLower && tickCurrent < tickUpper) {
        return "in-range";
    } else if (tickCurrent < tickLower) {
        return "out-of-range-below";
    } else {
        return "out-of-range-above";
    }
}

/**
 * Determine position phase for PnL curve
 * @param tickCurrent Current price tick
 * @param tickLower Lower bound tick
 * @param tickUpper Upper bound tick
 * @returns Position phase
 */
export function determinePhase(
    tickCurrent: number,
    tickLower: number,
    tickUpper: number
): PositionPhase {
    if (tickCurrent < tickLower) {
        return "below";
    } else if (tickCurrent >= tickUpper) {
        return "above";
    } else {
        return "in-range";
    }
}

/**
 * Calculate PnL for a position
 * @param currentValue Current position value
 * @param initialValue Initial position value
 * @returns PnL information
 */
export function calculatePnL(
    currentValue: bigint,
    initialValue: bigint
): {
    pnl: bigint;
    pnlPercent: number;
} {
    const pnl = currentValue - initialValue;
    const pnlPercent =
        initialValue > 0n ? Number((pnl * 10000n) / initialValue) / 100 : 0;

    return { pnl, pnlPercent };
}

/**
 * Generate PnL curve data points
 * @param liquidity Position liquidity
 * @param tickLower Lower bound tick
 * @param tickUpper Upper bound tick
 * @param initialValue Initial position value
 * @param baseTokenAddress Base token address
 * @param quoteTokenAddress Quote token address
 * @param baseTokenDecimals Base token decimals
 * @param tickSpacing Tick spacing for price calculations
 * @param priceRange Price range to analyze
 * @param numPoints Number of data points to generate
 * @returns Array of PnL points
 */
export function generatePnLCurve(
    liquidity: bigint,
    tickLower: number,
    tickUpper: number,
    initialValue: bigint,
    baseTokenAddress: string,
    quoteTokenAddress: string,
    baseTokenDecimals: number,
    tickSpacing: number,
    priceRange: { min: bigint; max: bigint },
    numPoints: number = 150
): PnLPoint[] {
    const points: PnLPoint[] = [];
    const priceStep = (priceRange.max - priceRange.min) / BigInt(numPoints);

    // Determine if base is token0
    const baseIsToken0 = BigInt(baseTokenAddress) < BigInt(quoteTokenAddress);

    for (let i = 0; i <= numPoints; i++) {
        const price = priceRange.min + BigInt(i) * priceStep;
        const tick = priceToTick(
            price,
            tickSpacing,
            baseTokenAddress,
            quoteTokenAddress,
            baseTokenDecimals
        );

        const positionValue = calculatePositionValue(
            liquidity,
            tick,
            tickLower,
            tickUpper,
            price,
            baseIsToken0,
            baseTokenDecimals
        );

        const { pnl, pnlPercent } = calculatePnL(positionValue, initialValue);
        const phase = determinePhase(tick, tickLower, tickUpper);

        points.push({
            price,
            positionValue,
            pnl,
            pnlPercent,
            phase,
        });
    }

    return points;
}

/**
 * Compare position performance to hold strategy
 * @param positionValue Current position value
 * @param initialToken0Amount Initial token0 amount
 * @param initialToken1Amount Initial token1 amount
 * @param currentPrice Current price (quote per base)
 * @param baseIsToken0 Whether base token is token0
 * @param baseDecimals Base token decimals
 * @returns Comparison metrics
 */
export function compareToHoldStrategy(
    positionValue: bigint,
    initialToken0Amount: bigint,
    initialToken1Amount: bigint,
    currentPrice: bigint,
    baseIsToken0: boolean,
    baseDecimals: number
): {
    positionValue: bigint;
    holdValue: bigint;
    advantage: bigint;
    advantagePercent: number;
} {
    // Calculate what the hold value would be
    let holdValue: bigint;

    if (baseIsToken0) {
        // token0 = base, token1 = quote
        holdValue =
            (initialToken0Amount * currentPrice) / 10n ** BigInt(baseDecimals) +
            initialToken1Amount;
    } else {
        // token0 = quote, token1 = base
        holdValue =
            initialToken0Amount +
            (initialToken1Amount * currentPrice) / 10n ** BigInt(baseDecimals);
    }

    const advantage = positionValue - holdValue;
    const advantagePercent =
        holdValue > 0n ? Number((advantage * 10000n) / holdValue) / 100 : 0;

    return {
        positionValue,
        holdValue,
        advantage,
        advantagePercent,
    };
}

/**
 * Calculate position value at a specific price
 * @param liquidity Position liquidity
 * @param tickLower Lower bound tick
 * @param tickUpper Upper bound tick
 * @param targetPrice Target price to evaluate
 * @param baseTokenAddress Base token address
 * @param quoteTokenAddress Quote token address
 * @param baseTokenDecimals Base token decimals
 * @param tickSpacing Tick spacing
 * @returns Position value at target price
 */
export function calculatePositionValueAtPrice(
    liquidity: bigint,
    tickLower: number,
    tickUpper: number,
    targetPrice: bigint,
    baseTokenAddress: string,
    quoteTokenAddress: string,
    baseTokenDecimals: number,
    tickSpacing: number
): bigint {
    const targetTick = priceToTick(
        targetPrice,
        tickSpacing,
        baseTokenAddress,
        quoteTokenAddress,
        baseTokenDecimals
    );

    const baseIsToken0 = BigInt(baseTokenAddress) < BigInt(quoteTokenAddress);

    return calculatePositionValue(
        liquidity,
        targetTick,
        tickLower,
        tickUpper,
        targetPrice,
        baseIsToken0,
        baseTokenDecimals
    );
}

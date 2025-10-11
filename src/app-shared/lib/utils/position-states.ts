import { getTokenAmountsFromLiquidity_withTick, calculatePositionValue } from "@/lib/utils/uniswap-v3/liquidity";
import { tickToPrice, priceToTick } from "@/lib/utils/uniswap-v3/price";
import { TickMath } from "@uniswap/v3-sdk";
import type { BasicPosition } from "@/services/positions/positionService";
import type { PnlBreakdown } from "@/types/pnl";

export interface PositionState {
    baseTokenAmount: bigint;
    quoteTokenAmount: bigint;
    poolPrice: bigint;
    positionValue: bigint;
    pnlIncludingFees: bigint;
    pnlExcludingFees: bigint;
}

export interface PositionStates {
    lowerRange: PositionState;
    current: PositionState;
    upperRange: PositionState;
}

/**
 * Calculate position state at a specific tick
 */
function calculatePositionStateAtTick(
    position: BasicPosition,
    pnlBreakdown: PnlBreakdown | null | undefined,
    tick: number
): PositionState {
    const { pool } = position;
    const baseToken = position.token0IsQuote ? pool.token1 : pool.token0;
    const quoteToken = position.token0IsQuote ? pool.token0 : pool.token1;

    // Calculate token amounts at this tick (hypothetical scenario)
    // Using _withTick since tick parameter represents "what-if" calculations
    const { token0Amount, token1Amount } = getTokenAmountsFromLiquidity_withTick(
        BigInt(position.liquidity),
        tick,
        position.tickLower,
        position.tickUpper
    );

    // Determine base and quote amounts based on position configuration
    const baseTokenAmount = position.token0IsQuote ? token1Amount : token0Amount;
    const quoteTokenAmount = position.token0IsQuote ? token0Amount : token1Amount;

    // Calculate price at this tick
    const poolPrice = tickToPrice(
        tick,
        baseToken.address,
        quoteToken.address,
        baseToken.decimals
    );

    // Calculate position value at this tick
    // Convert tick to sqrtPriceX96 for hypothetical scenario
    const sqrtPriceX96 = BigInt(TickMath.getSqrtRatioAtTick(tick).toString());
    const positionValue = calculatePositionValue(
        BigInt(position.liquidity),
        sqrtPriceX96,
        position.tickLower,
        position.tickUpper,
        poolPrice,
        !position.token0IsQuote, // baseIsToken0 is opposite of token0IsQuote
        baseToken.decimals
    );

    // Get PnL components (default to 0 if no breakdown available)
    const currentCostBasis = pnlBreakdown ? BigInt(pnlBreakdown.currentCostBasis) : 0n;
    const realizedPnL = pnlBreakdown ? BigInt(pnlBreakdown.realizedPnL) : 0n;
    const collectedFees = pnlBreakdown ? BigInt(pnlBreakdown.collectedFees) : 0n;
    const unclaimedFees = pnlBreakdown ? BigInt(pnlBreakdown.unclaimedFees) : 0n;

    // Calculate PnL including and excluding fees
    // For current tick, use unclaimed fees; for other ticks, fees would be 0
    const unclaimedFeesAtTick = tick === (position.pool.currentTick ?? 0) ? unclaimedFees : 0n;

    // PnL Including Fees = (Position Value + Unclaimed Fees) - Current Cost Basis + Realized PnL + Collected Fees
    const pnlIncludingFees = (positionValue + unclaimedFeesAtTick) - currentCostBasis + realizedPnL + collectedFees;

    // PnL Excluding Fees = Position Value - Current Cost Basis + Realized PnL + Collected Fees
    const pnlExcludingFees = positionValue - currentCostBasis + realizedPnL + collectedFees;

    return {
        baseTokenAmount,
        quoteTokenAmount,
        poolPrice,
        positionValue,
        pnlIncludingFees,
        pnlExcludingFees,
    };
}

/**
 * Calculate position states for lower range, current, and upper range
 */
export function calculatePositionStates(
    position: BasicPosition,
    pnlBreakdown: PnlBreakdown | null | undefined
): PositionStates {
    const currentTick = position.pool.currentTick ?? 0;

    return {
        lowerRange: calculatePositionStateAtTick(position, pnlBreakdown, position.tickLower),
        current: calculatePositionStateAtTick(position, pnlBreakdown, currentTick),
        upperRange: calculatePositionStateAtTick(position, pnlBreakdown, position.tickUpper),
    };
}

/**
 * Calculate break-even price for a position
 * Break-even = price where position value equals net investment
 */
export function calculateBreakEvenPrice(
    position: BasicPosition,
    pnlBreakdown: PnlBreakdown | null | undefined
): bigint | null {
    if (!pnlBreakdown || !position.pool.currentPrice) {
        return null;
    }

    const baseToken = position.token0IsQuote ? position.pool.token1 : position.pool.token0;
    const quoteToken = position.token0IsQuote ? position.pool.token0 : position.pool.token1;

    // Calculate target value (net investment amount)
    const currentCostBasis = BigInt(pnlBreakdown.currentCostBasis);
    const realizedPnL = BigInt(pnlBreakdown.realizedPnL);
    const collectedFees = BigInt(pnlBreakdown.collectedFees);
    const unclaimedFees = BigInt(pnlBreakdown.unclaimedFees);

    const targetValue = currentCostBasis - realizedPnL - collectedFees - unclaimedFees;

    // If target value is negative or zero, position is already profitable
    if (targetValue <= 0n) {
        return null; // Already profitable
    }

    // Binary search for break-even price
    // Search range: from very low to very high price
    const currentPrice = BigInt(position.pool.currentPrice);
    let lowPrice = currentPrice / 10n; // Start search at 10% of current price
    let highPrice = currentPrice * 10n; // End search at 1000% of current price

    const tolerance = BigInt(10 ** (quoteToken.decimals - 4)); // Small tolerance for convergence
    const maxIterations = 50;

    for (let i = 0; i < maxIterations; i++) {
        const midPrice = (lowPrice + highPrice) / 2n;

        // Convert price to tick to calculate position value
        const tick = priceToTick(
            midPrice,
            position.pool.tickSpacing,
            baseToken.address,
            quoteToken.address,
            baseToken.decimals
        );

        // Calculate position value at this price
        // Convert tick to sqrtPriceX96 for hypothetical break-even calculation
        const sqrtPriceX96 = BigInt(TickMath.getSqrtRatioAtTick(tick).toString());
        const positionValue = calculatePositionValue(
            BigInt(position.liquidity),
            sqrtPriceX96,
            position.tickLower,
            position.tickUpper,
            midPrice,
            !position.token0IsQuote, // baseIsToken0 is opposite of token0IsQuote
            baseToken.decimals
        );

        // Check if we're close enough to target value
        const diff = positionValue > targetValue
            ? positionValue - targetValue
            : targetValue - positionValue;

        if (diff <= tolerance) {
            return midPrice;
        }

        // Adjust search range
        if (positionValue < targetValue) {
            lowPrice = midPrice;
        } else {
            highPrice = midPrice;
        }

        // Prevent infinite loops with very tight ranges
        if ((highPrice - lowPrice) <= tolerance) {
            break;
        }
    }

    // Return best approximation
    return (lowPrice + highPrice) / 2n;
}
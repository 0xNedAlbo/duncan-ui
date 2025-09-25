/**
 * Uniswap V3 Liquidity Calculation Utilities
 *
 * These functions implement the core Uniswap V3 math for converting between
 * token amounts and liquidity values based on price ranges.
 */

// Constants for Uniswap V3 math
const Q96 = 2n ** 96n;
const Q128 = 2n ** 128n;

/**
 * Convert tick to sqrt price
 * sqrt(1.0001^tick) * 2^96
 */
export function tickToSqrtPriceX96(tick: number): bigint {
    const absTick = Math.abs(tick);

    let ratio = 0xfffcb933bd6fad37aa2d162d1a594001n;
    if (absTick & 0x1) ratio = (ratio * 0xfff97272373d413259a46990580e213an) >> 128n;
    if (absTick & 0x2) ratio = (ratio * 0xfff2e50f5f656932ef12357cf3c7fdccn) >> 128n;
    if (absTick & 0x4) ratio = (ratio * 0xffe5caca7e10e4e61c3624eaa0941cd0n) >> 128n;
    if (absTick & 0x8) ratio = (ratio * 0xffcb9843d60f6159c9db58835c926644n) >> 128n;
    if (absTick & 0x10) ratio = (ratio * 0xff973b41fa98c081472e6896dfb254c0n) >> 128n;
    if (absTick & 0x20) ratio = (ratio * 0xff2ea16466c96a3843ec78b326b52861n) >> 128n;
    if (absTick & 0x40) ratio = (ratio * 0xfe5dee046a99a2a811c461f1969c3053n) >> 128n;
    if (absTick & 0x80) ratio = (ratio * 0xfcbe86c7900a88aedcffc83b479aa3a4n) >> 128n;
    if (absTick & 0x100) ratio = (ratio * 0xf987a7253ac413176f2b074cf7815e54n) >> 128n;
    if (absTick & 0x200) ratio = (ratio * 0xf3392b0822b70005940c7a398e4b70f3n) >> 128n;
    if (absTick & 0x400) ratio = (ratio * 0xe7159475a2c29b7443b29c7fa6e889d9n) >> 128n;
    if (absTick & 0x800) ratio = (ratio * 0xd097f3bdfd2022b8845ad8f792aa5825n) >> 128n;
    if (absTick & 0x1000) ratio = (ratio * 0xa9f746462d870fdf8a65dc1f90e061e5n) >> 128n;
    if (absTick & 0x2000) ratio = (ratio * 0x70d869a156d2a1b890bb3df62baf32f7n) >> 128n;
    if (absTick & 0x4000) ratio = (ratio * 0x31be135f97d08fd981231505542fcfa6n) >> 128n;
    if (absTick & 0x8000) ratio = (ratio * 0x9aa508b5b7a84e1c677de54f3e99bc9n) >> 128n;
    if (absTick & 0x10000) ratio = (ratio * 0x5d6af8dedb81196699c329225ee604n) >> 128n;
    if (absTick & 0x20000) ratio = (ratio * 0x2216e584f5fa1ea926041bedfe98n) >> 128n;
    if (absTick & 0x40000) ratio = (ratio * 0x48a170391f7dc42444e8fa2n) >> 128n;

    if (tick > 0) ratio = Q128 / ratio;

    return ratio >> 32n;
}

/**
 * Get amount0 for liquidity between two sqrt prices
 */
export function getAmount0ForLiquidity(
    sqrtRatioAX96: bigint,
    sqrtRatioBX96: bigint,
    liquidity: bigint
): bigint {
    const sqrtRatioLowerX96 = sqrtRatioAX96 < sqrtRatioBX96 ? sqrtRatioAX96 : sqrtRatioBX96;
    const sqrtRatioUpperX96 = sqrtRatioAX96 > sqrtRatioBX96 ? sqrtRatioAX96 : sqrtRatioBX96;

    return (liquidity << 96n) / sqrtRatioUpperX96 - (liquidity << 96n) / sqrtRatioLowerX96;
}

/**
 * Get amount1 for liquidity between two sqrt prices
 */
export function getAmount1ForLiquidity(
    sqrtRatioAX96: bigint,
    sqrtRatioBX96: bigint,
    liquidity: bigint
): bigint {
    const sqrtRatioLowerX96 = sqrtRatioAX96 < sqrtRatioBX96 ? sqrtRatioAX96 : sqrtRatioBX96;
    const sqrtRatioUpperX96 = sqrtRatioAX96 > sqrtRatioBX96 ? sqrtRatioAX96 : sqrtRatioBX96;

    return (liquidity * (sqrtRatioUpperX96 - sqrtRatioLowerX96)) / Q96;
}

/**
 * Get liquidity for amount0 between two sqrt prices
 */
export function getLiquidityForAmount0(
    sqrtRatioAX96: bigint,
    sqrtRatioBX96: bigint,
    amount0: bigint
): bigint {
    const sqrtRatioLowerX96 = sqrtRatioAX96 < sqrtRatioBX96 ? sqrtRatioAX96 : sqrtRatioBX96;
    const sqrtRatioUpperX96 = sqrtRatioAX96 > sqrtRatioBX96 ? sqrtRatioAX96 : sqrtRatioBX96;

    const intermediate = (sqrtRatioUpperX96 * sqrtRatioLowerX96) / Q96;
    return (amount0 * intermediate) / (sqrtRatioUpperX96 - sqrtRatioLowerX96);
}

/**
 * Get liquidity for amount1 between two sqrt prices
 */
export function getLiquidityForAmount1(
    sqrtRatioAX96: bigint,
    sqrtRatioBX96: bigint,
    amount1: bigint
): bigint {
    const sqrtRatioLowerX96 = sqrtRatioAX96 < sqrtRatioBX96 ? sqrtRatioAX96 : sqrtRatioBX96;
    const sqrtRatioUpperX96 = sqrtRatioAX96 > sqrtRatioBX96 ? sqrtRatioAX96 : sqrtRatioBX96;

    return (amount1 * Q96) / (sqrtRatioUpperX96 - sqrtRatioLowerX96);
}

/**
 * Get liquidity for given amounts and price range
 * This is the main function used in position creation
 */
export function getLiquidityForAmounts(
    sqrtRatioCurrentX96: bigint,
    sqrtRatioLowerX96: bigint,
    sqrtRatioUpperX96: bigint,
    amount0: bigint,
    amount1: bigint
): bigint {
    let liquidity: bigint;

    if (sqrtRatioCurrentX96 <= sqrtRatioLowerX96) {
        // Current price below range - use amount0
        liquidity = getLiquidityForAmount0(sqrtRatioLowerX96, sqrtRatioUpperX96, amount0);
    } else if (sqrtRatioCurrentX96 < sqrtRatioUpperX96) {
        // Current price in range - use both amounts
        const liquidity0 = getLiquidityForAmount0(sqrtRatioCurrentX96, sqrtRatioUpperX96, amount0);
        const liquidity1 = getLiquidityForAmount1(sqrtRatioLowerX96, sqrtRatioCurrentX96, amount1);
        liquidity = liquidity0 < liquidity1 ? liquidity0 : liquidity1;
    } else {
        // Current price above range - use amount1
        liquidity = getLiquidityForAmount1(sqrtRatioLowerX96, sqrtRatioUpperX96, amount1);
    }

    return liquidity;
}

/**
 * Get token amounts for given liquidity and price range
 */
export interface TokenAmounts {
    amount0: bigint;
    amount1: bigint;
}

export function getAmountsForLiquidity(
    sqrtRatioCurrentX96: bigint,
    sqrtRatioLowerX96: bigint,
    sqrtRatioUpperX96: bigint,
    liquidity: bigint
): TokenAmounts {
    let amount0: bigint = 0n;
    let amount1: bigint = 0n;

    if (sqrtRatioCurrentX96 <= sqrtRatioLowerX96) {
        // Current price below range
        amount0 = getAmount0ForLiquidity(sqrtRatioLowerX96, sqrtRatioUpperX96, liquidity);
    } else if (sqrtRatioCurrentX96 < sqrtRatioUpperX96) {
        // Current price in range
        amount0 = getAmount0ForLiquidity(sqrtRatioCurrentX96, sqrtRatioUpperX96, liquidity);
        amount1 = getAmount1ForLiquidity(sqrtRatioLowerX96, sqrtRatioCurrentX96, liquidity);
    } else {
        // Current price above range
        amount1 = getAmount1ForLiquidity(sqrtRatioLowerX96, sqrtRatioUpperX96, liquidity);
    }

    return { amount0, amount1 };
}

/**
 * Simplified wrapper for position sizing calculations
 */
export function calculateLiquidityFromTokenAmounts(
    currentPrice: string, // Current price as string (e.g., from pool.currentPrice)
    tickLower: number,
    tickUpper: number,
    amount0: bigint,
    amount1: bigint
): bigint {
    try {
        // Convert current price to sqrtPriceX96
        const priceFloat = parseFloat(currentPrice);
        const sqrtPrice = Math.sqrt(priceFloat);
        const sqrtPriceX96 = BigInt(Math.floor(sqrtPrice * Math.pow(2, 96)));

        // Convert ticks to sqrt prices
        const sqrtRatioLowerX96 = tickToSqrtPriceX96(tickLower);
        const sqrtRatioUpperX96 = tickToSqrtPriceX96(tickUpper);

        return getLiquidityForAmounts(
            sqrtPriceX96,
            sqrtRatioLowerX96,
            sqrtRatioUpperX96,
            amount0,
            amount1
        );
    } catch (error) {
        console.error('Error calculating liquidity:', error);
        return 0n;
    }
}
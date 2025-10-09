import { TickMath } from "@uniswap/v3-sdk";
import { Q96, Q192 } from "./constants";
import type { TokenAmounts } from "./types";
import { mulDiv } from "../math";

/**
 * Liquidity calculations for Uniswap V3 positions
 * Pure functions with simple parameters - no custom data structures
 */

/**
 * Calculate token amounts from liquidity for a given price range
 * @param liquidity The liquidity amount
 * @param tickCurrent Current price tick
 * @param tickLower Lower bound tick
 * @param tickUpper Upper bound tick
 * @returns Token amounts for token0 and token1
 */
export function getTokenAmountsFromLiquidity(
    liquidity: bigint,
    tickCurrent: number,
    tickLower: number,
    tickUpper: number,
    roundUp: boolean = false
): TokenAmounts {
    if (liquidity === 0n) {
        return { token0Amount: 0n, token1Amount: 0n };
    }

    const sqrtPriceLower = BigInt(
        TickMath.getSqrtRatioAtTick(tickLower).toString()
    );
    const sqrtPriceUpper = BigInt(
        TickMath.getSqrtRatioAtTick(tickUpper).toString()
    );
    const sqrtPriceCurrent = BigInt(
        TickMath.getSqrtRatioAtTick(tickCurrent).toString()
    );

    let token0Amount: bigint;
    let token1Amount: bigint;

    if (tickCurrent < tickLower) {
        // Price below range - all liquidity in token0
        token0Amount = getAmount0FromLiquidity(
            sqrtPriceLower,
            sqrtPriceUpper,
            liquidity,
            roundUp
        );
        token1Amount = 0n;
    } else if (tickCurrent >= tickUpper) {
        // Price above range - all liquidity in token1
        token0Amount = 0n;
        token1Amount = getAmount1FromLiquidity(
            sqrtPriceLower,
            sqrtPriceUpper,
            liquidity,
            roundUp
        );
    } else {
        // Price in range - mixed liquidity
        token0Amount = getAmount0FromLiquidity(
            sqrtPriceCurrent,
            sqrtPriceUpper,
            liquidity,
            roundUp
        );
        token1Amount = getAmount1FromLiquidity(
            sqrtPriceLower,
            sqrtPriceCurrent,
            liquidity,
            roundUp
        );
    }

    return { token0Amount, token1Amount };
}

/**
 * Calculate liquidity from token amounts
 * @param tickCurrent Current price tick
 * @param tickLower Lower bound tick
 * @param tickUpper Upper bound tick
 * @param token0Amount Amount of token0
 * @param token1Amount Amount of token1
 * @returns Liquidity that can be provided
 */
export function getLiquidityFromTokenAmounts(
    tickCurrent: number,
    tickLower: number,
    tickUpper: number,
    token0Amount: bigint,
    token1Amount: bigint
): bigint {
    const sqrtPriceLower = BigInt(
        TickMath.getSqrtRatioAtTick(tickLower).toString()
    );
    const sqrtPriceUpper = BigInt(
        TickMath.getSqrtRatioAtTick(tickUpper).toString()
    );
    const sqrtPriceCurrent = BigInt(
        TickMath.getSqrtRatioAtTick(tickCurrent).toString()
    );

    if (tickCurrent < tickLower) {
        // Price below range - only token0 determines liquidity
        return getLiquidityFromAmount0(
            sqrtPriceLower,
            sqrtPriceUpper,
            token0Amount
        );
    } else if (tickCurrent >= tickUpper) {
        // Price above range - only token1 determines liquidity
        return getLiquidityFromAmount1(
            sqrtPriceLower,
            sqrtPriceUpper,
            token1Amount
        );
    } else {
        // Price in range - take minimum liquidity from both tokens
        const liquidity0 = getLiquidityFromAmount0(
            sqrtPriceCurrent,
            sqrtPriceUpper,
            token0Amount
        );
        const liquidity1 = getLiquidityFromAmount1(
            sqrtPriceLower,
            sqrtPriceCurrent,
            token1Amount
        );
        return liquidity0 < liquidity1 ? liquidity0 : liquidity1;
    }
}

// Helper functions for liquidity math

export function getAmount0FromLiquidity(
    sqrtPriceLower: bigint,
    sqrtPriceUpper: bigint,
    liquidity: bigint,
    roundUp: boolean = false
): bigint {
    if (sqrtPriceUpper <= sqrtPriceLower || liquidity === 0n) return 0n;
    const numerator1 = liquidity * (sqrtPriceUpper - sqrtPriceLower); // L * (Δ√P)
    const denominator = sqrtPriceUpper * sqrtPriceLower;

    if (roundUp) {
        // Use ceiling division
        const product = numerator1 * Q96;
        return product % denominator === 0n ? product / denominator : product / denominator + 1n;
    } else {
        return mulDiv(numerator1, Q96, denominator);
    }
}

export function getAmount1FromLiquidity(
    sqrtPriceLower: bigint,
    sqrtPriceUpper: bigint,
    liquidity: bigint,
    roundUp: boolean = false
): bigint {
    if (sqrtPriceUpper <= sqrtPriceLower || liquidity === 0n) return 0n;
    const delta = sqrtPriceUpper - sqrtPriceLower;

    if (roundUp) {
        // Use ceiling division
        const product = liquidity * delta;
        return product % Q96 === 0n ? product / Q96 : product / Q96 + 1n;
    } else {
        return mulDiv(liquidity, delta, Q96);
    }
}

export function getLiquidityFromAmount0(
    sqrtPriceLower: bigint,
    sqrtPriceUpper: bigint,
    amount0: bigint,
    roundUp: boolean = false
): bigint {
    if (sqrtPriceUpper <= sqrtPriceLower || amount0 <= 0n) return 0n;
    const delta = sqrtPriceUpper - sqrtPriceLower;
    const numerator = amount0 * (sqrtPriceLower * sqrtPriceUpper);
    const denominator = Q96 * delta;

    if (roundUp) {
        // Ceiling division: (a + b - 1) / b
        return (numerator + denominator - 1n) / denominator;
    } else {
        // Floor division (default)
        return numerator / denominator;
    }
}

export function getLiquidityFromAmount1(
    sqrtPriceLower: bigint,
    sqrtPriceUpper: bigint,
    amount1: bigint,
    roundUp: boolean = false
): bigint {
    if (sqrtPriceUpper <= sqrtPriceLower || amount1 <= 0n) return 0n;
    const delta = sqrtPriceUpper - sqrtPriceLower;
    const numerator = amount1 * Q96;
    const denominator = delta;

    if (roundUp) {
        // Ceiling division: (a + b - 1) / b
        return (numerator + denominator - 1n) / denominator;
    } else {
        // Floor division (default)
        return numerator / denominator;
    }
}

export const pow10 = (n: number) => 10n ** BigInt(n);

/**
 * Calculate liquidity from total investment amounts using exact sqrt prices
 * Converts both base and quote amounts to total quote value, then calculates maximum liquidity
 * @param baseAmount Amount of base token to invest (in base token decimals)
 * @param baseDecimals Number of decimals for base token
 * @param quoteAmount Amount of quote token to invest (in quote token decimals)
 * @param quoteDecimals Number of decimals for quote token
 * @param isQuoteToken0 Whether quote token is token0 (affects price calculation)
 * @param sqrtPriceLowerX96 Lower bound sqrt price (Q96.96 format)
 * @param sqrtPriceUpperX96 Upper bound sqrt price (Q96.96 format)
 * @param sqrtPriceCurrentX96 Current sqrt price from pool slot0 (Q96.96 format)
 * @returns Maximum liquidity that can be provided with total investment
 */
export function getLiquidityFromInvestmentAmounts(
    baseAmount: bigint, // amount of base token (the non-quote token)
    baseDecimals: number,
    quoteAmount: bigint, // amount of quote token (your accounting currency)
    quoteDecimals: number,
    isQuoteToken0: boolean, // true: quote=token0, false: quote=token1
    sqrtPriceLowerX96: bigint,
    sqrtPriceUpperX96: bigint,
    sqrtPriceCurrentX96: bigint // <- slot0.sqrtPriceX96
): bigint {
    if (baseAmount <= 0n && quoteAmount <= 0n) return 0n;

    // Ensure ordering
    const A =
        sqrtPriceUpperX96 > sqrtPriceLowerX96
            ? sqrtPriceUpperX96
            : sqrtPriceLowerX96; // upper
    const B =
        sqrtPriceUpperX96 > sqrtPriceLowerX96
            ? sqrtPriceLowerX96
            : sqrtPriceUpperX96; // lower
    const S = sqrtPriceCurrentX96;

    // Current location vs. range
    if (S <= B) {
        // BELOW range -> all liquidity needs token0
        // Convert total budget to token0 if needed, then use amount0->L
        const totalBudgetQuote = totalBudgetInQuote(
            baseAmount,
            baseDecimals,
            quoteAmount,
            quoteDecimals,
            isQuoteToken0,
            S
        );
        const amount0 = isQuoteToken0
            ? totalBudgetQuote // already token0 units
            : quoteToToken0(totalBudgetQuote, S);
        return getLiquidityFromAmount0(B, A, amount0);
    }

    if (S >= A) {
        // ABOVE range -> all liquidity needs token1
        // Convert total budget to token1 if needed, then use amount1->L
        const totalBudgetQuote = totalBudgetInQuote(
            baseAmount,
            baseDecimals,
            quoteAmount,
            quoteDecimals,
            isQuoteToken0,
            S
        );
        const amount1 = isQuoteToken0
            ? token0ToQuoteToken1(totalBudgetQuote, S) // convert token0->token1
            : totalBudgetQuote; // already token1 units
        return getLiquidityFromAmount1(B, A, amount1);
    }

    // IN RANGE: compute L = (Budget * Q96) / (K_Q96 * 10^quoteDecimals)
    const budgetQuote = totalBudgetInQuote(
        baseAmount,
        baseDecimals,
        quoteAmount,
        quoteDecimals,
        isQuoteToken0,
        S
    );

    const K_Q96 = isQuoteToken0
        ? K_Q96_inToken0(B, A, S) // quote is token0
        : K_Q96_inToken1(B, A, S); // quote is token1
    if (K_Q96 <= 0n) return 0n; // guard (degenerate edges)

    return (budgetQuote * Q96) / K_Q96;
}

/**
 * Calculate liquidity from total investment amounts using tick boundaries (compatibility wrapper)
 * Less accurate than using exact sqrt prices - prefer getLiquidityFromInvestmentAmounts when possible
 * @param baseAmount Amount of base token to invest (in base token decimals)
 * @param baseDecimals Number of decimals for base token
 * @param quoteAmount Amount of quote token to invest (in quote token decimals)
 * @param quoteDecimals Number of decimals for quote token
 * @param isQuoteToken0 Whether quote token is token0 (affects price calculation)
 * @param tickUpper Upper bound tick
 * @param tickLower Lower bound tick
 * @param sqrtPriceCurrentX96 Current sqrt price from pool slot0 (Q96.96 format)
 * @returns Maximum liquidity that can be provided with total investment
 */
export function getLiquidityFromInvestmentAmounts_withTick(
    baseAmount: bigint,
    baseDecimals: number,
    quoteAmount: bigint,
    quoteDecimals: number,
    isQuoteToken0: boolean,
    tickUpper: number,
    tickLower: number,
    sqrtPriceCurrentX96: bigint
): bigint {
    const sqrtPriceLowerX96 = BigInt(
        TickMath.getSqrtRatioAtTick(tickLower).toString()
    );
    const sqrtPriceUpperX96 = BigInt(
        TickMath.getSqrtRatioAtTick(tickUpper).toString()
    );
    return getLiquidityFromInvestmentAmounts(
        baseAmount,
        baseDecimals,
        quoteAmount,
        quoteDecimals,
        isQuoteToken0,
        sqrtPriceLowerX96,
        sqrtPriceUpperX96,
        sqrtPriceCurrentX96
    );
}

// -----------------------------
// Helpers
// -----------------------------

/**
 * Convert both pockets into QUOTE token units and sum them.
 * Uses correct Q192 price depending on whether quote is token0 or token1.
 */
function totalBudgetInQuote(
    baseAmount: bigint,
    baseDecimals: number,
    quoteAmount: bigint,
    quoteDecimals: number,
    isQuoteToken0: boolean,
    S: bigint
): bigint {
    const baseAsQuote = isQuoteToken0
        ? // quote=token0, base=token1 -> price (quote/base) = Q192 / S^2
          (baseAmount * Q192) / (S * S)
        : // quote=token1, base=token0 -> price (quote/base) = S^2 / Q192
          (baseAmount * S * S) / Q192;
    return quoteAmount + baseAsQuote;
}

/** Convert a QUOTE budget (token1) into token0 amount, respecting decimals. */
function quoteToToken0(amountQuoteToken1: bigint, S: bigint): bigint {
    // token0/token1 price = Q192 / S^2
    return (amountQuoteToken1 * Q192) / (S * S);
}

/** Convert a QUOTE budget (token0) into token1 amount, respecting decimals. */
function token0ToQuoteToken1(amountQuoteToken0: bigint, S: bigint): bigint {
    // token1/token0 price = S^2 / Q192
    return (amountQuoteToken0 * S * S) / Q192;
}

/**
 * K (quote value per unit L) in token1 units, scaled by Q96.
 * K_Q96 = (S - B) + floor( S * (A - S) / A )
 */
function K_Q96_inToken1(B: bigint, A: bigint, S: bigint): bigint {
    if (S <= B) return 0n;
    if (S >= A) return 0n;
    const term1 = S - B; // already in X96 units
    const term2 = (S * (A - S)) / A; // floor(S * (A - S) / A), still X96
    return term1 + term2; // X96
}

/**
 * K (quote value per unit L) in token0 units, scaled by Q96.
 * K0_perL = Q96*(A - S)/(A*S) + Q96*(S - B)/S^2
 * => K_Q96 = Q192*(A - S)/(A*S) + Q192*(S - B)/S^2  (so that final division uses ... *Q96 / K_Q96)
 */
function K_Q96_inToken0(B: bigint, A: bigint, S: bigint): bigint {
    if (S <= B) return 0n;
    if (S >= A) return 0n;
    const termA = (Q192 * (A - S)) / (A * S); // ~ Q96*(A - S)/(A*S) * Q96
    const termB = (Q192 * (S - B)) / (S * S); // ~ Q96*(S - B)/S^2 * Q96
    return termA + termB; // X96
}

/**
 * Calculate position value at current price
 * @param liquidity The position liquidity
 * @param tickCurrent Current price tick
 * @param tickLower Lower bound tick
 * @param tickUpper Upper bound tick
 * @param currentPrice Current price (quote per base)
 * @param baseIsToken0 Whether base token is token0
 * @param baseDecimals Decimals of base token
 * @returns Position value in quote token units
 */
export function calculatePositionValue(
    liquidity: bigint,
    tickCurrent: number,
    tickLower: number,
    tickUpper: number,
    currentPrice: bigint,
    baseIsToken0: boolean,
    baseDecimals: number
): bigint {
    if (liquidity === 0n) return 0n;

    const { token0Amount, token1Amount } = getTokenAmountsFromLiquidity(
        liquidity,
        tickCurrent,
        tickLower,
        tickUpper
    );

    // Convert to value in quote token
    if (baseIsToken0) {
        // token0 = base, token1 = quote
        // Value = token0Amount * price + token1Amount
        return (
            (token0Amount * currentPrice) / 10n ** BigInt(baseDecimals) +
            token1Amount
        );
    } else {
        // token0 = quote, token1 = base
        // Value = token0Amount + token1Amount * price
        return (
            token0Amount +
            (token1Amount * currentPrice) / 10n ** BigInt(baseDecimals)
        );
    }
}

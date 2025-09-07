import { TickMath } from "@uniswap/v3-sdk";
import { Q96 } from "./constants";

/**
 * Liquidity calculations for Uniswap V3 positions
 * Pure functions with simple parameters - no custom data structures
 */

export interface TokenAmounts {
  token0Amount: bigint;
  token1Amount: bigint;
}

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
  tickUpper: number
): TokenAmounts {
  if (liquidity === 0n) {
    return { token0Amount: 0n, token1Amount: 0n };
  }

  const sqrtPriceLower = BigInt(TickMath.getSqrtRatioAtTick(tickLower).toString());
  const sqrtPriceUpper = BigInt(TickMath.getSqrtRatioAtTick(tickUpper).toString());
  const sqrtPriceCurrent = BigInt(TickMath.getSqrtRatioAtTick(tickCurrent).toString());

  let token0Amount: bigint;
  let token1Amount: bigint;

  if (tickCurrent < tickLower) {
    // Price below range - all liquidity in token0
    token0Amount = getAmount0FromLiquidity(sqrtPriceLower, sqrtPriceUpper, liquidity);
    token1Amount = 0n;
  } else if (tickCurrent >= tickUpper) {
    // Price above range - all liquidity in token1
    token0Amount = 0n;
    token1Amount = getAmount1FromLiquidity(sqrtPriceLower, sqrtPriceUpper, liquidity);
  } else {
    // Price in range - mixed liquidity
    token0Amount = getAmount0FromLiquidity(sqrtPriceCurrent, sqrtPriceUpper, liquidity);
    token1Amount = getAmount1FromLiquidity(sqrtPriceLower, sqrtPriceCurrent, liquidity);
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
  const sqrtPriceLower = BigInt(TickMath.getSqrtRatioAtTick(tickLower).toString());
  const sqrtPriceUpper = BigInt(TickMath.getSqrtRatioAtTick(tickUpper).toString());
  const sqrtPriceCurrent = BigInt(TickMath.getSqrtRatioAtTick(tickCurrent).toString());

  if (tickCurrent < tickLower) {
    // Price below range - only token0 determines liquidity
    return getLiquidityFromAmount0(sqrtPriceLower, sqrtPriceUpper, token0Amount);
  } else if (tickCurrent >= tickUpper) {
    // Price above range - only token1 determines liquidity
    return getLiquidityFromAmount1(sqrtPriceLower, sqrtPriceUpper, token1Amount);
  } else {
    // Price in range - take minimum liquidity from both tokens
    const liquidity0 = getLiquidityFromAmount0(sqrtPriceCurrent, sqrtPriceUpper, token0Amount);
    const liquidity1 = getLiquidityFromAmount1(sqrtPriceLower, sqrtPriceCurrent, token1Amount);
    return liquidity0 < liquidity1 ? liquidity0 : liquidity1;
  }
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
    return (token0Amount * currentPrice) / (10n ** BigInt(baseDecimals)) + token1Amount;
  } else {
    // token0 = quote, token1 = base  
    // Value = token0Amount + token1Amount * price
    return token0Amount + (token1Amount * currentPrice) / (10n ** BigInt(baseDecimals));
  }
}

// Helper functions for liquidity math

function getAmount0FromLiquidity(
  sqrtPriceLower: bigint,
  sqrtPriceUpper: bigint,
  liquidity: bigint
): bigint {
  if (sqrtPriceUpper <= sqrtPriceLower) return 0n;
  
  return (liquidity * (sqrtPriceUpper - sqrtPriceLower)) / (sqrtPriceLower * sqrtPriceUpper / Q96);
}

function getAmount1FromLiquidity(
  sqrtPriceLower: bigint,
  sqrtPriceUpper: bigint,
  liquidity: bigint
): bigint {
  if (sqrtPriceUpper <= sqrtPriceLower) return 0n;
  
  return (liquidity * (sqrtPriceUpper - sqrtPriceLower)) / Q96;
}

function getLiquidityFromAmount0(
  sqrtPriceLower: bigint,
  sqrtPriceUpper: bigint,
  amount0: bigint
): bigint {
  if (sqrtPriceUpper <= sqrtPriceLower || amount0 <= 0n) return 0n;
  
  const intermediate = (sqrtPriceLower * sqrtPriceUpper) / Q96;
  return (amount0 * intermediate) / (sqrtPriceUpper - sqrtPriceLower);
}

function getLiquidityFromAmount1(
  sqrtPriceLower: bigint,
  sqrtPriceUpper: bigint,
  amount1: bigint
): bigint {
  if (sqrtPriceUpper <= sqrtPriceLower || amount1 <= 0n) return 0n;
  
  return (amount1 * Q96) / (sqrtPriceUpper - sqrtPriceLower);
}
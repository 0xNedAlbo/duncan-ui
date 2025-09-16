/**
 * Uniswap V3 Utilities
 * 
 * Pure mathematical utilities for Uniswap V3 calculations
 * All functions work with primitive parameters - no custom data structures required
 */

// Types and constants
export * from "./types";
export * from "./constants";

// Core utilities
export * from "./price";
export * from "./liquidity";
export * from "./position";
export * from "./utils";

// Commonly used functions (convenience re-exports)
export {
  // Price/tick conversions
  priceToSqrtRatioX96,
  tickToPrice,
  priceToTick,
  priceToClosestUsableTick,
  tickToSqrtRatioX96,
  sqrtRatioX96ToToken1PerToken0,
  sqrtRatioX96ToToken0PerToken1,
} from "./price";

export {
  // Liquidity calculations
  getTokenAmountsFromLiquidity,
  getLiquidityFromTokenAmounts,
} from "./liquidity";

export {
  // Position analysis
  determinePhase,
  calculatePnL,
  generatePnLCurve,
  calculatePositionValueAtPrice,
} from "./position";

export {
  // Utility functions
  sameAddress,
  isValidAddress,
  isToken0,
  sortTokens,
  getTokenMapping,
  getTickSpacing,
} from "./utils";
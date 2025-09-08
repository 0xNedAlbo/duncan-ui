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
  sqrtToPrice0In1,
  sqrtToPrice1In0,
} from "./price";

export {
  // Liquidity calculations
  getTokenAmountsFromLiquidity,
  getLiquidityFromTokenAmounts,
  calculatePositionValue,
} from "./liquidity";

export {
  // Position analysis
  determineRangeStatus,
  determinePhase,
  calculatePnL,
  generatePnLCurve,
  compareToHoldStrategy,
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
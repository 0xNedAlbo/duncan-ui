import { Token } from "@uniswap/sdk-core";
import type { Pool as V3Pool } from "@uniswap/v3-sdk";

/**
 * Essential types for Uniswap V3 calculations
 * Minimal type definitions for the pure function utilities
 */

// SDK type aliases for cleaner imports
export type SdkToken = Token;
export type SdkPool = V3Pool;

// Fee tier constants
export const FEE_TIERS = [100, 500, 3000, 10000] as const; // 0.01%, 0.05%, 0.3%, 1%
export type FeeTier = (typeof FEE_TIERS)[number];

// Token amounts interface for liquidity calculations
export interface TokenAmounts {
    token0Amount: bigint;
    token1Amount: bigint;
}

// Range status for positions
export type RangeStatus =
    | "in-range"
    | "out-of-range-below"
    | "out-of-range-above"
    | "unknown";

// Position phase for PnL curves
export type PositionPhase = "below" | "in-range" | "above";

// PnL curve data point
export interface PnLPoint {
    price: bigint;
    positionValue: bigint;
    pnl: bigint;
    pnlPercent: number;
    phase: PositionPhase;
}

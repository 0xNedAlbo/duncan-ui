/**
 * PnL (Profit and Loss) Type Definitions
 *
 * Types for position PnL calculations and unclaimed fees.
 */

import type { BasicPosition } from './positions';

/**
 * PnL breakdown for a position
 * All values in quote token units as BigInt strings
 */
export interface PnlBreakdown {
  // Core position metrics (all in quote token units as strings)
  currentValue: string;           // Current position value
  currentCostBasis: string;       // Latest cost basis from PositionEvent
  collectedFees: string;          // Total fees collected historically
  unclaimedFees: string;          // Current unclaimed fees value
  realizedPnL: string;            // Current realized PnL from PositionEvent

  // Derived metrics
  unrealizedPnL: string;          // currentValue - currentCostBasis
  totalPnL: string;               // unrealizedPnL + collectedFees + unclaimedFees

  // Metadata
  positionChain: string;
  positionProtocol: string;
  positionNftId: string;
  calculatedAt: Date;
}

/**
 * Enhanced position interface with PnL data
 * Used in API responses and components that need both position and PnL data
 */
export interface PositionWithPnL extends BasicPosition {
  initialValue: string;
  currentValue: string;
  unrealizedPnL: string;
  realizedPnL: string;
  totalPnL: string;
  feesCollected0: string;
  feesCollected1: string;
  feeValueInQuote: string;
}

// Re-export UnclaimedFeesWithMetadata from the implementation file
export type { UnclaimedFeesWithMetadata } from "@/lib/utils/uniswap-v3/fees";

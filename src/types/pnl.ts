/**
 * PnL (Profit and Loss) Type Definitions
 *
 * Types for position PnL calculations and unclaimed fees.
 */

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

// Re-export UnclaimedFeesWithMetadata from the implementation file
export type { UnclaimedFeesWithMetadata } from "@/lib/utils/uniswap-v3/fees";

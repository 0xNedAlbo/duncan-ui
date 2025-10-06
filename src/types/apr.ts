/**
 * APR (Annual Percentage Rate) Type Definitions
 *
 * Types for position APR calculations and time-weighted returns.
 */

/**
 * APR breakdown for a position
 * Includes realized, unrealized, and total APR metrics
 */
export interface AprBreakdown {
    positionChain: string;
    positionProtocol: string;
    positionNftId: string;

    // Realized metrics
    realizedApr: number;              // APR from collected fees only
    realizedFeesCollected: string;    // Collected fees (BigInt as string)
    realizedTWCostBasis: string;      // Time-weighted cost basis for realized periods (BigInt as string)
    realizedActiveDays: number;       // Days covered by realized periods

    // Unrealized metrics
    unrealizedApr: number;            // APR from unclaimed fees only
    unrealizedFeesUnclaimed: string;  // Current unclaimed fees (BigInt as string)
    unrealizedCostBasis: string;      // Current period cost basis (BigInt as string)
    unrealizedActiveDays: number;     // Days since last collect/start

    // Total metrics (calculated from realized + unrealized components)
    totalApr: number;                 // Time-weighted average: (realizedApr * realizedActiveDays + unrealizedApr * unrealizedActiveDays) / totalActiveDays
    totalActiveDays: number;          // realizedActiveDays + unrealizedActiveDays (0 for closed positions)
    totalTWCostBasis: string;         // Time-weighted average of realized + unrealized cost basis

    calculatedAt: Date;
}

/**
 * APR calculation result
 * Used internally by APR service
 */
export interface AprCalculationResult {
    positionChain: string;
    positionProtocol: string;
    positionNftId: string;
    totalApr: number;
    timeWeightedCostBasis: string;
    totalFeesCollected: string;
    totalActiveDays: number;
    calculatedAt: Date;
    periods: any[]; // PositionEventApr from Prisma
}

/**
 * Capital period for fee distribution
 * Represents a period between INCREASE/DECREASE events
 */
export interface CapitalPeriod {
    eventId: string;
    startDate: Date;
    endDate: Date | null;
    durationDays: number | null;
    costBasis: string;              // BigInt as string
    weight: number;                 // For fee distribution calculation
}

/**
 * Fee distribution across periods
 */
export interface FeeDistribution {
    collectEventId: string;
    totalFees: string;              // BigInt as string
    distributions: {
        periodId: string;
        allocatedFees: string;      // BigInt as string
        proportion: number;         // 0-1
    }[];
}

/**
 * APR calculation metrics
 * Summary statistics for APR calculation
 */
export interface AprCalculationMetrics {
    totalPeriods: number;
    activePeriods: number;          // Periods with positive duration and cost basis
    collectEvents: number;
    totalFeesDistributed: string;   // BigInt as string
    averagePeriodDuration: number;  // Days
    timeWeightedCostBasis: string;  // BigInt as string
}

// ============================================
// API Response Types
// ============================================

/**
 * APR period data for API responses
 */
export interface AprPeriodData {
  eventId: string;
  periodStartDate: string;          // ISO string
  periodEndDate: string | null;     // ISO string or null for latest
  periodDays: number | null;
  periodCostBasis: string;          // BigInt as string
  allocatedFees: string;            // BigInt as string
  periodApr: number | null;         // Percentage
}

/**
 * Position APR summary for API responses
 */
export interface PositionAprSummary {
  positionId: string;
  totalApr: number;                 // Percentage
  totalTWCostBasis: string;         // BigInt as string
  realizedFeesCollected: string;    // BigInt as string
  totalActiveDays: number;
  calculatedAt: string;             // ISO string
  periods: AprPeriodData[];
}

/**
 * APR calculation parameters
 */
export interface AprCalculationParams {
    positionId: string;
    forceRecalculate?: boolean;
}

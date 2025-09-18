/**
 * APR Calculation Types
 *
 * TypeScript interfaces for APR calculation data and API responses
 */

export interface AprPeriodData {
    eventId: string;
    periodStartDate: string; // ISO string
    periodEndDate: string | null; // ISO string or null for latest
    periodDays: number | null;
    periodCostBasis: string; // BigInt as string
    allocatedFees: string; // BigInt as string
    periodApr: number | null; // Percentage
}

export interface PositionAprSummary {
    positionId: string;
    totalApr: number; // Percentage
    timeWeightedCostBasis: string; // BigInt as string
    totalFeesCollected: string; // BigInt as string
    totalActiveDays: number;
    calculatedAt: string; // ISO string
    periods: AprPeriodData[];
}

export interface AprApiResponse {
    chain: string;
    nftId: string;
    success: boolean;
    data?: PositionAprSummary;
    error?: string;
}

export interface AprCalculationParams {
    positionId: string;
    forceRecalculate?: boolean;
}

// Internal service types
export interface CapitalPeriod {
    eventId: string;
    startDate: Date;
    endDate: Date | null;
    durationDays: number | null;
    costBasis: string; // BigInt as string
    weight: number; // For fee distribution calculation
}

export interface FeeDistribution {
    collectEventId: string;
    totalFees: string; // BigInt as string
    distributions: {
        periodId: string;
        allocatedFees: string; // BigInt as string
        proportion: number; // 0-1
    }[];
}

export interface AprCalculationMetrics {
    totalPeriods: number;
    activePeriods: number; // Periods with positive duration and cost basis
    collectEvents: number;
    totalFeesDistributed: string; // BigInt as string
    averagePeriodDuration: number; // Days
    timeWeightedCostBasis: string; // BigInt as string
}
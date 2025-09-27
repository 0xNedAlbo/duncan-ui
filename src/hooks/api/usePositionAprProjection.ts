/**
 * usePositionAprProjection Hook
 *
 * Centralized hook for calculating prospective APR projections for Uniswap V3 positions
 * Based on historical 24h trading data and current position parameters
 */

import { useMemo } from "react";
import type { PoolData } from "@/hooks/api/usePool";
import { usePoolFeeData } from "@/hooks/api/usePoolFeeData";
import { calculateProspectiveApr } from "@/lib/utils/apr-calculation";

interface UsePositionAprProjectionParams {
    pool: PoolData;           // Pool data containing chain, address, currentTick, etc.
    liquidity: bigint;        // User's position liquidity amount (Uniswap V3 liquidity value)
    tickLower?: number;       // Lower tick of position range
    tickUpper?: number;       // Upper tick of position range
    isToken0Base: boolean;    // Whether token0 is the base token (for correct decimal scaling)
    enabled?: boolean;        // Enable/disable the hook
}

interface UsePositionAprProjectionResult {
    // Loading/error states
    isLoading: boolean;
    isError: boolean;
    error?: Error | null;

    // Raw calculation data (no formatting)
    apr: number;                    // Annual APR as decimal (0.25 = 25%)
    dailyApr: number;              // Daily APR as decimal
    sharePercent: number;          // User's pool share as decimal (0.001 = 0.1%)

    // Raw fee amounts (in token units)
    token0Fees: bigint;            // Daily fees in token0 amount
    token1Fees: bigint;            // Daily fees in token1 amount
    totalFeesQuote: bigint;        // Daily fees in quote token amount

    // Position metrics
    positionValueQuote: bigint;    // Position value in quote token

    // Status flags
    isOutOfRange: boolean;
    hasValidData: boolean;
}

/**
 * Hook for calculating prospective APR projections
 * Returns raw numerical data without any display formatting
 */
export function usePositionAprProjection({
    pool,
    liquidity,
    tickLower,
    tickUpper,
    isToken0Base,
    enabled = true,
}: UsePositionAprProjectionParams): UsePositionAprProjectionResult {

    // Fetch pool fee data from API
    const {
        data: poolFeeData,
        isLoading,
        isError,
        error,
    } = usePoolFeeData(pool.chain, pool.poolAddress, {
        enabled: enabled && !!pool.chain && !!pool.poolAddress && liquidity > 0n,
    });

    // Calculate APR from pool fee data
    const aprCalculation = useMemo(() => {
        if (
            !poolFeeData ||
            liquidity === 0n ||
            !pool.currentTick ||
            tickLower === undefined ||
            tickUpper === undefined ||
            isNaN(tickLower) ||
            isNaN(tickUpper)
        ) {
            return null;
        }

        try {
            return calculateProspectiveApr(
                poolFeeData,
                liquidity,
                pool.currentTick,
                tickLower,
                tickUpper,
                isToken0Base
            );
        } catch (error) {
            console.error("Error calculating APR projection:", error);
            return null;
        }
    }, [poolFeeData, liquidity, pool.currentTick, tickLower, tickUpper, isToken0Base]);

    // Check if current price is out of range
    const isOutOfRange = useMemo(() => {
        if (
            !pool?.currentTick ||
            tickLower === undefined ||
            tickUpper === undefined ||
            isNaN(tickLower) ||
            isNaN(tickUpper)
        ) {
            return false;
        }
        return pool.currentTick < tickLower || pool.currentTick > tickUpper;
    }, [pool?.currentTick, tickLower, tickUpper]);

    // Return structured data without any formatting
    if (!aprCalculation) {
        return {
            isLoading,
            isError,
            error,
            apr: 0,
            dailyApr: 0,
            sharePercent: 0,
            token0Fees: 0n,
            token1Fees: 0n,
            totalFeesQuote: 0n,
            positionValueQuote: 0n,
            isOutOfRange,
            hasValidData: false,
        };
    }

    return {
        isLoading,
        isError,
        error,
        apr: aprCalculation.annualizedApr / 100, // Convert percentage to decimal
        dailyApr: aprCalculation.dailyApr / 100, // Convert percentage to decimal
        sharePercent: aprCalculation.userSharePercent / 100, // Convert percentage to decimal
        token0Fees: aprCalculation.userFeesToken0,
        token1Fees: aprCalculation.userFeesToken1,
        totalFeesQuote: aprCalculation.userFeesQuoteValue,
        positionValueQuote: aprCalculation.positionValueQuote,
        isOutOfRange,
        hasValidData: true,
    };
}
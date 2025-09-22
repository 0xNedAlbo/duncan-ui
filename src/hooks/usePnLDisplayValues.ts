/**
 * PnL Display Values Hook
 *
 * Hook for formatting PnL breakdown data for display
 */

import { useMemo } from 'react';
import type { PnlBreakdown } from '@/services/positions/positionPnLService';

interface PnLDisplayValues {
  currentValue: bigint | null;
  totalPnL: bigint | null;
  unclaimedFees: bigint | null;
  pnlColor: string;
  isPositive: boolean;
  isNegative: boolean;
}

/**
 * Hook to get formatted display values for PnL data
 */
export function usePnLDisplayValues(
  pnlData: PnlBreakdown | undefined,
  // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
  quoteTokenDecimals: number
): PnLDisplayValues {
  return useMemo(() => {
    if (!pnlData) {
      return {
        currentValue: null,
        totalPnL: null,
        unclaimedFees: null,
        pnlColor: 'text-slate-400',
        isPositive: false,
        isNegative: false,
      };
    }

    // Calculate total PnL including fees
    const totalPnL = BigInt(pnlData.realizedPnL) +
      BigInt(pnlData.collectedFees) +
      BigInt(pnlData.unclaimedFees) +
      (BigInt(pnlData.currentValue) - BigInt(pnlData.currentCostBasis));

    const isPositive = totalPnL > 0n;
    const isNegative = totalPnL < 0n;

    const pnlColor = isPositive
      ? 'text-green-400'
      : isNegative
      ? 'text-red-400'
      : 'text-slate-400';

    return {
      currentValue: BigInt(pnlData.currentValue),
      totalPnL,
      unclaimedFees: BigInt(pnlData.unclaimedFees),
      pnlColor,
      isPositive,
      isNegative,
    };
  }, [pnlData]);
}
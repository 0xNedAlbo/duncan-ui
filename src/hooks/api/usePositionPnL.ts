/**
 * Hook for fetching position PnL data
 */

import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { apiClient } from '@/lib/app/apiClient';
import type { ApiError } from '@/lib/app/apiError';
import type { PositionPnlResponse } from '@/types/api';
import type { PnlBreakdown } from '@/services/positions/positionPnLService';

export interface UsePositionPnLOptions extends Omit<UseQueryOptions<PnlBreakdown, ApiError>, 'queryKey' | 'queryFn'> {
  enabled?: boolean;
}

/**
 * Hook to fetch PnL breakdown for a specific position
 *
 * @param chain - The blockchain network (ethereum, arbitrum, base)
 * @param nftId - The NFT token ID of the position
 * @param options - Additional query options
 * @returns Query result with PnL breakdown data
 */
export function usePositionPnL(
  chain: string | undefined,
  nftId: string | undefined,
  options?: UsePositionPnLOptions
) {
  return useQuery({
    queryKey: ['positions', 'pnl', chain, nftId],
    queryFn: async () => {
      if (!chain || !nftId) {
        throw new Error('Chain and NFT ID are required');
      }

      const response = await apiClient.get<PositionPnlResponse>(
        `/api/positions/uniswapv3/nft/${chain}/${nftId}/pnl`
      );

      if (!response.data) {
        throw new Error('No PnL data received');
      }

      return response.data;
    },
    enabled: Boolean(chain && nftId && options?.enabled !== false),

    // Use shorter stale time for PnL data as it changes frequently
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes

    // Retry configuration for blockchain data
    retry: (failureCount, error) => {
      // Don't retry on 404 (position not found) or 401 (unauthorized)
      if (error instanceof Error && (
        error.message.includes('404') ||
        error.message.includes('401') ||
        error.message.includes('Position not found')
      )) {
        return false;
      }

      // Retry up to 2 times for other errors
      return failureCount < 2;
    },

    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),

    // Merge with custom options
    ...options,
  });
}

/**
 * Hook to get formatted PnL display values
 *
 * @param pnlData - PnL breakdown data
 * @param quoteTokenDecimals - Number of decimals for the quote token
 * @returns Formatted values for display
 */
export function usePnLDisplayValues(
  pnlData: PnlBreakdown | undefined,
  quoteTokenDecimals: number
) {
  if (!pnlData) {
    return {
      currentValue: null,
      totalPnL: null,
      unclaimedFees: null,
      pnlColor: 'text-slate-400' as const,
      isPositive: false,
      isNegative: false,
    };
  }

  // Use the service-provided totalPnL which includes all fees
  // totalPnL = unrealizedPnL + collectedFees + unclaimedFees (overall position performance)
  const totalPnL = BigInt(pnlData.totalPnL);

  const isPositive = totalPnL > 0n;
  const isNegative = totalPnL < 0n;

  const pnlColor = isPositive
    ? 'text-green-400' as const
    : isNegative
    ? 'text-red-400' as const
    : 'text-slate-400' as const;

  return {
    currentValue: BigInt(pnlData.currentValue),
    totalPnL,
    unclaimedFees: BigInt(pnlData.unclaimedFees),
    pnlColor,
    isPositive,
    isNegative,
    quoteTokenDecimals,
  };
}
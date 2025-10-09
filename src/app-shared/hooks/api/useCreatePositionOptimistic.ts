/**
 * Create Position Optimistically Hook
 *
 * Hook for creating positions with minimal validation for instant UI updates
 */

import { useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query';
import { apiClient } from '@/app-shared/lib/api-client/apiClient';
import { ApiError } from '@/app-shared/lib/api-client/apiError';
import type { PositionRefreshResponse } from '@/types/api';
import { QUERY_KEYS } from '@/types/api';

export interface CreatePositionOptimisticRequest {
  chain: string;
  nftId: string;
  poolAddress: string;
  tickLower: number;
  tickUpper: number;
  liquidity: string;
  token0IsQuote: boolean;
  owner?: string;
  events?: Array<{
    eventType: "INCREASE_LIQUIDITY" | "DECREASE_LIQUIDITY" | "COLLECT";
    transactionHash: string;
    blockNumber: string;
    transactionIndex: number;
    logIndex: number;
    liquidity?: string;
    amount0?: string;
    amount1?: string;
    recipient?: string;
  }>;
}

/**
 * Hook to create a position optimistically
 *
 * Creates a position record in the database with minimal validation.
 * Returns full position data including PnL, APR, and curve data.
 * The API now seeds the initial event and calculates all metrics immediately.
 */
export function useCreatePositionOptimistic(
  options?: UseMutationOptions<PositionRefreshResponse, ApiError, CreatePositionOptimisticRequest>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePositionOptimisticRequest) =>
      apiClient.put<PositionRefreshResponse>(
        `/api/positions/uniswapv3/${data.chain}/${data.nftId}`,
        {
          poolAddress: data.poolAddress,
          tickLower: data.tickLower,
          tickUpper: data.tickUpper,
          liquidity: data.liquidity,
          token0IsQuote: data.token0IsQuote,
          owner: data.owner,
          events: data.events,
        }
      ),
    onSuccess: () => {
      // Invalidate positions list to show the new position with full data
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.positions });
    },
    ...options,
  });
}

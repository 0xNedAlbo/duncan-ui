/**
 * Update Position With Events Hook
 *
 * Hook for updating existing positions by seeding events from transaction receipts
 */

import { useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query';
import { apiClient } from '@/app-shared/lib/api-client/apiClient';
import { ApiError } from '@/app-shared/lib/api-client/apiError';
import type { PositionRefreshResponse } from '@/types/api';
import { QUERY_KEYS } from '@/types/api';

export interface UpdatePositionWithEventsRequest {
  chain: string;
  nftId: string;
  // Position fields (all available from loaded position)
  poolAddress: string;
  tickLower: number;
  tickUpper: number;
  liquidity: string; // New total liquidity after the transaction
  token0IsQuote: boolean;
  owner?: string;
  // Events from transaction receipt
  events: Array<{
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
 * Hook to update position by seeding events from transaction receipts
 * Uses PUT endpoint to update existing position with fresh event data
 */
export function useUpdatePositionWithEvents(
  options?: UseMutationOptions<PositionRefreshResponse, ApiError, UpdatePositionWithEventsRequest>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdatePositionWithEventsRequest) =>
      apiClient.put<PositionRefreshResponse>(
        `/api/positions/uniswapv3/${data.chain}/${data.nftId}`,
        {
          poolAddress: data.poolAddress,
          tickLower: data.tickLower,
          tickUpper: data.tickUpper,
          liquidity: data.liquidity,
          token0IsQuote: data.token0IsQuote,
          owner: data.owner,
          events: data.events
        }
      ),
    onSuccess: (response, variables) => {
      // Invalidate position details query used by PositionCard
      // Query key pattern: ['position', userId, chain, protocol, nftId]
      // We use a predicate to match regardless of userId value
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return (
            Array.isArray(key) &&
            key[0] === 'position' &&
            key[2] === variables.chain &&
            key[3] === 'uniswapv3' &&
            key[4] === variables.nftId
          );
        }
      });
    },
    ...options,
  });
}

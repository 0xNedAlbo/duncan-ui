/**
 * Create Position Optimistically Hook
 *
 * Hook for creating positions with minimal validation for instant UI updates
 */

import { useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query';
import { apiClient } from '@/lib/app/apiClient';
import { ApiError } from '@/lib/app/apiError';
import type { ApiResponse } from '@/types/api';
import type { BasicPosition } from '@/services/positions/positionService';
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
}

/**
 * Hook to create a position optimistically
 *
 * Creates a position record in the database with minimal validation.
 * Useful for instant UI updates when opening a position on-chain.
 * Should be followed by a refresh call to sync full position data.
 */
export function useCreatePositionOptimistic(
  options?: UseMutationOptions<ApiResponse<BasicPosition>, ApiError, CreatePositionOptimisticRequest>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePositionOptimisticRequest) =>
      apiClient.put<ApiResponse<BasicPosition>>(
        `/api/positions/uniswapv3/${data.chain}/${data.nftId}`,
        {
          poolAddress: data.poolAddress,
          tickLower: data.tickLower,
          tickUpper: data.tickUpper,
          liquidity: data.liquidity,
          token0IsQuote: data.token0IsQuote,
          owner: data.owner,
        }
      ),
    onSuccess: () => {
      // Invalidate positions list to show the new position
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.positions });
    },
    ...options,
  });
}

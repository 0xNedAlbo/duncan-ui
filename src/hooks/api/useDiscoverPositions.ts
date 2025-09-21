/**
 * Position Discovery Hook
 *
 * React Query hook for discovering Uniswap V3 positions from wallet addresses
 */

import { useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query';
import { apiClient } from '@/lib/app/apiClient';
import { ApiError } from '@/lib/app/apiError';
import type {
  DiscoverPositionsRequest,
  DiscoverPositionsResponse,
  PositionListResponse
} from '@/types/api';
import { QUERY_KEYS } from '@/types/api';
import type { BasicPosition } from '@/services/positions/positionService';

/**
 * Hook to discover positions for a wallet address
 * Returns positions that can be imported along with summary information
 */
export function useDiscoverPositions(
  options?: UseMutationOptions<DiscoverPositionsResponse, ApiError, DiscoverPositionsRequest>
) {
  return useMutation({
    mutationKey: ['positions', 'discover'] as const,
    mutationFn: (data: DiscoverPositionsRequest) =>
      apiClient.post<DiscoverPositionsResponse>('/api/positions/uniswapv3/discover', data),

    onSuccess: (response, variables) => {
      // Log successful discovery for debugging
      console.log(`✓ Discovered ${response.data?.newPositionsFound || 0} new positions for ${variables.address} on ${variables.chain}`);

      // Note: We don't automatically update the positions cache here
      // because these are discovered positions, not yet imported
      // The cache will be updated when positions are actually imported
    },

    onError: (error, variables) => {
      // Log discovery error for debugging
      console.error(`Failed to discover positions for ${variables.address} on ${variables.chain}:`, error);
    },

    ...options,
  });
}

/**
 * Hook to import multiple discovered positions
 * Used after position discovery to bulk import selected positions
 */
export function useImportDiscoveredPositions(
  options?: UseMutationOptions<
    { imported: BasicPosition[]; failed: { nftId: string; error: string }[] },
    ApiError,
    { positions: BasicPosition[]; chain: string }
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['positions', 'import-discovered'] as const,
    mutationFn: async ({ positions, chain }) => {
      const imported: BasicPosition[] = [];
      const failed: { nftId: string; error: string }[] = [];

      // Import positions one by one using the existing NFT import endpoint
      for (const position of positions) {
        try {
          const response = await apiClient.post('/api/positions/uniswapv3/import-nft', {
            chain,
            nftId: position.nftId,
          });

          if (response.data?.position) {
            imported.push(response.data.position as unknown as BasicPosition);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          failed.push({
            nftId: position.nftId || 'unknown',
            error: errorMessage,
          });
        }
      }

      return { imported, failed };
    },

    onSuccess: (result) => {
      const { imported, failed } = result;

      // Log import results
      console.log(`✓ Successfully imported ${imported.length} positions`);
      if (failed.length > 0) {
        console.warn(`⚠ Failed to import ${failed.length} positions:`, failed);
      }

      // Invalidate positions list to refetch with new positions
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.positions });

      // Update positions list cache if it exists
      if (imported.length > 0) {
        queryClient.setQueriesData<PositionListResponse>(
          { queryKey: QUERY_KEYS.positions },
          (oldData) => {
            if (!oldData?.data) return oldData;

            return {
              ...oldData,
              data: {
                ...oldData.data,
                positions: [...imported, ...oldData.data.positions],
                pagination: {
                  ...oldData.data.pagination,
                  total: oldData.data.pagination.total + imported.length,
                },
              },
            };
          }
        );
      }
    },

    onError: (error) => {
      console.error('Failed to import discovered positions:', error);
    },

    ...options,
  });
}
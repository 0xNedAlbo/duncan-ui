/**
 * Import Position Mutation Hook
 *
 * Hook for importing positions by NFT ID
 */

import { useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query';
import { apiClient } from '@/lib/app/apiClient';
import { ApiError } from '@/lib/app/apiError';
import type {
  ImportNFTRequest,
  ImportNFTResponse,
} from '@/types/api';
import { MUTATION_KEYS, QUERY_KEYS } from '@/types/api';

/**
 * Hook to import a new position by NFT ID
 */
export function useImportPositionByNftId(
  options?: UseMutationOptions<ImportNFTResponse, ApiError, ImportNFTRequest>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: MUTATION_KEYS.importNFT,
    mutationFn: (data: ImportNFTRequest) =>
      apiClient.post<ImportNFTResponse>('/api/positions/uniswapv3/import-nft', data),

    onSuccess: (response) => {
      // Invalidate positions list to show the new position
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.positions,
      });
    },

    ...options,
  });
}
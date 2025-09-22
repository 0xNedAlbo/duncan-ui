/**
 * Delete Position Hook
 *
 * React Query hook for deleting Uniswap V3 positions
 */

import { useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query';
import { apiClient } from '@/lib/app/apiClient';
import { ApiError } from '@/lib/app/apiError';

interface DeletePositionRequest {
  chain: string;
  nftId: string;
}

interface DeletePositionResponse {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Hook to delete a position
 */
export function useDeletePosition(
  options?: UseMutationOptions<DeletePositionResponse, ApiError, DeletePositionRequest>
) {
  return useMutation({
    mutationKey: ['positions', 'delete'] as const,
    mutationFn: ({ chain, nftId }: DeletePositionRequest) =>
      apiClient.delete<DeletePositionResponse>(`/api/positions/uniswapv3/${chain}/${nftId}`),

    onSuccess: () => {
      // Cache updates are handled by parent component callback
      // This keeps the hook focused on API calls only
    },

    onError: (error, variables) => {
      // Log deletion error for debugging
      console.error(`Failed to delete position ${variables.chain}/${variables.nftId}:`, error);
    },

    ...options,
  });
}

/**
 * Hook to get loading state for a specific position deletion
 * Useful for showing loading states on specific position cards
 */
export function useIsDeletingPosition(chain: string, nftId: string): boolean {
  const queryClient = useQueryClient();
  const mutationCache = queryClient.getMutationCache();

  // Check if there's an active delete mutation for this position
  const deleteMutations = mutationCache.findAll({
    mutationKey: ['positions', 'delete'],
    status: 'pending',
  });

  return deleteMutations.some(
    mutation => {
      const variables = mutation.state.variables as DeletePositionRequest | undefined;
      return variables?.chain === chain && variables?.nftId === nftId;
    }
  );
}
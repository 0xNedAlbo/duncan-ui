/**
 * Hook for fetching position curve data
 */

import { useQuery, type UseQueryOptions, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/app/apiClient';
import type { ApiError } from '@/lib/app/apiError';
import type { PositionCurveResponse } from '@/app/api/positions/uniswapv3/nft/[chain]/[nft]/curve/route';
import type { CurveData } from '@/components/charts/mini-pnl-curve';

export interface UsePositionCurveOptions extends Omit<UseQueryOptions<CurveData, ApiError>, 'queryKey' | 'queryFn'> {
  enabled?: boolean;
}

/**
 * Hook to fetch curve visualization data for a specific position
 *
 * @param chain - The blockchain network (ethereum, arbitrum, base)
 * @param nftId - The NFT token ID of the position
 * @param options - Additional query options
 * @returns Query result with curve data
 */
export function usePositionCurve(
  chain: string | undefined,
  nftId: string | undefined,
  options?: UsePositionCurveOptions
) {
  const queryClient = useQueryClient();
  const cacheKey = ['positions', 'curve', chain, nftId];

  // Check if data is already in cache before making query
  const existingData = queryClient.getQueryData(cacheKey);
  if (existingData && chain && nftId) {
    console.debug('[Cache] Found existing curve data in cache:', {
      cacheKey,
      pointsCount: (existingData as CurveData).points?.length,
      willUseCache: true
    });
  }

  return useQuery({
    queryKey: cacheKey,
    queryFn: async () => {
      if (!chain || !nftId) {
        throw new Error('Chain and NFT ID are required');
      }

      console.debug('[Cache] Fetching curve data from API (cache miss):', {
        cacheKey,
        chain,
        nftId
      });

      const response = await apiClient.get<PositionCurveResponse>(
        `/api/positions/uniswapv3/nft/${chain}/${nftId}/curve`
      );

      if (!response.data) {
        throw new Error('No curve data received');
      }

      console.debug('[Cache] Received curve data from API:', {
        cacheKey,
        pointsCount: response.data.points?.length,
        hasData: !!response.data
      });

      return response.data;
    },
    enabled: Boolean(chain && nftId && options?.enabled !== false),

    // Use longer stale time for curve data as it's expensive to compute and doesn't change as frequently
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes

    // Additional optimizations for curve data
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,

    // Note: onSuccess callback was removed as it's deprecated in React Query v5

    ...options,
  });
}
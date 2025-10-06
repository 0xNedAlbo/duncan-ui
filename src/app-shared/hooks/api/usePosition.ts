/**
 * Position Query Hook
 *
 * Hook for fetching complete position data with PnL, APR, and curve details
 */

import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { apiClient } from '@/app-shared/lib/api-client/apiClient';
import { ApiError } from '@/app-shared/lib/api-client/apiError';
import type { PositionDetailsResponse } from '@/app/api/positions/uniswapv3/[chain]/[nft]/details/route';
import { QUERY_OPTIONS } from '@/types/api';

/**
 * Hook to fetch a complete position with all details (PnL, APR, curve data)
 * Returns complete position data from the unified details API
 */
export function usePosition(
  userId: string,
  chain: string,
  protocol: string,
  nftId: string,
  options?: Omit<UseQueryOptions<PositionDetailsResponse, ApiError, PositionDetailsResponse['data']>, 'queryKey' | 'queryFn' | 'select'>
) {
  return useQuery({
    queryKey: ['position', userId, chain, protocol, nftId] as const,
    queryFn: () => apiClient.get<PositionDetailsResponse>(`/api/positions/uniswapv3/${chain}/${nftId}/details`),

    // Default options
    staleTime: QUERY_OPTIONS.positionDetails.staleTime,
    gcTime: QUERY_OPTIONS.positionDetails.cacheTime,

    // Only run query if all required params are provided
    enabled: !!userId && !!chain && !!protocol && !!nftId,

    // Transform response to extract complete position data
    select: (response: PositionDetailsResponse) => response.data!,

    ...options,
  });
}
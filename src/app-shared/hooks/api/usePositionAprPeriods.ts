/**
 * Position APR Periods Query Hook
 *
 * Hook for fetching position APR breakdown and time periods
 */

import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { apiClient } from '@/app-shared/lib/api-client/apiClient';
import { ApiError } from '@/app-shared/lib/api-client/apiError';
import { QUERY_OPTIONS, type AprApiResponse } from '@/types/api';

/**
 * Hook to fetch position APR periods by position identifiers
 */
export function usePositionAprPeriods(
  userId: string,
  chain: string,
  protocol: string,
  nftId: string,
  options?: Omit<UseQueryOptions<AprApiResponse, ApiError, AprApiResponse['data']>, 'queryKey' | 'queryFn' | 'select'>
) {
  return useQuery({
    queryKey: ['position-apr-periods', userId, chain, protocol, nftId] as const,
    queryFn: () => apiClient.get<AprApiResponse>(`/api/positions/uniswapv3/${chain}/${nftId}/apr`),

    // Default options
    staleTime: QUERY_OPTIONS.positionAprPeriods.staleTime,
    gcTime: QUERY_OPTIONS.positionAprPeriods.cacheTime,

    // Only run query if all required params are provided
    enabled: !!userId && !!chain && !!protocol && !!nftId,

    // Transform response to extract just the APR data
    select: (response: AprApiResponse) => response.data!,

    ...options,
  });
}
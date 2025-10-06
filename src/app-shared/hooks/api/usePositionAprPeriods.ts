/**
 * Position APR Periods Query Hook
 *
 * Hook for fetching position APR breakdown and time periods
 */

import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { apiClient } from '@/lib/app/apiClient';
import { ApiError } from '@/lib/app/apiError';
import type { AprApiResponse } from '@/types/apr';
import { QUERY_OPTIONS } from '@/types/api';

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
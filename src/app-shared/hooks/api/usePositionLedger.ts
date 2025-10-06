/**
 * Position Ledger Query Hook
 *
 * Hook for fetching position transaction history and events
 */

import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { apiClient } from '@/lib/app/apiClient';
import { ApiError } from '@/lib/app/apiError';
import type {
  PositionEventsParams,
  PositionEventsResponse,
} from '@/types/api';
import { QUERY_OPTIONS } from '@/types/api';

/**
 * Hook to fetch position ledger (events/transactions) by position identifiers
 */
export function usePositionLedger(
  userId: string,
  chain: string,
  protocol: string,
  nftId: string,
  params: PositionEventsParams = {},
  options?: Omit<UseQueryOptions<PositionEventsResponse, ApiError, PositionEventsResponse['data']>, 'queryKey' | 'queryFn' | 'select'>
) {
  return useQuery({
    queryKey: ['position-ledger', userId, chain, protocol, nftId, params] as const,
    queryFn: () => apiClient.get<PositionEventsResponse>(
      `/api/positions/uniswapv3/${chain}/${nftId}/events`,
      { params }
    ),

    // Default options
    staleTime: QUERY_OPTIONS.positionLedger.staleTime,
    gcTime: QUERY_OPTIONS.positionLedger.cacheTime,

    // Only run query if all required params are provided
    enabled: !!userId && !!chain && !!protocol && !!nftId,

    // Transform response to extract data
    select: (response: PositionEventsResponse) => response.data!,

    ...options,
  });
}
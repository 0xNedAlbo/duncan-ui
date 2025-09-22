/**
 * Positions List Query Hook
 *
 * Hook for fetching paginated list of positions with filtering and sorting
 */

import { useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { apiClient } from '@/lib/app/apiClient';
import { ApiError } from '@/lib/app/apiError';
import type {
  PositionListParams,
  PositionListResponse,
} from '@/types/api';
import { QUERY_KEYS, QUERY_OPTIONS } from '@/types/api';

/**
 * Hook to fetch positions list with filtering, sorting, and pagination
 */
export function usePositionsList(
  params: PositionListParams = {},
  options?: Omit<UseQueryOptions<PositionListResponse, ApiError, PositionListResponse['data']>, 'queryKey' | 'queryFn' | 'select'>
) {
  return useQuery({
    queryKey: QUERY_KEYS.positionsList(params),
    queryFn: () => apiClient.get<PositionListResponse>('/api/positions/uniswapv3/list', { params }),

    // Default options from types
    staleTime: QUERY_OPTIONS.positions.staleTime,
    gcTime: QUERY_OPTIONS.positions.cacheTime,

    // Transform the response to extract data
    select: (response: PositionListResponse) => response.data!,

    // Merge with custom options
    ...options,
  });
}

/**
 * Hook to prefetch positions list
 */
export function usePrefetchPositionsList() {
  const queryClient = useQueryClient();

  return (params: PositionListParams = {}) => {
    return queryClient.prefetchQuery({
      queryKey: QUERY_KEYS.positionsList(params),
      queryFn: () => apiClient.get<PositionListResponse>('/api/positions/uniswapv3/list', { params }),
      staleTime: QUERY_OPTIONS.positions.staleTime,
    });
  };
}
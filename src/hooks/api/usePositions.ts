/**
 * Position Management Hooks
 * 
 * React Query hooks for position-related API operations
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { apiClient } from '@/lib/app/apiClient';
import { ApiError } from '@/lib/app/apiError';
import type { 
  PositionListParams, 
  PositionListResponse, 
  PositionDetailsResponse,
  PositionRefreshResponse,
  ImportNFTRequest,
  ImportNFTResponse,
  PositionEventsParams,
  PositionEventsResponse
} from '@/types/api';
import { QUERY_KEYS, MUTATION_KEYS, QUERY_OPTIONS } from '@/types/api';
import type { BasicPosition } from '@/services/positions/positionService';

/**
 * Hook to fetch positions list with filtering, sorting, and pagination
 */
export function usePositions(
  params: PositionListParams = {},
  options?: Omit<UseQueryOptions<PositionListResponse, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: QUERY_KEYS.positionsList(params),
    queryFn: () => apiClient.get<PositionListResponse>('/api/positions/uniswapv3/list', { params }),
    
    // Default options from types
    staleTime: QUERY_OPTIONS.positions.staleTime,
    gcTime: QUERY_OPTIONS.positions.cacheTime,
    
    // Transform the response to extract data
    select: (response) => ({
      positions: response.data?.positions || [],
      pagination: response.data?.pagination || {
        total: 0,
        limit: 20,
        offset: 0,
        hasMore: false,
        nextOffset: null,
      },
      dataQuality: response.meta?.dataQuality || {
        subgraphPositions: 0,
        snapshotPositions: 0,
        upgradedPositions: 0,
      },
      filters: response.meta?.filters,
    }),
    
    // Merge with custom options
    ...options,
  });
}


/**
 * Hook to fetch a single NFT position by chain and NFT ID
 */
export function useNFTPosition(
  chain: string,
  nftId: string,
  options?: Omit<UseQueryOptions<PositionDetailsResponse, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['positions', 'nft', chain, nftId] as const,
    queryFn: () => apiClient.get<PositionDetailsResponse>(`/api/positions/uniswapv3/nft/${chain}/${nftId}`),
    
    // Default options
    staleTime: QUERY_OPTIONS.positionDetails.staleTime,
    gcTime: QUERY_OPTIONS.positionDetails.cacheTime,
    
    // Only run query if chain and nftId are provided
    enabled: !!chain && !!nftId,
    
    // Transform response - extract position from data
    select: (response) => response.data.position,
    
    ...options,
  });
}

/**
 * Hook to fetch position events for a specific NFT position
 */
export function usePositionEvents(
  chain: string,
  nftId: string,
  params: PositionEventsParams = {},
  options?: Omit<UseQueryOptions<PositionEventsResponse, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: QUERY_KEYS.positionEvents(chain, nftId, params),
    queryFn: () => apiClient.get<PositionEventsResponse>(
      `/api/positions/uniswapv3/nft/${chain}/${nftId}/events`,
      { params }
    ),
    
    // Default options
    staleTime: QUERY_OPTIONS.positionEvents.staleTime,
    gcTime: QUERY_OPTIONS.positionEvents.cacheTime,
    
    // Only run query if chain and nftId are provided
    enabled: !!chain && !!nftId,
    
    // Transform response to extract data
    select: (response) => ({
      events: response.data?.events || [],
      pagination: response.data?.pagination || {
        total: 0,
        limit: 20,
        offset: 0,
        hasMore: false,
        nextOffset: null,
      },
      meta: response.meta,
    }),
    
    ...options,
  });
}

/**
 * Hook to refresh a single NFT position
 */
export function useRefreshNFTPosition(
  options?: UseMutationOptions<PositionRefreshResponse, ApiError, { chain: string; nftId: string }>
) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationKey: ['refreshNFTPosition'] as const,
    mutationFn: ({ chain, nftId }: { chain: string; nftId: string }) => {
      return apiClient.post<PositionRefreshResponse>(
        `/api/positions/uniswapv3/nft/${chain}/${nftId}/refresh`
      );
    },
    
    onSuccess: (response, { chain, nftId }) => {
      const refreshedPosition = response.data?.position;
      const pnlBreakdown = response.data?.pnlBreakdown;

      if (refreshedPosition) {
        // Update the specific NFT position in cache
        queryClient.setQueryData(
          ['positions', 'nft', chain, nftId] as const,
          refreshedPosition
        );

        // Update PnL cache with fresh data
        if (pnlBreakdown) {
          queryClient.setQueryData(
            ['positions', 'pnl', chain, nftId],
            pnlBreakdown
          );
        }

        // Invalidate positions list to ensure it's updated
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.positions });
      }
    },
    
    onError: (error, { chain, nftId }) => {
      console.error(`Failed to refresh NFT position ${chain}/${nftId}:`, error);
    },
    
    ...options,
  });
}

/**
 * Hook to import NFT position
 */
export function useImportNFT(
  options?: UseMutationOptions<ImportNFTResponse, ApiError, ImportNFTRequest>
) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationKey: MUTATION_KEYS.importNFT,
    mutationFn: (data: ImportNFTRequest) => 
      apiClient.post<ImportNFTResponse>('/api/positions/uniswapv3/import-nft', data),
    
    onSuccess: (response, variables) => {
      // Invalidate positions list to refetch with new position
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.positions });
      
      // Note: Position details are now accessed via chain/NFT, not database ID
      // Individual position cache invalidation handled by NFT-specific hooks
      if (response.data?.position) {
        
        // Update positions list cache if it exists
        queryClient.setQueriesData<PositionListResponse>(
          { queryKey: QUERY_KEYS.positions },
          (oldData) => {
            if (!oldData?.data) return oldData;
            
            return {
              ...oldData,
              data: {
                ...oldData.data,
                positions: [response.data.position as BasicPosition, ...oldData.data.positions],
                pagination: {
                  ...oldData.data.pagination,
                  total: oldData.data.pagination.total + 1,
                },
              },
            };
          }
        );
      }
    },
    
    onError: (error, variables) => {
      // Log import error for debugging
      console.error(`Failed to import NFT ${variables.nftId} on ${variables.chain}:`, error);
    },
    
    ...options,
  });
}

/**
 * Hook to refresh a single position
 */
export function useRefreshPosition(
  options?: UseMutationOptions<PositionRefreshResponse, ApiError, BasicPosition>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: MUTATION_KEYS.refreshPosition,
    mutationFn: (position: BasicPosition) => {
      // Use new protocol-aware endpoint for NFT positions
      if (position.nftId && position.pool.chain) {
        return apiClient.post<PositionRefreshResponse>(
          `/api/positions/uniswapv3/nft/${position.pool.chain}/${position.nftId}/refresh`
        );
      }
      // Fallback for non-NFT positions - they can't be refreshed with new API structure
      throw new Error('Position refresh is only available for NFT positions');
    },
    
    onSuccess: (response, position) => {
      const refreshedPosition = response.data?.position;
      const pnlBreakdown = response.data?.pnlBreakdown;

      if (refreshedPosition) {
        // Update position in all positions list queries
        queryClient.setQueriesData<PositionListResponse>(
          { queryKey: QUERY_KEYS.positions },
          (oldData) => {
            if (!oldData?.data) return oldData;

            return {
              ...oldData,
              data: {
                ...oldData.data,
                positions: oldData.data.positions.map(pos =>
                  pos.id === position.id ? refreshedPosition : pos
                ),
              },
            };
          }
        );

        // Update PnL cache with fresh data instead of invalidating
        if (position.nftId && position.pool.chain && pnlBreakdown) {
          queryClient.setQueryData(
            ['positions', 'pnl', position.pool.chain, position.nftId],
            pnlBreakdown
          );
        }
      }
    },
    
    onError: (error, position) => {
      console.error(`Failed to refresh position ${position.id}:`, error);
    },
    
    ...options,
  });
}

/**
 * Hook to get loading state for a specific position refresh
 */
export function useIsRefreshingPosition(positionId: string): boolean {
  const queryClient = useQueryClient();
  const mutationCache = queryClient.getMutationCache();
  
  // Check if there's an active refresh mutation for this position
  const refreshMutations = mutationCache.findAll({
    mutationKey: MUTATION_KEYS.refreshPosition,
    status: 'pending',
  });
  
  return refreshMutations.some(
    mutation => mutation.state.variables === positionId
  );
}

/**
 * Hook to prefetch positions
 * Useful for preloading data before navigation
 */
export function usePrefetchPositions() {
  const queryClient = useQueryClient();
  
  return (params: PositionListParams = {}) => {
    return queryClient.prefetchQuery({
      queryKey: QUERY_KEYS.positionsList(params),
      queryFn: () => apiClient.get<PositionListResponse>('/api/positions/uniswapv3/list', { params }),
      staleTime: QUERY_OPTIONS.positions.staleTime,
    });
  };
}


/**
 * Hook to invalidate positions cache
 * Useful for manual cache invalidation
 */
export function useInvalidatePositions() {
  const queryClient = useQueryClient();
  
  return {
    // Invalidate all position queries
    invalidateAll: () => {
      return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.positions });
    },
    
    // Note: Individual position invalidation handled by NFT-specific hooks
    
    // Invalidate positions list only
    invalidateList: (params?: PositionListParams) => {
      if (params) {
        return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.positionsList(params) });
      }
      return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.positions });
    },
  };
}

/**
 * Hook to get positions cache info
 * Useful for debugging and cache inspection
 */
export function usePositionsCacheInfo() {
  const queryClient = useQueryClient();
  
  return {
    // Get all cached positions queries
    getCachedQueries: () => {
      return queryClient.getQueryCache().findAll({ queryKey: QUERY_KEYS.positions });
    },
    
    // Get cache statistics
    getStats: () => {
      const cache = queryClient.getQueryCache();
      const allQueries = cache.findAll();
      const positionQueries = cache.findAll({ queryKey: QUERY_KEYS.positions });
      
      return {
        totalQueries: allQueries.length,
        positionQueries: positionQueries.length,
        activeQueries: positionQueries.filter(q => q.state.fetchStatus === 'fetching').length,
      };
    },
  };
}
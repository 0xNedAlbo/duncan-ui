/**
 * Position Management Hooks
 * 
 * React Query hooks for position-related API operations
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/apiClient';
import { ApiError } from '@/lib/api/apiError';
import type { 
  PositionListParams, 
  PositionListResponse, 
  PositionDetailsResponse,
  PositionRefreshResponse,
  ImportNFTRequest,
  ImportNFTResponse
} from '@/types/api';
import { QUERY_KEYS, MUTATION_KEYS, QUERY_OPTIONS } from '@/types/api';
import type { PositionWithPnL } from '@/services/positions/positionService';

/**
 * Hook to fetch positions list with filtering, sorting, and pagination
 */
export function usePositions(
  params: PositionListParams = {},
  options?: Omit<UseQueryOptions<PositionListResponse, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: QUERY_KEYS.positionsList(params),
    queryFn: () => apiClient.get<PositionListResponse>('/api/positions', { params }),
    
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
 * Hook to fetch a single position by ID
 */
export function usePosition(
  positionId: string,
  options?: Omit<UseQueryOptions<PositionDetailsResponse, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: QUERY_KEYS.positionDetails(positionId),
    queryFn: () => apiClient.get<PositionDetailsResponse>(`/api/positions/${positionId}`),
    
    // Default options
    staleTime: QUERY_OPTIONS.positionDetails.staleTime,
    gcTime: QUERY_OPTIONS.positionDetails.cacheTime,
    
    // Only run query if positionId is provided
    enabled: !!positionId,
    
    // Transform response
    select: (response) => response.data,
    
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
      apiClient.post<ImportNFTResponse>('/api/positions/import-nft', data),
    
    onSuccess: (response, variables) => {
      // Invalidate positions list to refetch with new position
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.positions });
      
      // If we have the new position data, add it to the cache optimistically
      if (response.data?.position) {
        const position = response.data.position;
        queryClient.setQueryData(
          QUERY_KEYS.positionDetails(position.id || 'unknown'), 
          response.data.position
        );
        
        // Update positions list cache if it exists
        queryClient.setQueriesData<PositionListResponse>(
          { queryKey: QUERY_KEYS.positions },
          (oldData) => {
            if (!oldData?.data) return oldData;
            
            return {
              ...oldData,
              data: {
                ...oldData.data,
                positions: [position as PositionWithPnL, ...oldData.data.positions],
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
  options?: UseMutationOptions<PositionRefreshResponse, ApiError, string>
) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationKey: MUTATION_KEYS.refreshPosition,
    mutationFn: (positionId: string) => 
      apiClient.post<PositionRefreshResponse>(`/api/positions/${positionId}/refresh`),
    
    onSuccess: (response, positionId) => {
      const refreshedPosition = response.data?.position;
      
      if (refreshedPosition) {
        // Update the specific position in cache
        queryClient.setQueryData(
          QUERY_KEYS.positionDetails(positionId),
          refreshedPosition
        );
        
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
                  pos.id === positionId ? refreshedPosition : pos
                ),
              },
            };
          }
        );
      }
      
      // Optionally invalidate to ensure fresh data
      // queryClient.invalidateQueries({ queryKey: QUERY_KEYS.positionDetails(positionId) });
    },
    
    onError: (error, positionId) => {
      console.error(`Failed to refresh position ${positionId}:`, error);
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
      queryFn: () => apiClient.get<PositionListResponse>('/api/positions', { params }),
      staleTime: QUERY_OPTIONS.positions.staleTime,
    });
  };
}

/**
 * Hook to prefetch a single position
 */
export function usePrefetchPosition() {
  const queryClient = useQueryClient();
  
  return (positionId: string) => {
    return queryClient.prefetchQuery({
      queryKey: QUERY_KEYS.positionDetails(positionId),
      queryFn: () => apiClient.get<PositionDetailsResponse>(`/api/positions/${positionId}`),
      staleTime: QUERY_OPTIONS.positionDetails.staleTime,
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
    
    // Invalidate specific position
    invalidatePosition: (positionId: string) => {
      return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.positionDetails(positionId) });
    },
    
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
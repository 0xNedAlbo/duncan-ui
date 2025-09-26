/**
 * Pool Fee Data Query Hook
 *
 * Hook for fetching pool fee data from The Graph subgraph via our secure API
 */

import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { apiClient } from '@/lib/app/apiClient';
import { ApiError } from '@/lib/app/apiError';
import { QUERY_OPTIONS } from '@/types/api';

interface PoolFeeData {
  poolAddress: string;
  chain: string;
  feeTier: string;
  poolLiquidity: string; // BigInt as string
  token0: {
    address: string;
    symbol: string;
    decimals: number;
    dailyVolume: string; // BigInt as string (token units)
    price: string; // BigInt as string (quote token units per base token)
  };
  token1: {
    address: string;
    symbol: string;
    decimals: number;
    dailyVolume: string; // BigInt as string (token units)
    price: string; // BigInt as string (quote token units per base token)
  };
  calculatedAt: string; // ISO timestamp
}

interface PoolFeeApiResponse {
  success: boolean;
  data?: PoolFeeData;
  error?: string;
}

/**
 * Hook to fetch pool fee data for APR calculations
 * @param chain Chain name (e.g., "ethereum", "arbitrum")
 * @param poolAddress Pool contract address
 * @param options Additional query options
 */
export function usePoolFeeData(
  chain: string | undefined,
  poolAddress: string | undefined,
  options?: Omit<UseQueryOptions<PoolFeeApiResponse, ApiError, PoolFeeData>, 'queryKey' | 'queryFn' | 'select'>
) {
  return useQuery({
    queryKey: ['pool-fee-data', chain, poolAddress] as const,
    queryFn: () => {
      if (!chain || !poolAddress) {
        throw new Error('Chain and pool address are required');
      }
      return apiClient.get<PoolFeeApiResponse>(`/api/pools/${chain}/${poolAddress}/fees`);
    },

    // Default options - cache for 5 minutes since pool data changes frequently
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes

    // Only run query if both parameters are provided
    enabled: !!chain && !!poolAddress && (options?.enabled !== false),

    // Transform response to extract just the pool fee data
    select: (response: PoolFeeApiResponse) => {
      if (!response.success || !response.data) {
        throw new ApiError(response.error || 'Failed to fetch pool fee data', 500);
      }
      return response.data;
    },

    // Merge with custom options
    ...options,
  });
}
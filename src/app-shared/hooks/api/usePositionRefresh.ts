/**
 * Position Refresh Mutation Hook
 *
 * Hook for refreshing position data with direct cache updates
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/app-shared/lib/api-client/apiClient';
import type { PositionRefreshResponse } from '@/types/api';

/**
 * Hook to refresh position data with direct cache updates
 */
export function usePositionRefresh() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ chain, nftId }: {
      userId: string;
      chain: string;
      protocol: string;
      nftId: string;
    }) => {
      return apiClient.post<PositionRefreshResponse>(
        `/api/positions/uniswapv3/${chain}/${nftId}/refresh`
      );
    },

    onSuccess: (response, { userId, chain, protocol, nftId }) => {
      if (!response.data) return;

      const { position, pnlBreakdown, aprBreakdown, curveData } = response.data;

      // ✅ UPDATE caches with fresh data instead of invalidating

      // Update main position cache - format to match API response structure
      queryClient.setQueryData(
        ['position', userId, chain, protocol, nftId],
        {
          data: {
            basicData: position,
            pnlBreakdown,
            aprBreakdown,
            curveData,
            lastUpdated: new Date().toISOString()
          }
        }
      );

      // Update positions list cache if present
      queryClient.setQueryData(
        ['positions', 'list'],
        (oldData: any) => {
          if (!oldData?.positions) return oldData;

          // Update the specific position in the list
          return {
            ...oldData,
            positions: oldData.positions.map((p: any) =>
              p.nftId === nftId && p.pool?.chain === chain
                ? position
                : p
            )
          };
        }
      );

      // Mark related queries as fresh (extend their stale time)
      // Update position ledger query data timestamp to keep it fresh
      queryClient.setQueryData(
        ['position-ledger', userId, chain, protocol, nftId],
        (oldData: any) => oldData // Keep existing data but mark as fresh
      );

      // Update position APR periods query data timestamp to keep it fresh
      queryClient.setQueryData(
        ['position-apr-periods', userId, chain, protocol, nftId],
        (oldData: any) => oldData // Keep existing data but mark as fresh
      );

      console.log(`[RefreshHook] Updated caches for position ${chain}-${nftId}`);
    },
  });
}
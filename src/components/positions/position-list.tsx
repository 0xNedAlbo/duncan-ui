"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Loader2, Filter, SortAsc, SortDesc, AlertCircle } from "lucide-react";
import { useTranslations } from "@/i18n/client";
import { PositionCard } from "./position-card";
import { usePositionStore, useCurrentListState, usePositionRefresh } from "@/store/position-store";
import { apiClient } from "@/lib/app/apiClient";
import type { BasicPosition } from "@/services/positions/positionService";
import type { PositionListParams } from "@/types/api";

interface PositionListProps {
  className?: string;
  refreshTrigger?: number;
}

export function PositionList({ className, refreshTrigger }: PositionListProps) {
  const t = useTranslations();
  
  // Filters and sorting state
  const [status, setStatus] = useState<string>("all");
  const [chain, setChain] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<string>("desc");
  
  // Pagination state
  const [limit] = useState(20);
  const [offset, setOffset] = useState(0);

  // Build query parameters (memoized to prevent unnecessary re-renders)
  const queryParams: PositionListParams = useMemo(() => ({
    status: status as any,
    chain: chain !== "all" ? chain : undefined,
    sortBy,
    sortOrder: sortOrder as "asc" | "desc",
    limit,
    offset,
  }), [status, chain, sortBy, sortOrder, limit, offset]);

  // Use position store with memoized actions to prevent useEffect reruns
  const setCurrentList = usePositionStore(useCallback((state) => state.setCurrentList, []));
  const setListLoading = usePositionStore(useCallback((state) => state.setListLoading, []));
  const setListError = usePositionStore(useCallback((state) => state.setListError, []));
  const removePosition = usePositionStore(useCallback((state) => state.removePosition, []));
  const currentListState = useCurrentListState();
  const { refreshPosition } = usePositionRefresh();

  // Extract data from store
  const { positions: positionsMap, pagination, isLoading, error } = currentListState;
  const positions = Object.values(positionsMap).map(p => p.basicData);

  // Extract pagination data
  const hasMore = pagination?.hasMore || false;
  const total = pagination?.total || 0;

  // TODO: Add dataQuality to store if needed
  const dataQuality = {
    subgraphPositions: 0,
    snapshotPositions: 0,
    upgradedPositions: 0
  };

  // Reset pagination when filters change
  useEffect(() => {
    setOffset(0);
  }, [status, chain, sortBy, sortOrder]);

  // Load positions when component mounts or filters change
  const loadPositions = useCallback(async () => {
    try {
      setListLoading(true);
      setListError(null);

      const response = await apiClient.get('/api/positions/uniswapv3/list', {
        params: queryParams
      });

      if (response.data) {
        setCurrentList(
          response.data.positions || [],
          response.data.pagination || {
            total: 0,
            limit: 20,
            offset: 0,
            hasMore: false,
            nextOffset: null
          },
          queryParams
        );

        // Load PnL data for the first few positions in the background
        const positions = response.data.positions || [];
        const limitedPositions = positions.slice(0, 5); // Load PnL for first 5 positions

        limitedPositions.forEach(async (position: BasicPosition) => {
          if (position.nftId && position.pool?.chain) {
            // Load both PnL and curve data in parallel
            const [pnlResponse, curveResponse] = await Promise.allSettled([
              apiClient.get(`/api/positions/uniswapv3/${position.pool.chain}/${position.nftId}/pnl`),
              apiClient.get(`/api/positions/uniswapv3/${position.pool.chain}/${position.nftId}/curve`)
            ]);

            // Update position with loaded data in store
            const key = `${position.pool.chain}-${position.nftId}`;
            const getPosition = usePositionStore.getState().getPosition;
            const updatePositionEverywhere = usePositionStore.getState().updatePositionEverywhere;

            const existingPosition = getPosition(position.pool.chain, position.nftId);
            if (existingPosition) {
              const updatedPosition = { ...existingPosition };

              // Add PnL data if successful
              if (pnlResponse.status === 'fulfilled' && pnlResponse.value.data) {
                updatedPosition.pnlBreakdown = pnlResponse.value.data;
              }

              // Add curve data if successful (including null data for closed positions)
              if (curveResponse.status === 'fulfilled' && curveResponse.value.success) {
                updatedPosition.curveData = curveResponse.value.data; // Can be null for closed positions
              }

              // Update if we got any response (PnL data or curve response)
              const hasPnlData = pnlResponse.status === 'fulfilled' && pnlResponse.value.data;
              const hasCurveResponse = curveResponse.status === 'fulfilled' && curveResponse.value.success;

              if (hasPnlData || hasCurveResponse) {
                updatePositionEverywhere(key, updatedPosition);
              }
            }
          }
        });
      }
    } catch (error) {
      console.error('Failed to load positions:', error);
      setListError('Failed to load positions');
    } finally {
      setListLoading(false);
    }
  }, [queryParams, setCurrentList, setListLoading, setListError]);

  useEffect(() => {
    loadPositions();
  }, [loadPositions]);

  // Handle external refresh trigger
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      // TODO: Implement list refresh in store
      console.log('Refresh trigger received:', refreshTrigger);
    }
  }, [refreshTrigger]);

  // Load more positions
  const loadMore = () => {
    if (!hasMore || isLoading) return;
    setOffset(prev => prev + limit);
  };

  // Handle single position refresh
  const handleRefreshPosition = async (position: BasicPosition) => {
    try {
      await refreshPosition(position.pool.chain, position.nftId || '');
      // Store will automatically update position everywhere
    } catch (error) {
      console.error("Failed to refresh position:", error);
      // TODO: Show error toast
    }
  };

  // Handle position deletion - called after successful API deletion
  const handleDeletePosition = useCallback((position: BasicPosition) => {
    removePosition(position.pool.chain, position.nftId || '');
  }, [removePosition]);

  // Check if a specific position is being refreshed
  const isPositionRefreshing = (position: BasicPosition) => {
    const key = `${position.pool.chain}-${position.nftId}`;
    return positionsMap[key]?.isRefreshing || false;
  };

  // Get user-friendly error message
  const errorMessage = error || null;

  if (isLoading && positions.length === 0) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (errorMessage && positions.length === 0) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Error Loading Positions</h3>
          <p className="text-slate-400 mb-4">{errorMessage}</p>
          <button
            onClick={() => {
              // TODO: Implement retry logic for store
              console.log('Retry clicked');
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Filters & Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">{t("dashboard.positions.filters.all")}</option>
            <option value="active">{t("dashboard.positions.filters.active")}</option>
            <option value="closed">{t("dashboard.positions.filters.closed")}</option>
            <option value="archived">{t("dashboard.positions.filters.archived")}</option>
          </select>
        </div>

        {/* Chain Filter */}
        <div>
          <select
            value={chain}
            onChange={(e) => setChain(e.target.value)}
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">{t("dashboard.positions.filters.allChains")}</option>
            <option value="ethereum">Ethereum</option>
            <option value="arbitrum">Arbitrum</option>
            <option value="base">Base</option>
          </select>
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="createdAt">{t("dashboard.positions.filters.sortBy.createdAt")}</option>
            {/* PnL-related sorting options commented out until PnL service is implemented */}
            {/* <option value="currentValue">{t("dashboard.positions.filters.sortBy.currentValue")}</option> */}
            {/* <option value="pnl">{t("dashboard.positions.filters.sortBy.pnl")}</option> */}
            {/* <option value="pnlPercent">{t("dashboard.positions.filters.sortBy.pnlPercent")}</option> */}
          </select>
          
          <button
            onClick={() => setSortOrder(prev => prev === "asc" ? "desc" : "asc")}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
            title={`Sort ${sortOrder === "asc" ? "Descending" : "Ascending"}`}
          >
            {sortOrder === "asc" ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
          </button>
        </div>

      </div>

      {/* Results Summary */}
      <div className="text-sm text-slate-400 mb-4">
        {t("dashboard.positions.showing", { current: positions.length, total })}
        {dataQuality.upgradedPositions > 0 && (
          <span className="ml-2 text-green-400">
            • {t("dashboard.positions.upgraded", { count: dataQuality.upgradedPositions })}
          </span>
        )}
      </div>

      {/* Position Cards */}
      {positions.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-xl font-semibold text-white mb-2">
            No positions found
          </h3>
          <p className="text-slate-400">
            {status === "active" 
              ? "Start by importing your first Uniswap V3 position"
              : `No ${status} positions available`
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {positions.map((position: BasicPosition) => (
            <PositionCard
              key={`${position.chain}-${position.protocol}-${position.nftId}`}
              position={position}
              onRefresh={handleRefreshPosition}
              onDelete={handleDeletePosition}
              isRefreshing={isPositionRefreshing(position)}
            />
          ))}
          
          {/* Load More Button */}
          {hasMore && (
            <div className="text-center pt-6">
              <button
                onClick={loadMore}
                disabled={isLoading}
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center gap-2 mx-auto disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  `Load More (${total - positions.length} remaining)`
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
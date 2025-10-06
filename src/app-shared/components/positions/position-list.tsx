"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { RotateCcw, Plus } from "lucide-react";
import { useTranslations } from "@/app-shared/i18n/client";
import type { BasicPosition } from "@/types/positions";
import type { PositionListParams } from "@/types/api";
import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/types/api";
import { useAccount } from "wagmi";
import { SUPPORTED_CHAINS, type SupportedChainsType } from "@/config/chains";
import { useDiscoverPositions, useImportDiscoveredPositions } from "@/app-shared/hooks/api/useDiscoverPositions";

// New ReactQuery-only hooks
import { usePositionsList } from "@/app-shared/hooks/api/usePositionsList";

import { PositionCard } from "./position-card";

interface PositionListProps {
  className?: string;
}

export function PositionList({ className }: PositionListProps) {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const { address: connectedAddress } = useAccount();

  // UI state (not stored globally anymore)
  const [sortBy, setSortBy] = useState("createdAt");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "closed" | "archived">("active");
  const [filterChain, setFilterChain] = useState("all");
  const [offset, setOffset] = useState(0);
  const limit = 20;

  // Multi-chain discovery state
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);
  const [discoveredCount, setDiscoveredCount] = useState(0);
  const hasRunInitialDiscovery = useRef(false);

  // Build query parameters - memoized to prevent unnecessary re-renders
  const queryParams = useMemo<PositionListParams>(() => ({
    limit,
    offset,
    sortBy,
    status: filterStatus, // Always include status, let API handle "all"
    ...(filterChain !== "all" && { chain: filterChain }),
  }), [limit, offset, sortBy, filterStatus, filterChain]);

  // Fetch positions with ReactQuery
  const {
    data: positionsData,
    isLoading,
    error,
    refetch,
  } = usePositionsList(queryParams);

  const positions = positionsData?.positions || [];
  const pagination = positionsData?.pagination;
  const hasMore = pagination ? pagination.total > offset + limit : false;

  // Discovery mutations
  const discoverPositions = useDiscoverPositions();
  const importPositions = useImportDiscoveredPositions();

  // Load more positions
  const loadMore = useCallback(() => {
    if (!hasMore || isLoading) return;
    setOffset(prev => prev + limit);
  }, [hasMore, isLoading, limit]);

  // Reset pagination when filters change
  const handleFilterChange = useCallback((newFilters: Partial<PositionListParams>) => {
    setOffset(0);
    if (newFilters.sortBy) setSortBy(newFilters.sortBy);
    if (newFilters.status) setFilterStatus(newFilters.status);
    if (newFilters.chain) setFilterChain(newFilters.chain);
  }, []);

  // Handle multi-chain position discovery
  const handleDiscoverNewPositions = useCallback(async () => {
    // Validate wallet connection
    if (!connectedAddress) {
      setDiscoveryError("Please connect your wallet first");
      return;
    }

    setIsDiscovering(true);
    setDiscoveryError(null);
    setDiscoveredCount(0);

    try {
      const allDiscoveredPositions: BasicPosition[] = [];

      // Discover positions on all supported chains (excluding dev chains)
      const productionChains = SUPPORTED_CHAINS.filter(
        chain => !chain.includes('local') && !chain.includes('fork')
      ) as SupportedChainsType[];

      for (const chain of productionChains) {
        try {
          const result = await discoverPositions.mutateAsync({
            address: connectedAddress,
            chain,
            limit: 10,
          });

          if (result.data?.positions) {
            // Filter for active positions only
            const activePositions = result.data.positions.filter(
              p => p.status === "active"
            );
            allDiscoveredPositions.push(...activePositions);
          }
        } catch (error) {
          console.warn(`Failed to discover positions on ${chain}:`, error);
          // Continue with other chains even if one fails
        }
      }

      // Import all discovered active positions
      if (allDiscoveredPositions.length > 0) {
        // Group positions by chain for import
        const positionsByChain = allDiscoveredPositions.reduce((acc, position) => {
          const chain = position.pool.chain;
          if (!acc[chain]) acc[chain] = [];
          acc[chain].push(position);
          return acc;
        }, {} as Record<string, BasicPosition[]>);

        // Import positions for each chain
        for (const [chain, chainPositions] of Object.entries(positionsByChain)) {
          try {
            await importPositions.mutateAsync({
              positions: chainPositions,
              chain,
            });
            setDiscoveredCount(prev => prev + chainPositions.length);
          } catch (error) {
            console.error(`Failed to import positions on ${chain}:`, error);
          }
        }

        // Invalidate position list to refresh
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.positions });
        setOffset(0);
        refetch();
      }
      // Don't show error feedback when no new positions found - just silently complete
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to discover positions";
      setDiscoveryError(errorMessage);
    } finally {
      setIsDiscovering(false);
    }
  }, [connectedAddress, discoverPositions, importPositions, queryClient, refetch]);

  // Handle external refresh trigger (old behavior for non-active filters)
  const handleRefresh = useCallback(() => {
    setOffset(0);
    refetch();
  }, [refetch]);

  // Run discovery once on initial load if wallet is connected
  useEffect(() => {
    if (connectedAddress && !hasRunInitialDiscovery.current) {
      hasRunInitialDiscovery.current = true;
      handleDiscoverNewPositions();
    }
  }, [connectedAddress, handleDiscoverNewPositions]);

  // Auto-hide feedback messages after 5 seconds
  useEffect(() => {
    if (discoveryError || discoveredCount > 0) {
      const timer = setTimeout(() => {
        setDiscoveryError(null);
        setDiscoveredCount(0);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [discoveryError, discoveredCount]);

  // Handle successful position deletion - update cache with correct key
  const handleDeleteSuccess = useCallback((deletedPosition: BasicPosition) => {
    // Update the cache with the correct query key that includes parameters
    queryClient.setQueryData(
      QUERY_KEYS.positionsList(queryParams),
      (oldData: any) => {
        if (!oldData?.data?.positions) {
          return oldData;
        }

        // Filter out the deleted position
        const updatedPositions = oldData.data.positions.filter(
          (p: any) =>
            !(
              p.nftId === deletedPosition.nftId &&
              p.pool?.chain === deletedPosition.pool.chain
            )
        );

        return {
          ...oldData,
          data: {
            ...oldData.data,
            positions: updatedPositions,
            pagination: oldData.data.pagination
              ? {
                  ...oldData.data.pagination,
                  total: oldData.data.pagination.total - 1,
                }
              : undefined,
          }
        };
      }
    );
  }, [queryClient, queryParams]);

  if (error) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-red-400 mb-4">Failed to load positions</p>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          <RotateCcw className="w-4 h-4 mr-2 inline" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={className}>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        {/* Status Filter */}
        <select
          value={filterStatus}
          onChange={(e) => handleFilterChange({ status: e.target.value as "active" | "closed" | "archived" })}
          className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">{t("dashboard.positions.filters.all")}</option>
          <option value="active">{t("dashboard.positions.filters.active")}</option>
          <option value="closed">{t("dashboard.positions.filters.closed")}</option>
        </select>

        {/* Chain Filter */}
        <select
          value={filterChain}
          onChange={(e) => handleFilterChange({ chain: e.target.value })}
          className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">{t("dashboard.positions.filters.allChains")}</option>
          <option value="ethereum">Ethereum</option>
          <option value="arbitrum">Arbitrum</option>
          <option value="base">Base</option>
        </select>

        {/* Sort By */}
        <select
          value={sortBy}
          onChange={(e) => handleFilterChange({ sortBy: e.target.value })}
          className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="createdAt">{t("dashboard.positions.filters.sortBy.createdAt")}</option>
        </select>

        {/* Refresh Button - Only visible when "active" filter is selected */}
        {filterStatus === "active" && (
          <button
            onClick={handleDiscoverNewPositions}
            disabled={isDiscovering}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-200 transition-colors disabled:opacity-50"
            title="Search for new active positions on all chains"
          >
            <RotateCcw className={`w-4 h-4 ${isDiscovering ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>

      {/* Discovery Feedback */}
      {discoveryError && (
        <div className="mb-4 px-4 py-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-sm text-yellow-400">
          {discoveryError}
        </div>
      )}

      {discoveredCount > 0 && (
        <div className="mb-4 px-4 py-3 bg-green-500/10 border border-green-500/20 rounded-lg text-sm text-green-400">
          Successfully imported {discoveredCount} new position{discoveredCount > 1 ? 's' : ''}
        </div>
      )}

      {/* Positions Grid */}
      {isLoading && positions.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-slate-400">Loading positions...</p>
        </div>
      ) : positions.length === 0 ? (
        <div className="text-center py-12">
          <div className="max-w-md mx-auto">
            <div className="bg-slate-800/50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              {t("dashboard.emptyState.title")}
            </h3>
            <p className="text-slate-400 mb-6">
              {t("dashboard.emptyState.description")}
            </p>
            {/* CreatePositionDropdown handled by parent dashboard */}
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4">
            {positions.map((position: BasicPosition) => (
              <PositionCard
                key={`${position.pool.chain}-${position.nftId}`}
                position={position}
                onDeleteSuccess={handleDeleteSuccess}
              />
            ))}
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="text-center mt-6">
              <button
                onClick={loadMore}
                disabled={isLoading}
                className="px-6 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-200 transition-colors disabled:opacity-50"
              >
                {isLoading ? "Loading..." : `Load More (${(pagination?.total || 0) - positions.length} remaining)`}
              </button>
            </div>
          )}

          {/* Pagination Info */}
          {pagination && (
            <div className="text-center mt-4 text-sm text-slate-400">
              Showing {positions.length} of {pagination.total} positions
            </div>
          )}
        </>
      )}
    </div>
  );
}
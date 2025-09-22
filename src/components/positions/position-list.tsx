"use client";

import { useState, useCallback } from "react";
import { RotateCcw, Plus } from "lucide-react";
import { useTranslations } from "@/i18n/client";
import type { BasicPosition } from "@/services/positions/positionService";
import type { PositionListParams } from "@/types/api";

// New ReactQuery-only hooks
import { usePositionsList } from "@/hooks/api/usePositionsList";

import { PositionCard } from "./position-card";
import { CreatePositionDropdown } from "./create-position-dropdown";

interface PositionListProps {
  className?: string;
}

export function PositionList({ className }: PositionListProps) {
  const t = useTranslations();

  // UI state (not stored globally anymore)
  const [sortBy, setSortBy] = useState("createdAt");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "closed" | "archived">("all");
  const [filterChain, setFilterChain] = useState("all");
  const [offset, setOffset] = useState(0);
  const limit = 20;

  // Build query parameters
  const queryParams: PositionListParams = {
    limit,
    offset,
    sortBy,
    ...(filterStatus !== "all" && { status: filterStatus }),
    ...(filterChain !== "all" && { chain: filterChain }),
  };

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

  // Handle external refresh trigger
  const handleRefresh = useCallback(() => {
    setOffset(0);
    refetch();
  }, [refetch]);

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
      {/* Header with filters */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white mb-2">
            {t("dashboard.title")}
          </h2>
          <p className="text-slate-400 text-sm">
            {t("dashboard.subtitle")}
          </p>
        </div>

        <CreatePositionDropdown />
      </div>

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

        {/* Refresh Button */}
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-200 transition-colors disabled:opacity-50"
        >
          <RotateCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

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
            <CreatePositionDropdown />
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4">
            {positions.map((position: BasicPosition) => (
              <PositionCard
                key={`${position.pool.chain}-${position.nftId}`}
                position={position}
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
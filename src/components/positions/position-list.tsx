"use client";

import { useState, useEffect } from "react";
import { Loader2, Filter, SortAsc, SortDesc, AlertCircle } from "lucide-react";
import { useTranslations } from "@/i18n/client";
import { PositionCard } from "./position-card";
import type { PositionWithPnL } from "@/services/positions/positionService";

interface PositionListResponse {
  success: boolean;
  data: {
    positions: PositionWithPnL[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
      nextOffset: number | null;
    };
  };
  meta: {
    requestedAt: string;
    filters: {
      status: string;
      chain: string | null;
      sortBy: string;
      sortOrder: string;
    };
    dataQuality: {
      subgraphPositions: number;
      snapshotPositions: number;
      upgradedPositions: number;
    };
  };
  error?: string;
}

interface PositionListProps {
  className?: string;
  refreshTrigger?: number;
}

export function PositionList({ className, refreshTrigger }: PositionListProps) {
  const t = useTranslations();
  const [positions, setPositions] = useState<PositionWithPnL[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  
  // Filters and sorting
  const [status, setStatus] = useState<string>("active");
  const [chain, setChain] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<string>("desc");
  
  // Pagination
  const [limit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  // Data quality info
  const [dataQuality, setDataQuality] = useState({
    subgraphPositions: 0,
    snapshotPositions: 0,
    upgradedPositions: 0
  });

  // Fetch positions
  const fetchPositions = async (reset = false) => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        status,
        limit: limit.toString(),
        offset: reset ? "0" : offset.toString(),
        sortBy,
        sortOrder,
      });
      
      if (chain !== "all") {
        params.append("chain", chain);
      }

      const response = await fetch(`/api/positions?${params}`);
      const result: PositionListResponse = await response.json();

      if (result.success) {
        if (reset) {
          setPositions(result.data.positions);
          setOffset(0);
        } else {
          setPositions(prev => [...prev, ...result.data.positions]);
        }
        
        setHasMore(result.data.pagination.hasMore);
        setTotal(result.data.pagination.total);
        setDataQuality(result.meta.dataQuality);
      } else {
        setError(result.error || "Failed to load positions");
      }
    } catch (err) {
      console.error("Error fetching positions:", err);
      setError("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  };

  // Load more positions
  const loadMore = () => {
    if (!hasMore || loading) return;
    setOffset(prev => prev + limit);
  };

  // Refresh single position
  const refreshPosition = async (positionId: string) => {
    try {
      setRefreshingId(positionId);
      
      const response = await fetch(`/api/positions/${positionId}/refresh`, {
        method: "POST",
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Update the position in the list
        setPositions(prev => 
          prev.map(pos => 
            pos.id === positionId ? result.data.position : pos
          )
        );
        
        // Show upgrade notification if data was upgraded
        if (result.meta.upgraded) {
          // TODO: Show toast notification
          // Position data upgraded to exact historical values
        }
      } else {
        console.error("Failed to refresh position:", result.error);
        // TODO: Show error toast
      }
    } catch (error) {
      console.error("Error refreshing position:", error);
    } finally {
      setRefreshingId(null);
    }
  };

  // Effect for fetching positions when filters change
  useEffect(() => {
    fetchPositions(true);
  }, [status, chain, sortBy, sortOrder]);

  // Effect for loading more when offset changes
  useEffect(() => {
    if (offset > 0) {
      fetchPositions(false);
    }
  }, [offset]);

  // Effect for external refresh trigger (e.g., after import)
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      fetchPositions(true);
    }
  }, [refreshTrigger]);

  if (loading && positions.length === 0) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error && positions.length === 0) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Error Loading Positions</h3>
          <p className="text-slate-400 mb-4">{error}</p>
          <button
            onClick={() => fetchPositions(true)}
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
            <option value="currentValue">{t("dashboard.positions.filters.sortBy.currentValue")}</option>
            <option value="pnl">{t("dashboard.positions.filters.sortBy.pnl")}</option>
            <option value="pnlPercent">{t("dashboard.positions.filters.sortBy.pnlPercent")}</option>
          </select>
          
          <button
            onClick={() => setSortOrder(prev => prev === "asc" ? "desc" : "asc")}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
            title={`Sort ${sortOrder === "asc" ? "Descending" : "Ascending"}`}
          >
            {sortOrder === "asc" ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
          </button>
        </div>

        {/* Data Quality Info */}
        <div className="flex items-center gap-2 text-xs text-slate-400 ml-auto">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>{dataQuality.subgraphPositions} exact</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
            <span>{dataQuality.snapshotPositions} estimated</span>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="text-sm text-slate-400 mb-4">
        Showing {positions.length} of {total} positions
        {dataQuality.upgradedPositions > 0 && (
          <span className="ml-2 text-green-400">
            • {dataQuality.upgradedPositions} upgraded to exact data
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
          {positions.map((position) => (
            <PositionCard
              key={position.id}
              position={position}
              onRefresh={refreshPosition}
              isRefreshing={refreshingId === position.id}
            />
          ))}
          
          {/* Load More Button */}
          {hasMore && (
            <div className="text-center pt-6">
              <button
                onClick={loadMore}
                disabled={loading}
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center gap-2 mx-auto disabled:opacity-50"
              >
                {loading ? (
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
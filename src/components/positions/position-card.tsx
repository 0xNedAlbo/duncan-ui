"use client";

import { useState } from "react";
import { RefreshCw, TrendingUp, TrendingDown, Clock, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useTranslations } from "@/i18n/client";
import type { PositionWithPnL } from "@/services/positions/positionService";

interface PositionCardProps {
  position: PositionWithPnL;
  onRefresh?: (positionId: string) => void;
  isRefreshing?: boolean;
}

export function PositionCard({ position, onRefresh, isRefreshing }: PositionCardProps) {
  const t = useTranslations();
  const [showDetails, setShowDetails] = useState(false);

  // Format currency values
  const formatCurrency = (value: string) => {
    const num = parseFloat(value);
    if (num >= 1000000) {
      return `$${(num / 1000000).toFixed(2)}M`;
    } else if (num >= 1000) {
      return `$${(num / 1000).toFixed(2)}K`;
    } else {
      return `$${num.toFixed(2)}`;
    }
  };

  // Format percentage
  const formatPercent = (value: number) => {
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}%`;
  };

  // Get PnL color classes
  const getPnLColorClasses = (pnlPercent: number) => {
    if (pnlPercent > 0) {
      return "text-green-400 bg-green-500/10 border-green-500/20";
    } else if (pnlPercent < 0) {
      return "text-red-400 bg-red-500/10 border-red-500/20";
    } else {
      return "text-slate-400 bg-slate-500/10 border-slate-500/20";
    }
  };

  // Get range status color
  const getRangeStatusColor = (status: string) => {
    switch (status) {
      case "in-range":
        return "text-green-400 bg-green-500/10 border-green-500/20";
      case "out-of-range":
        return "text-orange-400 bg-orange-500/10 border-orange-500/20";
      default:
        return "text-slate-400 bg-slate-500/10 border-slate-500/20";
    }
  };

  // Get chain badge color
  const getChainColor = (chain: string) => {
    switch (chain.toLowerCase()) {
      case "ethereum":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "arbitrum":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "base":
        return "bg-indigo-500/20 text-indigo-400 border-indigo-500/30";
      default:
        return "bg-slate-500/20 text-slate-400 border-slate-500/30";
    }
  };

  // Get confidence icon
  const getConfidenceIcon = () => {
    if (position.confidence === "exact") {
      return <CheckCircle2 className="w-3 h-3" />;
    } else {
      return <AlertCircle className="w-3 h-3" />;
    }
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6 hover:border-slate-600/50 transition-all duration-200">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Token Logos */}
          <div className="flex items-center -space-x-2">
            {position.pool.token0.logoUrl && (
              <img
                src={position.pool.token0.logoUrl}
                alt={position.pool.token0.symbol}
                className="w-8 h-8 rounded-full border-2 border-slate-800 bg-slate-700"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            )}
            {position.pool.token1.logoUrl && (
              <img
                src={position.pool.token1.logoUrl}
                alt={position.pool.token1.symbol}
                className="w-8 h-8 rounded-full border-2 border-slate-800 bg-slate-700"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            )}
          </div>
          
          {/* Token Pair & Info */}
          <div>
            <h3 className="text-lg font-semibold text-white">
              {position.tokenPair}
            </h3>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getChainColor(position.pool.chain)}`}>
                {position.pool.chain.charAt(0).toUpperCase() + position.pool.chain.slice(1)}
              </span>
              <span>•</span>
              <span>{(position.pool.fee / 10000).toFixed(2)}%</span>
              {position.nftId && (
                <>
                  <span>•</span>
                  <span>#{position.nftId}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Refresh Button */}
        <button
          onClick={() => onRefresh?.(position.id)}
          disabled={isRefreshing}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors disabled:opacity-50"
          title={t("dashboard.positions.refresh")}
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Values & PnL */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-sm text-slate-400 mb-1">{t("dashboard.positions.currentValue")}</div>
          <div className="text-xl font-semibold text-white">
            {formatCurrency(position.currentValue)}
          </div>
        </div>
        <div>
          <div className="text-sm text-slate-400 mb-1">{t("dashboard.positions.pnl")}</div>
          <div className={`text-xl font-semibold flex items-center gap-2 ${
            position.pnlPercent > 0 ? 'text-green-400' : position.pnlPercent < 0 ? 'text-red-400' : 'text-slate-400'
          }`}>
            {position.pnlPercent > 0 ? <TrendingUp className="w-5 h-5" /> : 
             position.pnlPercent < 0 ? <TrendingDown className="w-5 h-5" /> : null}
            {formatCurrency(position.pnl)}
          </div>
          <div className="text-sm text-slate-400">
            ({formatPercent(position.pnlPercent)})
          </div>
        </div>
      </div>

      {/* Status Badges */}
      <div className="flex items-center gap-2 mb-4">
        {/* Range Status */}
        <span className={`px-2 py-1 rounded-md text-xs font-medium border ${getRangeStatusColor(position.rangeStatus)}`}>
          {position.rangeStatus === "in-range" ? t("dashboard.positions.rangeStatus.inRange") :
           position.rangeStatus === "out-of-range" ? t("dashboard.positions.rangeStatus.outOfRange") : 
           t("dashboard.positions.rangeStatus.unknown")}
        </span>

        {/* Data Quality Badge */}
        <span className={`px-2 py-1 rounded-md text-xs font-medium border flex items-center gap-1 ${
          position.confidence === "exact" ? "text-green-400 bg-green-500/10 border-green-500/20" : "text-yellow-400 bg-yellow-500/10 border-yellow-500/20"
        }`}>
          {getConfidenceIcon()}
          {position.confidence === "exact" ? t("dashboard.positions.dataQuality.exact") : t("dashboard.positions.dataQuality.estimated")}
        </span>

        {/* Data Source */}
        <span className="px-2 py-1 rounded-md text-xs font-medium text-slate-400 bg-slate-500/10 border border-slate-500/20">
          {position.initialSource === "subgraph" ? t("dashboard.positions.dataQuality.subgraph") : t("dashboard.positions.dataQuality.snapshot")}
        </span>
      </div>

      {/* Details Toggle */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="w-full text-sm text-slate-400 hover:text-white transition-colors"
      >
        {showDetails ? t("dashboard.positions.hideDetails") : t("dashboard.positions.showDetails")}
      </button>

      {/* Collapsible Details */}
      {showDetails && (
        <div className="mt-4 pt-4 border-t border-slate-700/50 space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-slate-400 mb-1">{t("dashboard.positions.initialValue")}</div>
              <div className="text-slate-200">{formatCurrency(position.initialValue)}</div>
            </div>
            <div>
              <div className="text-slate-400 mb-1">{t("dashboard.positions.liquidity")}</div>
              <div className="text-slate-200 font-mono">
                {parseFloat(position.liquidity).toExponential(2)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-slate-400 mb-1">{t("dashboard.positions.tickLower")}</div>
              <div className="text-slate-200 font-mono">{position.tickLower}</div>
            </div>
            <div>
              <div className="text-slate-400 mb-1">{t("dashboard.positions.tickUpper")}</div>
              <div className="text-slate-200 font-mono">{position.tickUpper}</div>
            </div>
          </div>

          <div className="text-xs text-slate-500 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {t("dashboard.positions.lastUpdated")}: {new Date(position.lastUpdated).toLocaleString()}
          </div>

          {position.dataUpdated && (
            <div className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded p-2">
              ✨ {t("dashboard.positions.dataUpgraded")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
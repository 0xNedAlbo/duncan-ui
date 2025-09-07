"use client";

import { useState } from "react";
import Image from "next/image";
import { RefreshCw, TrendingUp, TrendingDown, Clock, Loader2, AlertCircle, CheckCircle2, Copy, ChevronDown } from "lucide-react";
import { useTranslations } from "@/i18n/client";
import { formatCurrency, formatPercent, formatLiquidity } from "@/lib/utils/formatters";
import type { PositionWithPnL } from "@/services/positions/positionService";

interface PositionCardProps {
  position: PositionWithPnL;
  onRefresh?: (positionId: string) => void;
  isRefreshing?: boolean;
}

export function PositionCard({ position, onRefresh, isRefreshing }: PositionCardProps) {
  const t = useTranslations();
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);
  const [token0ImageError, setToken0ImageError] = useState(false);
  const [token1ImageError, setToken1ImageError] = useState(false);


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


  // Get confidence icon
  const getConfidenceIcon = () => {
    if (position.confidence === "exact") {
      return <CheckCircle2 className="w-3 h-3" />;
    } else {
      return <AlertCircle className="w-3 h-3" />;
    }
  };

  // Get NFT explorer link
  const getNFTExplorerLink = (chain: string, nftId: string) => {
    const uniswapV3NFTAddresses = {
      ethereum: "0xc36442b4a4522e871399cd717abdd847ab11fe88",
      arbitrum: "0xc36442b4a4522e871399cd717abdd847ab11fe88", 
      base: "0x03a520b32c04bf3beef7beb72e919cf822ed34f1"
    };

    const explorers = {
      ethereum: "https://etherscan.io",
      arbitrum: "https://arbiscan.io",
      base: "https://basescan.org"
    };

    const contractAddress = uniswapV3NFTAddresses[chain.toLowerCase() as keyof typeof uniswapV3NFTAddresses];
    const explorerUrl = explorers[chain.toLowerCase() as keyof typeof explorers];

    if (contractAddress && explorerUrl) {
      return `${explorerUrl}/token/${contractAddress}?a=${nftId}`;
    }
    return null;
  };

  // Copy NFT ID to clipboard
  const copyNFTId = async (nftId: string) => {
    try {
      await navigator.clipboard.writeText(nftId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy NFT ID:', err);
    }
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 px-6 py-4 hover:border-slate-600/50 transition-all duration-200">
      {/* Header - Always Visible */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {/* Expand/Collapse Button */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title={showDetails ? t("dashboard.positions.hideDetails") : t("dashboard.positions.showDetails")}
          >
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showDetails ? 'rotate-180' : ''}`} />
          </button>
          {/* Token Logos */}
          <div className="flex items-center -space-x-2">
            {position.pool.token0.logoUrl && !token0ImageError && (
              <Image
                src={position.pool.token0.logoUrl}
                alt={position.pool.token0.symbol}
                width={32}
                height={32}
                className="w-8 h-8 rounded-full border-2 border-slate-800 bg-slate-700"
                onError={() => setToken0ImageError(true)}
              />
            )}
            {position.pool.token1.logoUrl && !token1ImageError && (
              <Image
                src={position.pool.token1.logoUrl}
                alt={position.pool.token1.symbol}
                width={32}
                height={32}
                className="w-8 h-8 rounded-full border-2 border-slate-800 bg-slate-700"
                onError={() => setToken1ImageError(true)}
              />
            )}
          </div>
          
          {/* Token Pair & Info */}
          <div>
            <h3 className="text-lg font-semibold text-white">
              {position.tokenPair}
            </h3>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span className="px-2 py-0.5 rounded text-xs font-medium border bg-slate-500/20 text-slate-400 border-slate-500/30">
                {position.pool.chain.charAt(0).toUpperCase() + position.pool.chain.slice(1)}
              </span>
              <span>•</span>
              <span>{(position.pool.fee / 10000).toFixed(2)}%</span>
              {position.nftId && (
                <>
                  <span>•</span>
                  <span>{t("dashboard.addPosition.nft.nftId")}: </span>
                  <div className="inline-flex items-center gap-1">
                    {(() => {
                      const explorerLink = getNFTExplorerLink(position.pool.chain, position.nftId);
                      return explorerLink ? (
                        <a
                          href={explorerLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          #{position.nftId}
                        </a>
                      ) : (
                        <span>#{position.nftId}</span>
                      );
                    })()}
                    <div className="relative">
                      <button
                        onClick={() => position.nftId && copyNFTId(position.nftId)}
                        className="p-0.5 text-slate-400 hover:text-white transition-colors cursor-pointer"
                        title="Copy NFT ID"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      {copied && (
                        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-green-600 text-white text-xs px-2 py-1 rounded shadow-lg z-10">
                          Copied!
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Current Value & PnL */}
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-xs text-slate-400 mb-0.5">{t("dashboard.positions.currentValue")}</div>
            <div className="text-lg font-semibold text-white">
              {formatCurrency(position.currentValue)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400 mb-0.5">{t("dashboard.positions.pnl")}</div>
            <div className={`text-lg font-semibold flex items-center gap-1 ${
              position.pnlPercent > 0 ? 'text-green-400' : position.pnlPercent < 0 ? 'text-red-400' : 'text-slate-400'
            }`}>
              {position.pnlPercent > 0 ? <TrendingUp className="w-4 h-4" /> : 
               position.pnlPercent < 0 ? <TrendingDown className="w-4 h-4" /> : null}
              <div className="flex flex-col items-end">
                <span>{formatCurrency(position.pnl)}</span>
                <span className="text-xs text-slate-400">
                  {formatPercent(position.pnlPercent)}
                </span>
              </div>
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


      {/* Collapsible Details */}
      {showDetails && (
        <div className="mt-3 pt-3 border-t border-slate-700/50 space-y-3">
          {/* Status Badges */}
          <div className="flex items-center gap-2 flex-wrap">
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

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-slate-400 mb-1">{t("dashboard.positions.initialValue")}</div>
              <div className="text-slate-200">{formatCurrency(position.initialValue)}</div>
            </div>
            <div>
              <div className="text-slate-400 mb-1">{t("dashboard.positions.liquidity")}</div>
              <div className="text-slate-200 font-mono">
                {formatLiquidity(position.liquidity)}
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
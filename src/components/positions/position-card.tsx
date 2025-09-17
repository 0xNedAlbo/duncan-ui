"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { RefreshCw, Copy, Search, TrendingUp, TrendingDown } from "lucide-react";
import { useTranslations } from "@/i18n/client";
import { formatCompactValue } from "@/lib/utils/fraction-format";
import type { BasicPosition } from "@/services/positions/positionService";
import { usePositionPnL, usePnLDisplayValues } from "@/hooks/api/usePositionPnL";
import { MiniPnLCurveLazy } from "@/components/charts/mini-pnl-curve-lazy";

interface PositionCardProps {
    position: BasicPosition;
    onRefresh?: (position: BasicPosition) => void;
    isRefreshing?: boolean;
}

export function PositionCard({
    position,
    onRefresh,
    isRefreshing,
}: PositionCardProps) {
    const t = useTranslations();
    const [copied, setCopied] = useState(false);
    const [token0ImageError, setToken0ImageError] = useState(false);
    const [token1ImageError, setToken1ImageError] = useState(false);

    // Get quote token decimals for proper formatting
    const quoteTokenDecimals = position.token0IsQuote
        ? position.pool.token0.decimals
        : position.pool.token1.decimals;

    // Fetch PnL data for this position
    const { data: pnlData, isLoading: pnlLoading, error: pnlError } = usePositionPnL(
        position.pool.chain,
        position.nftId,
        { enabled: Boolean(position.nftId) } // Only fetch if position has NFT ID
    );

    // Get formatted display values
    const pnlDisplayValues = usePnLDisplayValues(pnlData, quoteTokenDecimals);

    // Check if PnL data failed to load (for debugging)
    const pnlFailed = Boolean(pnlError && !pnlLoading);

    // Get PnL color classes - Commented out until PnL data is available
    // const getPnLColorClasses = (pnlPercent: number) => {
    //     if (pnlPercent > 0) {
    //         return "text-green-400 bg-green-500/10 border-green-500/20";
    //     } else if (pnlPercent < 0) {
    //         return "text-red-400 bg-red-500/10 border-red-500/20";
    //     } else {
    //         return "text-slate-400 bg-slate-500/10 border-slate-500/20";
    //     }
    // };

    // Get range status color - Commented out until range status is calculated
    // const getRangeStatusColor = (status: string) => {
    //     switch (status) {
    //         case "in-range":
    //             return "text-green-400 bg-green-500/10 border-green-500/20";
    //         case "out-of-range":
    //             return "text-orange-400 bg-orange-500/10 border-orange-500/20";
    //         default:
    //             return "text-slate-400 bg-slate-500/10 border-slate-500/20";
    //     }
    // };

    // Get NFT explorer link
    const getNFTExplorerLink = (chain: string, nftId: string) => {
        const uniswapV3NFTAddresses = {
            ethereum: "0xc36442b4a4522e871399cd717abdd847ab11fe88",
            arbitrum: "0xc36442b4a4522e871399cd717abdd847ab11fe88",
            base: "0x03a520b32c04bf3beef7beb72e919cf822ed34f1",
        };

        const explorers = {
            ethereum: "https://etherscan.io",
            arbitrum: "https://arbiscan.io",
            base: "https://basescan.org",
        };

        const contractAddress =
            uniswapV3NFTAddresses[
                chain.toLowerCase() as keyof typeof uniswapV3NFTAddresses
            ];
        const explorerUrl =
            explorers[chain.toLowerCase() as keyof typeof explorers];

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
            console.error("Failed to copy NFT ID:", err);
        }
    };

    // Check if position is stale (not refreshed for more than 30 minutes)
    // Commented out until lastUpdated field is available
    // const isStalePosition = () => {
    //     if (!position.lastUpdated) return true;
    //     const lastUpdatedTime = new Date(position.lastUpdated).getTime();
    //     const now = Date.now();
    //     const thirtyMinutesInMs = 30 * 60 * 1000;
    //     return (now - lastUpdatedTime) > thirtyMinutesInMs;
    // };

    return (
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 px-6 py-4 hover:border-slate-600/50 transition-all duration-200">
            {/* Header - Always Visible */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
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
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-semibold text-white">
                                {position.pool.token0.symbol}/{position.pool.token1.symbol}
                            </h3>
                            {/* Range Status - Commented out until range status calculation is implemented */}
                            {/* <span
                                className={`px-2 py-1 rounded-md text-xs font-medium border ${getRangeStatusColor(
                                    position.rangeStatus
                                )}`}
                            >
                                {position.rangeStatus === "in-range"
                                    ? t(
                                          "dashboard.positions.rangeStatus.inRange"
                                      )
                                    : position.rangeStatus === "out-of-range"
                                    ? t(
                                          "dashboard.positions.rangeStatus.outOfRange"
                                      )
                                    : t(
                                          "dashboard.positions.rangeStatus.unknown"
                                      )}
                            </span>
                            */}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                            <span className="px-2 py-0.5 rounded text-xs font-medium border bg-slate-500/20 text-slate-400 border-slate-500/30">
                                {position.pool.chain.charAt(0).toUpperCase() +
                                    position.pool.chain.slice(1)}
                            </span>
                            <span>•</span>
                            <span>
                                {(position.pool.fee / 10000).toFixed(2)}%
                            </span>
                            {position.nftId && (
                                <>
                                    <span>•</span>
                                    <span>
                                        {t("dashboard.addPosition.nft.nftId")}:{" "}
                                    </span>
                                    <div className="inline-flex items-center gap-1">
                                        {(() => {
                                            const explorerLink =
                                                getNFTExplorerLink(
                                                    position.pool.chain,
                                                    position.nftId
                                                );
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
                                                onClick={() =>
                                                    position.nftId &&
                                                    copyNFTId(position.nftId)
                                                }
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
                    {/* Position Info with PnL Data */}
                    <div className="flex items-start gap-6 ml-6">
                        {/* Current Value */}
                        <div className="text-right">
                            <div className="text-xs text-slate-400 mb-0.5">
                                Current Value ({position.token0IsQuote ? position.pool.token0.symbol : position.pool.token1.symbol})
                            </div>
                            <div className="text-lg font-semibold text-white">
                                {pnlDisplayValues.currentValue ? (
                                    formatCompactValue(
                                        pnlDisplayValues.currentValue,
                                        quoteTokenDecimals
                                    )
                                ) : (
                                    "0"
                                )}
                            </div>
                        </div>

                        {/* PnL Curve Visualization */}
                        <div className="text-right">
                            <div className="text-xs text-slate-400 mb-0.5">
                                PnL Curve
                            </div>
                            <div className="flex justify-end">
                                <MiniPnLCurveLazy
                                    position={position}
                                    width={120}
                                    height={60}
                                    showTooltip={false}
                                />
                            </div>
                        </div>

                        {/* Total PnL */}
                        {pnlDisplayValues.totalPnL !== null ? (
                            <div className="text-right">
                                <div className="text-xs text-slate-400 mb-0.5">
                                    Total PnL ({position.token0IsQuote ? position.pool.token0.symbol : position.pool.token1.symbol})
                                </div>
                                <div className={`text-lg font-semibold ${pnlDisplayValues.pnlColor}`}>
                                    <div className="flex items-center justify-end gap-1">
                                        {pnlDisplayValues.isPositive ? (
                                            <TrendingUp className="w-4 h-4" />
                                        ) : pnlDisplayValues.isNegative ? (
                                            <TrendingDown className="w-4 h-4" />
                                        ) : null}
                                        <span>
                                            {formatCompactValue(
                                                pnlDisplayValues.totalPnL,
                                                quoteTokenDecimals
                                            )}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ) : pnlLoading ? (
                            <div className="text-right">
                                <div className="text-xs text-slate-400 mb-0.5">
                                    Loading PnL...
                                </div>
                                <div className="text-lg font-semibold text-slate-400">
                                    --
                                </div>
                            </div>
                        ) : pnlFailed ? (
                            <div className="text-right">
                                <div className="text-xs text-slate-400 mb-0.5">
                                    PnL Unavailable
                                </div>
                                <div className="text-lg font-semibold text-slate-400">
                                    --
                                </div>
                            </div>
                        ) : null}

                        {/* Unclaimed Fees */}
                        <div className="text-right">
                            <div className="text-xs text-slate-400 mb-0.5">
                                Claimable Fees ({position.token0IsQuote ? position.pool.token0.symbol : position.pool.token1.symbol})
                            </div>
                            <div className={`text-lg font-semibold ${pnlDisplayValues.unclaimedFees ? 'text-amber-400' : 'text-white'}`}>
                                {pnlDisplayValues.unclaimedFees ? (
                                    formatCompactValue(
                                        pnlDisplayValues.unclaimedFees,
                                        quoteTokenDecimals
                                    )
                                ) : (
                                    "0"
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                    {/* Details Button */}
                    {position.nftId ? (
                        <Link
                            href={`/position/uniswapv3/nft/${position.pool.chain}/${position.nftId}`}
                            className="p-3 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
                            title={t("dashboard.positions.viewDetails")}
                        >
                            <Search className="w-5 h-5" />
                        </Link>
                    ) : (
                        <button
                            disabled
                            className="p-3 text-slate-600 cursor-not-allowed rounded-lg opacity-50"
                            title={t("dashboard.positions.noNftId")}
                        >
                            <Search className="w-5 h-5" />
                        </button>
                    )}
                    
                    {/* Refresh Button */}
                    <div className="relative">
                        <button
                            onClick={() => onRefresh?.(position)}
                            disabled={isRefreshing}
                            className="p-3 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors disabled:opacity-50"
                            title={t("dashboard.positions.refresh")}
                        >
                            <RefreshCw
                                className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`}
                            />
                        </button>
                        {/* Stale Position Indicator - Commented out until lastUpdated field is available */}
                        {/* {isStalePosition() && !isRefreshing && (
                            <div className="absolute -top-1 -right-1 bg-yellow-500 text-yellow-900 rounded-full w-4 h-4 flex items-center justify-center text-xs font-bold">
                                !
                            </div>
                        )} */}
                    </div>
                </div>
            </div>
        </div>
    );
}

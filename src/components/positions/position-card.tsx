"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
    RefreshCw,
    Copy,
    Search,
    TrendingUp,
    TrendingDown,
} from "lucide-react";
import { useTranslations } from "@/i18n/client";
import { formatCompactValue } from "@/lib/utils/fraction-format";
import type { BasicPosition } from "@/services/positions/positionService";
import { usePnLDisplayValues } from "@/hooks/api/usePositionPnL";
import { usePositionStore } from "@/store/position-store";
import { apiClient } from "@/lib/app/apiClient";
import { MiniPnLCurveLazy } from "@/components/charts/mini-pnl-curve-lazy";

interface PositionCardProps {
    position: BasicPosition;
    // eslint-disable-next-line no-unused-vars
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
    const cardRef = useRef<HTMLDivElement>(null);
    const [pnlLoaded, setPnlLoaded] = useState(false);

    // Get quote token decimals for proper formatting
    const quoteTokenDecimals = position.token0IsQuote
        ? position.pool.token0.decimals
        : position.pool.token1.decimals;

    // Get PnL and APR data from position store
    const getPosition = usePositionStore((state) => state.getPosition);
    const positionWithDetails = position.nftId
        ? getPosition(position.pool.chain, position.nftId)
        : null;
    const pnlData = positionWithDetails?.pnlBreakdown;
    const aprData = positionWithDetails?.aprBreakdown;
    const pnlLoading = !pnlData && Boolean(position.nftId); // Loading if no PnL data and position has NFT ID
    const aprLoading = !aprData && Boolean(position.nftId); // Loading if no APR data and position has NFT ID
    const pnlFailed = false; // Store doesn't track individual PnL errors currently

    // Get formatted display values
    const pnlDisplayValues = usePnLDisplayValues(pnlData, quoteTokenDecimals);

    // Format APR for display
    const formatApr = (apr: number): string => {
        if (apr === 0) return "0%";
        if (Math.abs(apr) < 0.01) return "<0.01%";
        return `${apr.toFixed(2)}%`;
    };

    // APR is always non-negative (no negative fees) so we use white text
    const aprColorClass = "text-white";

    // Load PnL, APR, and curve data when position card becomes visible
    useEffect(() => {
        const curveData = positionWithDetails?.curveData;
        const aprData = positionWithDetails?.aprBreakdown;
        const needsData =
            (!pnlData || !curveData || !aprData) &&
            !pnlLoaded &&
            position.nftId &&
            position.pool?.chain;

        if (needsData) {
            const observer = new IntersectionObserver(
                async ([entry]) => {
                    if (entry.isIntersecting) {
                        setPnlLoaded(true);
                        observer.disconnect();

                        // Load PnL, APR, and curve data in parallel
                        const [pnlResponse, aprResponse, curveResponse] =
                            await Promise.allSettled([
                                apiClient.get(
                                    `/api/positions/uniswapv3/nft/${position.pool.chain}/${position.nftId}/pnl`
                                ),
                                apiClient.get(
                                    `/api/positions/uniswapv3/nft/${position.pool.chain}/${position.nftId}/apr`
                                ),
                                apiClient.get(
                                    `/api/positions/uniswapv3/nft/${position.pool.chain}/${position.nftId}/curve`
                                ),
                            ]);

                        // Update position with loaded data in store
                        if (!position.nftId) {
                            return; // Skip if no NFT ID
                        }

                        const key = `${position.pool.chain}-${position.nftId}`;
                        const { getPosition, updatePositionEverywhere } =
                            usePositionStore.getState();

                        const existingPosition = getPosition(
                            position.pool.chain,
                            position.nftId
                        );
                        if (existingPosition) {
                            const updatedPosition = { ...existingPosition };

                            // Add PnL data if successful and not already present
                            if (
                                pnlResponse.status === "fulfilled" &&
                                pnlResponse.value.data &&
                                !updatedPosition.pnlBreakdown
                            ) {
                                updatedPosition.pnlBreakdown =
                                    pnlResponse.value.data;
                            } else if (pnlResponse.status === "rejected") {
                                console.debug(
                                    `PnL load failed for position ${position.nftId}:`,
                                    pnlResponse.reason
                                );
                            }

                            // Add APR data if successful and not already present
                            if (
                                aprResponse.status === "fulfilled" &&
                                aprResponse.value.data &&
                                !updatedPosition.aprBreakdown
                            ) {
                                updatedPosition.aprBreakdown =
                                    aprResponse.value.data;
                            } else if (aprResponse.status === "rejected") {
                                console.debug(
                                    `APR load failed for position ${position.nftId}:`,
                                    aprResponse.reason
                                );
                            }

                            // Add curve data if successful and not already present
                            if (
                                curveResponse.status === "fulfilled" &&
                                curveResponse.value.data &&
                                !updatedPosition.curveData
                            ) {
                                updatedPosition.curveData =
                                    curveResponse.value.data;
                            } else if (curveResponse.status === "rejected") {
                                console.debug(
                                    `Curve load failed for position ${position.nftId}:`,
                                    curveResponse.reason
                                );
                            }

                            // Only update if we got at least some data or made changes
                            if (
                                updatedPosition.pnlBreakdown !==
                                    existingPosition.pnlBreakdown ||
                                updatedPosition.aprBreakdown !==
                                    existingPosition.aprBreakdown ||
                                updatedPosition.curveData !==
                                    existingPosition.curveData
                            ) {
                                updatePositionEverywhere(key, updatedPosition);
                            }
                        }
                    }
                },
                {
                    threshold: 0.1,
                    rootMargin: "100px",
                }
            );

            if (cardRef.current) {
                observer.observe(cardRef.current);
            }

            return () => observer.disconnect();
        }
    }, [
        pnlData,
        positionWithDetails?.curveData,
        positionWithDetails?.aprBreakdown,
        pnlLoaded,
        position.nftId,
        position.pool?.chain,
    ]);

    // Check if PnL data failed to load (for debugging)
    // const pnlFailed = false; // Store doesn't track individual errors

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

    // Determine position status for badge
    const getPositionStatus = () => {
        // Check if position is closed first
        if (position.status === "closed" || position.status === "archived") {
            return "closed";
        }

        // Check if position is in range based on current tick
        if (
            position.pool.currentTick !== undefined &&
            position.pool.currentTick !== null
        ) {
            const currentTick = position.pool.currentTick;
            if (
                currentTick >= position.tickLower &&
                currentTick <= position.tickUpper
            ) {
                return "in-range";
            } else {
                return "out-of-range";
            }
        }

        // If no current tick data, return unknown
        return "unknown";
    };

    // Get status badge styling
    const getStatusBadgeStyle = (status: string) => {
        switch (status) {
            case "in-range":
                return "bg-green-500/20 text-green-400 border-green-500/30";
            case "out-of-range":
                return "bg-red-500/20 text-red-400 border-red-500/30";
            case "closed":
                return "bg-slate-500/20 text-slate-400 border-slate-500/30";
            default:
                return "bg-slate-500/20 text-slate-400 border-slate-500/30";
        }
    };

    // Get status display text
    const getStatusText = (status: string) => {
        switch (status) {
            case "in-range":
                return t("dashboard.positions.rangeStatus.inRange");
            case "out-of-range":
                return t("dashboard.positions.rangeStatus.outOfRange");
            case "closed":
                return "Closed";
            default:
                return "Unknown";
        }
    };

    const positionStatus = getPositionStatus();

    return (
        <div
            ref={cardRef}
            className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 px-6 py-4 hover:border-slate-600/50 transition-all duration-200"
        >
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
                                {position.pool.token0.symbol}/
                                {position.pool.token1.symbol}
                            </h3>
                            <span
                                className={`px-1 py-0.5 rounded-sm text-xs font-medium border ${getStatusBadgeStyle(
                                    positionStatus
                                )}`}
                            >
                                {getStatusText(positionStatus)}
                            </span>
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
                                {t("dashboard.positions.currentValue")} (
                                {position.token0IsQuote
                                    ? position.pool.token0.symbol
                                    : position.pool.token1.symbol}
                                )
                            </div>
                            <div className="text-lg font-semibold text-white">
                                {pnlDisplayValues.currentValue
                                    ? formatCompactValue(
                                          pnlDisplayValues.currentValue,
                                          quoteTokenDecimals
                                      )
                                    : "0"}
                            </div>
                        </div>

                        {/* PnL Curve Visualization */}
                        <div className="text-right">
                            <div className="text-xs text-slate-400 mb-0.5">
                                {t("dashboard.positions.pnlCurve")}
                            </div>
                            <div className="flex justify-end">
                                <MiniPnLCurveLazy
                                    position={position}
                                    width={120}
                                    height={60}
                                    showTooltip={true}
                                />
                            </div>
                        </div>

                        {/* Total PnL */}
                        {pnlDisplayValues.totalPnL !== null ? (
                            <div className="text-right">
                                <div className="text-xs text-slate-400 mb-0.5">
                                    {t("dashboard.positions.totalPnl")} (
                                    {position.token0IsQuote
                                        ? position.pool.token0.symbol
                                        : position.pool.token1.symbol}
                                    )
                                </div>
                                <div
                                    className={`text-lg font-semibold ${pnlDisplayValues.pnlColor}`}
                                >
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
                                {t("dashboard.positions.claimableFees")} (
                                {position.token0IsQuote
                                    ? position.pool.token0.symbol
                                    : position.pool.token1.symbol}
                                )
                            </div>
                            <div
                                className={`text-lg font-semibold ${
                                    pnlDisplayValues.unclaimedFees
                                        ? "text-amber-400"
                                        : "text-white"
                                }`}
                            >
                                {pnlDisplayValues.unclaimedFees
                                    ? formatCompactValue(
                                          pnlDisplayValues.unclaimedFees,
                                          quoteTokenDecimals
                                      )
                                    : "0"}
                            </div>
                        </div>

                        {/* Total APR */}
                        {aprData && aprData.totalApr !== undefined ? (
                            <div className="text-right">
                                <div className="text-xs text-slate-400 mb-0.5">
                                    Total APR
                                </div>
                                <div
                                    className={`text-lg font-semibold ${aprColorClass}`}
                                >
                                    {formatApr(aprData.totalApr)}
                                </div>
                            </div>
                        ) : aprLoading ? (
                            <div className="text-right">
                                <div className="text-xs text-slate-400 mb-0.5">
                                    Total APR
                                </div>
                                <div className="text-lg font-semibold text-slate-400">
                                    --
                                </div>
                            </div>
                        ) : null}
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
                                className={`w-5 h-5 ${
                                    isRefreshing ? "animate-spin" : ""
                                }`}
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

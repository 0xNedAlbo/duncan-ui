"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
    RefreshCw,
    Copy,
    Search,
    TrendingUp,
    TrendingDown,
    Plus,
    Minus,
    DollarSign,
} from "lucide-react";
import { useAccount } from "wagmi";
import { useTranslations } from "@/i18n/client";
import { formatCompactValue } from "@/lib/utils/fraction-format";
import type { BasicPosition } from "@/services/positions/positionService";
import { usePnLDisplayValues } from "@/hooks/usePnLDisplayValues";
import { getChainConfig } from "@/config/chains";
import {
    NONFUNGIBLE_POSITION_MANAGER_ADDRESSES,
    getChainId,
} from "@/lib/contracts/nonfungiblePositionManager";
import { normalizeAddress } from "@/lib/utils/evm";

// New ReactQuery hooks
import { usePosition } from "@/hooks/api/usePosition";
import { usePositionRefresh } from "@/hooks/api/usePositionRefresh";
import { useIsDeletingPosition } from "@/hooks/api/useDeletePosition";
import { useQueryClient } from "@tanstack/react-query";

import { MiniPnLCurveLazy } from "@/components/charts/mini-pnl-curve-lazy";
import { PositionActionsMenu } from "./position-actions-menu";
import { DeletePositionModal } from "./delete-position-modal";

interface PositionCardProps {
    position: BasicPosition;
    // eslint-disable-next-line no-unused-vars
    onRefresh?: (position: BasicPosition) => void;
    isRefreshing?: boolean;
    // eslint-disable-next-line no-unused-vars
    onDeleteSuccess?: (position: BasicPosition) => void;
}

export function PositionCard({
    position,
    onRefresh,
    isRefreshing,
    onDeleteSuccess,
}: PositionCardProps) {
    const t = useTranslations();
    const queryClient = useQueryClient();
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [copied, setCopied] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

    // Wallet connection hook
    const { address: connectedAddress, isConnected } = useAccount();

    // Check if user can perform actions (wallet matches position owner)
    const canPerformActions = () => {
        if (!isConnected || !connectedAddress || !position.owner) {
            return false;
        }
        try {
            const normalizedConnected = normalizeAddress(connectedAddress);
            const normalizedOwner = normalizeAddress(position.owner);
            return normalizedConnected === normalizedOwner;
        } catch {
            return false;
        }
    };

    // Helper function to build block explorer URL
    const getBlockExplorerUrl = (chain: string, nftId: string) => {
        const chainConfig = getChainConfig(chain);
        const chainId = getChainId(chain);
        const nftManagerAddress =
            NONFUNGIBLE_POSITION_MANAGER_ADDRESSES[chainId];

        if (!chainConfig || !nftManagerAddress) return null;

        return `${chainConfig.explorer}/token/${nftManagerAddress}?a=${nftId}`;
    };

    // Token decimals for formatting
    const quoteTokenDecimals = position.token0IsQuote
        ? position.pool.token0.decimals
        : position.pool.token1.decimals;

    // Helper functions for status badges
    const getStatusColor = (status: string) => {
        switch (status) {
            case "active":
                return "text-green-400 bg-green-500/10 border-green-500/20";
            case "closed":
                return "text-slate-400 bg-slate-500/10 border-slate-500/20";
            default:
                return "text-slate-400 bg-slate-500/10 border-slate-500/20";
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case "active":
                return t("dashboard.positions.status.active");
            case "closed":
                return t("dashboard.positions.status.closed");
            default:
                return t("dashboard.positions.status.active");
        }
    };

    const getRangeStatus = () => {
        if (position.status !== "active") {
            return null;
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
        return "unknown";
    };

    const getRangeStatusColor = (status: string | null) => {
        switch (status) {
            case "in-range":
                return "text-green-400 bg-green-500/10 border-green-500/20";
            case "out-of-range":
                return "text-red-400 bg-red-500/10 border-red-500/20";
            case "unknown":
                return "text-slate-400 bg-slate-500/10 border-slate-500/20";
            default:
                return "text-slate-400 bg-slate-500/10 border-slate-500/20";
        }
    };

    const getRangeStatusText = (status: string | null) => {
        switch (status) {
            case "in-range":
                return t("dashboard.positions.rangeStatus.inRange");
            case "out-of-range":
                return t("dashboard.positions.rangeStatus.outOfRange");
            case "unknown":
                return t("dashboard.positions.rangeStatus.unknown");
            default:
                return "";
        }
    };

    // Get complete position data with new hook
    // TODO: Need to get userId from auth context once available
    const userId = "temp-user-id"; // Placeholder
    const protocol = "uniswapv3";

    const {
        data: positionDetails,
        isLoading: detailsLoading,
        error: detailsError,
    } = usePosition(
        userId,
        position.pool.chain,
        protocol,
        position.nftId || "",
        {
            enabled: Boolean(position.nftId && position.pool.chain),
        }
    );

    // Extract data from unified response
    const pnlData = positionDetails?.pnlBreakdown;
    const aprData = positionDetails?.aprBreakdown;
    const curveData = positionDetails?.curveData || null;

    // Loading states
    const pnlLoading = detailsLoading && Boolean(position.nftId);
    const pnlFailed = Boolean(detailsError);

    // Get formatted display values
    const pnlDisplayValues = usePnLDisplayValues(
        pnlData || undefined,
        quoteTokenDecimals
    );

    // Refresh mutation
    const refreshMutation = usePositionRefresh();

    // Handle refresh
    const handleRefresh = async () => {
        if (!position.nftId || !position.pool.chain) return;

        try {
            await refreshMutation.mutateAsync({
                userId,
                chain: position.pool.chain,
                protocol,
                nftId: position.nftId,
            });

            onRefresh?.(position);
        } catch (error) {
            console.error("Failed to refresh position:", error);
        }
    };

    // Auto-refresh every 60 seconds
    useEffect(() => {
        const intervalId = setInterval(() => {
            handleRefresh();
        }, 60000); // 60 seconds

        return () => clearInterval(intervalId);
    }, [position.nftId, position.pool.chain]); // eslint-disable-line react-hooks/exhaustive-deps

    // Deletion state
    const isDeleting = useIsDeletingPosition(
        position.pool.chain,
        position.nftId || ""
    );

    // Copy NFT ID to clipboard
    const handleCopyNftId = async () => {
        if (!position.nftId) return;

        try {
            await navigator.clipboard.writeText(position.nftId);
            setCopied(true);

            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            timeoutRef.current = setTimeout(() => {
                setCopied(false);
            }, 2000);
        } catch (error) {
            console.error("Failed to copy NFT ID:", error);
        }
    };

    // Handle successful position deletion - call parent callback
    const handleDeleteSuccess = () => {
        // Remove the specific position detail cache
        queryClient.removeQueries({
            queryKey: [
                "position",
                undefined,
                position.pool.chain,
                "uniswapv3",
                position.nftId,
            ],
        });

        // Let parent (PositionList) handle the list cache update
        onDeleteSuccess?.(position);
    };

    return (
        <>
            <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 hover:border-slate-600/50 transition-all duration-200">
                {/* Single Line Layout */}
                <div className="flex items-center">
                    {/* Left Side: Token Info */}
                    <div className="flex items-center gap-3">
                        {/* Token Icons */}
                        <div className="flex items-center">
                            <div className="flex items-center -space-x-2">
                                <Image
                                    src={
                                        position.pool.token0.logoUrl ||
                                        "/images/tokens/unknown.png"
                                    }
                                    alt={position.pool.token0.symbol}
                                    width={32}
                                    height={32}
                                    className="rounded-full border-2 border-slate-700 bg-slate-800 relative z-10"
                                />
                                <Image
                                    src={
                                        position.pool.token1.logoUrl ||
                                        "/images/tokens/unknown.png"
                                    }
                                    alt={position.pool.token1.symbol}
                                    width={32}
                                    height={32}
                                    className="rounded-full border-2 border-slate-700 bg-slate-800"
                                />
                            </div>
                            <div className="ml-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="font-semibold text-white text-lg">
                                        {position.pool.token0.symbol}/
                                        {position.pool.token1.symbol}
                                    </div>
                                    {/* Status Badge */}
                                    <span
                                        className={`px-2 py-0.5 rounded text-xs font-medium border ${getStatusColor(
                                            position.status || "active"
                                        )}`}
                                    >
                                        {getStatusText(position.status || "active")}
                                    </span>
                                    {/* Range Status Badge - only for active positions */}
                                    {position.status === "active" && (
                                        <span
                                            className={`px-2 py-0.5 rounded text-xs font-medium border ${getRangeStatusColor(
                                                getRangeStatus()
                                            )}`}
                                        >
                                            {getRangeStatusText(getRangeStatus())}
                                        </span>
                                    )}
                                </div>
                                <div className="text-sm text-slate-400 flex items-center gap-2">
                                    <span className="capitalize">
                                        {position.pool.chain}
                                    </span>
                                    <span>•</span>
                                    <span>
                                        {(position.pool.fee / 10000).toFixed(2)}
                                        %
                                    </span>
                                    {position.nftId && (
                                        <>
                                            <span>•</span>
                                            <span className="flex items-center gap-1">
                                                <a
                                                    href={
                                                        getBlockExplorerUrl(
                                                            position.pool.chain,
                                                            position.nftId
                                                        ) || "#"
                                                    }
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-400 hover:text-blue-300 underline cursor-pointer"
                                                    title="View on block explorer"
                                                >
                                                    #{position.nftId}
                                                </a>
                                                <button
                                                    onClick={handleCopyNftId}
                                                    className="p-0.5 hover:bg-slate-700/50 rounded transition-colors cursor-pointer"
                                                    title="Copy NFT ID"
                                                >
                                                    {copied ? (
                                                        <div className="text-green-400 text-xs">
                                                            ✓
                                                        </div>
                                                    ) : (
                                                        <Copy className="w-3 h-3 text-slate-400 hover:text-slate-300" />
                                                    )}
                                                </button>
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Middle: Position Data */}
                    <div className="flex items-center gap-6 ml-6">
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
                                    curveData={curveData}
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
                                {t("dashboard.positions.unclaimedFees")} (
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

                        {/* APR */}
                        {aprData ? (
                            <div className="text-right">
                                <div className="text-xs text-slate-400 mb-0.5">
                                    est. APR
                                </div>
                                <div className="text-lg font-semibold text-white">
                                    {aprData.totalApr !== null
                                        ? `${Number(aprData.totalApr).toFixed(
                                              2
                                          )}%`
                                        : "--"}
                                </div>
                            </div>
                        ) : pnlLoading ? (
                            <div className="text-right">
                                <div className="text-xs text-slate-400 mb-0.5">
                                    est. APR
                                </div>
                                <div className="text-lg font-semibold text-slate-400">
                                    --
                                </div>
                            </div>
                        ) : null}
                    </div>

                    {/* Right Side: Actions */}
                    <div className="flex items-center gap-2 ml-auto">
                        {/* View Details Link */}
                        {position.nftId ? (
                            <Link
                                href={`/position/uniswapv3/${position.pool.chain}/${position.nftId}`}
                                className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
                                title={t("dashboard.positions.viewDetails")}
                            >
                                <Search className="w-4 h-4 text-slate-400" />
                            </Link>
                        ) : (
                            <div
                                className="p-2 opacity-50 cursor-not-allowed"
                                title={t("dashboard.positions.noNftId")}
                            >
                                <Search className="w-4 h-4 text-slate-400" />
                            </div>
                        )}

                        {/* Refresh Button */}
                        <button
                            onClick={handleRefresh}
                            disabled={refreshMutation.isPending || isRefreshing}
                            className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors disabled:opacity-50"
                            title={t("dashboard.positions.refresh")}
                        >
                            <RefreshCw
                                className={`w-4 h-4 text-slate-400 ${
                                    refreshMutation.isPending || isRefreshing
                                        ? "animate-spin"
                                        : ""
                                }`}
                            />
                        </button>

                        {/* Actions Menu */}
                        <PositionActionsMenu
                            position={position}
                            onDelete={() => setShowDeleteModal(true)}
                            isDeleting={isDeleting}
                        />
                    </div>
                </div>

                {/* Action Buttons Row */}
                {canPerformActions() && (
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-700/50">
                        <button
                            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium border rounded-lg transition-colors ${
                                position.status === "closed"
                                    ? "text-slate-500 bg-slate-800/30 border-slate-600/30 cursor-not-allowed"
                                    : "text-green-300 bg-green-900/20 hover:bg-green-800/30 border-green-600/50 cursor-pointer"
                            }`}
                            disabled={position.status === "closed"}
                        >
                            <Plus className="w-3 h-3" />
                            {t("dashboard.positions.actions.increaseDeposit")}
                        </button>
                        <button
                            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium border rounded-lg transition-colors ${
                                position.status === "closed"
                                    ? "text-slate-500 bg-slate-800/30 border-slate-600/30 cursor-not-allowed"
                                    : "text-green-300 bg-green-900/20 hover:bg-green-800/30 border-green-600/50 cursor-pointer"
                            }`}
                            disabled={position.status === "closed"}
                        >
                            <Minus className="w-3 h-3" />
                            {t("dashboard.positions.actions.withdraw")}
                        </button>
                        <button
                            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium border rounded-lg transition-colors ${
                                pnlDisplayValues.unclaimedFees && pnlDisplayValues.unclaimedFees > 0n
                                    ? "text-amber-300 bg-amber-900/20 hover:bg-amber-800/30 border-amber-600/50 cursor-pointer"
                                    : "text-slate-500 bg-slate-800/30 border-slate-600/30 cursor-not-allowed"
                            }`}
                            disabled={!pnlDisplayValues.unclaimedFees || pnlDisplayValues.unclaimedFees <= 0n}
                        >
                            <DollarSign className="w-3 h-3" />
                            {t("dashboard.positions.actions.collectFees")}
                        </button>
                    </div>
                )}
            </div>

            {/* Delete Modal */}
            <DeletePositionModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                position={position}
                onDeleteSuccess={handleDeleteSuccess}
            />
        </>
    );
}

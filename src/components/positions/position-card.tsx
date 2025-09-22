"use client";

import { useState, useRef } from "react";
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
import { usePnLDisplayValues } from "@/hooks/usePnLDisplayValues";

// New ReactQuery hooks
import { usePosition } from "@/hooks/api/usePosition";
import { usePositionRefresh } from "@/hooks/api/usePositionRefresh";
import { useIsDeletingPosition } from "@/hooks/api/useDeletePosition";

import { MiniPnLCurveLazy } from "@/components/charts/mini-pnl-curve-lazy";
import { PositionActionsMenu } from "./position-actions-menu";
import { DeletePositionModal } from "./delete-position-modal";

interface PositionCardProps {
    position: BasicPosition;
    // eslint-disable-next-line no-unused-vars
    onRefresh?: (position: BasicPosition) => void;
    isRefreshing?: boolean;
}

export function PositionCard({ position, onRefresh, isRefreshing }: PositionCardProps) {
    const t = useTranslations();
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [copied, setCopied] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

    // Token decimals for formatting
    const quoteTokenDecimals = position.token0IsQuote
        ? position.pool.token0.decimals
        : position.pool.token1.decimals;

    // Get complete position data with new hook
    // TODO: Need to get userId from auth context once available
    const userId = "temp-user-id"; // Placeholder
    const protocol = "uniswapv3";

    const {
        data: positionDetails,
        isLoading: detailsLoading,
        error: detailsError,
    } = usePosition(userId, position.pool.chain, protocol, position.nftId || "", {
        enabled: Boolean(position.nftId && position.pool.chain),
    });

    // Extract data from unified response
    const pnlData = positionDetails?.pnlBreakdown;
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

    // Deletion state
    const isDeleting = useIsDeletingPosition(position.pool.chain, position.nftId || "");

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

    return (
        <>
            <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 hover:border-slate-600/50 transition-all duration-200">
                {/* Position Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        {/* Token Icons */}
                        <div className="flex items-center">
                            <div className="relative">
                                <Image
                                    src={position.pool.token0.logoUrl || "/images/tokens/unknown.png"}
                                    alt={position.pool.token0.symbol}
                                    width={32}
                                    height={32}
                                    className="rounded-full border border-slate-600"
                                />
                                <Image
                                    src={position.pool.token1.logoUrl || "/images/tokens/unknown.png"}
                                    alt={position.pool.token1.symbol}
                                    width={32}
                                    height={32}
                                    className="rounded-full border border-slate-600 -ml-3"
                                />
                            </div>
                            <div className="ml-3">
                                <div className="font-semibold text-white text-lg">
                                    {position.pool.token0.symbol}/{position.pool.token1.symbol}
                                </div>
                                <div className="text-sm text-slate-400 flex items-center gap-2">
                                    <span className="capitalize">{position.pool.chain}</span>
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
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        {/* Copy NFT ID */}
                        {position.nftId && (
                            <button
                                onClick={handleCopyNftId}
                                className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
                                title="Copy NFT ID"
                            >
                                {copied ? (
                                    <div className="text-green-400 text-xs">Copied!</div>
                                ) : (
                                    <Copy className="w-4 h-4 text-slate-400" />
                                )}
                            </button>
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
                                    refreshMutation.isPending || isRefreshing ? "animate-spin" : ""
                                }`}
                            />
                        </button>

                        {/* Actions Menu */}
                        <PositionActionsMenu
                            position={position}
                            onDelete={() => setShowDeleteModal(true)}
                            isDeleting={isDeleting}
                        />

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
                </div>
            </div>

            {/* Delete Modal */}
            <DeletePositionModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                position={position}
            />
        </>
    );
}
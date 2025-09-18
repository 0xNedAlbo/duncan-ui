"use client";

import { useTranslations } from "@/i18n/client";
import {
    usePositionPnL,
    usePnLDisplayValues,
} from "@/hooks/api/usePositionPnL";
import {
    formatCompactValue,
} from "@/lib/utils/fraction-format";
import { MiniPnLCurveLazy } from "@/components/charts/mini-pnl-curve-lazy";
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    Target,
    BarChart3,
    Loader2,
} from "lucide-react";
import type { BasicPosition } from "@/services/positions/positionService";

interface OverviewTabProps {
    position: BasicPosition;
    chainSlug: string;
    nftId: string;
}

export function OverviewTab({ position, chainSlug, nftId }: OverviewTabProps) {
    const t = useTranslations();
    // Get quote token info for formatting (must be before hook calls)
    const quoteToken = position.token0IsQuote
        ? position.pool.token0
        : position.pool.token1;
    const quoteTokenDecimals = quoteToken.decimals;

    // Fetch PnL data (position is provided as prop)
    const {
        data: pnlData,
        isLoading: pnlLoading,
        error: pnlError,
    } = usePositionPnL(chainSlug, nftId);

    // Get formatted display values using the same hook as PositionCard
    const pnlDisplayValues = usePnLDisplayValues(pnlData, quoteTokenDecimals);

    // Loading state
    if (pnlLoading) {
        return (
            <div className="space-y-6">
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-8">
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                        <span className="ml-3 text-slate-400">
                            {t("common.loading")}
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    // Error state
    if (pnlError) {
        return (
            <div className="space-y-6">
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-8 text-center">
                    <div className="text-red-400 mb-2">{t("common.error")}</div>
                    <div className="text-slate-400 text-sm">
                        {pnlError?.message || "Failed to load PnL data"}
                    </div>
                </div>
            </div>
        );
    }

    // Position is provided as prop, no need to check if it exists

    // Get position status
    const getPositionStatus = () => {
        if (position.status === "closed" || position.status === "archived") {
            return {
                status: "closed",
                color: "text-slate-400 bg-slate-500/20 border-slate-500/30",
            };
        }

        if (
            position.pool.currentTick !== undefined &&
            position.pool.currentTick !== null
        ) {
            const currentTick = position.pool.currentTick;
            if (
                currentTick >= position.tickLower &&
                currentTick <= position.tickUpper
            ) {
                return {
                    status: "in-range",
                    color: "text-green-400 bg-green-500/20 border-green-500/30",
                };
            } else {
                return {
                    status: "out-of-range",
                    color: "text-red-400 bg-red-500/20 border-red-500/30",
                };
            }
        }

        return {
            status: "unknown",
            color: "text-slate-400 bg-slate-500/20 border-slate-500/30",
        };
    };

    const positionStatus = getPositionStatus();

    return (
        <div className="space-y-6">
            {/* Position Values Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Current Value */}
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-blue-500/20 rounded-lg">
                            <DollarSign className="w-5 h-5 text-blue-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-white">
                            {t("positionDetails.overview.currentValue")}
                        </h3>
                    </div>
                    <div className="text-2xl font-bold text-white">
                        {pnlDisplayValues.currentValue
                            ? formatCompactValue(
                                  pnlDisplayValues.currentValue,
                                  quoteTokenDecimals
                              )
                            : "0"}{" "}
                        {quoteToken.symbol}
                    </div>
                    <div className="text-sm text-slate-400 mt-1">
                        {t("positionDetails.overview.valueDescription")}
                    </div>
                </div>

                {/* Total PnL */}
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div
                            className={`p-2 rounded-lg ${(() => {
                                if (!pnlData) return "bg-slate-500/20";
                                const totalWithUnclaimed =
                                    BigInt(pnlData.realizedPnL) +
                                    BigInt(pnlData.collectedFees) +
                                    BigInt(pnlData.unclaimedFees) +
                                    (BigInt(pnlData.currentValue) -
                                        BigInt(pnlData.currentCostBasis));
                                return totalWithUnclaimed > 0n
                                    ? "bg-green-500/20"
                                    : totalWithUnclaimed < 0n
                                    ? "bg-red-500/20"
                                    : "bg-slate-500/20";
                            })()}`}
                        >
                            {(() => {
                                if (!pnlData)
                                    return (
                                        <BarChart3 className="w-5 h-5 text-slate-400" />
                                    );
                                const totalWithUnclaimed =
                                    BigInt(pnlData.realizedPnL) +
                                    BigInt(pnlData.collectedFees) +
                                    BigInt(pnlData.unclaimedFees) +
                                    (BigInt(pnlData.currentValue) -
                                        BigInt(pnlData.currentCostBasis));
                                return totalWithUnclaimed > 0n ? (
                                    <TrendingUp className="w-5 h-5 text-green-400" />
                                ) : totalWithUnclaimed < 0n ? (
                                    <TrendingDown className="w-5 h-5 text-red-400" />
                                ) : (
                                    <BarChart3 className="w-5 h-5 text-slate-400" />
                                );
                            })()}
                        </div>
                        <h3 className="text-lg font-semibold text-white">
                            {t("positionDetails.overview.totalPnL")}
                        </h3>
                    </div>
                    <div
                        className={`text-2xl font-bold ${(() => {
                            if (!pnlData) return "text-slate-400";
                            const totalWithUnclaimed =
                                BigInt(pnlData.realizedPnL) +
                                BigInt(pnlData.collectedFees) +
                                BigInt(pnlData.unclaimedFees) +
                                (BigInt(pnlData.currentValue) -
                                    BigInt(pnlData.currentCostBasis));
                            return totalWithUnclaimed > 0n
                                ? "text-green-400"
                                : totalWithUnclaimed < 0n
                                ? "text-red-400"
                                : "text-slate-400";
                        })()}`}
                    >
                        {pnlData
                            ? formatCompactValue(
                                  BigInt(pnlData.realizedPnL) +
                                      BigInt(pnlData.collectedFees) +
                                      BigInt(pnlData.unclaimedFees) +
                                      (BigInt(pnlData.currentValue) -
                                          BigInt(pnlData.currentCostBasis)),
                                  quoteTokenDecimals
                              )
                            : "0"}{" "}
                        {quoteToken.symbol}
                    </div>
                    <div className="text-sm text-slate-400 mt-1">
                        {t("positionDetails.overview.pnlDescription")}
                    </div>
                </div>

                {/* Unclaimed Fees */}
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-amber-500/20 rounded-lg">
                            <Target className="w-5 h-5 text-amber-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-white">
                            {t("positionDetails.overview.unclaimedFees")}
                        </h3>
                    </div>
                    <div
                        className={`text-2xl font-bold ${
                            pnlDisplayValues.unclaimedFees &&
                            pnlDisplayValues.unclaimedFees > 0n
                                ? "text-amber-400"
                                : "text-white"
                        }`}
                    >
                        {pnlDisplayValues.unclaimedFees
                            ? formatCompactValue(
                                  pnlDisplayValues.unclaimedFees,
                                  quoteTokenDecimals
                              )
                            : "0"}{" "}
                        {quoteToken.symbol}
                    </div>
                    <div className="text-sm text-slate-400 mt-1">
                        {t("positionDetails.overview.feesDescription")}
                    </div>
                </div>
            </div>

            {/* PnL Curve Visualization */}
            <div className="flex justify-center">
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6 w-full max-w-2xl">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-white">
                            {t("positionDetails.overview.pnlCurve")}
                        </h3>
                        <span
                            className={`px-3 py-1 rounded-lg text-sm font-medium border ${positionStatus.color}`}
                        >
                            {t(
                                `positionDetails.overview.status.${positionStatus.status}` as any
                            )}
                        </span>
                    </div>
                    <div className="flex justify-center">
                        <MiniPnLCurveLazy
                            position={position}
                            width={400}
                            height={200}
                            showTooltip={true}
                        />
                    </div>
                    <div className="text-sm text-slate-400 mt-3 text-center">
                        {t("positionDetails.overview.curveDescription")}
                    </div>
                </div>
            </div>
        </div>
    );
}

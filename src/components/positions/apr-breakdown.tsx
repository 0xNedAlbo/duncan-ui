"use client";

import { useTranslations } from "@/i18n/client";
import { formatCompactValue } from "@/lib/utils/fraction-format";
import type { AprBreakdown } from "@/services/positions/positionAprService";
import type { PnlBreakdown } from "@/services/positions/positionPnLService";

interface AprBreakdownProps {
    aprData: AprBreakdown;
    pnlData?: PnlBreakdown;
    quoteToken: {
        symbol: string;
        decimals: number;
    };
    quoteTokenDecimals: number;
}

export function AprBreakdown({ aprData, quoteToken, quoteTokenDecimals }: AprBreakdownProps) {
    const t = useTranslations();

    // APR breakdown data should come from the service
    const realizedAprValue = aprData.realizedApr || 0;
    const unrealizedAprValue = aprData.unrealizedApr || 0;
    const totalAprValue = aprData.totalApr;

    // All data should come from the service
    const realizedFees = BigInt(aprData.realizedFeesCollected);
    const realizedTWCostBasis = BigInt(aprData.realizedTWCostBasis);
    const unclaimedFees = BigInt(aprData.unrealizedFeesUnclaimed);

    // Unrealized metrics should come from service
    const unrealizedCostBasis = BigInt(aprData.unrealizedCostBasis);
    const unrealizedDays = aprData.unrealizedActiveDays;

    return (
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
            <h3 className="text-lg font-semibold text-white mb-6">
                {t("positionDetails.overview.aprBreakdown")}
            </h3>

            <div className="space-y-6">
                {/* Total APR at top */}
                <div className="border-b border-slate-600/50 pb-4">
                    <div className="flex items-center">
                        <span className="text-lg font-semibold text-slate-300">
                            {t("positionDetails.overview.totalAprBreakdown")}:
                        </span>
                        <span className="text-xl font-bold text-green-400 ml-2">
                            {totalAprValue.toFixed(2)}%
                        </span>
                        <span className="text-sm text-slate-400 ml-2">
                            ({t("positionDetails.overview.overTotal")} {aprData.totalActiveDays} {t("positionDetails.overview.days")})
                        </span>
                    </div>
                </div>

                {/* Two Column Layout for Realized and Unrealized APR */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Realized APR Column */}
                    <div className="space-y-3">
                        <h4 className="text-md font-semibold text-white">
                            {t("positionDetails.overview.realizedAprSection")}
                        </h4>
                        <div className="bg-slate-700/30 rounded-lg p-4 space-y-2">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-400">
                                    {t("positionDetails.overview.totalFeesCollected")}
                                </span>
                                <span className="text-white font-medium">
                                    {formatCompactValue(realizedFees, quoteTokenDecimals)} {quoteToken.symbol}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-400">
                                    {t("positionDetails.overview.timeWeightedCostBasis")}
                                </span>
                                <span className="text-white font-medium">
                                    {formatCompactValue(realizedTWCostBasis, quoteTokenDecimals)} {quoteToken.symbol}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-400">
                                    {t("positionDetails.overview.activeDays")}
                                </span>
                                <span className="text-white font-medium">
                                    {aprData.realizedActiveDays} {t("positionDetails.overview.days")}
                                </span>
                            </div>
                            <div className="border-t border-slate-600/50 pt-2 mt-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-white font-medium">
                                        = {t("positionDetails.overview.realizedApr")}
                                    </span>
                                    <span className="font-bold text-green-400">
                                        {realizedAprValue.toFixed(2)}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Unrealized APR Column */}
                    <div className="space-y-3">
                        <h4 className="text-md font-semibold text-white">
                            {t("positionDetails.overview.unrealizedAprSection")}
                        </h4>
                        <div className="bg-slate-700/30 rounded-lg p-4 space-y-2">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-400">
                                    {t("positionDetails.overview.unclaimedFees")}
                                </span>
                                <span className="text-white font-medium">
                                    {formatCompactValue(unclaimedFees, quoteTokenDecimals)} {quoteToken.symbol}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-400">
                                    {t("positionDetails.overview.currentCostBasis")}
                                </span>
                                <span className="text-white font-medium">
                                    {formatCompactValue(unrealizedCostBasis, quoteTokenDecimals)} {quoteToken.symbol}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-400">
                                    {t("positionDetails.overview.daysSinceStart")}
                                </span>
                                <span className="text-white font-medium">
                                    {unrealizedCostBasis > 0n
                                        ? `${unrealizedDays} ${t("positionDetails.overview.days")}`
                                        : "-"
                                    }
                                </span>
                            </div>
                            <div className="border-t border-slate-600/50 pt-2 mt-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-white font-medium">
                                        = {t("positionDetails.overview.estimatedApr")}
                                    </span>
                                    <span className="font-bold text-green-400">
                                        {unrealizedAprValue.toFixed(2)}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
"use client";

import { useTranslations } from "@/i18n/client";
import { formatCompactValue } from "@/lib/utils/fraction-format";
import type { PnlBreakdown } from "@/services/positions/positionPnLService";

interface PnLBreakdownProps {
    pnlData: PnlBreakdown;
    quoteToken: {
        symbol: string;
        decimals: number;
    };
    quoteTokenDecimals: number;
}

export function PnLBreakdown({ pnlData, quoteToken, quoteTokenDecimals }: PnLBreakdownProps) {
    const t = useTranslations();

    // Calculate breakdown values
    const realizedPnLAmount = BigInt(pnlData.realizedPnL) + BigInt(pnlData.collectedFees);
    const unrealizedPnLAmount = BigInt(pnlData.unclaimedFees) + (BigInt(pnlData.currentValue) - BigInt(pnlData.currentCostBasis));
    const totalPnLAmount = realizedPnLAmount + unrealizedPnLAmount;

    const realizedColor = realizedPnLAmount > 0n ? "text-green-400" : realizedPnLAmount < 0n ? "text-red-400" : "text-slate-400";
    const unrealizedColor = unrealizedPnLAmount > 0n ? "text-green-400" : unrealizedPnLAmount < 0n ? "text-red-400" : "text-slate-400";
    const totalColor = totalPnLAmount > 0n ? "text-green-400" : totalPnLAmount < 0n ? "text-red-400" : "text-slate-400";

    return (
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
            <h3 className="text-lg font-semibold text-white mb-6">
                {t("positionDetails.overview.pnlBreakdown")}
            </h3>

            <div className="space-y-6">
                {/* Total PnL at top */}
                <div className="border-b border-slate-600/50 pb-4">
                    <div className="flex justify-between items-center">
                        <span className="text-lg font-semibold text-slate-300">
                            {t("positionDetails.overview.totalPnLBreakdown")}
                        </span>
                        <span className={`text-xl font-bold ${totalColor}`}>
                            {formatCompactValue(totalPnLAmount, quoteTokenDecimals)} {quoteToken.symbol}
                        </span>
                    </div>
                </div>

                {/* Two Column Layout for Realized and Unrealized PnL */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Realized PnL Column */}
                    <div className="space-y-3">
                        <h4 className="text-md font-semibold text-white">
                            {t("positionDetails.overview.realizedPnLSection")}
                        </h4>
                        <div className="bg-slate-700/30 rounded-lg p-4 space-y-2">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-400">
                                    + {t("positionDetails.overview.feesCollected")}
                                </span>
                                <span className="text-white font-medium">
                                    {formatCompactValue(BigInt(pnlData.collectedFees), quoteTokenDecimals)} {quoteToken.symbol}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-400">
                                    + {t("positionDetails.overview.realizedPnL")}*
                                </span>
                                <span className="text-white font-medium">
                                    {formatCompactValue(BigInt(pnlData.realizedPnL), quoteTokenDecimals)} {quoteToken.symbol}
                                </span>
                            </div>
                            <div className="text-xs text-slate-500 pl-2" style={{ marginTop: "2px" }}>
                                *) {t("positionDetails.overview.realizedPnLAnnotation")}
                            </div>
                            <div className="border-t border-slate-600/50 pt-2 mt-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-white font-medium">
                                        = {t("positionDetails.overview.subtotal")}
                                    </span>
                                    <span className={`font-bold ${realizedColor}`}>
                                        {formatCompactValue(realizedPnLAmount, quoteTokenDecimals)} {quoteToken.symbol}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Unrealized PnL Column */}
                    <div className="space-y-3">
                        <h4 className="text-md font-semibold text-white">
                            {t("positionDetails.overview.unrealizedPnLSection")}
                        </h4>
                        <div className="bg-slate-700/30 rounded-lg p-4 space-y-2">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-400">
                                    + {t("positionDetails.overview.unclaimedFees")}
                                </span>
                                <span className="text-white font-medium">
                                    {formatCompactValue(BigInt(pnlData.unclaimedFees), quoteTokenDecimals)} {quoteToken.symbol}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-400">
                                    + {t("positionDetails.overview.currentValue")}
                                </span>
                                <span className="text-white font-medium">
                                    {formatCompactValue(BigInt(pnlData.currentValue), quoteTokenDecimals)} {quoteToken.symbol}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-400">
                                    - {t("positionDetails.overview.costBasis")}
                                </span>
                                <span className="text-white font-medium">
                                    -{formatCompactValue(BigInt(pnlData.currentCostBasis), quoteTokenDecimals)} {quoteToken.symbol}
                                </span>
                            </div>
                            <div className="border-t border-slate-600/50 pt-2 mt-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-white font-medium">
                                        = {t("positionDetails.overview.subtotal")}
                                    </span>
                                    <span className={`font-bold ${unrealizedColor}`}>
                                        {formatCompactValue(unrealizedPnLAmount, quoteTokenDecimals)} {quoteToken.symbol}
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
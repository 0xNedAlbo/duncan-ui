"use client";

import { useTranslations } from "@/i18n/client";
import { usePositionApr } from "@/hooks/api/usePositions";
import { AprBreakdown } from "@/components/positions/apr-breakdown";
import type { AprBreakdown as AprBreakdownType } from "@/services/positions/positionAprService";
import type { PnlBreakdown } from "@/services/positions/positionPnLService";

interface AprTabProps {
    chainSlug: string;
    nftId: string;
    aprBreakdown?: AprBreakdownType;
    pnlBreakdown?: PnlBreakdown;
    quoteToken?: {
        symbol: string;
        decimals: number;
    };
    token0?: {
        symbol: string;
        decimals: number;
    };
    token1?: {
        symbol: string;
        decimals: number;
    };
}

export function AprTab({
    chainSlug,
    nftId,
    aprBreakdown,
    pnlBreakdown,
    quoteToken,
}: AprTabProps) {
    const t = useTranslations();

    const {
        data: aprData,
        isLoading: aprLoading,
        error: aprError,
    } = usePositionApr(chainSlug, nftId, {
        staleTime: 60000, // 1 minute
    });

    if (aprError) {
        return (
            <div className="space-y-6">
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-8 text-center">
                    <h2 className="text-xl font-semibold text-white mb-4">
                        {t("positionDetails.tabs.apr")}
                    </h2>
                    <div className="text-red-400 mb-4">
                        Error loading APR data: {aprError.message}
                    </div>
                    <p className="text-slate-500 text-sm">
                        Chain: {chainSlug} | NFT ID: #{nftId}
                    </p>
                </div>
            </div>
        );
    }

    // Convert APR data periods to events format for the events table
    const aprEvents =
        aprData?.periods
            ?.map((period) => ({
                id: period.eventId,
                type: "apr_period" as const,
                transactionHash: null,
                blockNumber: null,
                timestamp: new Date(period.periodStartDate),
                amount0: "0",
                amount1: "0",
                tickLower: null,
                tickUpper: null,
                liquidity: "0",
                chainSlug,
                nftId,
                // APR-specific data
                periodDays: period.periodDays,
                periodCostBasis: period.periodCostBasis,
                allocatedFees: period.allocatedFees,
                periodApr: period.periodApr,
                periodEndDate: period.periodEndDate
                    ? new Date(period.periodEndDate)
                    : null,
            }))
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()) ||
        [];

    return (
        <div className="space-y-6">
            {/* APR Breakdown */}
            {aprBreakdown && quoteToken && (
                <AprBreakdown
                    aprData={aprBreakdown}
                    pnlData={pnlBreakdown}
                    quoteToken={quoteToken}
                    quoteTokenDecimals={quoteToken.decimals}
                />
            )}

            {/* APR Events/Periods Table */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
                <h3 className="text-lg font-semibold text-white mb-6">
                    {t("positionDetails.overview.aprPeriods")}
                </h3>

                {aprLoading ? (
                    <div className="text-center py-8">
                        <div className="text-slate-400">
                            {t("common.loading")}
                        </div>
                    </div>
                ) : aprEvents.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-700/50">
                                    <th className="text-left py-3 px-2 text-slate-400 font-medium">
                                        {t("positionDetails.overview.period")}
                                    </th>
                                    <th className="text-right py-3 px-2 text-slate-400 font-medium">
                                        {t("positionDetails.overview.duration")}
                                    </th>
                                    <th className="text-right py-3 px-2 text-slate-400 font-medium">
                                        {t(
                                            "positionDetails.overview.costBasis"
                                        )}
                                    </th>
                                    <th className="text-right py-3 px-2 text-slate-400 font-medium">
                                        {t(
                                            "positionDetails.overview.feesAllocated"
                                        )}
                                    </th>
                                    <th className="text-right py-3 px-2 text-slate-400 font-medium">
                                        {t(
                                            "positionDetails.overview.periodApr"
                                        )}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {aprEvents.map((event) => (
                                    <tr
                                        key={event.id}
                                        className="border-b border-slate-700/30 hover:bg-slate-700/20"
                                    >
                                        <td className="py-3 px-2">
                                            <div className="text-white">
                                                {event.timestamp.toLocaleDateString()}{" "}
                                                {event.timestamp.toLocaleTimeString()}
                                            </div>
                                        </td>
                                        <td className="py-3 px-2 text-right text-slate-300">
                                            {(() => {
                                                if (event.periodDays)
                                                    return event.periodDays.toFixed(
                                                        2
                                                    );
                                                // For ongoing periods, calculate days from start to now
                                                const now = new Date();
                                                const daysSinceStart =
                                                    (now.getTime() -
                                                        event.timestamp.getTime()) /
                                                    (1000 * 60 * 60 * 24);
                                                return Math.max(
                                                    0.01,
                                                    daysSinceStart
                                                ).toFixed(2);
                                            })()}{" "}
                                            {t("positionDetails.overview.days")}
                                        </td>
                                        <td className="py-3 px-2 text-right text-slate-300">
                                            {quoteToken ? (
                                                <>
                                                    {(
                                                        BigInt(
                                                            event.periodCostBasis
                                                        ) /
                                                        BigInt(
                                                            10 **
                                                                quoteToken.decimals
                                                        )
                                                    ).toString()}{" "}
                                                    {quoteToken.symbol}
                                                </>
                                            ) : (
                                                event.periodCostBasis
                                            )}
                                        </td>
                                        <td className="py-3 px-2 text-right text-green-400">
                                            {quoteToken ? (
                                                <>
                                                    {(
                                                        BigInt(
                                                            event.allocatedFees
                                                        ) /
                                                        BigInt(
                                                            10 **
                                                                quoteToken.decimals
                                                        )
                                                    ).toString()}{" "}
                                                    {quoteToken.symbol}
                                                </>
                                            ) : (
                                                event.allocatedFees
                                            )}
                                        </td>
                                        <td className="py-3 px-2 text-right">
                                            <span
                                                className={
                                                    event.periodApr &&
                                                    event.periodApr > 0
                                                        ? "text-green-400"
                                                        : "text-slate-400"
                                                }
                                            >
                                                {event.periodApr
                                                    ? `${event.periodApr.toFixed(
                                                          2
                                                      )}%`
                                                    : "-"}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <div className="text-slate-400">
                            {t("positionDetails.overview.noAprData")}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

"use client";

import { useState, useMemo } from "react";
import { Eye, EyeOff, Loader2, AlertTriangle } from "lucide-react";
import { useTranslations } from "@/i18n/client";
import type { PoolData } from "@/hooks/api/usePool";
import { usePositionAprProjection } from "@/hooks/api/usePositionAprProjection";
import { formatCompactValue } from "@/lib/utils/fraction-format";
import { compareAddresses } from "@/lib/utils/evm";

interface TokenInfo {
    address: string;
    symbol: string;
    decimals: number;
    logoUrl?: string | null;
}

interface PositionAprPreviewProps {
    pool: PoolData;
    baseToken: TokenInfo;
    quoteToken: TokenInfo;
    liquidity: bigint; // Current liquidity value
    tickLower?: number;
    tickUpper?: number;
}

export function PositionAprPreview({
    pool,
    baseToken,
    quoteToken,
    liquidity,
    tickLower,
    tickUpper,
}: PositionAprPreviewProps) {
    const t = useTranslations();
    const [isExpanded, setIsExpanded] = useState<boolean>(false);

    // Determine token roles for correct decimal scaling
    const isToken0Base = useMemo(() => {
        return compareAddresses(pool.token0.address, baseToken.address) === 0;
    }, [pool.token0.address, baseToken.address]);

    // Use the APR projection hook
    const {
        isLoading,
        isError,
        error,
        apr,
        dailyApr,
        sharePercent,
        token0Fees,
        token1Fees,
        totalFeesQuote,
        isOutOfRange,
        hasValidData,
    } = usePositionAprProjection({
        pool,
        liquidity,
        tickLower,
        tickUpper,
        isToken0Base,
    });

    // Format APR for display
    const displayApr = useMemo(() => {
        if (!hasValidData) return "—";

        const aprPercent = apr * 100; // Convert decimal to percentage

        if (aprPercent === 0) return "0%";
        if (aprPercent < 0.01) return "<0.01%";
        if (aprPercent > 1000) return ">1000%";

        return `${aprPercent.toFixed(2)}%`;
    }, [apr, hasValidData]);

    // Format daily fees in quote token for header display
    const displayDailyFees = useMemo(() => {
        if (!hasValidData) return "";

        if (totalFeesQuote === 0n) return "";

        // Use actual quote token decimals for display formatting
        const formattedFees = formatCompactValue(totalFeesQuote, quoteToken.decimals);

        return ` (${formattedFees} ${quoteToken.symbol}/day)`;
    }, [hasValidData, totalFeesQuote, quoteToken.symbol, quoteToken.decimals]);

    // Format individual token daily fees for details
    const displayTokenFees = useMemo(() => {
        if (!hasValidData) return null;

        const token0FeesFormatted = formatCompactValue(token0Fees, baseToken.decimals);
        const token1FeesFormatted = formatCompactValue(token1Fees, quoteToken.decimals);

        return {
            token0: `${token0FeesFormatted} ${baseToken.symbol}/day`,
            token1: `${token1FeesFormatted} ${quoteToken.symbol}/day`
        };
    }, [hasValidData, token0Fees, token1Fees, baseToken.decimals, baseToken.symbol, quoteToken.decimals, quoteToken.symbol]);

    // Format user share for display
    const displayUserShare = useMemo(() => {
        if (!hasValidData) return "—";

        const sharePercentFormatted = sharePercent * 100; // Convert decimal to percentage

        if (sharePercentFormatted === 0) return "0%";
        if (sharePercentFormatted < 0.001) return "<0.001%";

        return `${sharePercentFormatted.toFixed(3)}%`;
    }, [hasValidData, sharePercent]);

    return (
        <div className="space-y-3">
            {/* Header with APR display */}
            <div className="flex items-center justify-between text-sm">
                <div className="flex flex-col">
                    <span className="text-slate-300 font-medium">
                        Prospective APR:
                    </span>
                    {isOutOfRange && (
                        <span className="text-slate-400 text-xs italic">
                            {t("positionWizard.positionConfig.outOfRangeCondition")}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {isLoading ? (
                        <div className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                            <span className="text-slate-400">Loading...</span>
                        </div>
                    ) : isError ? (
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-400" />
                            <span className="text-red-400">Error</span>
                        </div>
                    ) : (
                        <span className={`text-white font-medium ${isOutOfRange ? 'line-through' : ''}`}>
                            {displayApr}{displayDailyFees}
                        </span>
                    )}
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="p-1 hover:bg-slate-700 rounded transition-colors cursor-pointer"
                    >
                        {isExpanded ? (
                            <EyeOff className="w-4 h-4 text-slate-400" />
                        ) : (
                            <Eye className="w-4 h-4 text-slate-400" />
                        )}
                    </button>
                </div>
            </div>

            {/* Collapsible content */}
            {isExpanded && (
                <div className="space-y-3 border-t border-slate-700 pt-3">
                    {isLoading && (
                        <div className="flex items-center justify-center py-6">
                            <div className="flex items-center gap-3 text-slate-400">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>Fetching pool fee data...</span>
                            </div>
                        </div>
                    )}

                    {isError && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                                <AlertTriangle className="w-4 h-4 text-red-400" />
                                <h6 className="text-red-400 font-medium text-sm">
                                    Failed to load pool data
                                </h6>
                            </div>
                            <p className="text-red-200/80 text-xs">
                                {error?.message || "Unable to fetch fee data for APR calculation"}
                            </p>
                        </div>
                    )}

                    {hasValidData && (
                        <div className="space-y-3">
                            {/* APR Breakdown */}
                            <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3">
                                <h6 className="text-sm font-medium text-slate-300 mb-3">
                                    APR Breakdown (24h data)
                                </h6>

                                <div className="space-y-2 text-xs">
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Pool Fee Tier:</span>
                                        <span className="text-white">{(pool.fee / 10000).toFixed(2)}%</span>
                                    </div>

                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Your Pool Share:</span>
                                        <span className="text-white">{displayUserShare}</span>
                                    </div>

                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Daily APR:</span>
                                        <span className="text-white">
                                            {(dailyApr * 100) < 0.001 ? "<0.001%" : `${(dailyApr * 100).toFixed(3)}%`}
                                        </span>
                                    </div>

                                    <div className="flex justify-between font-medium">
                                        <span className="text-slate-300">Annualized APR:</span>
                                        <span className="text-white">{displayApr}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Daily Fees Breakdown */}
                            {displayTokenFees && (
                                <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3">
                                    <h6 className="text-sm font-medium text-slate-300 mb-3">
                                        Daily Fee Collection
                                    </h6>

                                    <div className="space-y-2 text-xs">
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">{baseToken.symbol} Fees:</span>
                                            <span className="text-white">{displayTokenFees.token0}</span>
                                        </div>

                                        <div className="flex justify-between">
                                            <span className="text-slate-400">{quoteToken.symbol} Fees:</span>
                                            <span className="text-white">{displayTokenFees.token1}</span>
                                        </div>

                                        <div className="border-t border-slate-600 pt-2 mt-2">
                                            <div className="flex justify-between font-medium">
                                                <span className="text-slate-300">Fee value in {quoteToken.symbol}:</span>
                                                <span className="text-white">{formatCompactValue(totalFeesQuote, quoteToken.decimals)} {quoteToken.symbol}/day</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Disclaimer */}
                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                                <p className="text-amber-200/80 text-xs">
                                    <strong>Disclaimer:</strong> This APR calculation is based on the last 24h of trading activity
                                    and assumes similar volume patterns. Actual returns may vary significantly due to market conditions
                                    and changing trading volumes.
                                </p>
                            </div>
                        </div>
                    )}

                    {!isLoading && !isError && !hasValidData && liquidity === 0n && (
                        <div className="text-center py-4">
                            <p className="text-slate-400 text-sm">
                                Configure your position size to see APR estimate
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
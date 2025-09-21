"use client";

import { useTranslations } from "@/i18n/client";
import { usePnLDisplayValues } from "@/hooks/api/usePositionPnL";
import {
    formatCompactValue,
} from "@/lib/utils/fraction-format";
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    Target,
    BarChart3,
    ChevronDown,
    ChevronUp,
    Minus,
} from "lucide-react";
import type { BasicPosition } from "@/services/positions/positionService";
import type { PnlBreakdown } from "@/services/positions/positionPnLService";
import type { CurveData } from "@/components/charts/mini-pnl-curve";
import { calculatePositionStates, calculateBreakEvenPrice } from "@/lib/utils/position-states";
import { MiniPnLCurve } from "@/components/charts/mini-pnl-curve";
import { tickToPrice } from "@/lib/utils/uniswap-v3/price";

interface OverviewTabProps {
    position: BasicPosition;
    pnlBreakdown?: PnlBreakdown | null;
    curveData?: CurveData | null;
    chainSlug: string;
    nftId: string;
}

export function OverviewTab({ position, pnlBreakdown, curveData }: OverviewTabProps) {
    const t = useTranslations();
    // Get quote token info for formatting (must be before hook calls)
    const quoteToken = position.token0IsQuote
        ? position.pool.token0
        : position.pool.token1;
    const baseToken = position.token0IsQuote
        ? position.pool.token1
        : position.pool.token0;
    const quoteTokenDecimals = quoteToken.decimals;

    // Use PnL data from props instead of store
    const pnlData = pnlBreakdown || undefined;

    // Get formatted display values using the same hook as PositionCard
    const pnlDisplayValues = usePnLDisplayValues(pnlData, quoteTokenDecimals);

    // Calculate position states for all three scenarios
    const positionStates = calculatePositionStates(position, pnlBreakdown);

    // Helper function to find closest price index in curve data
    const findPriceIndex = (targetPrice: bigint): number => {
        if (!curveData) return 0;

        const targetPriceNumber = Number(targetPrice) / (10 ** quoteToken.decimals);
        let closestIndex = 0;
        let closestDistance = Infinity;

        curveData.points.forEach((point, index) => {
            const distance = Math.abs(point.price - targetPriceNumber);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestIndex = index;
            }
        });

        return closestIndex;
    };

    // Create curve data variants for each section
    const createCurveDataForTick = (tick: number): CurveData | null => {
        if (!curveData) return null;

        const targetPrice = tickToPrice(
            tick,
            baseToken.address,
            quoteToken.address,
            baseToken.decimals
        );

        const targetIndex = findPriceIndex(targetPrice);

        return {
            ...curveData,
            currentPriceIndex: targetIndex
        };
    };

    const lowerRangeCurveData = createCurveDataForTick(position.tickLower);
    const currentCurveData = curveData ?? null; // Use existing curve data with current price
    const upperRangeCurveData = createCurveDataForTick(position.tickUpper);

    // Calculate break-even price
    const breakEvenPrice = calculateBreakEvenPrice(position, pnlBreakdown);

    return (
        <div className="space-y-6">
            {/* Position Values Overview */}
            <div className={`grid grid-cols-1 gap-6 ${breakEvenPrice !== null ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
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

                {/* Break-Even Price */}
                {breakEvenPrice !== null && (
                    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-slate-500/20 rounded-lg">
                                <Target className="w-5 h-5 text-slate-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-white">
                                {t("positionDetails.overview.breakEvenPrice")}
                            </h3>
                        </div>
                        <div className="text-2xl font-bold text-white">
                            {formatCompactValue(breakEvenPrice, quoteToken.decimals)} {quoteToken.symbol}
                        </div>
                        <div className="text-sm text-slate-400 mt-1">
                            {t("positionDetails.overview.breakEvenDescription")}
                        </div>
                    </div>
                )}
            </div>

            {/* Position States Section */}
            <div className="space-y-4">
                <h3 className="text-xl font-semibold text-white mb-6">
                    {t("positionDetails.overview.positionStates")}
                </h3>

                <div className="space-y-6">
                    {/* Current Position State */}
                    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-blue-500/20 rounded-lg">
                                <Minus className="w-5 h-5 text-blue-400" />
                            </div>
                            <h4 className="text-lg font-semibold text-white">
                                {t("positionDetails.overview.currentState")}
                            </h4>
                        </div>

                        <div className="flex gap-6">
                            {/* Left Half - Data */}
                            <div className="flex-1 space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Base Token:</span>
                                    <div className="flex items-center gap-2 text-white">
                                        {baseToken.logoUrl && (
                                            <img
                                                src={baseToken.logoUrl}
                                                alt={baseToken.symbol}
                                                className="w-4 h-4 rounded-full"
                                            />
                                        )}
                                        <span>{formatCompactValue(positionStates.current.baseTokenAmount, baseToken.decimals)} {baseToken.symbol}</span>
                                    </div>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Quote Token:</span>
                                    <div className="flex items-center gap-2 text-white">
                                        {quoteToken.logoUrl && (
                                            <img
                                                src={quoteToken.logoUrl}
                                                alt={quoteToken.symbol}
                                                className="w-4 h-4 rounded-full"
                                            />
                                        )}
                                        <span>{formatCompactValue(positionStates.current.quoteTokenAmount, quoteToken.decimals)} {quoteToken.symbol}</span>
                                    </div>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">{t("positionDetails.overview.poolPrice")}:</span>
                                    <span className="text-white">
                                        {formatCompactValue(positionStates.current.poolPrice, quoteToken.decimals)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">{t("positionDetails.overview.positionValue")}:</span>
                                    <span className="text-white">
                                        {formatCompactValue(positionStates.current.positionValue, quoteToken.decimals)} {quoteToken.symbol}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">{t("positionDetails.overview.pnlIncludingFees")}:</span>
                                    <span className={`${
                                        positionStates.current.pnlIncludingFees > 0n
                                            ? "text-green-400"
                                            : positionStates.current.pnlIncludingFees < 0n
                                            ? "text-red-400"
                                            : "text-slate-400"
                                    }`}>
                                        {formatCompactValue(positionStates.current.pnlIncludingFees, quoteToken.decimals)} {quoteToken.symbol}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">{t("positionDetails.overview.pnlExcludingFees")}:</span>
                                    <span className={`${
                                        positionStates.current.pnlExcludingFees > 0n
                                            ? "text-green-400"
                                            : positionStates.current.pnlExcludingFees < 0n
                                            ? "text-red-400"
                                            : "text-slate-400"
                                    }`}>
                                        {formatCompactValue(positionStates.current.pnlExcludingFees, quoteToken.decimals)} {quoteToken.symbol}
                                    </span>
                                </div>
                            </div>

                            {/* Right Half - Mini PnL Curve */}
                            <div className="flex-1 flex items-center justify-center">
                                <MiniPnLCurve
                                    position={position}
                                    curveData={currentCurveData}
                                    width={240}
                                    height={144}
                                    showTooltip={true}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Position at Lower Range */}
                    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-red-500/20 rounded-lg">
                                <ChevronDown className="w-5 h-5 text-red-400" />
                            </div>
                            <h4 className="text-lg font-semibold text-white">
                                {t("positionDetails.overview.lowerRange")}
                            </h4>
                        </div>

                        <div className="flex gap-6">
                            {/* Left Half - Data */}
                            <div className="flex-1 space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Base Token:</span>
                                    <div className="flex items-center gap-2 text-white">
                                        {baseToken.logoUrl && (
                                            <img
                                                src={baseToken.logoUrl}
                                                alt={baseToken.symbol}
                                                className="w-4 h-4 rounded-full"
                                            />
                                        )}
                                        <span>{formatCompactValue(positionStates.lowerRange.baseTokenAmount, baseToken.decimals)} {baseToken.symbol}</span>
                                    </div>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Quote Token:</span>
                                    <div className="flex items-center gap-2 text-white">
                                        {quoteToken.logoUrl && (
                                            <img
                                                src={quoteToken.logoUrl}
                                                alt={quoteToken.symbol}
                                                className="w-4 h-4 rounded-full"
                                            />
                                        )}
                                        <span>{formatCompactValue(positionStates.lowerRange.quoteTokenAmount, quoteToken.decimals)} {quoteToken.symbol}</span>
                                    </div>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">{t("positionDetails.overview.poolPrice")}:</span>
                                    <span className="text-white">
                                        {formatCompactValue(positionStates.lowerRange.poolPrice, quoteToken.decimals)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">{t("positionDetails.overview.positionValue")}:</span>
                                    <span className="text-white">
                                        {formatCompactValue(positionStates.lowerRange.positionValue, quoteToken.decimals)} {quoteToken.symbol}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">{t("positionDetails.overview.pnlIncludingFees")}:</span>
                                    <span className={`${
                                        positionStates.lowerRange.pnlIncludingFees > 0n
                                            ? "text-green-400"
                                            : positionStates.lowerRange.pnlIncludingFees < 0n
                                            ? "text-red-400"
                                            : "text-slate-400"
                                    }`}>
                                        {formatCompactValue(positionStates.lowerRange.pnlIncludingFees, quoteToken.decimals)} {quoteToken.symbol}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">{t("positionDetails.overview.pnlExcludingFees")}:</span>
                                    <span className={`${
                                        positionStates.lowerRange.pnlExcludingFees > 0n
                                            ? "text-green-400"
                                            : positionStates.lowerRange.pnlExcludingFees < 0n
                                            ? "text-red-400"
                                            : "text-slate-400"
                                    }`}>
                                        {formatCompactValue(positionStates.lowerRange.pnlExcludingFees, quoteToken.decimals)} {quoteToken.symbol}
                                    </span>
                                </div>
                            </div>

                            {/* Right Half - Mini PnL Curve */}
                            <div className="flex-1 flex items-center justify-center">
                                <MiniPnLCurve
                                    position={position}
                                    curveData={lowerRangeCurveData}
                                    width={240}
                                    height={144}
                                    showTooltip={true}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Position at Upper Range */}
                    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-green-500/20 rounded-lg">
                                <ChevronUp className="w-5 h-5 text-green-400" />
                            </div>
                            <h4 className="text-lg font-semibold text-white">
                                {t("positionDetails.overview.upperRange")}
                            </h4>
                        </div>

                        <div className="flex gap-6">
                            {/* Left Half - Data */}
                            <div className="flex-1 space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Base Token:</span>
                                    <div className="flex items-center gap-2 text-white">
                                        {baseToken.logoUrl && (
                                            <img
                                                src={baseToken.logoUrl}
                                                alt={baseToken.symbol}
                                                className="w-4 h-4 rounded-full"
                                            />
                                        )}
                                        <span>{formatCompactValue(positionStates.upperRange.baseTokenAmount, baseToken.decimals)} {baseToken.symbol}</span>
                                    </div>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Quote Token:</span>
                                    <div className="flex items-center gap-2 text-white">
                                        {quoteToken.logoUrl && (
                                            <img
                                                src={quoteToken.logoUrl}
                                                alt={quoteToken.symbol}
                                                className="w-4 h-4 rounded-full"
                                            />
                                        )}
                                        <span>{formatCompactValue(positionStates.upperRange.quoteTokenAmount, quoteToken.decimals)} {quoteToken.symbol}</span>
                                    </div>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">{t("positionDetails.overview.poolPrice")}:</span>
                                    <span className="text-white">
                                        {formatCompactValue(positionStates.upperRange.poolPrice, quoteToken.decimals)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">{t("positionDetails.overview.positionValue")}:</span>
                                    <span className="text-white">
                                        {formatCompactValue(positionStates.upperRange.positionValue, quoteToken.decimals)} {quoteToken.symbol}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">{t("positionDetails.overview.pnlIncludingFees")}:</span>
                                    <span className={`${
                                        positionStates.upperRange.pnlIncludingFees > 0n
                                            ? "text-green-400"
                                            : positionStates.upperRange.pnlIncludingFees < 0n
                                            ? "text-red-400"
                                            : "text-slate-400"
                                    }`}>
                                        {formatCompactValue(positionStates.upperRange.pnlIncludingFees, quoteToken.decimals)} {quoteToken.symbol}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">{t("positionDetails.overview.pnlExcludingFees")}:</span>
                                    <span className={`${
                                        positionStates.upperRange.pnlExcludingFees > 0n
                                            ? "text-green-400"
                                            : positionStates.upperRange.pnlExcludingFees < 0n
                                            ? "text-red-400"
                                            : "text-slate-400"
                                    }`}>
                                        {formatCompactValue(positionStates.upperRange.pnlExcludingFees, quoteToken.decimals)} {quoteToken.symbol}
                                    </span>
                                </div>
                            </div>

                            {/* Right Half - Mini PnL Curve */}
                            <div className="flex-1 flex items-center justify-center">
                                <MiniPnLCurve
                                    position={position}
                                    curveData={upperRangeCurveData}
                                    width={240}
                                    height={144}
                                    showTooltip={true}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}

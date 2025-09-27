"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { PencilLine, PencilOff, TrendingUp } from "lucide-react";
import { useTranslations } from "@/i18n/client";
import type { PoolData } from "@/hooks/api/usePool";
import { tickToPrice, priceToTick } from "@/lib/utils/uniswap-v3/price";
import { getTokenAmountsFromLiquidity } from "@/lib/utils/uniswap-v3/liquidity";
import { TickMath } from "@uniswap/v3-sdk";
import { formatCompactValue } from "@/lib/utils/fraction-format";
import { InteractiveRangeSelector } from "@/components/charts/InteractiveRangeSelector";
import { usePositionAprProjection } from "@/hooks/api/usePositionAprProjection";
import { compareAddresses } from "@/lib/utils/evm";

interface TokenInfo {
    address: string;
    symbol: string;
    decimals: number;
    logoUrl?: string | null;
}

interface PositionRangeConfigProps {
    pool: PoolData;
    baseToken: TokenInfo;
    quoteToken: TokenInfo;
    tickLower: number;
    tickUpper: number;
    liquidity?: bigint;
    totalQuoteValue?: bigint;
    // eslint-disable-next-line no-unused-vars
    onTickLowerChange: (tick: number) => void;
    // eslint-disable-next-line no-unused-vars
    onTickUpperChange: (tick: number) => void;
}

export function PositionRangeConfig({
    pool,
    baseToken,
    quoteToken,
    tickLower,
    tickUpper,
    liquidity,
    totalQuoteValue = 0n,
    onTickLowerChange,
    onTickUpperChange,
}: PositionRangeConfigProps) {
    const t = useTranslations();
    const [isExpanded, setIsExpanded] = useState<boolean>(false);
    const [lowerPrice, setLowerPrice] = useState<string>("");
    const [upperPrice, setUpperPrice] = useState<string>("");

    // Determine token roles for correct decimal scaling
    const isToken0Base = useMemo(() => {
        return compareAddresses(pool.token0.address, baseToken.address) === 0;
    }, [pool.token0.address, baseToken.address]);


    /**
     * Convert tick to human-readable price
     * @param tick The tick value to convert
     * @returns Price as a number (quote tokens per base token)
     * @example For WETH/USDC: tick -195340 → 3000.5 (meaning 3000.5 USDC per 1 WETH)
     */
    const convertTickToPriceSimple = useCallback(
        (tick: number): number => {
            if (!baseToken || !quoteToken || !pool) return 0;

            try {
                // Get the correct decimals from pool data
                const baseTokenDecimals =
                    pool.token0.address.toLowerCase() ===
                    baseToken.address.toLowerCase()
                        ? pool.token0.decimals
                        : pool.token1.decimals;

                const quoteTokenDecimals =
                    pool.token0.address.toLowerCase() ===
                    quoteToken.address.toLowerCase()
                        ? pool.token0.decimals
                        : pool.token1.decimals;

                // tickToPrice returns price in quote token decimals
                const priceBigInt = tickToPrice(
                    tick,
                    baseToken.address,
                    quoteToken.address,
                    baseTokenDecimals
                );

                // Convert to human readable number using quote token decimals
                const divisor = 10n ** BigInt(quoteTokenDecimals);
                return Number(priceBigInt) / Number(divisor);
            } catch (error) {
                console.error("Error converting tick to price:", error);
                return 0;
            }
        },
        [baseToken, quoteToken, pool]
    );

    /**
     * Convert human-readable price to tick value
     * @param price Price as a number (quote tokens per base token)
     * @returns Tick value snapped to valid tick spacing
     * @example For WETH/USDC: price 3000.5 → tick -195340 (3000.5 USDC per 1 WETH)
     */
    const convertPriceToTick = useCallback(
        (price: number): number => {
            if (!baseToken || !quoteToken || !pool?.tickSpacing || price <= 0) {
                return TickMath.MIN_TICK;
            }

            try {
                // Get the correct decimals from pool data
                const baseTokenDecimals =
                    pool.token0.address.toLowerCase() ===
                    baseToken.address.toLowerCase()
                        ? pool.token0.decimals
                        : pool.token1.decimals;

                const quoteTokenDecimals =
                    pool.token0.address.toLowerCase() ===
                    quoteToken.address.toLowerCase()
                        ? pool.token0.decimals
                        : pool.token1.decimals;

                // priceToTick expects price in quote token decimals as BigInt
                const multiplier = 10n ** BigInt(quoteTokenDecimals);
                const priceBigInt = BigInt(
                    Math.floor(price * Number(multiplier))
                );

                return priceToTick(
                    priceBigInt,
                    pool.tickSpacing,
                    baseToken.address,
                    quoteToken.address,
                    baseTokenDecimals
                );
            } catch (error) {
                console.error("Error converting price to tick:", error);
                return TickMath.MIN_TICK;
            }
        },
        [baseToken, quoteToken, pool]
    );

    // Sync price inputs with tick values for display
    useEffect(() => {
        // Convert valid ticks to price strings for input fields
        if (pool && !isNaN(tickLower) && !lowerPrice) {
            const price = convertTickToPriceSimple(tickLower);
            if (price > 0) {
                setLowerPrice(price.toString());
            }
        }

        if (pool && !isNaN(tickUpper) && !upperPrice) {
            const price = convertTickToPriceSimple(tickUpper);
            if (price > 0) {
                setUpperPrice(price.toString());
            }
        }
    }, [
        pool,
        tickLower,
        tickUpper,
        lowerPrice,
        upperPrice,
        convertTickToPriceSimple,
    ]);

    // Use APR projection hook
    const {
        isLoading: isPoolFeeLoading,
        isError: isPoolFeeError,
        apr,
        hasValidData,
    } = usePositionAprProjection({
        pool,
        liquidity: liquidity || 0n,
        tickLower,
        tickUpper,
        isToken0Base,
        enabled: (liquidity || 0n) > 0n,
    });

    // Format APR for display
    const prospectiveAPR = useMemo(() => {
        if (isPoolFeeLoading) return "—";
        if (isPoolFeeError || !hasValidData) return "—";

        const aprPercent = apr * 100; // Convert decimal to percentage

        if (aprPercent === 0) return 0;
        if (aprPercent < 0.01) return "<0.01";
        if (aprPercent > 1000) return ">1000";

        return aprPercent.toFixed(2);
    }, [apr, hasValidData, isPoolFeeLoading, isPoolFeeError]);

    /**
     * Get current pool price for display
     * @returns Current price as a number (quote tokens per base token)
     * @example For WETH/USDC pool: 3000.5 (meaning 3000.5 USDC per 1 WETH)
     */
    const currentPrice = useMemo(() => {
        if (!pool?.currentTick || !baseToken || !quoteToken) return 0;

        try {
            // Get the correct decimals from pool data
            const baseTokenDecimals =
                pool.token0.address.toLowerCase() ===
                baseToken.address.toLowerCase()
                    ? pool.token0.decimals
                    : pool.token1.decimals;

            const quoteTokenDecimals =
                pool.token0.address.toLowerCase() ===
                quoteToken.address.toLowerCase()
                    ? pool.token0.decimals
                    : pool.token1.decimals;

            // tickToPrice returns price in quote token decimals
            const priceBigInt = tickToPrice(
                pool.currentTick,
                baseToken.address,
                quoteToken.address,
                baseTokenDecimals
            );

            // Convert to human readable number using quote token decimals
            const divisor = 10n ** BigInt(quoteTokenDecimals);
            return Number(priceBigInt) / Number(divisor);
        } catch (error) {
            console.error("Error getting current price:", error);
            return 0;
        }
    }, [baseToken, quoteToken, pool]);

    // Display prices for header
    const displayPrices = useMemo(() => {
        const lowerDisplay =
            tickLower !== undefined && !isNaN(tickLower)
                ? convertTickToPriceSimple(tickLower)
                : 0;
        const upperDisplay =
            tickUpper !== undefined && !isNaN(tickUpper)
                ? convertTickToPriceSimple(tickUpper)
                : 0;

        // Convert to BigInt for compact formatting
        const lowerBigInt =
            lowerDisplay > 0
                ? BigInt(
                      Math.floor(
                          lowerDisplay *
                              Number(10n ** BigInt(quoteToken.decimals))
                      )
                  )
                : 0n;
        const upperBigInt =
            upperDisplay > 0
                ? BigInt(
                      Math.floor(
                          upperDisplay *
                              Number(10n ** BigInt(quoteToken.decimals))
                      )
                  )
                : 0n;

        return {
            lower:
                lowerBigInt > 0n
                    ? formatCompactValue(lowerBigInt, quoteToken.decimals)
                    : "—",
            upper:
                upperBigInt > 0n
                    ? formatCompactValue(upperBigInt, quoteToken.decimals)
                    : "—",
        };
    }, [tickLower, tickUpper, convertTickToPriceSimple, quoteToken.decimals]);

    // Check if current price is out of range
    const isOutOfRange = useMemo(() => {
        if (
            !pool?.currentTick ||
            tickLower === undefined ||
            tickUpper === undefined ||
            isNaN(tickLower) ||
            isNaN(tickUpper)
        ) {
            return false;
        }
        return pool.currentTick < tickLower || pool.currentTick > tickUpper;
    }, [pool?.currentTick, tickLower, tickUpper]);

    function onLowerPriceChange(newLowerPrice: string) {
        setLowerPrice(newLowerPrice);
        // Don't convert to tick immediately - let user finish typing
    }

    function onUpperPriceChange(newUpperPrice: string) {
        setUpperPrice(newUpperPrice);
        // Don't convert to tick immediately - let user finish typing
    }

    function onLowerPriceBlur() {
        const price = parseFloat(lowerPrice);
        if (!isNaN(price) && price > 0) {
            const tick = convertPriceToTick(price);
            onTickLowerChange(tick);
        }
    }

    function onUpperPriceBlur() {
        const price = parseFloat(upperPrice);
        if (!isNaN(price) && price > 0) {
            const tick = convertPriceToTick(price);
            onTickUpperChange(tick);
        }
    }

    // Calculate current price in BigInt for InteractiveRangeSelector
    const currentPriceBigInt = useMemo(() => {
        if (!pool?.currentTick || !baseToken || !quoteToken) return 0n;

        try {
            const baseTokenDecimals =
                pool.token0.address.toLowerCase() ===
                baseToken.address.toLowerCase()
                    ? pool.token0.decimals
                    : pool.token1.decimals;

            return tickToPrice(
                pool.currentTick,
                baseToken.address,
                quoteToken.address,
                baseTokenDecimals
            );
        } catch (error) {
            console.error("Error getting current price:", error);
            return 0n;
        }
    }, [baseToken, quoteToken, pool]);

    // Calculate price bounds in BigInt
    const lowerPriceBigInt = useMemo(() => {
        if (tickLower === undefined || isNaN(tickLower)) return 0n;
        try {
            const baseTokenDecimals =
                pool.token0.address.toLowerCase() ===
                baseToken.address.toLowerCase()
                    ? pool.token0.decimals
                    : pool.token1.decimals;

            return tickToPrice(
                tickLower,
                baseToken.address,
                quoteToken.address,
                baseTokenDecimals
            );
        } catch {
            return 0n;
        }
    }, [tickLower, baseToken, quoteToken, pool]);

    const upperPriceBigInt = useMemo(() => {
        if (tickUpper === undefined || isNaN(tickUpper)) return 0n;
        try {
            const baseTokenDecimals =
                pool.token0.address.toLowerCase() ===
                baseToken.address.toLowerCase()
                    ? pool.token0.decimals
                    : pool.token1.decimals;

            return tickToPrice(
                tickUpper,
                baseToken.address,
                quoteToken.address,
                baseTokenDecimals
            );
        } catch {
            return 0n;
        }
    }, [tickUpper, baseToken, quoteToken, pool]);

    // Handle range change from interactive chart
    const handleRangeChange = useCallback(
        (newLowerPrice: bigint, newUpperPrice: bigint) => {
            try {
                const baseTokenDecimals =
                    pool.token0.address.toLowerCase() ===
                    baseToken.address.toLowerCase()
                        ? pool.token0.decimals
                        : pool.token1.decimals;

                const newLowerTick = priceToTick(
                    newLowerPrice,
                    pool.tickSpacing,
                    baseToken.address,
                    quoteToken.address,
                    baseTokenDecimals
                );

                const newUpperTick = priceToTick(
                    newUpperPrice,
                    pool.tickSpacing,
                    baseToken.address,
                    quoteToken.address,
                    baseTokenDecimals
                );

                onTickLowerChange(newLowerTick);
                onTickUpperChange(newUpperTick);
            } catch (error) {
                console.error("Error converting price to tick:", error);
            }
        },
        [pool, baseToken, quoteToken, onTickLowerChange, onTickUpperChange]
    );

    // APR is now calculated above using real pool fee data

    // Calculate position metrics directly from liquidity
    const positionMetrics = useMemo(() => {
        if (!liquidity || liquidity === 0n || pool.currentTick === null) {
            return {
                positionSizeBase: "0",
                positionSizeQuote: "0",
                lowerRangePnL: "0",
                upperRangePnL: "0",
            };
        }

        try {
            // Calculate actual token amounts from liquidity
            const { token0Amount, token1Amount } = getTokenAmountsFromLiquidity(
                liquidity,
                pool.currentTick,
                tickLower,
                tickUpper
            );

            // Determine which token is base and which is quote
            const isQuoteToken0 = compareAddresses(quoteToken.address, baseToken.address) < 0;
            const baseTokenAmount = isQuoteToken0 ? token1Amount : token0Amount;
            const quoteTokenAmount = isQuoteToken0 ? token0Amount : token1Amount;

            // Format position sizes for display
            const positionSizeBase = baseTokenAmount > 0n
                ? formatCompactValue(baseTokenAmount, baseToken.decimals)
                : "0";
            const positionSizeQuote = quoteTokenAmount > 0n
                ? formatCompactValue(quoteTokenAmount, quoteToken.decimals)
                : "0";

            return {
                positionSizeBase,
                positionSizeQuote,
                lowerRangePnL: "-4000", // TODO: Calculate actual PnL ranges
                upperRangePnL: "+1800", // TODO: Calculate actual PnL ranges
            };
        } catch (error) {
            console.error("Error calculating position metrics:", error);
            return {
                positionSizeBase: "0",
                positionSizeQuote: "0",
                lowerRangePnL: "0",
                upperRangePnL: "0",
            };
        }
    }, [
        liquidity,
        pool.currentTick,
        tickLower,
        tickUpper,
        baseToken.address,
        baseToken.decimals,
        quoteToken.address,
        quoteToken.decimals,
    ]);

    return (
        <div className="space-y-4">
            {/* Header with Price Range display */}
            <div className="flex items-center justify-between text-sm">
                <span className="text-slate-300 font-medium flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    {t("positionWizard.positionConfig.priceRange")}:
                </span>
                <div className="flex items-center gap-2">
                    {isOutOfRange && (
                        <span className="px-2 py-0.5 bg-red-500/20 border border-red-500/30 text-red-200 text-xs rounded-full font-medium">
                            Out of Range
                        </span>
                    )}
                    <span className="text-white font-medium">
                        {displayPrices.lower} - {displayPrices.upper}{" "}
                        {baseToken.symbol}/{quoteToken.symbol}
                    </span>
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="p-1 hover:bg-slate-700 rounded transition-colors cursor-pointer"
                    >
                        {isExpanded ? (
                            <PencilOff className="w-4 h-4 text-slate-400" />
                        ) : (
                            <PencilLine className="w-4 h-4 text-slate-400" />
                        )}
                    </button>
                </div>
            </div>

            {/* Main Layout: Information Panel + Interactive Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Left Information Panel */}
                <div className="lg:col-span-2 space-y-4">
                    {/* APR Section */}
                    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-lg p-4">
                        <div className="space-y-3">
                            <div className="border-b border-slate-600 pb-3">
                                <h4 className="text-yellow-400 font-bold text-lg">
                                    Prospective APR: {prospectiveAPR}%
                                </h4>
                            </div>

                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-300">
                                        Current Price:
                                    </span>
                                    <span className="text-white font-mono">
                                        {currentPrice > 0
                                            ? currentPrice.toFixed(2)
                                            : "—"}{" "}
                                        {quoteToken.symbol}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-300">
                                        Lower Range:
                                    </span>
                                    <span className="text-white font-mono">
                                        {displayPrices.lower}{" "}
                                        {quoteToken.symbol}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-300">
                                        Upper Range:
                                    </span>
                                    <span className="text-white font-mono">
                                        {displayPrices.upper}{" "}
                                        {quoteToken.symbol}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>


                    {/* Position Size Section */}
                    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-lg p-4">
                        <div className="space-y-3">
                            <div className="border-b border-slate-600 pb-2">
                                <h4 className="text-slate-200 font-medium">
                                    Position Size
                                </h4>
                            </div>

                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-300">
                                        Icon({baseToken.symbol}):
                                    </span>
                                    <span className="text-white font-mono">
                                        {positionMetrics.positionSizeBase}{" "}
                                        {baseToken.symbol}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-300">
                                        Icon({quoteToken.symbol}):
                                    </span>
                                    <span className="text-white font-mono">
                                        {positionMetrics.positionSizeQuote}{" "}
                                        {quoteToken.symbol}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* PnL Analysis Section */}
                    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-lg p-4">
                        <div className="space-y-3">
                            <div className="border-b border-slate-600 pb-2">
                                <h4 className="text-slate-200 font-medium">
                                    PnL Analysis
                                </h4>
                            </div>

                            <div className="space-y-2 text-sm">
                                <div>
                                    <div className="flex justify-between mb-1">
                                        <span className="text-slate-300">
                                            Lower Range:
                                        </span>
                                        <span className="text-red-400 font-mono">
                                            {positionMetrics.lowerRangePnL}{" "}
                                            {quoteToken.symbol}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400 text-xs">
                                            Position Size:
                                        </span>
                                        <span className="text-slate-400 font-mono text-xs">
                                            {positionMetrics.positionSizeBase}{" "}
                                            {baseToken.symbol}
                                        </span>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <div className="flex justify-between mb-1">
                                        <span className="text-slate-300">
                                            Upper Range:
                                        </span>
                                        <span className="text-green-400 font-mono">
                                            {positionMetrics.upperRangePnL}{" "}
                                            {quoteToken.symbol}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400 text-xs">
                                            Position Size:
                                        </span>
                                        <span className="text-slate-400 font-mono text-xs">
                                            {positionMetrics.positionSizeQuote}{" "}
                                            {quoteToken.symbol}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Interactive Chart */}
                <div className="lg:col-span-3">
                    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-lg p-4">
                        {totalQuoteValue > 0n ? (
                            <InteractiveRangeSelector
                                pool={{
                                    ...pool,
                                    token0Address: pool.token0.address,
                                    token1Address: pool.token1.address,
                                } as any}
                                totalQuoteValue={totalQuoteValue}
                                lowerPrice={lowerPriceBigInt}
                                upperPrice={upperPriceBigInt}
                                currentPrice={currentPriceBigInt}
                                onRangeChange={handleRangeChange}
                                width={600}
                                height={400}
                                className="w-full"
                            />
                        ) : (
                            <div className="flex items-center justify-center h-96 text-slate-400">
                                <div className="text-center">
                                    <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                    <p>
                                        Enter position size to see interactive
                                        chart
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Collapsible Manual Input Section */}
            {isExpanded && (
                <div className="space-y-3 border-t border-slate-700 pt-3">
                    <h5 className="text-slate-300 font-medium text-sm">
                        Manual Price Input
                    </h5>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-2">
                                Lower Price
                            </label>
                            <input
                                type="number"
                                value={lowerPrice}
                                onChange={(e) =>
                                    onLowerPriceChange(e.target.value)
                                }
                                onBlur={onLowerPriceBlur}
                                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="0.0"
                                step="any"
                            />
                            {tickLower !== undefined && (
                                <p className="text-xs text-slate-500 mt-1">
                                    Tick: {tickLower}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-2">
                                Upper Price
                            </label>
                            <input
                                type="number"
                                value={upperPrice}
                                onChange={(e) =>
                                    onUpperPriceChange(e.target.value)
                                }
                                onBlur={onUpperPriceBlur}
                                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="0.0"
                                step="any"
                            />
                            {tickUpper !== undefined && (
                                <p className="text-xs text-slate-500 mt-1">
                                    Tick: {tickUpper}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { PencilLine, PencilOff, TrendingUp } from "lucide-react";
import { useTranslations } from "@/i18n/client";
import type { PoolData } from "@/hooks/api/usePool";
import { tickToPrice, priceToTick } from "@/lib/utils/uniswap-v3/price";
import { formatCompactValue } from "@/lib/utils/fraction-format";
import { TickMath } from "@uniswap/v3-sdk";
import { RangeSlider } from "@/app-shared/components/common/RangeSlider";
import { usePositionAprProjection } from "@/hooks/api/usePositionAprProjection";
import { compareAddresses } from "@/lib/utils/evm";
import { PositionPnLCurve } from "@/app-shared/components/charts/PositionPnLCurve";

interface TokenInfo {
    address: string;
    symbol: string;
    decimals: number;
    logoUrl?: string | null;
}

interface SliderBounds {
    min: number;
    max: number;
}

interface PositionRangeConfigProps {
    pool: PoolData;
    baseToken: TokenInfo;
    quoteToken: TokenInfo;
    tickLower: number;
    tickUpper: number;
    liquidity?: bigint;
    onTickLowerChange: (_tick: number) => void;
    onTickUpperChange: (_tick: number) => void;
    onTickRangeChange: (_tickLower: number, _tickUpper: number) => void;
}

export function PositionRangeConfig({
    pool,
    baseToken,
    quoteToken,
    tickLower,
    tickUpper,
    liquidity,
    onTickLowerChange: _onTickLowerChange,
    onTickUpperChange: _onTickUpperChange,
    onTickRangeChange,
}: PositionRangeConfigProps) {
    const t = useTranslations();
    const [isExpanded, setIsExpanded] = useState<boolean>(false);

    // Slider bounds state - shared between RangeSlider and PositionPnLCurve
    const [sliderBounds, setSliderBounds] = useState<SliderBounds>(() => ({
        min: 0,
        max: 0,
    }));

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

    // Initialize slider bounds when current price is available
    useEffect(() => {
        if (currentPrice > 0 && sliderBounds.min === 0 && sliderBounds.max === 0) {
            const DEFAULT_RANGE_PERCENT = 50; // ±50% default range
            setSliderBounds({
                min: currentPrice * (1 - DEFAULT_RANGE_PERCENT / 100),
                max: currentPrice * (1 + DEFAULT_RANGE_PERCENT / 100),
            });
        }
    }, [currentPrice, sliderBounds.min, sliderBounds.max]);

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

            {/* Collapsible sections - only show when expanded */}
            {isExpanded && (
                <div className="space-y-6">
                    {/* Range Selector with integrated APR */}
                    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-lg p-6">
                        <RangeSlider
                            currentPrice={currentPrice}
                            lowerPrice={convertTickToPriceSimple(tickLower)}
                            upperPrice={convertTickToPriceSimple(tickUpper)}
                            onRangeChange={(newLowerPrice, newUpperPrice) => {
                                const newLowerTick = convertPriceToTick(newLowerPrice);
                                const newUpperTick = convertPriceToTick(newUpperPrice);
                                onTickRangeChange(newLowerTick, newUpperTick);
                            }}
                            quoteTokenSymbol={quoteToken.symbol}
                            quoteTokenDecimals={quoteToken.decimals}
                            aprValue={typeof prospectiveAPR === 'number' ? prospectiveAPR.toString() : prospectiveAPR}
                            aprLoading={isPoolFeeLoading}
                            sliderBounds={sliderBounds}
                            onBoundsChange={setSliderBounds}
                            _tickLowerPrice={convertTickToPriceSimple(tickLower)}
                            _tickUpperPrice={convertTickToPriceSimple(tickUpper)}
                            className=""
                        />

                        {/* Risk Profile Section */}
                        <div className="mt-6">
                            <h4 className="text-slate-200 font-medium mb-4">
                                Risk Profile
                            </h4>
                            <div className="flex justify-center">
                                <PositionPnLCurve
                                    pool={pool}
                                    baseToken={baseToken}
                                    quoteToken={quoteToken}
                                    tickLower={tickLower}
                                    tickUpper={tickUpper}
                                    liquidity={liquidity}
                                    priceRange={sliderBounds}
                                    currentPrice={currentPrice}
                                    className=""
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

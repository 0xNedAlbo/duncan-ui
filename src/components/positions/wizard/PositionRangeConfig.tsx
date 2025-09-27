"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { PencilLine, PencilOff } from "lucide-react";
import { useTranslations } from "@/i18n/client";
import type { PoolData } from "@/hooks/api/usePool";
import { tickToPrice, priceToTick } from "@/lib/utils/uniswap-v3/price";
import { TickMath } from "@uniswap/v3-sdk";
import { formatCompactValue } from "@/lib/utils/fraction-format";

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
    tickLower?: number;
    tickUpper?: number;
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
    onTickLowerChange,
    onTickUpperChange,
}: PositionRangeConfigProps) {
    const t = useTranslations();
    const [isExpanded, setIsExpanded] = useState<boolean>(false);
    const [lowerPrice, setLowerPrice] = useState<string>("");
    const [upperPrice, setUpperPrice] = useState<string>("");

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

    // Sync price inputs with tick values when pool loads
    useEffect(() => {
        if (pool && tickLower !== undefined && !lowerPrice) {
            const price = convertTickToPriceSimple(tickLower);
            if (price > 0) {
                setLowerPrice(price.toString());
            }
        }
        if (pool && tickUpper !== undefined && !upperPrice) {
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
                pool.token0.address.toLowerCase() === baseToken.address.toLowerCase()
                    ? pool.token0.decimals
                    : pool.token1.decimals;

            const quoteTokenDecimals =
                pool.token0.address.toLowerCase() === quoteToken.address.toLowerCase()
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
        const lowerDisplay = tickLower !== undefined ? convertTickToPriceSimple(tickLower) : 0;
        const upperDisplay = tickUpper !== undefined ? convertTickToPriceSimple(tickUpper) : 0;

        // Convert to BigInt for compact formatting
        const lowerBigInt = lowerDisplay > 0 ? BigInt(Math.floor(lowerDisplay * Number(10n ** BigInt(quoteToken.decimals)))) : 0n;
        const upperBigInt = upperDisplay > 0 ? BigInt(Math.floor(upperDisplay * Number(10n ** BigInt(quoteToken.decimals)))) : 0n;

        return {
            lower: lowerBigInt > 0n ? formatCompactValue(lowerBigInt, quoteToken.decimals) : "—",
            upper: upperBigInt > 0n ? formatCompactValue(upperBigInt, quoteToken.decimals) : "—",
        };
    }, [tickLower, tickUpper, convertTickToPriceSimple, quoteToken.decimals]);

    // Check if current price is out of range
    const isOutOfRange = useMemo(() => {
        if (!pool?.currentTick || tickLower === undefined || tickUpper === undefined) {
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

    return (
        <div className="space-y-3">
            {/* Header with Price Range display */}
            <div className="flex items-center justify-between text-sm">
                <span className="text-slate-300 font-medium">
                    {t("positionWizard.positionConfig.priceRange")}:
                </span>
                <div className="flex items-center gap-2">
                    {isOutOfRange && (
                        <span className="px-2 py-0.5 bg-red-500/20 border border-red-500/30 text-red-200 text-xs rounded-full font-medium">
                            Out of Range
                        </span>
                    )}
                    <span className="text-white font-medium">
                        {displayPrices.lower} - {displayPrices.upper} {baseToken.symbol}/{quoteToken.symbol}
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

            {/* Collapsible content */}
            {isExpanded && (
                <div className="space-y-3 border-t border-slate-700 pt-3">
                    {/* Current Price Display */}
                    {currentPrice > 0 && (
                        <div className="mb-4 p-3 bg-slate-700/50 rounded-lg">
                            <p className="text-xs text-slate-400 mb-1">
                                Current Price
                            </p>
                            <p className="text-white font-mono">
                                {currentPrice.toFixed(6)} {baseToken.symbol}/{quoteToken.symbol}
                            </p>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-2">
                                Lower Price
                            </label>
                            <input
                                type="number"
                                value={lowerPrice}
                                onChange={(e) => onLowerPriceChange(e.target.value)}
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
                                onChange={(e) => onUpperPriceChange(e.target.value)}
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
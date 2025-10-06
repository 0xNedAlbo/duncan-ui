"use client";

import { formatCompactValue } from "@/lib/utils/fraction-format";
import { tickToPrice } from "@/lib/utils/uniswap-v3/price";
import type { BasicPosition } from "@/types/positions";

interface RangeStatusLineProps {
    position: BasicPosition;
}

export function RangeStatusLine({ position }: RangeStatusLineProps) {
    const { pool } = position;

    // Determine base and quote tokens
    const baseToken = position.token0IsQuote ? pool.token1 : pool.token0;
    const quoteToken = position.token0IsQuote ? pool.token0 : pool.token1;

    // Calculate prices from ticks
    const lowerPrice = tickToPrice(
        position.tickLower,
        baseToken.address,
        quoteToken.address,
        baseToken.decimals
    );

    const upperPrice = tickToPrice(
        position.tickUpper,
        baseToken.address,
        quoteToken.address,
        baseToken.decimals
    );

    const currentPrice = BigInt(pool.currentPrice || "0");
    const currentTick = pool.currentTick ?? 0;

    // Determine if position is in range
    const isInRange = currentTick >= position.tickLower && currentTick <= position.tickUpper;
    const isBelowRange = currentTick < position.tickLower;

    // Calculate percentage distance from current price to other prices
    const calculatePercentageDistance = (fromPrice: bigint, toPrice: bigint): string => {
        if (fromPrice === 0n) return "0";

        const difference = toPrice - fromPrice;
        const percentage = (Number(difference) * 100) / Number(fromPrice);

        const sign = percentage > 0 ? "+" : "";
        return `${sign}${percentage.toFixed(1)}%`;
    };

    const distanceToLower = calculatePercentageDistance(currentPrice, lowerPrice);
    const distanceToUpper = calculatePercentageDistance(currentPrice, upperPrice);

    // Format prices for display
    const formattedLowerPrice = formatCompactValue(lowerPrice, quoteToken.decimals);
    const formattedUpperPrice = formatCompactValue(upperPrice, quoteToken.decimals);
    const formattedCurrentPrice = formatCompactValue(currentPrice, quoteToken.decimals);

    // Calculate positions using linear price scale
    // Range always occupies center 60% (20%-80%)
    // Full display width represents: lower - 1/3*range to upper + 1/3*range

    const rangeWidth = upperPrice - lowerPrice;
    const fullDisplayRange = (rangeWidth * 5n) / 3n; // range / 0.6 = range * 5/3
    const leftEdgePrice = lowerPrice - (rangeWidth / 3n);

    // Calculate position on linear scale
    const calculatePosition = (price: bigint): number => {
        if (fullDisplayRange === 0n) return 50; // fallback to center

        const offset = price - leftEdgePrice;
        const position = (Number(offset) * 100) / Number(fullDisplayRange);

        // Clamp to 0-100% range (stick to borders if outside)
        return Math.max(0, Math.min(100, position));
    };

    // Fixed positions for range boundaries
    const lowerPosition = 20; // Always at 20%
    const upperPosition = 80; // Always at 80%
    const currentPosition = calculatePosition(currentPrice);

    // Helper function to determine label alignment based on position
    const getLabelAlignment = (position: number): 'left' | 'center' | 'right' => {
        if (position <= 15) return 'left';
        if (position >= 85) return 'right';
        return 'center';
    };

    const lowerAlignment = getLabelAlignment(lowerPosition);
    const upperAlignment = getLabelAlignment(upperPosition);
    const currentAlignment = getLabelAlignment(currentPosition);

    return (
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
            <div className="relative h-28 py-4">
                {/* Horizontal line */}
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-600" />

                {/* Lower Price - Below Line */}
                <div
                    className="absolute top-1/2"
                    style={{
                        left: `${lowerPosition}%`,
                        transform: lowerAlignment === 'left' ? 'translateX(0)' : lowerAlignment === 'right' ? 'translateX(-100%)' : 'translateX(-50%)'
                    }}
                >
                    {/* Scale Marker */}
                    <div
                        className="absolute -top-3 text-white text-lg font-bold"
                        style={{
                            left: lowerAlignment === 'left' ? '0' : lowerAlignment === 'right' ? 'auto' : '50%',
                            right: lowerAlignment === 'right' ? '0' : 'auto',
                            transform: lowerAlignment === 'center' ? 'translateX(-50%)' : 'none'
                        }}
                    >
                        |
                    </div>
                    {/* Label Below */}
                    <div
                        className="flex flex-col px-2 pt-3"
                        style={{
                            alignItems: lowerAlignment === 'left' ? 'flex-start' : lowerAlignment === 'right' ? 'flex-end' : 'center'
                        }}
                    >
                        <div className="text-sm font-medium text-white whitespace-nowrap">
                            {formattedLowerPrice} {quoteToken.symbol}
                        </div>
                        <div className="text-xs text-slate-400 whitespace-nowrap">Lower Price</div>
                    </div>
                </div>

                {/* Upper Price - Below Line */}
                <div
                    className="absolute top-1/2"
                    style={{
                        left: `${upperPosition}%`,
                        transform: upperAlignment === 'left' ? 'translateX(0)' : upperAlignment === 'right' ? 'translateX(-100%)' : 'translateX(-50%)'
                    }}
                >
                    {/* Scale Marker */}
                    <div
                        className="absolute -top-3 text-white text-lg font-bold"
                        style={{
                            left: upperAlignment === 'left' ? '0' : upperAlignment === 'right' ? 'auto' : '50%',
                            right: upperAlignment === 'right' ? '0' : 'auto',
                            transform: upperAlignment === 'center' ? 'translateX(-50%)' : 'none'
                        }}
                    >
                        |
                    </div>
                    {/* Label Below */}
                    <div
                        className="flex flex-col px-2 pt-3"
                        style={{
                            alignItems: upperAlignment === 'left' ? 'flex-start' : upperAlignment === 'right' ? 'flex-end' : 'center'
                        }}
                    >
                        <div className="text-sm font-medium text-white whitespace-nowrap">
                            {formattedUpperPrice} {quoteToken.symbol}
                        </div>
                        <div className="text-xs text-slate-400 whitespace-nowrap">Upper Price</div>
                    </div>
                </div>

                {/* Current Price - Above Line */}
                <div
                    className="absolute top-1/2"
                    style={{
                        left: `${currentPosition}%`,
                        transform: currentAlignment === 'left' ? 'translateX(0)' : currentAlignment === 'right' ? 'translateX(-100%)' : 'translateX(-50%)'
                    }}
                >
                    {/* Label Above */}
                    <div
                        className="flex flex-col px-3 absolute bottom-3"
                        style={{
                            left: currentAlignment === 'left' ? '0' : currentAlignment === 'right' ? 'auto' : '50%',
                            right: currentAlignment === 'right' ? '0' : 'auto',
                            transform: currentAlignment === 'center' ? 'translateX(-50%)' : 'none',
                            alignItems: currentAlignment === 'left' ? 'flex-start' : currentAlignment === 'right' ? 'flex-end' : 'center'
                        }}
                    >
                        <div className={`text-sm font-medium whitespace-nowrap ${isInRange ? 'text-green-400' : 'text-red-400'}`}>
                            {formattedCurrentPrice} {quoteToken.symbol}
                        </div>
                        <div className={`text-xs whitespace-nowrap ${isInRange ? 'text-green-400' : 'text-red-400'}`}>
                            Current Price
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5 whitespace-nowrap">
                            {isInRange
                                ? `${distanceToLower} to lower • ${distanceToUpper} to upper`
                                : isBelowRange
                                ? `${distanceToLower} to lower`
                                : `${distanceToUpper} to upper`}
                        </div>
                    </div>
                    {/* Scale Marker - Colored */}
                    <div
                        className={`absolute -top-3 text-lg font-bold ${isInRange ? 'text-green-400' : 'text-red-400'}`}
                        style={{
                            left: currentAlignment === 'left' ? '0' : currentAlignment === 'right' ? 'auto' : '50%',
                            right: currentAlignment === 'right' ? '0' : 'auto',
                            transform: currentAlignment === 'center' ? 'translateX(-50%)' : 'none'
                        }}
                    >
                        |
                    </div>
                </div>
            </div>
        </div>
    );
}

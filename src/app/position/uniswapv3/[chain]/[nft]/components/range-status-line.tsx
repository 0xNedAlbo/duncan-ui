"use client";

import { formatCompactValue } from "@/lib/utils/fraction-format";
import { tickToPrice } from "@/lib/utils/uniswap-v3/price";
import type { BasicPosition } from "@/services/positions/positionService";

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
    const isAboveRange = currentTick > position.tickUpper;

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

    // Calculate positions for proportional display
    let lowerPosition = 0; // percentage from left
    let upperPosition = 100; // percentage from left
    let currentPosition = 50; // percentage from left

    if (isInRange) {
        // In range: lower at 0%, upper at 100%, current proportional between them
        lowerPosition = 0;
        upperPosition = 100;

        const rangeWidth = upperPrice - lowerPrice;
        if (rangeWidth > 0n) {
            const currentOffset = currentPrice - lowerPrice;
            currentPosition = (Number(currentOffset) * 100) / Number(rangeWidth);
            // Clamp to 0-100 range
            currentPosition = Math.max(0, Math.min(100, currentPosition));
        }
    } else if (isBelowRange) {
        // Below range: range takes left 50%, current price in left section
        lowerPosition = 0;
        upperPosition = 50;

        // Calculate how far below lower price (as percentage of lower price)
        const distanceFromLower = lowerPrice - currentPrice;
        const percentBelow = (Number(distanceFromLower) * 100) / Number(lowerPrice);

        // Map to right 50% of space: 0% below = just left of lower (0%), 50% below = far left edge (0%)
        // Since we're below, the further below we are, the more left we position
        // Position should be left of the range (which starts at 0%)
        // Scale: If 50% or more below, position at far left (0%), otherwise proportional
        if (percentBelow >= 50) {
            currentPosition = 0;
        } else {
            // Linear interpolation: 0% below -> position 0%, 50% below -> position -50% (but we can't go negative, so we adjust)
            // Actually, we want current price to appear LEFT of the range
            // Since range is at 0-50%, we need to position current before 0%
            // But we can't position before 0%, so we squeeze everything
            // New approach: shift everything right
            // Range: 25% to 75%, Current: 0% to 25%
            lowerPosition = 25 + (percentBelow / 50) * 25;
            upperPosition = 75;
            currentPosition = (percentBelow / 50) * 25;
        }
    } else if (isAboveRange) {
        // Above range: range takes left 50%, current price in right section
        lowerPosition = 0;
        upperPosition = 50;

        // Calculate how far above upper price (as percentage of upper price)
        const distanceFromUpper = currentPrice - upperPrice;
        const percentAbove = (Number(distanceFromUpper) * 100) / Number(upperPrice);

        // Map to right 50% of space: 0% above = just right of upper (50%), 50% above = far right (100%)
        if (percentAbove >= 50) {
            currentPosition = 100;
        } else {
            // Linear interpolation: 0% above -> 50%, 50% above -> 100%
            currentPosition = 50 + (percentAbove / 50) * 50;
        }
    }

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

"use client";

import { useMemo, useState } from "react";
import type { PoolData } from "@/app-shared/hooks/api/usePool";
import { generatePnLCurve } from "@/lib/utils/uniswap-v3/position";
import { tickToPrice, priceToTick } from "@/lib/utils/uniswap-v3/price";
import { calculatePositionValue, getTokenAmountsFromLiquidity_withTick } from "@/lib/utils/uniswap-v3/liquidity";
import { compareAddresses } from "@/lib/utils/evm";
import { useTranslations } from "@/app-shared/i18n/client";

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

interface PositionPnLCurveProps {
    pool: PoolData;
    baseToken: TokenInfo;
    quoteToken: TokenInfo;
    tickLower: number;
    tickUpper: number;
    liquidity?: bigint;
    priceRange: SliderBounds;
    currentPrice: number;
    width?: number;
    height?: number;
    className?: string;
}

interface CurvePoint {
    price: number;
    pnl: number;
    phase: "below" | "in-range" | "above";
    baseTokenAmount: number;
    quoteTokenAmount: number;
}

export function PositionPnLCurve({
    pool,
    baseToken,
    quoteToken,
    tickLower,
    tickUpper,
    liquidity,
    priceRange,
    currentPrice,
    width = 600,
    height = 200,
    className = "",
}: PositionPnLCurveProps) {
    const t = useTranslations();
    const [hoveredPoint, setHoveredPoint] = useState<CurvePoint | null>(null);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

    // Calculate curve data locally
    const curveData = useMemo(() => {
        if (!liquidity || liquidity === 0n || !pool?.currentTick || !baseToken || !quoteToken) {
            return null;
        }

        try {
            // Determine if base is token0
            const baseIsToken0 = compareAddresses(pool.token0.address, baseToken.address) === 0;

            // Get base token decimals from pool data
            const baseTokenDecimals = baseIsToken0 ? pool.token0.decimals : pool.token1.decimals;
            const quoteTokenDecimals = baseIsToken0 ? pool.token1.decimals : pool.token0.decimals;

            // Convert price range to BigInt (in quote token decimals)
            const priceRangeBigInt = {
                min: BigInt(Math.floor(priceRange.min * Number(10n ** BigInt(quoteTokenDecimals)))),
                max: BigInt(Math.floor(priceRange.max * Number(10n ** BigInt(quoteTokenDecimals))))
            };

            // Calculate cost basis: value of position at current price (opening point)
            // For new positions being planned, this is the initial investment value
            const costBasis = calculatePositionValue(
                liquidity,
                BigInt(pool.sqrtPriceX96),
                tickLower,
                tickUpper,
                BigInt(Math.floor(currentPrice * Number(10n ** BigInt(quoteTokenDecimals)))),
                baseIsToken0,
                baseTokenDecimals
            );

            // Generate PnL curve points
            const pnlPoints = generatePnLCurve(
                liquidity,
                tickLower,
                tickUpper,
                costBasis, // Use position value at current price as baseline
                baseToken.address,
                quoteToken.address,
                baseTokenDecimals,
                pool.tickSpacing,
                priceRangeBigInt,
                100 // number of points
            );

            // Convert to display format and calculate token amounts for each point
            const points: CurvePoint[] = pnlPoints.map(point => {
                const price = Number(point.price) / Number(10n ** BigInt(quoteTokenDecimals));
                const pnl = Number(point.pnl) / Number(10n ** BigInt(quoteTokenDecimals));

                // Calculate the tick for this price point
                const tick = priceToTick(
                    point.price,
                    pool.tickSpacing,
                    baseToken.address,
                    quoteToken.address,
                    baseTokenDecimals
                );

                // Get token amounts at this tick (hypothetical for curve visualization)
                const { token0Amount, token1Amount } = getTokenAmountsFromLiquidity_withTick(
                    liquidity,
                    tick,
                    tickLower,
                    tickUpper
                );

                // Determine which is base and which is quote
                const baseTokenAmount = baseIsToken0
                    ? Number(token0Amount) / Number(10n ** BigInt(baseTokenDecimals))
                    : Number(token1Amount) / Number(10n ** BigInt(baseTokenDecimals));

                const quoteTokenAmount = baseIsToken0
                    ? Number(token1Amount) / Number(10n ** BigInt(quoteTokenDecimals))
                    : Number(token0Amount) / Number(10n ** BigInt(quoteTokenDecimals));

                return {
                    price,
                    pnl,
                    phase: point.phase,
                    baseTokenAmount,
                    quoteTokenAmount
                };
            });

            // Calculate PnL range for Y-axis scaling
            const pnlValues = points.map(p => p.pnl);
            const pnlRange = {
                min: Math.min(...pnlValues),
                max: Math.max(...pnlValues)
            };

            // Find current price index
            const currentPriceIndex = points.findIndex((_, i) => {
                const pointPrice = points[i].price;
                const nextPointPrice = points[i + 1]?.price || pointPrice;
                return currentPrice >= pointPrice && currentPrice <= nextPointPrice;
            });

            // Convert tick bounds to prices for display
            const lowerPrice = Number(tickToPrice(
                tickLower,
                baseToken.address,
                quoteToken.address,
                baseTokenDecimals
            )) / Number(10n ** BigInt(quoteTokenDecimals));

            const upperPrice = Number(tickToPrice(
                tickUpper,
                baseToken.address,
                quoteToken.address,
                baseTokenDecimals
            )) / Number(10n ** BigInt(quoteTokenDecimals));

            return {
                points,
                priceRange: { min: priceRange.min, max: priceRange.max },
                pnlRange,
                currentPriceIndex: Math.max(0, currentPriceIndex),
                lowerPrice,
                upperPrice,
                currentPrice
            };

        } catch (error) {
            console.error("Error generating PnL curve data:", error);
            return null;
        }
    }, [liquidity, tickLower, tickUpper, priceRange.min, priceRange.max, currentPrice, baseToken, quoteToken, pool]);

    if (!curveData) {
        return (
            <div
                className={`flex items-center justify-center bg-slate-800/30 rounded ${className}`}
                style={{ width, height }}
            >
                <span className="text-xs text-slate-500">No data available</span>
            </div>
        );
    }

    const { points, pnlRange, currentPriceIndex, lowerPrice, upperPrice } = curveData;

    // SVG coordinate conversion
    const xScale = (price: number) =>
        ((price - priceRange.min) / (priceRange.max - priceRange.min)) * width;

    const yScale = (pnl: number) =>
        height - ((pnl - pnlRange.min) / (pnlRange.max - pnlRange.min)) * height;

    // Mouse event handlers for interactivity
    const handleMouseMove = (event: React.MouseEvent<SVGElement>) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        // Find closest point
        let closestIndex = 0;
        let closestDistance = Infinity;

        points.forEach((point, i) => {
            const pointX = xScale(point.price);
            const distance = Math.abs(pointX - mouseX);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestIndex = i;
            }
        });

        setHoveredPoint(points[closestIndex]);
        setMousePosition({ x: mouseX, y: mouseY });
    };

    const handleMouseLeave = () => {
        setHoveredPoint(null);
    };

    // Generate curve path
    const pathData = points
        .map((point, i) => {
            const x = xScale(point.price);
            const y = yScale(point.pnl);
            return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
        })
        .join(" ");

    // Zero line position
    const zeroLineY = yScale(0);

    // Range boundary positions
    const lowerBoundaryX = xScale(lowerPrice);
    const upperBoundaryX = xScale(upperPrice);

    // Current position
    const currentPoint = points[currentPriceIndex];
    const currentX = xScale(currentPoint?.price || currentPrice);
    const currentY = yScale(currentPoint?.pnl || 0);

    return (
        <div className={`relative ${className}`}>
            <svg
                width={width}
                height={height + 20}
                className="overflow-visible"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                style={{ cursor: "crosshair" }}
                viewBox={`0 -10 ${width} ${height + 20}`}
            >
                {/* Clip paths for fill areas */}
                <defs>
                    <clipPath id={`positivePnLClip-${pool.poolAddress}`}>
                        <rect x="0" y="0" width={width} height={Math.max(0, Math.min(height, zeroLineY))} />
                    </clipPath>
                    <clipPath id={`negativePnLClip-${pool.poolAddress}`}>
                        <rect x="0" y={Math.max(0, Math.min(height, zeroLineY))} width={width} height={height - Math.max(0, Math.min(height, zeroLineY))} />
                    </clipPath>
                </defs>

                {/* Positive PnL area (green fill above zero line) */}
                {(() => {
                    const effectiveZeroY = Math.max(0, Math.min(height, zeroLineY));
                    const shouldShowPositiveFill = zeroLineY > 0 || (zeroLineY <= 0 && pnlRange.min >= 0);

                    return shouldShowPositiveFill && (
                        <path
                            d={`${pathData} L ${width} ${effectiveZeroY} L 0 ${effectiveZeroY} Z`}
                            fill="rgba(34, 197, 94, 0.3)"
                            clipPath={`url(#positivePnLClip-${pool.poolAddress})`}
                        />
                    );
                })()}

                {/* Negative PnL area (red fill below zero line) */}
                {(() => {
                    const effectiveZeroY = Math.max(0, Math.min(height, zeroLineY));
                    const shouldShowNegativeFill = zeroLineY < height || (zeroLineY >= height && pnlRange.max <= 0);

                    return shouldShowNegativeFill && (
                        <path
                            d={`${pathData} L ${width} ${effectiveZeroY} L 0 ${effectiveZeroY} Z`}
                            fill="rgba(239, 68, 68, 0.3)"
                            clipPath={`url(#negativePnLClip-${pool.poolAddress})`}
                        />
                    );
                })()}

                {/* Zero line */}
                {zeroLineY >= 0 && zeroLineY <= height && (
                    <line
                        x1={0}
                        y1={zeroLineY}
                        x2={width}
                        y2={zeroLineY}
                        stroke="#64748b"
                        strokeWidth={2}
                        opacity={0.8}
                    />
                )}

                {/* PnL curve */}
                <path
                    d={pathData}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />

                {/* Range boundary lines */}
                <line
                    x1={lowerBoundaryX}
                    y1={0}
                    x2={lowerBoundaryX}
                    y2={height}
                    stroke="#06b6d4"
                    strokeWidth={1.5}
                    opacity={0.8}
                    strokeDasharray="3,3"
                />
                <line
                    x1={upperBoundaryX}
                    y1={0}
                    x2={upperBoundaryX}
                    y2={height}
                    stroke="#06b6d4"
                    strokeWidth={1.5}
                    opacity={0.8}
                    strokeDasharray="3,3"
                />

                {/* Current position marker */}
                <circle
                    cx={currentX}
                    cy={currentY}
                    r={6}
                    fill="#60a5fa"
                    stroke="#1e293b"
                    strokeWidth={1}
                />
            </svg>

            {/* Tooltip */}
            {hoveredPoint && (
                <div
                    className="absolute z-50 bg-slate-800 border border-slate-700 rounded-lg p-3 text-xs shadow-xl pointer-events-none"
                    style={{
                        left: mousePosition.x + 10,
                        top: mousePosition.y - 60,
                    }}
                >
                    <div className="text-slate-300 whitespace-nowrap mb-1">
                        {t("miniPnlCurve.tooltip.currentPrice")}: {hoveredPoint.price.toFixed(2)}
                    </div>
                    <div
                        className={`whitespace-nowrap mb-1 ${
                            hoveredPoint.pnl >= 0
                                ? "text-green-400"
                                : "text-red-400"
                        }`}
                    >
                        {t("miniPnlCurve.tooltip.pnlAtPrice")}:{" "}
                        {hoveredPoint.pnl >= 0 ? "+" : ""}{hoveredPoint.pnl.toFixed(0)}
                    </div>
                    <div className="text-slate-400 whitespace-nowrap mb-2">
                        {t("miniPnlCurve.tooltip.phase")}:{" "}
                        {t(`miniPnlCurve.phases.${hoveredPoint.phase}`)}
                    </div>
                    <div className="border-t border-slate-600 pt-2 space-y-1">
                        <div className="flex items-center gap-2 text-slate-300 whitespace-nowrap">
                            {baseToken.logoUrl ? (
                                <img
                                    src={baseToken.logoUrl}
                                    alt={baseToken.symbol}
                                    className="w-4 h-4 rounded-full"
                                />
                            ) : (
                                <div className="w-4 h-4 rounded-full bg-slate-600 flex items-center justify-center text-xs">
                                    {baseToken.symbol.charAt(0)}
                                </div>
                            )}
                            <span>{baseToken.symbol}: {hoveredPoint.baseTokenAmount.toFixed(4)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-300 whitespace-nowrap">
                            {quoteToken.logoUrl ? (
                                <img
                                    src={quoteToken.logoUrl}
                                    alt={quoteToken.symbol}
                                    className="w-4 h-4 rounded-full"
                                />
                            ) : (
                                <div className="w-4 h-4 rounded-full bg-slate-600 flex items-center justify-center text-xs">
                                    {quoteToken.symbol.charAt(0)}
                                </div>
                            )}
                            <span>{quoteToken.symbol}: {hoveredPoint.quoteTokenAmount.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
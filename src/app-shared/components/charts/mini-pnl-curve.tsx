"use client";

import { useState, memo, useMemo } from "react";
import type { BasicPosition } from "@/types/positions";
import type { PnlBreakdown } from "@/types/pnl";
import { useTranslations } from "@/app-shared/i18n/client";
import { generatePnLCurve } from "@/lib/utils/uniswap-v3/position";
import { tickToPrice } from "@/lib/utils/uniswap-v3/price";

interface MiniPnLCurveProps {
    position: BasicPosition;
    pnlBreakdown: PnlBreakdown | null;
    width?: number;
    height?: number;
    className?: string;
    showTooltip?: boolean;
    markerPrice?: number; // Optional price to position the marker at (for "what if" scenarios)
}

export interface CurvePoint {
    price: number;
    pnl: number;
    phase: "below" | "in-range" | "above";
}

export interface CurveData {
    points: CurvePoint[];
    priceRange: { min: number; max: number };
    pnlRange: { min: number; max: number };
    currentPriceIndex: number;
    rangeIndices: { lower: number; upper: number };
    lowerPrice: number;
    upperPrice: number;
    currentPrice: number;
}

function MiniPnLCurveComponent({
    position,
    pnlBreakdown,
    width = 120,
    height = 60,
    className = "",
    showTooltip = false,
    markerPrice,
}: MiniPnLCurveProps) {
    const t = useTranslations();
    const [hoveredPoint, setHoveredPoint] = useState<CurvePoint | null>(null);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

    // Generate curve data locally using cost basis from PnL breakdown
    const curveData = useMemo(() => {
        // Client-side validation
        const isValidForCurve = Boolean(
            position.liquidity &&
            position.liquidity !== "0" &&
            position.tickLower < position.tickUpper &&
            position.pool &&
            position.pool.token0 &&
            position.pool.token1
        );

        if (!isValidForCurve || !pnlBreakdown) {
            return null;
        }

        try {
            // Extract cost basis from PnL breakdown
            const costBasis = BigInt(pnlBreakdown.currentCostBasis);

            // Determine base/quote tokens
            const baseIsToken0 = !position.token0IsQuote;
            const baseToken = baseIsToken0 ? position.pool.token0 : position.pool.token1;
            const quoteToken = baseIsToken0 ? position.pool.token1 : position.pool.token0;

            // Calculate price range (±50% buffer around position range)
            const currentPrice = BigInt(position.pool.currentPrice || '0');
            const lowerPrice = tickToPrice(position.tickLower, baseToken.address, quoteToken.address, baseToken.decimals);
            const upperPrice = tickToPrice(position.tickUpper, baseToken.address, quoteToken.address, baseToken.decimals);
            const rangeWidth = upperPrice - lowerPrice;
            const buffer = rangeWidth / 2n;
            const minPrice = lowerPrice > buffer ? lowerPrice - buffer : lowerPrice / 2n;
            const maxPrice = upperPrice + buffer;

            // Generate curve with cost basis as baseline
            const pnlPoints = generatePnLCurve(
                BigInt(position.liquidity),
                position.tickLower,
                position.tickUpper,
                costBasis, // Use current cost basis from accounting
                baseToken.address,
                quoteToken.address,
                baseToken.decimals,
                position.pool.tickSpacing,
                { min: minPrice, max: maxPrice },
                100
            );

            // Transform to display format
            const points: CurvePoint[] = pnlPoints.map(point => ({
                price: Number(point.price) / Number(10n ** BigInt(quoteToken.decimals)),
                pnl: Number(point.pnl) / Number(10n ** BigInt(quoteToken.decimals)),
                phase: point.phase
            }));

            // Find indices for metadata
            const currentPriceNumber = Number(currentPrice) / Number(10n ** BigInt(quoteToken.decimals));

            // Use markerPrice if provided, otherwise use current pool price
            const priceForMarker = markerPrice !== undefined ? markerPrice : currentPriceNumber;

            // Find the closest point to the marker price
            let currentPriceIndex = 0;
            let minDistance = Infinity;
            points.forEach((point, i) => {
                const distance = Math.abs(point.price - priceForMarker);
                if (distance < minDistance) {
                    minDistance = distance;
                    currentPriceIndex = i;
                }
            });

            const lowerPriceNumber = Number(lowerPrice) / Number(10n ** BigInt(quoteToken.decimals));
            const lowerIndex = points.findIndex((_, i) => points[i].price >= lowerPriceNumber);

            const upperPriceNumber = Number(upperPrice) / Number(10n ** BigInt(quoteToken.decimals));
            const upperIndex = points.findIndex((_, i) => points[i].price >= upperPriceNumber);

            const allPrices = points.map(p => p.price);
            const allPnls = points.map(p => p.pnl);

            return {
                points,
                priceRange: {
                    min: Math.min(...allPrices),
                    max: Math.max(...allPrices)
                },
                pnlRange: {
                    min: Math.min(...allPnls),
                    max: Math.max(...allPnls)
                },
                currentPriceIndex,
                rangeIndices: {
                    lower: Math.max(0, lowerIndex),
                    upper: Math.min(points.length - 1, upperIndex)
                },
                lowerPrice: lowerPriceNumber,
                upperPrice: upperPriceNumber,
                currentPrice: currentPriceNumber
            };

        } catch (error) {
            console.error("Error generating PnL curve:", error);
            return null;
        }
    }, [position, pnlBreakdown, markerPrice]);

    // Show loading/N/A state when no curve data available
    if (!curveData) {
        return (
            <div
                className={`flex items-center justify-center bg-slate-800/30 rounded ${className}`}
                style={{ width, height }}
                title={!pnlBreakdown ? "Loading PnL data..." : "Curve not available for this position"}
            >
                <span className="text-xs text-slate-500">{!pnlBreakdown ? "Loading..." : "N/A"}</span>
            </div>
        );
    }

    const { points, priceRange, pnlRange, currentPriceIndex } = curveData;

    // Validate curve data
    if (!points || points.length === 0) {
        return (
            <div
                className={`flex items-center justify-center bg-slate-800/30 rounded ${className}`}
                style={{ width, height }}
                title="No curve points available"
            >
                <span className="text-xs text-slate-500">No Data</span>
            </div>
        );
    }

    // SVG coordinate conversion with NaN guards
    const xScale = (price: number) => {
        const range = priceRange.max - priceRange.min;
        if (range === 0) return width / 2; // Center if no price range
        return ((price - priceRange.min) / range) * width;
    };

    const yScale = (pnl: number) => {
        const range = pnlRange.max - pnlRange.min;
        if (range === 0) return height / 2; // Center if no PnL range
        return height - ((pnl - pnlRange.min) / range) * height;
    };

    // Generate curve path
    const pathData = points
        .map((point, i) => {
            const x = xScale(point.price);
            const y = yScale(point.pnl);
            return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
        })
        .join(" ");

    // Zone boundaries
    const lowerBoundaryX = xScale(curveData.lowerPrice);
    const upperBoundaryX = xScale(curveData.upperPrice);
    const zeroLineY = yScale(0);

    // Current position
    const currentPoint = points[currentPriceIndex];
    const currentX = xScale(currentPoint.price);
    const currentY = yScale(currentPoint.pnl);

    const handleMouseMove = (event: React.MouseEvent<SVGElement>) => {
        if (!showTooltip) return;

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
        // Use relative coordinates for absolute positioning within the container
        setMousePosition({ x: mouseX, y: mouseY });
    };

    return (
        <div className={`relative ${className}`}>
            <svg
                width={width}
                height={height}
                className="overflow-visible"
                onMouseMove={handleMouseMove}
                onMouseLeave={() => setHoveredPoint(null)}
            >
                {/* PnL-based fill areas */}
                <defs>
                    {/* Clip path for positive PnL area */}
                    <clipPath id={`positivePnLClip-${position.chain}-${position.protocol}-${position.nftId}`}>
                        <rect x="0" y="0" width={width} height={Math.max(0, Math.min(height, zeroLineY))} />
                    </clipPath>
                    {/* Clip path for negative PnL area */}
                    <clipPath id={`negativePnLClip-${position.chain}-${position.protocol}-${position.nftId}`}>
                        <rect x="0" y={Math.max(0, Math.min(height, zeroLineY))} width={width} height={height - Math.max(0, Math.min(height, zeroLineY))} />
                    </clipPath>
                </defs>

                {/* Positive PnL area (green fill above zero line) */}
                {(() => {
                    // Calculate effective fill boundary (clamp zero line to chart bounds)
                    const effectiveZeroY = Math.max(0, Math.min(height, zeroLineY));

                    // Determine if we should show positive fill
                    const shouldShowPositiveFill = zeroLineY > 0 || // Zero line below chart (some positive area)
                                                 (zeroLineY <= 0 && pnlRange.min >= 0); // Zero line above chart and all values positive

                    return shouldShowPositiveFill && (
                        <path
                            d={`${pathData} L ${width} ${effectiveZeroY} L 0 ${effectiveZeroY} Z`}
                            fill="rgba(34, 197, 94, 0.3)"
                            clipPath={`url(#positivePnLClip-${position.chain}-${position.protocol}-${position.nftId})`}
                        />
                    );
                })()}

                {/* Negative PnL area (red fill below zero line) */}
                {(() => {
                    // Calculate effective fill boundary (clamp zero line to chart bounds)
                    const effectiveZeroY = Math.max(0, Math.min(height, zeroLineY));

                    // Determine if we should show negative fill
                    const shouldShowNegativeFill = zeroLineY < height || // Zero line above chart (some negative area)
                                                 (zeroLineY >= height && pnlRange.max <= 0); // Zero line below chart and all values negative

                    return shouldShowNegativeFill && (
                        <path
                            d={`${pathData} L ${width} ${effectiveZeroY} L 0 ${effectiveZeroY} Z`}
                            fill="rgba(239, 68, 68, 0.3)"
                            clipPath={`url(#negativePnLClip-${position.chain}-${position.protocol}-${position.nftId})`}
                        />
                    );
                })()}

                {/* Zero line (solid) */}
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

                {/* Range boundary lines - drawn after curve to ensure visibility */}
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

                {/* Invisible hover area */}
                {showTooltip && (
                    <rect
                        x={0}
                        y={0}
                        width={width}
                        height={height}
                        fill="transparent"
                        style={{ cursor: "crosshair" }}
                    />
                )}
            </svg>

            {/* Tooltip */}
            {showTooltip && hoveredPoint && (
                <div
                    className="absolute z-50 bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs shadow-xl pointer-events-none"
                    style={{
                        left: mousePosition.x + 10,
                        top: mousePosition.y - 40,
                    }}
                >
                    <div className="text-slate-300 whitespace-nowrap">
                        {t("miniPnlCurve.tooltip.currentPrice")}: {hoveredPoint.price.toFixed(2)}
                    </div>
                    <div
                        className={`whitespace-nowrap ${
                            hoveredPoint.pnl >= 0
                                ? "text-green-400"
                                : "text-red-400"
                        }`}
                    >
                        {t("miniPnlCurve.tooltip.pnlAtPrice")}:{" "}
                        {hoveredPoint.pnl >= 0 ? "+" : ""}{hoveredPoint.pnl.toFixed(0)}
                    </div>
                    <div className="text-slate-400 whitespace-nowrap">
                        {t("miniPnlCurve.tooltip.phase")}:{" "}
                        {t(`miniPnlCurve.phases.${hoveredPoint.phase}`)}
                    </div>
                </div>
            )}
        </div>
    );
}

// Custom comparison function for React.memo
function arePropsEqual(
    prevProps: MiniPnLCurveProps,
    nextProps: MiniPnLCurveProps
): boolean {
    // Primary optimization: compare position ID
    if (prevProps.position.chain !== nextProps.position.chain ||
        prevProps.position.protocol !== nextProps.position.protocol ||
        prevProps.position.nftId !== nextProps.position.nftId) return false;

    // Check other props
    if (prevProps.width !== nextProps.width) return false;
    if (prevProps.height !== nextProps.height) return false;
    if (prevProps.className !== nextProps.className) return false;
    if (prevProps.showTooltip !== nextProps.showTooltip) return false;
    if (prevProps.markerPrice !== nextProps.markerPrice) return false; // Check marker price changes

    // CRITICAL: Check PnL breakdown changes (affects cost basis and curve)
    if (prevProps.pnlBreakdown !== nextProps.pnlBreakdown) {
        // If both are null, consider equal
        if (prevProps.pnlBreakdown === null && nextProps.pnlBreakdown === null) {
            // Continue checking other fields
        } else if (prevProps.pnlBreakdown && nextProps.pnlBreakdown) {
            // Compare cost basis which is key for curve generation
            if (prevProps.pnlBreakdown.currentCostBasis !== nextProps.pnlBreakdown.currentCostBasis) {
                return false;
            }
        } else {
            // One is null, one is not - not equal
            return false;
        }
    }

    // Check key position fields that affect curve shape
    if (prevProps.position.liquidity !== nextProps.position.liquidity)
        return false;
    if (prevProps.position.tickLower !== nextProps.position.tickLower)
        return false;
    if (prevProps.position.tickUpper !== nextProps.position.tickUpper)
        return false;
    if (prevProps.position.pool.currentPrice !== nextProps.position.pool.currentPrice)
        return false;

    return true;
}

// Export memoized component
export const MiniPnLCurve = memo(MiniPnLCurveComponent, arePropsEqual);

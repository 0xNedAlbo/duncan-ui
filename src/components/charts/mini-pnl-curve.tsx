"use client";

import { useState, memo } from "react";
import type { BasicPosition } from "@/services/positions/positionService";
import { usePositionCurve } from "@/hooks/api/usePositionCurve";
import { useTranslations } from "@/i18n/client";

interface MiniPnLCurveProps {
    position: BasicPosition;
    width?: number;
    height?: number;
    className?: string;
    showTooltip?: boolean;
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
    width = 120,
    height = 60,
    className = "",
    showTooltip = false,
}: MiniPnLCurveProps) {
    const t = useTranslations();
    const [hoveredPoint, setHoveredPoint] = useState<CurvePoint | null>(null);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

    // Extract chain and nftId from position for API call
    const chain = position.chain;
    const nftId = position.nftId;

    // Fetch curve data from API with caching
    const {
        data: curveData,
        isLoading,
        error,
        isError
    } = usePositionCurve(chain, nftId, {
        // Only fetch if we have the required identifiers
        enabled: Boolean(chain && nftId)
    });

    // Handle error state
    if (isError && error) {
        console.warn("Failed to fetch curve data:", error);
    }

    // Show loading state
    if (isLoading) {
        return (
            <div
                className={`flex items-center justify-center bg-slate-800/30 rounded ${className}`}
                style={{ width, height }}
                title="Loading curve data..."
            >
                <span className="text-xs text-slate-500">Loading...</span>
            </div>
        );
    }

    // Show error or no data state
    if (!curveData || isError) {
        return (
            <div
                className={`flex items-center justify-center bg-slate-800/30 rounded ${className}`}
                style={{ width, height }}
                title={isError ? "Error loading curve data" : t("miniPnlCurve.error")}
            >
                <span className="text-xs text-slate-500">N/A</span>
            </div>
        );
    }

    const { points, priceRange, pnlRange, currentPriceIndex } =
        curveData;

    // SVG coordinate conversion
    const xScale = (price: number) =>
        ((price - priceRange.min) / (priceRange.max - priceRange.min)) * width;
    const yScale = (pnl: number) =>
        height -
        ((pnl - pnlRange.min) / (pnlRange.max - pnlRange.min)) * height;

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
                    <clipPath id={`positivePnLClip-${position.id}`}>
                        <rect x="0" y="0" width={width} height={zeroLineY} />
                    </clipPath>
                    {/* Clip path for negative PnL area */}
                    <clipPath id={`negativePnLClip-${position.id}`}>
                        <rect x="0" y={zeroLineY} width={width} height={height - zeroLineY} />
                    </clipPath>
                </defs>

                {/* Positive PnL area (green fill above zero line) */}
                {zeroLineY >= 0 && zeroLineY <= height && (
                    <path
                        d={`${pathData} L ${width} ${zeroLineY} L 0 ${zeroLineY} Z`}
                        fill="rgba(34, 197, 94, 0.3)"
                        clipPath={`url(#positivePnLClip-${position.id})`}
                    />
                )}

                {/* Negative PnL area (red fill below zero line) */}
                {zeroLineY >= 0 && zeroLineY <= height && (
                    <path
                        d={`${pathData} L ${width} ${zeroLineY} L 0 ${zeroLineY} Z`}
                        fill="rgba(239, 68, 68, 0.3)"
                        clipPath={`url(#negativePnLClip-${position.id})`}
                    />
                )}

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

                {/* Range boundary lines */}
                <line
                    x1={lowerBoundaryX}
                    y1={0}
                    x2={lowerBoundaryX}
                    y2={height}
                    stroke="#06b6d4"
                    strokeWidth={1.5}
                    opacity={0.7}
                />
                <line
                    x1={upperBoundaryX}
                    y1={0}
                    x2={upperBoundaryX}
                    y2={height}
                    stroke="#06b6d4"
                    strokeWidth={1.5}
                    opacity={0.7}
                />

                {/* PnL curve */}
                <path
                    d={pathData}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />

                {/* Current position marker */}
                <circle
                    cx={currentX}
                    cy={currentY}
                    r={3}
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
                    <div className="text-slate-300">
                        {t("miniPnlCurve.tooltip.currentPrice")}: $
                        {hoveredPoint.price.toFixed(2)}
                    </div>
                    <div
                        className={
                            hoveredPoint.pnl >= 0
                                ? "text-green-400"
                                : "text-red-400"
                        }
                    >
                        {t("miniPnlCurve.tooltip.pnlAtPrice")}:{" "}
                        {hoveredPoint.pnl >= 0 ? "+" : ""}$
                        {hoveredPoint.pnl.toFixed(0)}
                    </div>
                    <div className="text-slate-400">
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
    // Primary optimization: compare position ID and current price
    if (prevProps.position.id !== nextProps.position.id) return false;
    if (
        prevProps.position.pool.currentPrice !==
        nextProps.position.pool.currentPrice
    )
        return false;

    // Check other props
    if (prevProps.width !== nextProps.width) return false;
    if (prevProps.height !== nextProps.height) return false;
    if (prevProps.className !== nextProps.className) return false;
    if (prevProps.showTooltip !== nextProps.showTooltip) return false;

    // For performance, only check key position fields that affect curve shape
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

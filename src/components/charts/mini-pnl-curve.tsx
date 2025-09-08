"use client";

import { useMemo, useState, memo } from "react";
import type { PositionWithPnL } from "@/services/positions/positionService";
import { curveDataService } from "@/services/positions/curveDataService";
import { curveCache } from "@/lib/utils/curve-cache";
import { useTranslations } from "@/i18n/client";

interface MiniPnLCurveProps {
    position: PositionWithPnL;
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

    const curveData = useMemo(() => {
        try {
            // Validate position data first
            if (!curveDataService.validatePosition(position)) {
                console.warn("Invalid position data for curve generation");
                return null;
            }

            const currentPrice = position.pool.currentPrice || "0";

            // Try cache first (if available)
            if (curveCache.isAvailable()) {
                const cached = curveCache.get(position.id, currentPrice);
                if (cached) {
                    return cached;
                }
            }

            // Generate new curve data
            const newCurveData = curveDataService.generateCurveData(position);

            // Cache the result (if available)
            if (curveCache.isAvailable()) {
                curveCache.set(position.id, currentPrice, newCurveData);
            }

            return newCurveData;
        } catch (error) {
            console.warn("Failed to generate curve data:", error);
            return null;
        }
    }, [position, position.pool.currentPrice]);

    if (!curveData) {
        // Fallback UI
        return (
            <div
                className={`flex items-center justify-center bg-slate-800/30 rounded ${className}`}
                style={{ width, height }}
                title={t("miniPnlCurve.error")}
            >
                <span className="text-xs text-slate-500">N/A</span>
            </div>
        );
    }

    const { points, priceRange, pnlRange, currentPriceIndex, rangeIndices } =
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
        setMousePosition({ x: event.clientX, y: event.clientY });
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
                {/* Background zones */}
                <defs>
                    <linearGradient
                        id="lossZone"
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="0%"
                    >
                        <stop offset="0%" stopColor="rgba(239, 68, 68, 0.1)" />
                        <stop
                            offset="100%"
                            stopColor="rgba(239, 68, 68, 0.05)"
                        />
                    </linearGradient>
                    <linearGradient
                        id="profitZone"
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="0%"
                    >
                        <stop offset="0%" stopColor="rgba(34, 197, 94, 0.05)" />
                        <stop
                            offset="100%"
                            stopColor="rgba(34, 197, 94, 0.1)"
                        />
                    </linearGradient>
                    <linearGradient
                        id="plateauZone"
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="0%"
                    >
                        <stop
                            offset="0%"
                            stopColor="rgba(245, 158, 11, 0.05)"
                        />
                        <stop
                            offset="100%"
                            stopColor="rgba(245, 158, 11, 0.1)"
                        />
                    </linearGradient>
                </defs>

                {/* Zone backgrounds */}
                {lowerBoundaryX > 0 && (
                    <rect
                        x={0}
                        y={0}
                        width={lowerBoundaryX}
                        height={height}
                        fill="url(#lossZone)"
                    />
                )}

                <rect
                    x={lowerBoundaryX}
                    y={0}
                    width={upperBoundaryX - lowerBoundaryX}
                    height={height}
                    fill="url(#profitZone)"
                />

                {upperBoundaryX < width && (
                    <rect
                        x={upperBoundaryX}
                        y={0}
                        width={width - upperBoundaryX}
                        height={height}
                        fill="url(#plateauZone)"
                    />
                )}

                {/* Zero line */}
                {zeroLineY >= 0 && zeroLineY <= height && (
                    <line
                        x1={0}
                        y1={zeroLineY}
                        x2={width}
                        y2={zeroLineY}
                        stroke="#64748b"
                        strokeWidth={1}
                        strokeDasharray="2 2"
                        opacity={0.6}
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
                    className="fixed z-50 bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs shadow-xl pointer-events-none"
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
    if (prevProps.position.initialValue !== nextProps.position.initialValue)
        return false;

    return true;
}

// Export memoized component
export const MiniPnLCurve = memo(MiniPnLCurveComponent, arePropsEqual);

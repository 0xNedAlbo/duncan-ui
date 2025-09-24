"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { generatePnLCurve, calculatePositionValueAtPrice } from "@/lib/utils/uniswap-v3/position";
import { priceToTick } from "@/lib/utils/uniswap-v3/price";
import { getTokenAmountsFromLiquidity } from "@/lib/utils/uniswap-v3/liquidity";
import { normalizeAddress } from "@/lib/utils/evm";
import { formatCompactValue } from "@/lib/utils/fraction-format";
import type { PoolWithTokens } from "@/services/pools/poolService";
import type { InteractiveCurveData, ViewportState } from "../positions/wizard/types";

interface InteractivePnLCurveProps {
    pool: PoolWithTokens;
    totalQuoteValue: bigint; // Total investment in quote token units
    lowerPrice: bigint;
    upperPrice: bigint;
    currentPrice: bigint;
    onRangeChange: (lowerPrice: bigint, upperPrice: bigint) => void;
    width?: number;
    height?: number;
    className?: string;
}

const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 400;
const ZOOM_SENSITIVITY = 0.1;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 10;

export function InteractivePnLCurve({
    pool,
    totalQuoteValue,
    lowerPrice,
    upperPrice,
    currentPrice,
    onRangeChange,
    width = DEFAULT_WIDTH,
    height = DEFAULT_HEIGHT,
    className = "",
}: InteractivePnLCurveProps) {
    const svgRef = useRef<SVGSVGElement>(null);
    const [viewport, setViewport] = useState<ViewportState>({
        zoom: 1,
        panX: 0,
        panY: 0,
        isDragging: false,
        dragStart: null,
    });
    const [draggingBorder, setDraggingBorder] = useState<"lower" | "upper" | null>(null);

    // Determine base/quote token roles and decimals
    const baseTokenAddress = normalizeAddress(pool.token0.address);
    const quoteTokenAddress = normalizeAddress(pool.token1.address);
    const baseIsToken0 = BigInt(baseTokenAddress) < BigInt(quoteTokenAddress);
    const baseToken = baseIsToken0 ? pool.token0 : pool.token1;
    const quoteToken = baseIsToken0 ? pool.token1 : pool.token0;
    const baseTokenDecimals = baseToken.decimals;
    const tickSpacing = pool.tickSpacing;

    // Calculate price range for curve generation (wider than visible range)
    const priceRangeMultiplier = 3n; // Show 3x wider range than current bounds
    const priceDelta = ((upperPrice - lowerPrice) * priceRangeMultiplier) / 2n;
    const minPrice = lowerPrice - priceDelta > 0n ? lowerPrice - priceDelta : lowerPrice / 2n;
    const maxPrice = upperPrice + priceDelta;

    // Calculate liquidity from total quote value and current range
    const liquidityAmount = useMemo(() => {
        if (totalQuoteValue === 0n) return 0n;

        try {
            const currentTick = priceToTick(currentPrice, tickSpacing, baseTokenAddress, quoteTokenAddress, baseTokenDecimals);
            const lowerTick = priceToTick(lowerPrice, tickSpacing, baseTokenAddress, quoteTokenAddress, baseTokenDecimals);
            const upperTick = priceToTick(upperPrice, tickSpacing, baseTokenAddress, quoteTokenAddress, baseTokenDecimals);

            // Get token amounts for current range
            const { token0Amount, token1Amount } = getTokenAmountsFromLiquidity(
                100000n, // Use a base liquidity amount for ratio calculation
                currentTick,
                lowerTick,
                upperTick
            );

            // Calculate the total value of this base liquidity
            const baseValue = baseIsToken0 ?
                (token0Amount * currentPrice) / (10n ** BigInt(baseTokenDecimals)) + token1Amount :
                token0Amount + (token1Amount * currentPrice) / (10n ** BigInt(baseTokenDecimals));

            if (baseValue === 0n) return 0n;

            // Scale liquidity to match target quote value
            return (100000n * totalQuoteValue) / baseValue;
        } catch (error) {
            console.warn("Error calculating liquidity:", error);
            return 0n;
        }
    }, [totalQuoteValue, lowerPrice, upperPrice, currentPrice, tickSpacing, baseTokenAddress, quoteTokenAddress, baseTokenDecimals, baseIsToken0]);

    // Generate curve data
    const curveData = useMemo((): InteractiveCurveData | null => {
        if (liquidityAmount === 0n) return null;

        try {
            const lowerTick = priceToTick(lowerPrice, tickSpacing, baseTokenAddress, quoteTokenAddress, baseTokenDecimals);
            const upperTick = priceToTick(upperPrice, tickSpacing, baseTokenAddress, quoteTokenAddress, baseTokenDecimals);

            // Calculate initial position value
            const initialValue = calculatePositionValueAtPrice(
                liquidityAmount,
                lowerTick,
                upperTick,
                currentPrice,
                baseTokenAddress,
                quoteTokenAddress,
                baseTokenDecimals,
                tickSpacing
            );

            const points = generatePnLCurve(
                liquidityAmount,
                lowerTick,
                upperTick,
                initialValue,
                baseTokenAddress,
                quoteTokenAddress,
                baseTokenDecimals,
                tickSpacing,
                { min: minPrice, max: maxPrice },
                200 // More points for smooth curve
            );

            // Find indices for current price and range boundaries
            const currentPriceIndex = points.findIndex(p => p.price >= currentPrice);
            const lowerIndex = points.findIndex(p => p.price >= lowerPrice);
            const upperIndex = points.findIndex(p => p.price >= upperPrice);

            // Calculate PnL range
            const pnlValues = points.map(p => p.pnlPercent);
            const pnlRange = {
                min: Math.min(...pnlValues),
                max: Math.max(...pnlValues)
            };

            return {
                points,
                priceRange: { min: minPrice, max: maxPrice },
                pnlRange,
                currentPriceIndex: Math.max(0, currentPriceIndex),
                rangeIndices: {
                    lower: Math.max(0, lowerIndex),
                    upper: Math.min(points.length - 1, upperIndex)
                },
                lowerPrice,
                upperPrice,
                currentPrice,
            };
        } catch (error) {
            console.warn("Error generating curve data:", error);
            return null;
        }
    }, [liquidityAmount, lowerPrice, upperPrice, currentPrice, minPrice, maxPrice, tickSpacing, baseTokenAddress, quoteTokenAddress, baseTokenDecimals]);

    // Coordinate transformations
    const xScale = useCallback((price: bigint) => {
        if (!curveData) return 0;
        const normalized = Number((price - curveData.priceRange.min) * 1000n / (curveData.priceRange.max - curveData.priceRange.min)) / 1000;
        return (normalized * width * viewport.zoom) + viewport.panX;
    }, [curveData, width, viewport]);

    const yScale = useCallback((pnl: number) => {
        if (!curveData) return height / 2;
        const normalized = (pnl - curveData.pnlRange.min) / (curveData.pnlRange.max - curveData.pnlRange.min);
        return height - (normalized * height * viewport.zoom) - viewport.panY;
    }, [curveData, height, viewport]);

    const priceFromX = useCallback((x: number): bigint => {
        if (!curveData) return 0n;
        const adjustedX = (x - viewport.panX) / viewport.zoom;
        const normalized = adjustedX / width;
        return curveData.priceRange.min + BigInt(Math.floor(Number(curveData.priceRange.max - curveData.priceRange.min) * normalized));
    }, [curveData, width, viewport]);

    // Generate curve path
    const pathData = useMemo(() => {
        if (!curveData) return "";

        return curveData.points
            .map((point, i) => {
                const x = xScale(point.price);
                const y = yScale(point.pnlPercent);
                return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
            })
            .join(" ");
    }, [curveData, xScale, yScale]);

    // Handle zoom
    const handleZoom = useCallback((delta: number, clientX?: number, clientY?: number) => {
        setViewport(prev => {
            const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev.zoom + delta));

            if (clientX !== undefined && clientY !== undefined && svgRef.current) {
                const rect = svgRef.current.getBoundingClientRect();
                const x = clientX - rect.left;
                const y = clientY - rect.top;

                // Zoom towards mouse position
                const zoomFactor = newZoom / prev.zoom;
                const newPanX = x - (x - prev.panX) * zoomFactor;
                const newPanY = y - (y - prev.panY) * zoomFactor;

                return {
                    ...prev,
                    zoom: newZoom,
                    panX: newPanX,
                    panY: newPanY,
                };
            }

            return { ...prev, zoom: newZoom };
        });
    }, []);

    // Handle mouse wheel zoom
    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        const delta = -e.deltaY * ZOOM_SENSITIVITY * 0.01;
        handleZoom(delta, e.clientX, e.clientY);
    }, [handleZoom]);

    // Handle pan/drag
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (!svgRef.current) return;

        const rect = svgRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Check if clicking on range border
        const lowerX = xScale(lowerPrice);
        const upperX = xScale(upperPrice);
        const borderTolerance = 10;

        if (Math.abs(x - lowerX) < borderTolerance) {
            setDraggingBorder("lower");
            return;
        }

        if (Math.abs(x - upperX) < borderTolerance) {
            setDraggingBorder("upper");
            return;
        }

        // Start panning
        setViewport(prev => ({
            ...prev,
            isDragging: true,
            dragStart: { x, y },
        }));
    }, [xScale, lowerPrice, upperPrice]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!svgRef.current) return;

        const rect = svgRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;

        if (draggingBorder) {
            const newPrice = priceFromX(x);

            if (draggingBorder === "lower" && newPrice < upperPrice) {
                onRangeChange(newPrice, upperPrice);
            } else if (draggingBorder === "upper" && newPrice > lowerPrice) {
                onRangeChange(lowerPrice, newPrice);
            }
            return;
        }

        if (viewport.isDragging && viewport.dragStart) {
            const deltaX = x - viewport.dragStart.x;
            const deltaY = (e.clientY - rect.top) - viewport.dragStart.y;

            setViewport(prev => ({
                ...prev,
                panX: prev.panX + deltaX,
                panY: prev.panY + deltaY,
                dragStart: { x, y: e.clientY - rect.top },
            }));
        }
    }, [draggingBorder, priceFromX, onRangeChange, lowerPrice, upperPrice, viewport.isDragging, viewport.dragStart]);

    const handleMouseUp = useCallback(() => {
        setDraggingBorder(null);
        setViewport(prev => ({
            ...prev,
            isDragging: false,
            dragStart: null,
        }));
    }, []);

    const resetView = () => {
        setViewport({
            zoom: 1,
            panX: 0,
            panY: 0,
            isDragging: false,
            dragStart: null,
        });
    };

    if (!curveData) {
        return (
            <div className={`flex items-center justify-center bg-slate-800/30 rounded-lg border border-slate-700/50 ${className}`} style={{ width, height }}>
                <div className="text-center">
                    <div className="text-slate-400 mb-2">
                        No curve data available
                    </div>
                    <div className="text-slate-500 text-sm">
                        Enter an investment amount to see the PnL curve
                    </div>
                </div>
            </div>
        );
    }

    const zeroLineY = yScale(0);
    const currentX = xScale(currentPrice);
    const lowerBorderX = xScale(lowerPrice);
    const upperBorderX = xScale(upperPrice);

    return (
        <div className={`relative bg-slate-800/30 rounded-lg border border-slate-700/50 overflow-hidden ${className}`}>
            {/* Controls */}
            <div className="absolute top-3 right-3 z-10 flex gap-2">
                <button
                    onClick={() => handleZoom(ZOOM_SENSITIVITY)}
                    className="p-2 bg-slate-700/80 backdrop-blur-sm border border-slate-600 rounded-lg text-slate-300 hover:text-white hover:bg-slate-600/80 transition-colors"
                    title="Zoom In"
                >
                    <ZoomIn className="w-4 h-4" />
                </button>
                <button
                    onClick={() => handleZoom(-ZOOM_SENSITIVITY)}
                    className="p-2 bg-slate-700/80 backdrop-blur-sm border border-slate-600 rounded-lg text-slate-300 hover:text-white hover:bg-slate-600/80 transition-colors"
                    title="Zoom Out"
                >
                    <ZoomOut className="w-4 h-4" />
                </button>
                <button
                    onClick={resetView}
                    className="p-2 bg-slate-700/80 backdrop-blur-sm border border-slate-600 rounded-lg text-slate-300 hover:text-white hover:bg-slate-600/80 transition-colors"
                    title="Reset View"
                >
                    <RotateCcw className="w-4 h-4" />
                </button>
            </div>

            {/* Chart */}
            <svg
                ref={svgRef}
                width={width}
                height={height}
                className="cursor-grab active:cursor-grabbing"
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                style={{ userSelect: "none" }}
            >
                <defs>
                    {/* Clip paths for PnL areas */}
                    <clipPath id="positivePnLClip">
                        <rect x="0" y="0" width={width} height={Math.max(0, Math.min(height, zeroLineY))} />
                    </clipPath>
                    <clipPath id="negativePnLClip">
                        <rect x="0" y={Math.max(0, Math.min(height, zeroLineY))} width={width} height={height - Math.max(0, Math.min(height, zeroLineY))} />
                    </clipPath>
                </defs>

                {/* Positive PnL area (green) */}
                {zeroLineY > 0 && (
                    <path
                        d={`${pathData} L ${width} ${Math.max(0, Math.min(height, zeroLineY))} L 0 ${Math.max(0, Math.min(height, zeroLineY))} Z`}
                        fill="rgba(34, 197, 94, 0.3)"
                        clipPath="url(#positivePnLClip)"
                    />
                )}

                {/* Negative PnL area (red) */}
                {zeroLineY < height && (
                    <path
                        d={`${pathData} L ${width} ${Math.max(0, Math.min(height, zeroLineY))} L 0 ${Math.max(0, Math.min(height, zeroLineY))} Z`}
                        fill="rgba(239, 68, 68, 0.3)"
                        clipPath="url(#negativePnLClip)"
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
                        strokeWidth={2}
                        opacity={0.8}
                    />
                )}

                {/* PnL curve */}
                <path
                    d={pathData}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />

                {/* Range boundary lines */}
                <line
                    x1={lowerBorderX}
                    y1={0}
                    x2={lowerBorderX}
                    y2={height}
                    stroke="#06b6d4"
                    strokeWidth={2}
                    opacity={0.9}
                    strokeDasharray="5,5"
                    className="cursor-ew-resize"
                />
                <line
                    x1={upperBorderX}
                    y1={0}
                    x2={upperBorderX}
                    y2={height}
                    stroke="#06b6d4"
                    strokeWidth={2}
                    opacity={0.9}
                    strokeDasharray="5,5"
                    className="cursor-ew-resize"
                />

                {/* Current price line */}
                <line
                    x1={currentX}
                    y1={0}
                    x2={currentX}
                    y2={height}
                    stroke="#fbbf24"
                    strokeWidth={2}
                    opacity={0.9}
                />

                {/* Range border handles */}
                <circle
                    cx={lowerBorderX}
                    cy={height / 2}
                    r={6}
                    fill="#06b6d4"
                    stroke="#1e293b"
                    strokeWidth={2}
                    className="cursor-ew-resize"
                />
                <circle
                    cx={upperBorderX}
                    cy={height / 2}
                    r={6}
                    fill="#06b6d4"
                    stroke="#1e293b"
                    strokeWidth={2}
                    className="cursor-ew-resize"
                />

                {/* Current price marker */}
                <circle
                    cx={currentX}
                    cy={yScale(curveData.points[curveData.currentPriceIndex]?.pnlPercent || 0)}
                    r={4}
                    fill="#fbbf24"
                    stroke="#1e293b"
                    strokeWidth={2}
                />
            </svg>

            {/* Price labels */}
            <div className="absolute bottom-3 left-3 right-3 flex justify-between text-xs text-slate-400 pointer-events-none">
                <div>
                    Lower: {formatCompactValue(lowerPrice, quoteToken.decimals)}
                </div>
                <div>
                    Current: {formatCompactValue(currentPrice, quoteToken.decimals)}
                </div>
                <div>
                    Upper: {formatCompactValue(upperPrice, quoteToken.decimals)}
                </div>
            </div>
        </div>
    );
}
"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { generatePnLCurve, calculatePositionValueAtPrice } from "@/lib/utils/uniswap-v3/position";
import { priceToTick } from "@/lib/utils/uniswap-v3/price";
import { getTokenAmountsFromLiquidity } from "@/lib/utils/uniswap-v3/liquidity";
import { normalizeAddress } from "@/lib/utils/evm";
import { formatCompactValue } from "@/lib/utils/fraction-format";
import type { PoolWithTokens } from "@/services/pools/poolService";
import type {
    InteractiveRangeData,
    InteractionState
} from "@/lib/utils/uniswap-v3/types";

interface InteractiveRangeSelectorProps {
    pool: PoolWithTokens;
    totalQuoteValue: bigint;
    lowerPrice: bigint;
    upperPrice: bigint;
    currentPrice: bigint;
    onRangeChange: (lowerPrice: bigint, upperPrice: bigint) => void;
    width?: number;
    height?: number;
    className?: string;
}

const DEFAULT_WIDTH = 600;
const DEFAULT_HEIGHT = 400;
const ZOOM_SENSITIVITY = 0.1;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 10;
const MARKER_TOLERANCE = 15;
const CURSOR_RADIUS = 6;
const MARKER_RADIUS = 8;

export function InteractiveRangeSelector({
    pool,
    totalQuoteValue,
    lowerPrice,
    upperPrice,
    currentPrice,
    onRangeChange,
    width = DEFAULT_WIDTH,
    height = DEFAULT_HEIGHT,
    className = "",
}: InteractiveRangeSelectorProps) {
    // Set default range if invalid prices provided (fallback safety)
    const safeCurrentPrice = currentPrice || 1n;
    const safeLowerPrice = lowerPrice && lowerPrice > 0n ? lowerPrice : safeCurrentPrice * 8n / 10n; // -20%
    const safeUpperPrice = upperPrice && upperPrice > 0n ? upperPrice : safeCurrentPrice * 12n / 10n; // +20%
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameRef = useRef<number>(0);

    // Determine base/quote token roles and decimals
    const baseTokenAddress = normalizeAddress(pool.token0.address);
    const quoteTokenAddress = normalizeAddress(pool.token1.address);
    const baseIsToken0 = BigInt(baseTokenAddress) < BigInt(quoteTokenAddress);
    const baseToken = baseIsToken0 ? pool.token0 : pool.token1;
    const quoteToken = baseIsToken0 ? pool.token1 : pool.token0;
    const baseTokenDecimals = baseToken.decimals;
    const tickSpacing = pool.tickSpacing;

    // Interaction state
    const [interaction, setInteraction] = useState<InteractionState>({
        viewport: {
            zoom: 1,
            panX: 0,
            panY: 0,
            isDragging: false,
            dragStart: null,
        },
        cursor: {
            x: 0,
            y: 0,
            price: 0n,
            pnl: 0n,
            pnlPercent: 0,
            isVisible: false,
        },
        markers: {
            lower: {
                position: "lower",
                isDragging: false,
                x: 0,
                price: safeLowerPrice,
            },
            upper: {
                position: "upper",
                isDragging: false,
                x: 0,
                price: safeUpperPrice,
            },
        },
        activeMarker: null,
        localDragState: {
            lowerPrice: null,
            upperPrice: null,
        },
    });

    // Calculate price range for curve generation (wider than visible range)
    const priceRangeMultiplier = 3n;
    const priceDelta = ((safeUpperPrice - safeLowerPrice) * priceRangeMultiplier) / 2n;
    const minPrice = safeLowerPrice - priceDelta > 0n ? safeLowerPrice - priceDelta : safeLowerPrice / 2n;
    const maxPrice = safeUpperPrice + priceDelta;

    // Calculate liquidity from total quote value and current range
    const liquidityAmount = useMemo(() => {
        if (totalQuoteValue === 0n) return 0n;

        try {
            const currentTick = priceToTick(safeCurrentPrice, tickSpacing, baseTokenAddress, quoteTokenAddress, baseTokenDecimals);
            const lowerTick = priceToTick(safeLowerPrice, tickSpacing, baseTokenAddress, quoteTokenAddress, baseTokenDecimals);
            const upperTick = priceToTick(safeUpperPrice, tickSpacing, baseTokenAddress, quoteTokenAddress, baseTokenDecimals);

            const { token0Amount, token1Amount } = getTokenAmountsFromLiquidity(
                100000n,
                currentTick,
                lowerTick,
                upperTick
            );

            const baseValue = baseIsToken0 ?
                (token0Amount * safeCurrentPrice) / (10n ** BigInt(baseTokenDecimals)) + token1Amount :
                token0Amount + (token1Amount * safeCurrentPrice) / (10n ** BigInt(baseTokenDecimals));

            if (baseValue === 0n) return 0n;

            return (100000n * totalQuoteValue) / baseValue;
        } catch (error) {
            console.warn("Error calculating liquidity:", error);
            return 0n;
        }
    }, [totalQuoteValue, safeLowerPrice, safeUpperPrice, safeCurrentPrice, tickSpacing, baseTokenAddress, quoteTokenAddress, baseTokenDecimals, baseIsToken0]);

    // Generate curve data
    const curveData = useMemo((): InteractiveRangeData | null => {
        if (liquidityAmount === 0n) return null;

        try {
            const lowerTick = priceToTick(safeLowerPrice, tickSpacing, baseTokenAddress, quoteTokenAddress, baseTokenDecimals);
            const upperTick = priceToTick(safeUpperPrice, tickSpacing, baseTokenAddress, quoteTokenAddress, baseTokenDecimals);

            const initialValue = calculatePositionValueAtPrice(
                liquidityAmount,
                lowerTick,
                upperTick,
                safeCurrentPrice,
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
                200
            );

            const currentPriceIndex = points.findIndex(p => p.price >= safeCurrentPrice);
            const lowerIndex = points.findIndex(p => p.price >= safeLowerPrice);
            const upperIndex = points.findIndex(p => p.price >= safeUpperPrice);

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
                lowerPrice: safeLowerPrice,
                upperPrice: safeUpperPrice,
                currentPrice: safeCurrentPrice,
            };
        } catch (error) {
            console.warn("Error generating curve data:", error);
            return null;
        }
    }, [liquidityAmount, safeLowerPrice, safeUpperPrice, safeCurrentPrice, minPrice, maxPrice, tickSpacing, baseTokenAddress, quoteTokenAddress, baseTokenDecimals]);

    // Coordinate transformations
    const xScale = useCallback((price: bigint) => {
        if (!curveData) return 0;
        const normalized = Number((price - curveData.priceRange.min) * 1000n / (curveData.priceRange.max - curveData.priceRange.min)) / 1000;
        return (normalized * width * interaction.viewport.zoom) + interaction.viewport.panX;
    }, [curveData, width, interaction.viewport]);

    const yScale = useCallback((pnl: number) => {
        if (!curveData) return height / 2;
        const normalized = (pnl - curveData.pnlRange.min) / (curveData.pnlRange.max - curveData.pnlRange.min);
        return height - (normalized * height * interaction.viewport.zoom) - interaction.viewport.panY;
    }, [curveData, height, interaction.viewport]);

    const priceFromX = useCallback((x: number): bigint => {
        if (!curveData) return 0n;
        const adjustedX = (x - interaction.viewport.panX) / interaction.viewport.zoom;
        const normalized = adjustedX / width;
        return curveData.priceRange.min + BigInt(Math.floor(Number(curveData.priceRange.max - curveData.priceRange.min) * normalized));
    }, [curveData, width, interaction.viewport]);

    // Find PnL at specific price
    const getPnLAtPrice = useCallback((price: bigint) => {
        if (!curveData) return { pnl: 0n, pnlPercent: 0 };

        const point = curveData.points.find(p => p.price >= price) || curveData.points[curveData.points.length - 1];
        return { pnl: point.pnl, pnlPercent: point.pnlPercent };
    }, [curveData]);

    // Drawing functions
    const drawCurve = useCallback((ctx: CanvasRenderingContext2D) => {
        if (!curveData) return;

        ctx.beginPath();
        curveData.points.forEach((point, i) => {
            const x = xScale(point.price);
            const y = yScale(point.pnlPercent);

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });

        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Fill areas
        const zeroLineY = yScale(0);

        // Positive area (green)
        ctx.fillStyle = "rgba(34, 197, 94, 0.2)";
        ctx.beginPath();
        curveData.points.forEach((point, i) => {
            const x = xScale(point.price);
            const y = Math.min(yScale(point.pnlPercent), zeroLineY);

            if (i === 0) {
                ctx.moveTo(x, zeroLineY);
                ctx.lineTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.lineTo(xScale(curveData.points[curveData.points.length - 1].price), zeroLineY);
        ctx.closePath();
        ctx.fill();

        // Negative area (red)
        ctx.fillStyle = "rgba(239, 68, 68, 0.2)";
        ctx.beginPath();
        curveData.points.forEach((point, i) => {
            const x = xScale(point.price);
            const y = Math.max(yScale(point.pnlPercent), zeroLineY);

            if (i === 0) {
                ctx.moveTo(x, zeroLineY);
                ctx.lineTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.lineTo(xScale(curveData.points[curveData.points.length - 1].price), zeroLineY);
        ctx.closePath();
        ctx.fill();
    }, [curveData, xScale, yScale]);

    const drawGrid = useCallback((ctx: CanvasRenderingContext2D) => {
        const zeroLineY = yScale(0);

        // Zero line
        ctx.strokeStyle = "#64748b";
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(0, zeroLineY);
        ctx.lineTo(width, zeroLineY);
        ctx.stroke();
        ctx.setLineDash([]);
    }, [yScale, width]);

    const drawRangeMarkers = useCallback((ctx: CanvasRenderingContext2D) => {
        if (!curveData) return;

        // Use local drag state if available, otherwise use props
        const effectiveLowerPrice = interaction.localDragState.lowerPrice ?? safeLowerPrice;
        const effectiveUpperPrice = interaction.localDragState.upperPrice ?? safeUpperPrice;

        const lowerX = xScale(effectiveLowerPrice);
        const upperX = xScale(effectiveUpperPrice);

        // Range boundary lines
        ctx.strokeStyle = "#a855f7";
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]);

        // Lower boundary
        ctx.beginPath();
        ctx.moveTo(lowerX, 0);
        ctx.lineTo(lowerX, height);
        ctx.stroke();

        // Upper boundary
        ctx.beginPath();
        ctx.moveTo(upperX, 0);
        ctx.lineTo(upperX, height);
        ctx.stroke();

        ctx.setLineDash([]);

        // Draggable markers
        const markerY = height / 2;

        // Lower marker
        ctx.fillStyle = "#a855f7";
        ctx.strokeStyle = "#1e293b";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(lowerX, markerY, MARKER_RADIUS, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        // Upper marker
        ctx.beginPath();
        ctx.arc(upperX, markerY, MARKER_RADIUS, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
    }, [curveData, xScale, safeLowerPrice, safeUpperPrice, height, interaction.localDragState]);

    const drawCurrentPrice = useCallback((ctx: CanvasRenderingContext2D) => {
        if (!curveData) return;

        const currentX = xScale(safeCurrentPrice);
        const currentPoint = curveData.points[curveData.currentPriceIndex];
        const currentY = currentPoint ? yScale(currentPoint.pnlPercent) : height / 2;

        // Current price line
        ctx.strokeStyle = "#fbbf24";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(currentX, 0);
        ctx.lineTo(currentX, height);
        ctx.stroke();

        // Current price marker
        ctx.fillStyle = "#fbbf24";
        ctx.strokeStyle = "#1e293b";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(currentX, currentY, 4, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
    }, [curveData, xScale, yScale, currentPrice, height]);

    const drawCursor = useCallback((ctx: CanvasRenderingContext2D) => {
        if (!interaction.cursor.isVisible) return;

        // Cursor dot
        ctx.fillStyle = "#06b6d4";
        ctx.strokeStyle = "#1e293b";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(interaction.cursor.x, interaction.cursor.y, CURSOR_RADIUS, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
    }, [interaction.cursor]);

    const render = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Draw components
        drawGrid(ctx);
        drawCurve(ctx);
        drawRangeMarkers(ctx);
        drawCurrentPrice(ctx);
        drawCursor(ctx);
    }, [width, height, drawGrid, drawCurve, drawRangeMarkers, drawCurrentPrice, drawCursor]);

    // Animation loop
    useEffect(() => {
        const animate = () => {
            render();
            animationFrameRef.current = requestAnimationFrame(animate);
        };

        animationFrameRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [render]);

    // Handle zoom
    const handleZoom = useCallback((delta: number, clientX?: number, clientY?: number) => {
        setInteraction(prev => {
            const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev.viewport.zoom + delta));

            if (clientX !== undefined && clientY !== undefined && canvasRef.current) {
                const rect = canvasRef.current.getBoundingClientRect();
                const x = clientX - rect.left;
                const y = clientY - rect.top;

                const zoomFactor = newZoom / prev.viewport.zoom;
                const newPanX = x - (x - prev.viewport.panX) * zoomFactor;
                const newPanY = y - (y - prev.viewport.panY) * zoomFactor;

                return {
                    ...prev,
                    viewport: {
                        ...prev.viewport,
                        zoom: newZoom,
                        panX: newPanX,
                        panY: newPanY,
                    },
                };
            }

            return {
                ...prev,
                viewport: { ...prev.viewport, zoom: newZoom },
            };
        });
    }, []);

    // Mouse event handlers
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (!canvasRef.current) return;

        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Check if clicking on range markers
        const lowerX = xScale(safeLowerPrice);
        const upperX = xScale(safeUpperPrice);
        const markerY = height / 2;

        if (Math.abs(x - lowerX) < MARKER_TOLERANCE && Math.abs(y - markerY) < MARKER_TOLERANCE) {
            setInteraction(prev => ({
                ...prev,
                activeMarker: "lower",
                markers: {
                    ...prev.markers,
                    lower: { ...prev.markers.lower, isDragging: true },
                },
            }));
            return;
        }

        if (Math.abs(x - upperX) < MARKER_TOLERANCE && Math.abs(y - markerY) < MARKER_TOLERANCE) {
            setInteraction(prev => ({
                ...prev,
                activeMarker: "upper",
                markers: {
                    ...prev.markers,
                    upper: { ...prev.markers.upper, isDragging: true },
                },
            }));
            return;
        }

        // Start panning
        setInteraction(prev => ({
            ...prev,
            viewport: {
                ...prev.viewport,
                isDragging: true,
                dragStart: { x, y },
            },
        }));
    }, [xScale, lowerPrice, upperPrice, height]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!canvasRef.current || !curveData) return;

        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Update cursor position and calculate PnL
        const price = priceFromX(x);
        const pnlData = getPnLAtPrice(price);

        setInteraction(prev => ({
            ...prev,
            cursor: {
                x,
                y,
                price,
                pnl: pnlData.pnl,
                pnlPercent: pnlData.pnlPercent,
                isVisible: true,
            },
        }));

        // Handle marker dragging
        if (interaction.activeMarker) {
            const newPrice = priceFromX(x);

            // Get current effective prices for bounds checking
            const currentLowerPrice = interaction.localDragState.lowerPrice ?? safeLowerPrice;
            const currentUpperPrice = interaction.localDragState.upperPrice ?? safeUpperPrice;

            // Update local drag state for immediate visual feedback
            if (interaction.activeMarker === "lower" && newPrice < currentUpperPrice) {
                setInteraction(prev => ({
                    ...prev,
                    localDragState: {
                        ...prev.localDragState,
                        lowerPrice: newPrice,
                    },
                }));
            } else if (interaction.activeMarker === "upper" && newPrice > currentLowerPrice) {
                setInteraction(prev => ({
                    ...prev,
                    localDragState: {
                        ...prev.localDragState,
                        upperPrice: newPrice,
                    },
                }));
            }
            return;
        }

        // Handle panning
        if (interaction.viewport.isDragging && interaction.viewport.dragStart) {
            const deltaX = x - interaction.viewport.dragStart.x;
            const deltaY = y - interaction.viewport.dragStart.y;

            setInteraction(prev => ({
                ...prev,
                viewport: {
                    ...prev.viewport,
                    panX: prev.viewport.panX + deltaX,
                    panY: prev.viewport.panY + deltaY,
                    dragStart: { x, y },
                },
            }));
        }
    }, [curveData, priceFromX, getPnLAtPrice, interaction.activeMarker, interaction.viewport.isDragging, interaction.viewport.dragStart, onRangeChange, lowerPrice, upperPrice]);

    const handleMouseUp = useCallback(() => {
        // If we have local drag state, propagate final values to parent
        if (interaction.activeMarker && (interaction.localDragState.lowerPrice || interaction.localDragState.upperPrice)) {
            const finalLowerPrice = interaction.localDragState.lowerPrice ?? safeLowerPrice;
            const finalUpperPrice = interaction.localDragState.upperPrice ?? safeUpperPrice;

            // Validate range and propagate to parent
            if (finalLowerPrice < finalUpperPrice) {
                onRangeChange(finalLowerPrice, finalUpperPrice);
            }
        }

        setInteraction(prev => ({
            ...prev,
            activeMarker: null,
            viewport: {
                ...prev.viewport,
                isDragging: false,
                dragStart: null,
            },
            markers: {
                lower: { ...prev.markers.lower, isDragging: false },
                upper: { ...prev.markers.upper, isDragging: false },
            },
            // Clear local drag state
            localDragState: {
                lowerPrice: null,
                upperPrice: null,
            },
        }));
    }, [interaction.activeMarker, interaction.localDragState, safeLowerPrice, safeUpperPrice, onRangeChange]);

    const handleMouseLeave = useCallback(() => {
        setInteraction(prev => ({
            ...prev,
            cursor: { ...prev.cursor, isVisible: false },
        }));
        handleMouseUp();
    }, [handleMouseUp]);

    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        const delta = -e.deltaY * ZOOM_SENSITIVITY * 0.01;
        handleZoom(delta, e.clientX, e.clientY);
    }, [handleZoom]);

    const resetView = () => {
        setInteraction(prev => ({
            ...prev,
            viewport: {
                zoom: 1,
                panX: 0,
                panY: 0,
                isDragging: false,
                dragStart: null,
            },
        }));
    };

    if (!curveData) {
        return (
            <div
                className={`flex items-center justify-center bg-slate-800/30 backdrop-blur-sm rounded-lg border border-slate-700/50 ${className}`}
                style={{ width, height }}
            >
                <div className="text-center">
                    <div className="text-slate-400 mb-2">No curve data available</div>
                    <div className="text-slate-500 text-sm">Enter an investment amount to see the PnL curve</div>
                </div>
            </div>
        );
    }

    return (
        <div className={`relative bg-slate-800/30 backdrop-blur-sm rounded-lg border border-slate-700/50 overflow-hidden ${className}`}>
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

            {/* Cursor tooltip */}
            {interaction.cursor.isVisible && (
                <div
                    className="absolute z-20 pointer-events-none"
                    style={{
                        left: interaction.cursor.x + 10,
                        top: interaction.cursor.y - 60,
                    }}
                >
                    <div className="bg-slate-800/90 backdrop-blur-sm border border-slate-600 rounded-lg p-2 text-xs">
                        <div className="text-slate-300">
                            Price: {formatCompactValue(interaction.cursor.price, quoteToken.decimals)}
                        </div>
                        <div className={`font-medium ${interaction.cursor.pnlPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            PnL: {interaction.cursor.pnlPercent >= 0 ? '+' : ''}{interaction.cursor.pnlPercent.toFixed(2)}%
                        </div>
                    </div>
                </div>
            )}

            {/* Canvas */}
            <canvas
                ref={canvasRef}
                width={width}
                height={height}
                className="cursor-grab active:cursor-grabbing"
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                style={{ userSelect: "none" }}
            />

            {/* Price labels */}
            <div className="absolute bottom-3 left-3 right-3 flex justify-between text-xs text-slate-400 pointer-events-none">
                <div>Lower: {formatCompactValue(interaction.localDragState.lowerPrice ?? safeLowerPrice, quoteToken.decimals)}</div>
                <div>Current: {formatCompactValue(safeCurrentPrice, quoteToken.decimals)}</div>
                <div>Upper: {formatCompactValue(interaction.localDragState.upperPrice ?? safeUpperPrice, quoteToken.decimals)}</div>
            </div>
        </div>
    );
}
"use client";

import { useEffect, useRef, useState } from "react";
import { MiniPnLCurve, type CurveData } from "./mini-pnl-curve";
import type { BasicPosition } from "@/services/positions/positionService";
import { usePositionStore } from "@/store/position-store";

interface MiniPnLCurveLazyProps {
    position: BasicPosition;
    curveData?: CurveData | null;
    width?: number;
    height?: number;
    className?: string;
    showTooltip?: boolean;
}

// Skeleton component for loading state
function CurveSkeleton({ width = 120, height = 60, className = "" }: { width?: number; height?: number; className?: string }) {
    return (
        <div 
            className={`flex items-center justify-center bg-slate-800/20 rounded animate-pulse ${className}`}
            style={{ width, height }}
        >
            <svg width={width} height={height} className="opacity-30">
                {/* Skeleton curve path */}
                <path 
                    d={`M 0 ${height * 0.8} Q ${width * 0.25} ${height * 0.2} ${width * 0.5} ${height * 0.4} Q ${width * 0.75} ${height * 0.6} ${width} ${height * 0.4}`}
                    fill="none"
                    stroke="#475569"
                    strokeWidth={2}
                />
                {/* Skeleton range lines */}
                <line x1={width * 0.3} y1={0} x2={width * 0.3} y2={height} stroke="#475569" strokeWidth={1} />
                <line x1={width * 0.7} y1={0} x2={width * 0.7} y2={height} stroke="#475569" strokeWidth={1} />
                {/* Skeleton current position dot */}
                <circle cx={width * 0.45} cy={height * 0.35} r={2} fill="#475569" />
            </svg>
        </div>
    );
}

export function MiniPnLCurveLazy({
    position,
    curveData: propCurveData,
    width = 120,
    height = 60,
    className = "",
    showTooltip = false
}: MiniPnLCurveLazyProps) {
    // Use curve data from props if provided, otherwise fall back to store
    const getPosition = usePositionStore(state => state.getPosition);
    const positionWithDetails = position.nftId && !propCurveData ?
        getPosition(position.pool.chain, position.nftId) : null;
    const curveData = propCurveData || positionWithDetails?.curveData;

    return (
        <div className={className}>
            <MiniPnLCurve
                position={position}
                curveData={curveData}
                width={width}
                height={height}
                showTooltip={showTooltip}
            />
        </div>
    );
}
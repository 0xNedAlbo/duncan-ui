"use client";

import { MiniPnLCurve, type CurveData } from "./mini-pnl-curve";
import type { BasicPosition } from "@/types/positions";

interface MiniPnLCurveLazyProps {
    position: BasicPosition;
    curveData: CurveData | null;
    width?: number;
    height?: number;
    className?: string;
    showTooltip?: boolean;
}

export function MiniPnLCurveLazy({
    position,
    curveData,
    width = 120,
    height = 60,
    className = "",
    showTooltip = false,
}: MiniPnLCurveLazyProps) {

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

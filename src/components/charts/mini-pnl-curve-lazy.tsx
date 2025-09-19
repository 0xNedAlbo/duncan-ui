"use client";

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

export function MiniPnLCurveLazy({
    position,
    curveData: propCurveData,
    width = 120,
    height = 60,
    className = "",
    showTooltip = false,
}: MiniPnLCurveLazyProps) {
    // Use curve data from props if provided, otherwise fall back to store
    const getPosition = usePositionStore((state) => state.getPosition);
    const positionWithDetails =
        position.nftId && !propCurveData
            ? getPosition(position.pool.chain, position.nftId)
            : null;
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

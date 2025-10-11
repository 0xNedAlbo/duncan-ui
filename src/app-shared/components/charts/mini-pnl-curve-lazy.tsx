"use client";

import { MiniPnLCurve } from "./mini-pnl-curve";
import type { BasicPosition } from "@/types/positions";
import type { PnlBreakdown } from "@/types/pnl";

interface MiniPnLCurveLazyProps {
    position: BasicPosition;
    pnlBreakdown: PnlBreakdown | null;
    width?: number;
    height?: number;
    className?: string;
    showTooltip?: boolean;
    markerPrice?: number;
}

export function MiniPnLCurveLazy({
    position,
    pnlBreakdown,
    width = 120,
    height = 60,
    className = "",
    showTooltip = false,
    markerPrice,
}: MiniPnLCurveLazyProps) {

    return (
        <div className={className}>
            <MiniPnLCurve
                position={position}
                pnlBreakdown={pnlBreakdown}
                width={width}
                height={height}
                showTooltip={showTooltip}
                markerPrice={markerPrice}
            />
        </div>
    );
}

import React, { useState } from "react";
import { UniswapV3Position } from "@/hooks/duncan/useUniswapV3Position";
import { PositionAssistent } from "./PositionAssistent/PositionAssistent";

export function UniswapPositionContainer() {
    const [position, setPosition] = useState<UniswapV3Position | undefined>();

    function onPositionChange(newPosition?: UniswapV3Position) {
        setPosition(newPosition);
    }

    if (!position) {
        return (
            <PositionAssistent
                onPositionChange={onPositionChange}
            ></PositionAssistent>
        );
    }
    return <></>;
}

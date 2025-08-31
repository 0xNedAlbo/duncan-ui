import { useState } from "react";
import {
    PositionLoaderVariant,
    SelectPositionLoader,
} from "./SelectPositionLoader";
import { PositionLoaderByPool } from "./PositionLoaderByPool";
import { UniswapV3Position } from "@/hooks/duncan/useUniswapV3Position";

export type PositionAssistentProps = {
    onPositionChange: (newPosition: UniswapV3Position | undefined) => void;
};

export function PositionAssistent(props: PositionAssistentProps) {
    const [loaderVariant, setLoaderVariant] = useState<PositionLoaderVariant>();

    function onPositionLoaderChange(newLoader: PositionLoaderVariant) {
        setLoaderVariant(newLoader);
    }

    if (!loaderVariant) {
        return (
            <SelectPositionLoader
                onLoaderChange={onPositionLoaderChange}
            ></SelectPositionLoader>
        );
    } else if (loaderVariant == "byPool") {
        return <PositionLoaderByPool></PositionLoaderByPool>;
    } else {
        throw new Error("Unknown Position Loader:" + loaderVariant);
    }
}

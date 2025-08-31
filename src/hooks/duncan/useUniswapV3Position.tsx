import { parseUnits } from "viem";

import { EvmAddress, sortEvmAddresses } from "@/utils/evmAddress";
import { FeeTiersType } from "@/utils/uniswap";
import {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useState,
} from "react";
import { Token } from "@uniswap/sdk-core";

export type UniswapV3Pool = {
    chainId?: number;
    address?: EvmAddress;
    token0: Token;
    token1: Token;
    fee?: FeeTiersType;
};

export type UniswapV3Position = {
    positionId?: number;
    owner?: EvmAddress;
    pool: UniswapV3Pool;
    /*    liquidity: bigint;
    tickLower: number;
    tickUpper: number;
    tickCurrent: number;*/
};

const UniswapV3PositionContext = createContext<UniswapV3Position | undefined>(
    undefined
);

export function useUniswapV3Position(): UniswapV3Position | undefined {
    return useContext(UniswapV3PositionContext);
}

/*export function useUniswapV3PositionByBaseAmount(params: {
    baseToken: EvmAddress; // usually the volatile asset
    quoteToken: EvmAddress; // usually the stable asset
    baseAmount: string;
    // all prices are quote amount per base amount
    // e.g. 4000 USDC/WETH.
    currentPrice: string;
    lowerPrice: string;
    upperPrice: string;
}): UniswapV3Position | undefined {
    const [token0Address, token1Address] = sortEvmAddresses(
        params.baseToken,
        params.quoteToken
    );
    const token0 = useErc20Token(token0Address);
    const token1 = useErc20Token(token1Address);
    const [pool, setPool] = useState<UniswapV3Pool | undefined>();
    const [position, setPosition] = useState<UniswapV3Position | undefined>();

    useEffect(() => {
        if (token0 && token1) {
            setPool({ token0, token1 });
        }
    }, [token0, token1]);

    return undefined;
}*/

export function UniswapPositionProvider(props: {
    children: ReactNode;
}): ReactNode {
    const [position, setPosition] = useState<UniswapV3Position | undefined>();

    return (
        <UniswapV3PositionContext.Provider value={position}>
            {props.children}
        </UniswapV3PositionContext.Provider>
    );
}

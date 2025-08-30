import { parseUnits } from "viem";

import { EvmAddress, sortEvmAddresses } from "@/utils/evmAddress";
import {
    getTickFromPrice,
    UniswapV3Pool,
    UniswapV3Position,
} from "@/utils/uniswap";
import {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useState,
} from "react";
import { useErc20Token } from "../common/useErc20Token";
import { TickMath, LiquidityAmounts } from "@uniswap/v3-sdk";


const UniswapV3PositionContext = createContext<UniswapV3Position | undefined>(
    undefined
);

export function useUniswapV3Position(): UniswapV3Position | undefined {
    return useContext(UniswapV3PositionContext);
}

export function useUniswapV3PositionByBaseAmount(params: {
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

    useEffect(() => {
        if (!pool) return;
        const isToken0Base = pool.token0.address == params.baseToken;

        const baseToken = isToken0Base ? pool.token0 : pool.token1;
        const quoteToken = isToken0Base ? pool.token1 : pool.token0;

        const tickCurrent = getTickFromPrice(params.currentPrice, baseToken, quoteToken);
        const tickLower = getTickFromPrice(params.lowerPrice, baseToken, quoteToken);
        const tickUpper = getTickFromPrice(params.upperPrice, baseToken, quoteToken);

        const baseAmount = parseUnits(params.baseAmount, isToken0Base ? pool.token0.decimals : pool.token1.decimals);
        const sqrtPriceAX96 = TickMath.getSqrtRatioAtTick(tickLower);
        const sqrtPriceBX96 = TickMath.getSqrtRatioAtTick(tickUpper);
        const sqrtPriceX96 = TickMath.getSqrtRatioAtTick(tickCurrent);
        const liquidity =  LiquidityMath
        
        .getLiquidityForAmount0(
  sqrtPriceX96,
  sqrtPriceAX96,
  sqrtPriceBX96,
  amount0
);

        setPosition({
            pool,
            tickCurrent, tickLower, tickUpper,
            liquidity
            ),
        });
    }, [pool]);

    return undefined;
}

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

import { Erc20Token } from "./erc20Token";
import { EvmAddress } from "./evmAddress";

import { TickMath, encodeSqrtRatioX96 } from "@uniswap/v3-sdk";
import { parseUnits } from "viem";

export type UniswapV3Pool = {
    chainId?: number;
    address?: EvmAddress;
    token0: Erc20Token;
    token1: Erc20Token;
    fee?: 500 | 3000 | 10000;
};

export type UniswapV3Position = {
    positionId?: number;
    owner?: EvmAddress;
    pool: UniswapV3Pool;
    liquidity: bigint;
    tickLower: number;
    tickUpper: number;
    tickCurrent: number;
};

export function getTickFromPrice(
    priceStr: string,
    base: Erc20Token,
    quote: Erc20Token
) {
    // Scale price to quote's decimals: numerator = price * 10^quote.decimals
    const numerator = parseUnits(priceStr, quote.decimals).toString();
    // Denominator = 1 base token in raw units = 10^base.decimals
    const denominator = parseUnits("1", base.decimals).toString();

    const sqrtPriceX96 = encodeSqrtRatioX96(numerator, denominator);
    return TickMath.getTickAtSqrtRatio(sqrtPriceX96);
}

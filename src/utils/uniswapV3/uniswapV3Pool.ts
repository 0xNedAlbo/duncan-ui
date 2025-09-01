import { Erc20Token } from "../erc20Token";
import { EvmAddress } from "../evmAddress";
import { readContract } from "wagmi/actions";
import { Config } from "wagmi";
import {
    uniswapV3FactoryAbi,
    uniswapV3FactoryAddress,
} from "../../generated/wagmi";
import { erc20Abi } from "viem";
import { mulDiv } from "../math";

export type UniswapV3Pool = {
    // Basic Identification
    chainId: number; // Chain ID
    address: EvmAddress; // Pool contract address
    token0: Erc20Token; // First token (lexicographically smaller address)
    token1: Erc20Token; // Second token (lexicographically larger address)
    fee: number; // Fee tier (e.g., 500, 3000, 10000 for 0.05%, 0.3%, 1%)

    // Current State
    sqrtPriceX96: bigint; // Current price in sqrt(price) * 2^96 format
    tick: number; // Current tick
    tickSpacing: number; // Tick spacing
    liquidity: bigint; // Total active liquidity
};

// Standard Uniswap V3 fee tiers
const FEE_TIERS = [100, 500, 3000, 10000] as const; // 0.05%, 0.3%, 1%

/**
 * Finds Uniswap V3 pools for a given token pair on a specific chain
 * @param config Wagmi config
 * @param chainId The blockchain chain ID
 * @param quoteToken The quote token (e.g., USDC)
 * @param baseToken The base token (e.g., WETH)
 * @returns Promise<UniswapV3Pool[]> Array of found pools
 */
export async function findUniswapV3Pools(
    config: Config,
    chainId: number,
    quoteToken: Erc20Token,
    baseToken: Erc20Token
): Promise<UniswapV3Pool[]> {
    console.log("findUniswapV3Pools", chainId, quoteToken, baseToken);
    const factoryAddress =
        uniswapV3FactoryAddress[
            chainId as keyof typeof uniswapV3FactoryAddress
        ];
    if (!factoryAddress) {
        throw new Error(`Unsupported chain ID: ${chainId}`);
    }

    // Ensure token order (token0 < token1 lexicographically)
    const [token0, token1] =
        quoteToken.address.toLowerCase() < baseToken.address.toLowerCase()
            ? [quoteToken, baseToken]
            : [baseToken, quoteToken];

    const pools: UniswapV3Pool[] = [];

    // Check each fee tier
    for (const fee of FEE_TIERS) {
        try {
            // Get pool address from factory
            const poolAddress = (await readContract(config, {
                address: factoryAddress,
                abi: uniswapV3FactoryAbi,
                functionName: "getPool",
                args: [
                    token0.address as EvmAddress,
                    token1.address as EvmAddress,
                    fee,
                ],
                chainId,
            })) as EvmAddress;

            // Skip if pool doesn't exist (returns zero address)
            if (
                !poolAddress ||
                poolAddress === "0x0000000000000000000000000000000000000000"
            ) {
                continue;
            }

            // Get pool state data
            const [slot0Data, liquidityData, tickSpacingData] =
                await Promise.all([
                    readContract(config, {
                        address: poolAddress,
                        abi: [
                            {
                                type: "function",
                                name: "slot0",
                                outputs: [
                                    { name: "sqrtPriceX96", type: "uint160" },
                                    { name: "tick", type: "int24" },
                                    {
                                        name: "observationIndex",
                                        type: "uint16",
                                    },
                                    {
                                        name: "observationCardinality",
                                        type: "uint16",
                                    },
                                    {
                                        name: "observationCardinalityNext",
                                        type: "uint16",
                                    },
                                    { name: "feeProtocol", type: "uint8" },
                                    { name: "unlocked", type: "bool" },
                                ],
                                stateMutability: "view",
                            },
                        ],
                        functionName: "slot0",
                        chainId,
                    }),
                    readContract(config, {
                        address: poolAddress,
                        abi: [
                            {
                                type: "function",
                                name: "liquidity",
                                outputs: [{ name: "", type: "uint128" }],
                                stateMutability: "view",
                            },
                        ],
                        functionName: "liquidity",
                        chainId,
                    }),
                    readContract(config, {
                        address: poolAddress,
                        abi: [
                            {
                                type: "function",
                                name: "tickSpacing",
                                outputs: [{ name: "", type: "int24" }],
                                stateMutability: "view",
                            },
                        ],
                        functionName: "tickSpacing",
                        chainId,
                    }),
                ]);

            const [sqrtPriceX96, tick] = slot0Data as [bigint, number];
            const liquidity = liquidityData as bigint;
            const tickSpacing = tickSpacingData as number;

            pools.push({
                chainId,
                address: poolAddress,
                token0,
                token1,
                fee,
                sqrtPriceX96,
                tick,
                liquidity,
                tickSpacing,
            });
        } catch (error) {
            console.warn(
                `Failed to fetch pool data for fee tier ${fee}:`,
                error
            );
            // Continue with other fee tiers
        }
    }

    return pools;
}

/**
 * Helper function to get a human-readable pool name
 * @param pool The UniswapV3Pool
 * @returns string Pool name like "WETH/USDC 0.3%"
 */
export function getPoolName(pool: UniswapV3Pool): string {
    const feePercentage = (pool.fee / 10000).toFixed(2);
    return `CL${pool.tickSpacing}-${pool.token0.symbol}/${pool.token1.symbol} ${feePercentage}%`;
}

/**
 * Calculates the current price of token1 in terms of token0
 * @param pool The UniswapV3Pool
 * @returns number Price of token1 in token0 units
 */
export function getToken1PriceInToken0(pool: UniswapV3Pool): {
    numerator: bigint;
    denominator: bigint;
} {
    const sqrtPriceX96 = pool.sqrtPriceX96;
    const decimals0 = BigInt(pool.token0.decimals);
    const decimals1 = BigInt(pool.token1.decimals);

    const Q192 = 1n << 192n;

    // Square the sqrtPrice to get price * Q192
    const sqrtPriceSquared = sqrtPriceX96 * sqrtPriceX96;

    // Handle decimal adjustment factor between token0 and token1
    const decimalDiff = decimals0 - decimals1;

    let numerator: bigint;
    let denominator: bigint;

    if (decimalDiff >= 0n) {
        // token0 has more decimals
        numerator = Q192;
        denominator = sqrtPriceSquared * 10n ** decimalDiff;
    } else {
        // token1 has more decimals
        numerator = Q192 * 10n ** -decimalDiff;
        denominator = sqrtPriceSquared;
    }

    // Invert to get token0 per token1
    return {
        numerator,
        denominator,
    };
}

/**
 * Calculates the current price of token0 in terms of token1
 * @param pool The UniswapV3Pool
 * @returns number Price of token0 in token1 units
 */
export function getToken0PriceInToken1(pool: UniswapV3Pool): {
    numerator: bigint;
    denominator: bigint;
} {
    const price = getToken1PriceInToken0(pool);
    return {
        numerator: price.denominator,
        denominator: price.numerator,
    };
}

/**
 * Helper: format the bigint ratio into a decimal string with desired precision.
 */
export function formatPrice(
    frac: { numerator: bigint; denominator: bigint },
    precision = 18
): string {
    const scaled = frac.numerator * 10n ** BigInt(precision);
    const value = scaled / frac.denominator;
    const s = value.toString().padStart(precision + 1, "0");
    const i = s.length - precision;
    return `${s.slice(0, i)}.${s.slice(i).replace(/0+$/, "")}`.replace(
        /\.$/,
        ""
    );
}

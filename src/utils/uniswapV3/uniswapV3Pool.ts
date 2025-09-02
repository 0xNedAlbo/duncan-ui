import { FeeAmount, Pool } from "@uniswap/v3-sdk";
import { Erc20Token, fromSdkToken, loadSdkToken } from "../erc20Token";
import { EvmAddress, sameAddress } from "../evmAddress";
import { Token } from "@uniswap/sdk-core";
import { getPublicClient } from "wagmi/actions";
import { Config } from "wagmi";
import uniswapV3PoolAbi from "@/abis/uniswapv3/pool.abi.json";
import { uniswapV3FactoryConfig } from "@/generated/wagmi";
import { ADDR_ZERO } from "../constants";
import JSBI from "jsbi";

// Allowed fee tiers
export const FEE_TIERS = [100, 500, 3000, 10000] as const; // 0.01%, 0.05%, 0.3%, 1%
export type FeeTier = (typeof FEE_TIERS)[number];

// Display/ready pool type for your app (lean, render-friendly)
export type UniswapV3Pool = {
    // Basic Identification
    chainId: number;
    address: EvmAddress;
    baseToken: Erc20Token;
    quoteToken: Erc20Token;
    fee: FeeTier;
    tickSpacing: number;

    // Current State (project convention: price in quote per 1 base, scaled to quote.decimals)
    price: bigint;
};

// -------------------------
// Utility: Pool ID helpers
// -------------------------

/** Returns a unique Pool ID string based on chainId and address. Format: "{chainId}-{address}" */
export function poolId(pool: UniswapV3Pool): string {
    return `${pool.chainId}-${pool.address}`;
}

/** Returns a unique Pool ID string from raw values. */
export function poolIdFromValues(chainId: number, address: EvmAddress): string {
    return `${chainId}-${address}`;
}

export function poolName(pool: UniswapV3Pool): string {
    const feePercent = pool.fee / 10000;
    return `CL${pool.tickSpacing}-${pool.baseToken.symbol}/${pool.baseToken.symbol} ${(pool.fee / 10000).toFixed(2)}%`;
}

// ---------------------------------------------
// Optional: Derive token0/token1 from base/quote
// ---------------------------------------------

/** Returns token0 of the pool (lexicographically smaller address). */
export function getToken0(pool: UniswapV3Pool): Erc20Token {
    return pool.baseToken.address.toLowerCase() <
        pool.quoteToken.address.toLowerCase()
        ? pool.baseToken
        : pool.quoteToken;
}

/** Returns token1 of the pool (lexicographically larger address). */
export function getToken1(pool: UniswapV3Pool): Erc20Token {
    return pool.baseToken.address.toLowerCase() <
        pool.quoteToken.address.toLowerCase()
        ? pool.quoteToken
        : pool.baseToken;
}

// ===============================
// SDK Interop – Price computation
// ===============================

// Minimal SDK token/pool shapes (adapt to your actual SDK types if needed)
export type SdkToken = Token;
export type SdkPool = Pool;

// Fixed constants
const Q192 = 2n ** 96n * 2n ** 96n;

/**
 * Price of 1 token0 in token1 units.
 * Result is scaled to token1.decimals (project convention for "quote" units).
 */
export function priceToken1PerToken0(pool: SdkPool): bigint {
    const sqrtRatioX96 = BigInt(pool.sqrtRatioX96.toString());
    const sqrtP2 = sqrtRatioX96 * sqrtRatioX96; // Q192-scaled
    BigInt(pool.sqrtRatioX96.toString()); // Q192-scaled
    const dec0 = BigInt(pool.token0.decimals);
    const dec1 = BigInt(pool.token1.decimals);

    if (dec0 >= dec1) {
        const pow = 10n ** (dec0 - dec1);
        return (sqrtP2 * pow) / Q192;
    } else {
        const pow = 10n ** (dec1 - dec0);
        // sqrtP2 / (Q192 / pow) == (sqrtP2 * pow) / Q192 but avoids an intermediate overflow in some engines
        return sqrtP2 / (Q192 / pow);
    }
}

/**
 * Price of 1 token1 in token0 units.
 * Result is scaled to token0.decimals.
 */
export function priceToken0PerToken1(pool: SdkPool): bigint {
    const sqrtRatioX96 = BigInt(pool.sqrtRatioX96.toString());
    const sqrtP2 = sqrtRatioX96 * sqrtRatioX96; // Q192-scaled
    const dec0 = BigInt(pool.token0.decimals);
    const dec1 = BigInt(pool.token1.decimals);

    if (dec1 >= dec0) {
        const pow = 10n ** (dec1 - dec0);
        return (Q192 * pow) / sqrtP2;
    } else {
        const pow = 10n ** (dec0 - dec1);
        return Q192 / (sqrtP2 * pow);
    }
}

/**
 * Project-convention pool price = quoteToken per 1 baseToken, as bigint.
 * The result is scaled to the decimals of the selected quote token.
 *
 * @param pool  Uniswap SDK pool (token0, token1, sqrtPriceX96)
 * @param quoteTokenAddress address of the desired quote token (must be pool.token0 or pool.token1)
 */
export function poolPrice(
    pool: SdkPool,
    quoteTokenAddress: EvmAddress
): bigint {
    if (sameAddress(quoteTokenAddress, pool.token1.address)) {
        // quote = token1 -> price = token1 per token0
        return priceToken1PerToken0(pool);
    }
    if (sameAddress(quoteTokenAddress, pool.token0.address)) {
        // quote = token0 -> price = token0 per token1
        return priceToken0PerToken1(pool);
    }
    throw new Error(
        "poolPrice: quote token must match pool.token0 or pool.token1"
    );
}

// ---------------------------------------------------------
// Convenience: Build project pool from SDK + selected tokens
// ---------------------------------------------------------

/**
 * Builds a project-level UniswapV3Pool from an SDK pool and chosen base/quote tokens.
 * The resulting `price` is scaled to `quoteToken.decimals` by convention.
 */
export function buildProjectPoolFromSdk(params: {
    sdkPool: Pool;
    baseToken: EvmAddress;
    quoteToken: EvmAddress;
}): UniswapV3Pool {
    const { sdkPool, baseToken, quoteToken } = params;
    const poolAddress = Pool.getAddress(
        sdkPool.token0,
        sdkPool.token1,
        sdkPool.fee
    );
    // Ensure quote token and base token are not the same
    if (sameAddress(baseToken, quoteToken)) {
        throw new Error(
            "buildProjectPoolFromSdk: base and quote token cannot be the same"
        );
    }

    // Ensure the fee is valid
    const fee = FEE_TIERS.find((fee) => fee === sdkPool.fee);
    if (!fee) {
        throw new Error("buildProjectPoolFromSdk: fee not found");
    }

    // Ensure the provided base/quote exist in the SDK pool
    const inPool =
        (sameAddress(baseToken, sdkPool.token0.address) &&
            sameAddress(quoteToken, sdkPool.token1.address)) ||
        (sameAddress(baseToken, sdkPool.token1.address) &&
            sameAddress(quoteToken, sdkPool.token0.address));

    if (!inPool) {
        throw new Error(
            "buildProjectPoolFromSdk: quote token does not match SDK pool tokens"
        );
    }

    const price = poolPrice(sdkPool, quoteToken);

    return {
        chainId: sdkPool.chainId,
        address: poolAddress as EvmAddress,
        baseToken: fromSdkToken(
            sameAddress(baseToken, sdkPool.token0.address)
                ? sdkPool.token0
                : sdkPool.token1
        ),
        quoteToken: fromSdkToken(
            sameAddress(quoteToken, sdkPool.token0.address)
                ? sdkPool.token0
                : sdkPool.token1
        ),
        fee,
        tickSpacing: sdkPool.tickSpacing,
        price,
    };
}

export async function loadSdkPool(
    config: Config,
    chainId: number,
    address: EvmAddress
): Promise<Pool> {
    const publicClient = getPublicClient(config, { chainId });
    if (!publicClient) {
        throw new Error(`No public client available for chainId ${chainId}`);
    }

    // Read static + dynamic pool state concurrently
    const [token0Addr, token1Addr, feeRaw, liquidityRaw, slot0] =
        await Promise.all([
            publicClient.readContract({
                address,
                abi: uniswapV3PoolAbi,
                functionName: "token0",
            }) as Promise<EvmAddress>,
            publicClient.readContract({
                address,
                abi: uniswapV3PoolAbi,
                functionName: "token1",
            }) as Promise<EvmAddress>,
            publicClient.readContract({
                address,
                abi: uniswapV3PoolAbi,
                functionName: "fee",
            }) as Promise<number | bigint>,
            publicClient.readContract({
                address,
                abi: uniswapV3PoolAbi,
                functionName: "liquidity",
            }) as Promise<bigint>,
            publicClient.readContract({
                address,
                abi: uniswapV3PoolAbi,
                functionName: "slot0",
            }) as Promise<{
                sqrtPriceX96: bigint;
                tick: number;
                observationIndex: number;
                observationCardinality: number;
                observationCardinalityNext: number;
                feeProtocol: number;
                unlocked: boolean;
            }>,
        ]);

    // Load SDK tokens (uses your existing loadSdkToken)
    const [sdkToken0, sdkToken1] = await Promise.all([
        loadSdkToken(config, chainId, token0Addr),
        loadSdkToken(config, chainId, token1Addr),
    ]);

    // Normalize types for the Pool constructor
    const fee = Number(feeRaw);
    const sqrtPriceX96 = slot0.sqrtPriceX96;
    const tick = Number(slot0.tick);
    const liquidity = liquidityRaw;

    // Construct @uniswap/v3-sdk Pool (JSBI expected for bigint fields)
    return new Pool(
        sdkToken0,
        sdkToken1,
        fee as FeeAmount,
        sqrtPriceX96.toString(),
        liquidity.toString(),
        tick
    );
}

/**
 * Finds all Uniswap V3 pools for a given token pair across all fee tiers.
 * Uses the Uniswap V3 factory contract to check for pool existence.
 *
 * @param config Wagmi config for blockchain interaction
 * @param chainId The blockchain network ID
 * @param baseToken The base token for the pool
 * @param quoteToken The quote token for the pool
 * @returns Promise<UniswapV3Pool[]> Array of found pools
 */
export async function findUniswapV3Pools(
    config: Config,
    chainId: number,
    baseToken: Erc20Token,
    quoteToken: Erc20Token
): Promise<UniswapV3Pool[]> {
    const publicClient = getPublicClient(config, { chainId });
    if (!publicClient) {
        throw new Error(`No public client available for chainId ${chainId}`);
    }

    // Ensure base and quote tokens are different
    if (sameAddress(baseToken.address, quoteToken.address)) {
        throw new Error("Base and quote tokens cannot be the same");
    }

    // Get the factory address for this chain
    const factoryAddress =
        uniswapV3FactoryConfig.address[
            chainId as keyof typeof uniswapV3FactoryConfig.address
        ];
    if (!factoryAddress) {
        throw new Error(
            `Uniswap V3 factory not available on chainId ${chainId}`
        );
    }

    const pools: UniswapV3Pool[] = [];

    // Check each fee tier for pool existence
    const poolChecks = FEE_TIERS.map(async (fee) => {
        try {
            // Call getPool on the factory contract
            const poolAddress = (await publicClient.readContract({
                address: factoryAddress,
                abi: uniswapV3FactoryConfig.abi,
                functionName: "getPool",
                args: [baseToken.address, quoteToken.address, fee],
            })) as EvmAddress;

            // If pool doesn't exist, factory returns zero address
            if (sameAddress(poolAddress, ADDR_ZERO)) {
                return null;
            }

            // Load the SDK pool to get current state
            const sdkPool = await loadSdkPool(config, chainId, poolAddress);

            // Build project pool from SDK pool
            const projectPool = buildProjectPoolFromSdk({
                sdkPool,
                baseToken: baseToken.address,
                quoteToken: quoteToken.address,
            });

            return projectPool;
        } catch (error) {
            console.warn(`Failed to check pool for fee tier ${fee}:`, error);
            return null;
        }
    });

    // Wait for all pool checks to complete
    const results = await Promise.all(poolChecks);

    // Filter out null results and add to pools array
    for (const pool of results) {
        if (pool) {
            pools.push(pool);
        }
    }

    return pools;
}

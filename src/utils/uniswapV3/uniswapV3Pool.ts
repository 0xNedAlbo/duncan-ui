import {
    encodeSqrtRatioX96,
    FeeAmount,
    nearestUsableTick,
    Pool,
    TickMath,
} from "@uniswap/v3-sdk";
import { Erc20Token, fromSdkToken, loadSdkToken } from "../erc20Token";
import { EvmAddress, sameAddress } from "../evmAddress";
import { Token } from "@uniswap/sdk-core";
import { getPublicClient } from "wagmi/actions";
import { Config } from "wagmi";
import uniswapV3PoolAbi from "@/abis/uniswapv3/pool.abi.json";
import { uniswapV3FactoryConfig } from "@/generated/wagmi";
import { ADDR_ZERO } from "../constants";
import JSBI from "jsbi";
import { Fraction } from "../math";

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
// Utility: Pool helpers
// -------------------------

const addrLt = (a: EvmAddress, b: EvmAddress) => BigInt(a) < BigInt(b);

export const PoolUtils = {
    /** "{chainId}-{address}" */
    id(pool: UniswapV3Pool): string {
        return `${pool.chainId}-${pool.address}`;
    },

    /** "{chainId}-{address}" aus Rohwerten */
    idFromValues(chainId: number, address: EvmAddress): string {
        return `${chainId}-${address}`;
    },

    /** z.B. "CL10-WETH/USDC 0.05%" */
    name(pool: UniswapV3Pool): string {
        const feePct = (pool.fee / 10_000).toFixed(2);
        return `CL${pool.tickSpacing}-${pool.baseToken.symbol}/${pool.quoteToken.symbol} ${feePct}%`;
    },

    /** token0/token1 nach Uniswap-Konvention + Flag, ob base==token0 */
    tokenOrder(pool: UniswapV3Pool): {
        token0: Erc20Token;
        token1: Erc20Token;
        baseIsToken0: boolean;
    } {
        const baseIsToken0 = addrLt(
            pool.baseToken.address,
            pool.quoteToken.address
        );
        const token0 = baseIsToken0 ? pool.baseToken : pool.quoteToken;
        const token1 = baseIsToken0 ? pool.quoteToken : pool.baseToken;
        return { token0, token1, baseIsToken0 };
    },

    /** token0 = kleinere Adresse */
    token0(pool: UniswapV3Pool): Erc20Token {
        return this.tokenOrder(pool).token0;
    },

    /** token1 = größere Adresse */
    token1(pool: UniswapV3Pool): Erc20Token {
        return this.tokenOrder(pool).token1;
    },

    /**
     * √Preis als Q96 (JSBI).
     * @param price  Quote per 1 Base (in quote.decimals). Fällt zurück auf pool.price.
     */
    sqrtRatioX96(pool: UniswapV3Pool, price?: bigint): JSBI {
        const p = price ?? pool.price;
        if (p == null || p <= 0n)
            throw new Error("price must be a positive bigint");

        const { token0, token1, baseIsToken0 } = this.tokenOrder(pool);

        let amount0: bigint;
        let amount1: bigint;
        if (baseIsToken0) {
            // price = token1 per 1 token0
            amount0 = 10n ** BigInt(token0.decimals);
            amount1 = p; // in quote.decimals (token1 here)
        } else {
            // price = token0 per 1 token1  → invert for encoder
            amount0 = p; // in token0.decimals
            amount1 = 10n ** BigInt(token1.decimals);
        }

        return encodeSqrtRatioX96(amount1.toString(), amount0.toString());
    },

    /**
     * Tick aus Preis (floor → snap): gut für Range-Grenzen.
     * @param price  Quote per 1 Base (in quote.decimals). Fällt zurück auf pool.price.
     */
    tickFromPrice(pool: UniswapV3Pool, price?: bigint): number {
        const sqrt = this.sqrtRatioX96(pool, price);
        const tickFloor = TickMath.getTickAtSqrtRatio(sqrt);
        return nearestUsableTick(tickFloor, pool.tickSpacing);
    },

    /**
     * Price (quote per 1 base) from a tick, scaled to quote.decimals.
     * - Returns bigint in quote's smallest units (project convention).
     * - Uses only the base↔token0 orientation; no dec-branching needed.
     *
     * Derivations:
     *   base==token0 → priceUnits = (sqrtP2 * 10^dec0) / Q192
     *   base==token1 → priceUnits = (Q192   * 10^dec1) / sqrtP2
     */
    priceFromTick(pool: UniswapV3Pool, tick: number): bigint {
        const { token0, token1, baseIsToken0 } = this.tokenOrder(pool);

        const s = BigInt(TickMath.getSqrtRatioAtTick(tick).toString()); // Q96
        const sqrtP2 = s * s; // Q192
        const Q192 = 1n << 192n;

        if (baseIsToken0) {
            // quote = token1, base = token0 → scale by 10^dec(base=token0)
            const scale = 10n ** BigInt(token0.decimals);
            return (sqrtP2 * scale) / Q192; // token1 per 1 token0, in token1 units
        } else {
            // quote = token0, base = token1 → reciprocal path
            const scale = 10n ** BigInt(token1.decimals);
            return (Q192 * scale) / sqrtP2; // token0 per 1 token1, in token0 units
        }
    },

    /** √Preis aus Tick (JSBI) – Symmetriehelper */
    sqrtRatioX96FromTick(tick: number): JSBI {
        return TickMath.getSqrtRatioAtTick(tick);
    },

    /**
     * Nächstgelegener *usable* Tick (closest → snap): gut für den "aktuellen Tick".
     * @param price  Quote per 1 Base (in quote.decimals). Fällt zurück auf pool.price.
     */
    closestUsableTickFromPrice(pool: UniswapV3Pool, price?: bigint): number {
        const sqrt = this.sqrtRatioX96(pool, price);
        const t0 = TickMath.getTickAtSqrtRatio(sqrt); // floor

        if (t0 >= TickMath.MAX_TICK)
            return nearestUsableTick(TickMath.MAX_TICK, pool.tickSpacing);
        if (t0 <= TickMath.MIN_TICK)
            return nearestUsableTick(TickMath.MIN_TICK, pool.tickSpacing);

        const s0 = TickMath.getSqrtRatioAtTick(t0);
        const s1 = TickMath.getSqrtRatioAtTick(t0 + 1);

        const d0 = JSBI.greaterThanOrEqual(sqrt, s0)
            ? JSBI.subtract(sqrt, s0)
            : JSBI.subtract(s0, sqrt);
        const d1 = JSBI.greaterThanOrEqual(s1, sqrt)
            ? JSBI.subtract(s1, sqrt)
            : JSBI.subtract(sqrt, s1);

        const tClosest = JSBI.lessThan(d0, d1) ? t0 : t0 + 1;
        return nearestUsableTick(tClosest, pool.tickSpacing);
    },
};
// ===============================
// SDK Interop – Price computation
// ===============================

// Minimal SDK token/pool shapes (adapt to your actual SDK types if needed)
export type SdkToken = Token;
export type SdkPool = Pool;

// Fixed constants
const Q192 = 1n << 192n;

type PartialSdkToken = {
    address: string;
    decimals: number;
};

type PartialSdkPool = {
    sqrtRatioX96: JSBI;
    token0: PartialSdkToken;
    token1: PartialSdkToken;
};
// Q192 = 2^192

/**
 * Price of 1 token0 in token1 units (dimensionless fraction).
 * Uses decimals to convert raw sqrt ratio into a tokens-per-token ratio.
 *   price(token0 in token1) = (sqrtP2 / Q192) * 10^(dec0 - dec1)
 */
export function priceOfToken0InToken1(
    pool: PartialSdkPool
): Fraction<bigint, bigint> {
    const sqrtRatioX96 = BigInt(pool.sqrtRatioX96.toString());
    const sqrtP2 = sqrtRatioX96 * sqrtRatioX96; // Q192-scaled
    const dec0 = BigInt(pool.token0.decimals);
    const dec1 = BigInt(pool.token1.decimals);

    if (dec0 >= dec1) {
        const pow = 10n ** (dec0 - dec1);
        return { num: sqrtP2 * pow, den: Q192 };
    } else {
        const pow = 10n ** (dec1 - dec0);
        return { num: sqrtP2, den: Q192 * pow }; // <-- fix: multiply, not divide
    }
}

/**
 * Price of 1 token1 in token0 units (dimensionless fraction).
 *   price(token1 in token0) = (Q192 / sqrtP2) * 10^(dec1 - dec0)
 */
export function priceOfToken1InToken0(
    pool: PartialSdkPool
): Fraction<bigint, bigint> {
    const sqrtRatioX96 = BigInt(pool.sqrtRatioX96.toString());
    const sqrtP2 = sqrtRatioX96 * sqrtRatioX96; // Q192-scaled
    const dec0 = BigInt(pool.token0.decimals);
    const dec1 = BigInt(pool.token1.decimals);

    if (dec1 >= dec0) {
        const pow = 10n ** (dec1 - dec0);
        return { num: Q192 * pow, den: sqrtP2 };
    } else {
        const pow = 10n ** (dec0 - dec1);
        return { num: Q192, den: sqrtP2 * pow };
    }
}

/**
 * Project-convention pool price = quoteToken per 1 baseToken, as bigint
 * (scaled to the quote token's decimals).
 */
export function poolPrice(
    pool: PartialSdkPool,
    quoteTokenAddress: EvmAddress
): bigint {
    if (sameAddress(quoteTokenAddress, pool.token1.address)) {
        // quote = token1 ⇒ want token1 per token0
        const frac = priceOfToken0InToken1(pool);
        return (frac.num * 10n ** BigInt(pool.token1.decimals)) / frac.den;
    }
    if (sameAddress(quoteTokenAddress, pool.token0.address)) {
        // quote = token0 ⇒ want token0 per token1
        const frac = priceOfToken1InToken0(pool);
        return (frac.num * 10n ** BigInt(pool.token0.decimals)) / frac.den;
    }
    throw new Error(
        "poolPrice: quote token must be pool.token0 or pool.token1"
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
    const pool = {
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
    const { token0, token1, baseIsToken0 } = PoolUtils.tokenOrder(pool);
    console.log({
        base: pool.baseToken.symbol,
        quote: pool.quoteToken.symbol,
        token0: token0.symbol,
        token1: token1.symbol,
        baseIsToken0,
        priceHuman: Number(pool.price) / 10 ** pool.quoteToken.decimals,
    });
    return pool;
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
    const [token0Addr, token1Addr, feeRaw, liquidityRaw] = await Promise.all([
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
    ]);

    const slot0 = (await publicClient.readContract({
        address,
        abi: uniswapV3PoolAbi,
        functionName: "slot0",
    })) as [
        bigint, // sqrtPriceX96
        number, // tick
        number, // observationIndex
        number, // observationCardinality
        number, // observationCardinalityNext
        number, // feeProtocol
        boolean, // unlocked
    ];

    // Load SDK tokens (uses your existing loadSdkToken)
    const [sdkToken0, sdkToken1] = await Promise.all([
        loadSdkToken(config, chainId, token0Addr),
        loadSdkToken(config, chainId, token1Addr),
    ]);

    // Normalize types for the Pool constructor
    const fee = Number(feeRaw);
    const sqrtPriceX96 = slot0[0];
    const tick = Number(slot0[1]);
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
export async function findPoolsByTokenPair(
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

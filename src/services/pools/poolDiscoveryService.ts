/**
 * Pool Discovery Service
 *
 * Discovers Uniswap V3 pools for token pairs using the factory contract
 * and enriches them with metrics (liquidity, volume, TVL)
 */

import { type PublicClient } from "viem";
import { PoolService, PoolWithTokens } from "./poolService";
import type { Services } from "../ServiceFactory";
import type { Clients } from "../ClientsFactory";
import {
    UNISWAP_V3_FACTORY_ABI,
    UNISWAP_V3_FACTORY_ADDRESSES,
    SUPPORTED_FEE_TIERS,
    getTickSpacing,
    formatFeePercentage,
} from "@/lib/contracts/uniswapV3Factory";
import { normalizeAddress, compareAddresses } from "@/lib/utils/evm";
import { type SupportedChainsType } from "@/config/chains";
import { getSubgraphService } from "@/services/subgraph";
import { POOLS_QUERY } from "@/services/subgraph/queries";

export interface PoolDiscoveryResult {
    poolAddress: string;
    fee: number;
    feePercentage: string;
    tickSpacing: number;
    liquidity: string; // BigInt as string
    exists: boolean;
    // Subgraph metrics (USD values)
    tvlUSD?: string;
    volumeUSD?: string;
    feesUSD?: string;
    pool?: PoolWithTokens;
}

export interface TokenPairInput {
    tokenA: string;
    tokenB: string;
}

// Subgraph pool data interface
interface PoolData {
    id: string;
    token0: {
        id: string;
        symbol: string;
        name: string;
        decimals: string;
    };
    token1: {
        id: string;
        symbol: string;
        name: string;
        decimals: string;
    };
    feeTier: string;
    token0Price: string;
    token1Price: string;
    liquidity: string;
    sqrtPrice: string;
    tick: string;
    totalValueLockedUSD: string;
    poolDayData: Array<{
        date: number;
        volumeUSD: string;
        feesUSD: string;
    }>;
}


export class PoolDiscoveryService {
    private poolService: PoolService;
    private rpcClients: Map<SupportedChainsType, PublicClient>;

    constructor(
        requiredClients: Pick<Clients, "rpcClients">,
        requiredServices: Pick<Services, "poolService">
    ) {
        this.rpcClients = requiredClients.rpcClients;
        this.poolService = requiredServices.poolService;
    }

    /**
     * Find all available pools for a token pair across all fee tiers
     */
    async findPoolsForTokenPair(
        chain: SupportedChainsType,
        tokenPair: TokenPairInput
    ): Promise<PoolDiscoveryResult[]> {
        const { tokenA, tokenB } = tokenPair;

        // Normalize and sort token addresses (Uniswap V3 requires token0 < token1)
        const normalizedTokenA = normalizeAddress(tokenA);
        const normalizedTokenB = normalizeAddress(tokenB);

        const [sortedToken0, sortedToken1] =
            compareAddresses(normalizedTokenA, normalizedTokenB) < 0
                ? [normalizedTokenA, normalizedTokenB]
                : [normalizedTokenB, normalizedTokenA];

        // Query factory for all fee tiers in parallel
        const poolQueries = SUPPORTED_FEE_TIERS.map((fee) =>
            this.queryPoolAddress(chain, sortedToken0, sortedToken1, fee)
        );

        const poolAddresses = await Promise.all(poolQueries);

        // Process results and fetch metrics for existing pools
        const results: PoolDiscoveryResult[] = [];

        for (let i = 0; i < SUPPORTED_FEE_TIERS.length; i++) {
            const fee = SUPPORTED_FEE_TIERS[i];
            const poolAddress = poolAddresses[i];

            if (
                poolAddress &&
                poolAddress !== "0x0000000000000000000000000000000000000000"
            ) {
                // Pool exists - fetch metrics
                const metrics = await this.getPoolMetrics(chain, poolAddress);
                const pool = await this.enrichPoolData(chain, poolAddress);

                results.push({
                    poolAddress,
                    fee,
                    feePercentage: formatFeePercentage(fee),
                    tickSpacing: getTickSpacing(fee),
                    liquidity: metrics.liquidity,
                    exists: true,
                    pool,
                });
            } else {
                // Pool doesn't exist
                results.push({
                    poolAddress: "0x0000000000000000000000000000000000000000",
                    fee,
                    feePercentage: formatFeePercentage(fee),
                    tickSpacing: getTickSpacing(fee),
                    liquidity: "0",
                    exists: false,
                });
            }
        }

        // Enrich existing pools with subgraph metrics
        await this.enrichWithSubgraphMetrics(
            results.filter((r) => r.exists),
            chain
        );

        // Sort by liquidity (highest first) - existing pools first
        return results.sort((a, b) => {
            if (a.exists && !b.exists) return -1;
            if (!a.exists && b.exists) return 1;
            return BigInt(b.liquidity) > BigInt(a.liquidity) ? 1 : -1;
        });
    }

    /**
     * Query factory contract for pool address
     */
    private async queryPoolAddress(
        chain: SupportedChainsType,
        token0: string,
        token1: string,
        fee: number
    ): Promise<string | null> {
        const publicClient = this.rpcClients.get(chain);
        if (!publicClient) {
            throw new Error(`No RPC client available for chain: ${chain}`);
        }

        const factoryAddress = UNISWAP_V3_FACTORY_ADDRESSES[chain];
        if (!factoryAddress) {
            throw new Error(
                `Uniswap V3 Factory not deployed on chain: ${chain}`
            );
        }

        try {
            const poolAddress = await publicClient.readContract({
                address: factoryAddress,
                abi: UNISWAP_V3_FACTORY_ABI,
                functionName: "getPool",
                args: [token0 as `0x${string}`, token1 as `0x${string}`, fee],
            });

            return poolAddress ? normalizeAddress(poolAddress as string) : null;
        } catch (error) {
            throw new Error(`Failed to query pool address: ${error}`);
        }
    }

    /**
     * Get pool metrics (liquidity, etc.) from blockchain
     */
    private async getPoolMetrics(
        chain: SupportedChainsType,
        poolAddress: string
    ): Promise<{ liquidity: string }> {
        const publicClient = this.rpcClients.get(chain);
        if (!publicClient) {
            throw new Error(`No RPC client available for chain: ${chain}`);
        }

        try {
            // Use the same ABI as the pool service
            const { UNISWAP_V3_POOL_ABI } = await import(
                "../../lib/contracts/uniswapV3Pool.js"
            );

            const liquidity = await publicClient.readContract({
                address: poolAddress as `0x${string}`,
                abi: UNISWAP_V3_POOL_ABI,
                functionName: "liquidity",
                args: [], // Explicit empty args array
            });

            return {
                liquidity: (liquidity as bigint).toString(),
            };
        } catch (error) {
            // If we can't fetch metrics, return zeros but don't fail
            console.warn(
                `Failed to fetch pool metrics for ${poolAddress}:`,
                error
            );
            return {
                liquidity: "0",
            };
        }
    }

    /**
     * Enrich pool data by creating/updating in database
     */
    private async enrichPoolData(
        chain: SupportedChainsType,
        poolAddress: string
    ): Promise<PoolWithTokens | undefined> {
        try {
            // Use existing pool service to create/get pool
            return await this.poolService.createPool(chain, poolAddress);
        } catch (error) {
            // If enrichment fails, don't block the discovery process
            console.warn(
                `Failed to enrich pool data for ${poolAddress}:`,
                error
            );
            return undefined;
        }
    }

    /**
     * Enrich pool results with subgraph metrics (TVL, Volume, Fees)
     */
    private async enrichWithSubgraphMetrics(
        existingPools: PoolDiscoveryResult[],
        chain: SupportedChainsType
    ): Promise<void> {
        if (existingPools.length === 0) return;

        try {
            const subgraphService = getSubgraphService();
            const poolAddresses = existingPools.map((p) =>
                p.poolAddress.toLowerCase()
            );

            console.log(`🔄 Querying The Graph for pool metrics on ${chain}:`, {
                poolAddresses,
                poolCount: poolAddresses.length
            });

            // Query subgraph for pool metrics
            const response = await subgraphService.query<{
                pools: PoolData[];
            }>(
                chain,
                POOLS_QUERY,
                { poolIds: poolAddresses }
            );

            if (response.data?.pools) {
                // Create lookup map for pool data
                const poolsMap = new Map<string, PoolData>();
                response.data.pools.forEach((pool) => {
                    poolsMap.set(pool.id.toLowerCase(), pool);
                });

                // Enrich results with subgraph data
                existingPools.forEach((pool) => {
                    const poolId = pool.poolAddress.toLowerCase();
                    const poolData = poolsMap.get(poolId);

                    if (poolData) {
                        pool.tvlUSD = poolData.totalValueLockedUSD || "0";

                        // Extract 24h metrics from most recent poolDayData entry
                        if (poolData.poolDayData && poolData.poolDayData.length > 0) {
                            const mostRecent = poolData.poolDayData[0]; // Already ordered by date desc
                            pool.volumeUSD = mostRecent.volumeUSD || "0";
                            pool.feesUSD = mostRecent.feesUSD || "0";
                        } else {
                            pool.volumeUSD = "0";
                            pool.feesUSD = "0";
                        }
                    }
                });

                console.log(`📊 Pool metrics enrichment completed for ${chain}:`, {
                    poolsProcessed: response.data.pools.length,
                    poolsWithTvl: existingPools.filter(p => p.tvlUSD && p.tvlUSD !== '0').length,
                    poolsWithVolume: existingPools.filter(p => p.volumeUSD && p.volumeUSD !== '0').length,
                    poolsWithFees: existingPools.filter(p => p.feesUSD && p.feesUSD !== '0').length
                });
            }
        } catch (error) {
            // Graceful degradation - log warning but don't fail
            console.warn(
                `Failed to fetch subgraph metrics for ${chain}:`,
                error
            );
        }
    }

    /**
     * Close database connection (for cleanup in tests)
     */
    async disconnect(): Promise<void> {
        await this.poolService.disconnect();
    }
}

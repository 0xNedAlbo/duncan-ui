/**
 * Pool Price Service - Alchemy RPC Implementation
 *
 * Provides exact pool pricing using Alchemy's eth_call API for both current and historical data.
 * Replaces subgraph-based approximations with precise blockchain data.
 */

import { type PublicClient } from "viem";
import { UNISWAP_V3_POOL_ABI } from "@/lib/contracts/uniswapV3Pool";
import { SupportedChainsType } from "@/config/chains";
import type { Clients } from "../ClientsFactory";
import { PrismaClient } from "@prisma/client";

// Enhanced price data with exact blockchain information
export interface ExactPriceData {
    poolAddress: string;
    blockNumber: bigint;
    blockTimestamp: Date;
    sqrtPriceX96: bigint;
    tick: number;
    source: "alchemy-rpc";
    confidence: "exact";
    chain: string;
    retrievedAt: Date;
}

// Request structure for batch operations
export interface PriceRequest {
    poolAddress: string;
    blockNumber: bigint;
    chain: SupportedChainsType;
    timestamp?: Date;
}

// Rate limiting state
interface RateLimitState {
    lastRequestTime: number;
    requestCount: number;
    resetTime: number;
    chain: string;
}

export class PoolPriceService {
    private clients: Map<SupportedChainsType, PublicClient>;
    private prisma: PrismaClient;
    private rateLimitState: Map<string, RateLimitState> = new Map();

    // Configuration
    private readonly RATE_LIMIT = {
        REQUESTS_PER_SECOND: 10, // Conservative limit for Alchemy
        MAX_BATCH_SIZE: 50,
        RETRY_ATTEMPTS: 3,
        RETRY_DELAY_MS: 1000,
    };

    constructor(requiredClients: Pick<Clients, "rpcClients" | "prisma">) {
        this.clients = requiredClients.rpcClients;
        this.prisma = requiredClients.prisma;
        this.initializeRateLimitStates();
    }

    /**
     * Initialize rate limiting state for all available chains
     */
    private initializeRateLimitStates(): void {
        Array.from(this.clients.keys()).forEach((chainName) => {
            this.rateLimitState.set(chainName, {
                lastRequestTime: 0,
                requestCount: 0,
                resetTime: 0,
                chain: chainName,
            });
        });
    }

    /**
     * Get cached price data from database
     * Parses cache key and queries PoolPriceCache table
     */
    private async getCachedPrice(
        cacheKey: string
    ): Promise<ExactPriceData | null> {
        try {
            // Parse cache key: ${chain}-${poolAddress}-${blockNumber}
            const parts = cacheKey.split("-");
            if (parts.length < 3) return null;

            const chain = parts[0];
            const poolAddress = parts[1];
            const blockNumber = BigInt(parts.slice(2).join("-")); // Handle addresses with dashes

            const cached = await this.prisma.poolPriceCache.findUnique({
                where: {
                    chain_poolAddress_blockNumber: {
                        chain,
                        poolAddress,
                        blockNumber,
                    },
                },
            });

            if (!cached) return null;

            // Convert database record back to ExactPriceData format
            return {
                poolAddress: cached.poolAddress,
                blockNumber: cached.blockNumber,
                blockTimestamp: cached.blockTimestamp,
                sqrtPriceX96: BigInt(cached.sqrtPriceX96),
                tick: cached.tick,
                source: cached.source as "alchemy-rpc",
                confidence: cached.confidence as "exact",
                chain: cached.chain,
                retrievedAt: cached.retrievedAt,
            };
        } catch (error) {
            // Log error but don't throw - cache miss is acceptable
            // Cache lookup failed
            return null;
        }
    }

    /**
     * Store price data in database cache
     * Uses upsert to handle conflicts gracefully
     */
    private async setCachedPrice(
        cacheKey: string,
        priceData: ExactPriceData
    ): Promise<void> {
        try {
            // Parse cache key for database storage
            const parts = cacheKey.split("-");
            if (parts.length < 3) return;

            const chain = parts[0];
            const poolAddress = parts[1];
            const blockNumber = BigInt(parts.slice(2).join("-"));

            await this.prisma.poolPriceCache.upsert({
                where: {
                    chain_poolAddress_blockNumber: {
                        chain,
                        poolAddress,
                        blockNumber,
                    },
                },
                update: {
                    // Update retrieved timestamp on cache hit
                    retrievedAt: new Date(),
                },
                create: {
                    chain,
                    poolAddress,
                    blockNumber,
                    sqrtPriceX96: priceData.sqrtPriceX96.toString(),
                    tick: priceData.tick,
                    blockTimestamp: priceData.blockTimestamp,
                    source: priceData.source,
                    confidence: priceData.confidence,
                    retrievedAt: priceData.retrievedAt,
                },
            });
        } catch (error) {
            // Log error but don't throw - cache failure shouldn't block price retrieval
            // Cache storage failed
        }
    }

    /**
     * Get current exact pool price (latest block)
     */
    async getCurrentExactPoolPrice(
        poolAddress: string,
        chain: SupportedChainsType
    ): Promise<ExactPriceData> {
        return this.getExactPoolPriceAtBlock(poolAddress, chain);
    }

    /**
     * Get exact pool price at specific block number
     */
    async getExactPoolPriceAtBlock(
        poolAddress: string,
        chain: SupportedChainsType,
        blockNumber?: bigint,
        timestamp?: Date
    ): Promise<ExactPriceData> {
        // Check cache first
        const cacheKey = `${chain}-${poolAddress.toLowerCase()}-${blockNumber}`;
        const cachedData = await this.getCachedPrice(cacheKey);
        if (cachedData) {
            return cachedData;
        }

        const client = this.clients.get(chain);
        if (!client) {
            throw new Error(`No RPC client available for chain: ${chain}`);
        }

        await this.enforceRateLimit(chain);

        try {
            // Get block timestamp if not provided
            let blockTimestamp = timestamp;
            if (!blockNumber || !blockTimestamp) {
                const block = await client.getBlock({ blockNumber });
                blockTimestamp = new Date(Number(block.timestamp) * 1000);
                blockNumber = block.number;
            }

            // Call slot0() function on the pool contract at specific block
            const slot0Data = await client.readContract({
                address: poolAddress as `0x${string}`,
                abi: UNISWAP_V3_POOL_ABI,
                functionName: "slot0",
                blockNumber,
            });

            const [sqrtPriceX96, tick] = slot0Data;

            const priceData: ExactPriceData = {
                poolAddress: poolAddress.toLowerCase(),
                blockNumber,
                blockTimestamp,
                sqrtPriceX96,
                tick,
                source: "alchemy-rpc",
                confidence: "exact",
                chain,
                retrievedAt: new Date(),
            };

            // Cache the result (historical data never changes)
            await this.setCachedPrice(cacheKey, priceData);

            return priceData;
        } catch (error) {
            throw new Error(
                `RPC call failed: ${
                    error instanceof Error ? error.message : "Unknown error"
                }`
            );
        }
    }

    /**
     * Batch fetch multiple pool prices for efficiency
     */
    async batchGetPoolPrices(
        requests: PriceRequest[]
    ): Promise<ExactPriceData[]> {
        if (requests.length === 0) return [];

        // Group requests by chain for parallel processing
        const requestsByChain = new Map<SupportedChainsType, PriceRequest[]>();
        for (const request of requests) {
            if (!requestsByChain.has(request.chain)) {
                requestsByChain.set(request.chain, []);
            }
            requestsByChain.get(request.chain)!.push(request);
        }

        // Process each chain in parallel
        const chainPromises = Array.from(requestsByChain.entries()).map(
            async ([, chainRequests]) => {
                const results: ExactPriceData[] = [];

                // Process requests in batches to respect rate limits
                for (
                    let i = 0;
                    i < chainRequests.length;
                    i += this.RATE_LIMIT.MAX_BATCH_SIZE
                ) {
                    const batch = chainRequests.slice(
                        i,
                        i + this.RATE_LIMIT.MAX_BATCH_SIZE
                    );

                    const batchPromises = batch.map((req) =>
                        this.getExactPoolPriceAtBlock(
                            req.poolAddress,
                            req.chain,
                            req.blockNumber,
                            req.timestamp
                        ).catch(() => {
                            return null; // Return null for failed requests
                        })
                    );

                    const batchResults = await Promise.all(batchPromises);
                    results.push(
                        ...batchResults.filter(
                            (result): result is ExactPriceData =>
                                result !== null
                        )
                    );

                    // Add delay between batches to respect rate limits
                    if (
                        i + this.RATE_LIMIT.MAX_BATCH_SIZE <
                        chainRequests.length
                    ) {
                        await this.delay(200); // 200ms between batches
                    }
                }

                return results;
            }
        );

        const allResults = await Promise.all(chainPromises);
        const flatResults = allResults.flat();

        return flatResults;
    }

    /**
     * Clear cache (useful for testing or memory management)
     * Clears database cache
     */
    async clearCache(): Promise<void> {
        try {
            await this.prisma.poolPriceCache.deleteMany({});
        } catch (error) {
            // Cache clear failed
            throw error;
        }
    }

    /**
     * Get cache statistics from database
     */
    async getCacheStats(): Promise<{ size: number; keys: string[] }> {
        try {
            // Get total count
            const size = await this.prisma.poolPriceCache.count();

            // Get sample keys (first 10)
            const sampleRecords = await this.prisma.poolPriceCache.findMany({
                take: 10,
                select: {
                    chain: true,
                    poolAddress: true,
                    blockNumber: true,
                },
                orderBy: {
                    retrievedAt: "desc",
                },
            });

            const keys = sampleRecords.map(
                (record) =>
                    `${record.chain}-${record.poolAddress}-${record.blockNumber}`
            );

            return { size, keys };
        } catch (error) {
            // Cache stats failed
            // Return empty stats if database fails
            return {
                size: 0,
                keys: [],
            };
        }
    }

    /**
     * Enforce rate limiting per chain
     */
    private async enforceRateLimit(chain: string): Promise<void> {
        const state = this.rateLimitState.get(chain);
        if (!state) return;

        const now = Date.now();

        // Reset counter every second
        if (now >= state.resetTime) {
            state.requestCount = 0;
            state.resetTime = now + 1000;
        }

        // Check if we need to wait
        if (state.requestCount >= this.RATE_LIMIT.REQUESTS_PER_SECOND) {
            const waitTime = state.resetTime - now;
            if (waitTime > 0) {
                await this.delay(waitTime);
            }
        }

        state.requestCount++;
        state.lastRequestTime = now;
    }

    /**
     * Utility delay function
     */
    private delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}

/**
 * Pool Price Service - Alchemy RPC Implementation
 *
 * Provides exact pool pricing using Alchemy's eth_call API for both current and historical data.
 * Replaces subgraph-based approximations with precise blockchain data.
 */

import { createPublicClient, http, type PublicClient } from "viem";
import { UNISWAP_V3_POOL_ABI } from "@/lib/contracts/uniswapV3Pool";
import {
    getChainConfig,
    SUPPORTED_CHAINS,
    SupportedChainsType,
} from "@/config/chains";

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

// Cache key structure
interface PriceCache {
    [key: string]: ExactPriceData; // key: `${chain}-${poolAddress}-${blockNumber}`
}

// Rate limiting state
interface RateLimitState {
    lastRequestTime: number;
    requestCount: number;
    resetTime: number;
    chain: string;
}

export class PoolPriceService {
    private clients: Map<string, PublicClient> = new Map();
    private priceCache: PriceCache = {};
    private rateLimitState: Map<string, RateLimitState> = new Map();

    // Configuration
    private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours (historical data doesn't change)
    private readonly RATE_LIMIT = {
        REQUESTS_PER_SECOND: 10, // Conservative limit for Alchemy
        MAX_BATCH_SIZE: 50,
        RETRY_ATTEMPTS: 3,
        RETRY_DELAY_MS: 1000,
    };

    constructor() {
        this.initializeClients();
    }

    /**
     * Initialize viem clients for all supported chains
     */
    private initializeClients(): PoolPriceService {
        SUPPORTED_CHAINS.forEach((chainName) => {
            const config = getChainConfig(chainName);
            const client = createPublicClient({
                chain: config as any,
                transport: http(config.rpcUrl, {
                    timeout: 30000, // 30s timeout
                    retryCount: 3,
                    retryDelay: 1000,
                }),
            }) as any;

            this.clients.set(chainName, client);

            // Initialize rate limiting state for this chain
            this.rateLimitState.set(chainName, {
                lastRequestTime: 0,
                requestCount: 0,
                resetTime: 0,
                chain: chainName,
            });
        });
        return this;
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
        if (this.priceCache[cacheKey]) {
            return this.priceCache[cacheKey];
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
            this.priceCache[cacheKey] = priceData;

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
     */
    clearCache(): void {
        this.priceCache = {};
    }

    /**
     * Get cache statistics
     */
    getCacheStats(): { size: number; keys: string[] } {
        const keys = Object.keys(this.priceCache);
        return {
            size: keys.length,
            keys: keys.slice(0, 10), // Show first 10 keys as sample
        };
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

// Singleton instance
let poolPriceServiceInstance: PoolPriceService | null = null;

export function getPoolPriceService(): PoolPriceService {
    if (!poolPriceServiceInstance) {
        poolPriceServiceInstance = new PoolPriceService();
    }
    return poolPriceServiceInstance;
}

// Legacy export for backward compatibility
export function getHistoricalPriceService(): PoolPriceService {
    return getPoolPriceService();
}

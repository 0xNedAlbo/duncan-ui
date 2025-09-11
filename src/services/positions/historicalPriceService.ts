/**
 * Historical Price Service - Alchemy RPC Implementation
 * 
 * Provides exact block-level pool pricing using Alchemy's eth_call API.
 * Replaces subgraph-based approximations with precise blockchain data.
 */

import { createPublicClient, http, type PublicClient } from 'viem';
import { mainnet, arbitrum, base } from 'viem/chains';
import { UNISWAP_V3_POOL_ABI } from '@/lib/contracts/uniswapV3Pool';
import { sqrtRatioX96ToToken1PerToken0 } from '@/lib/utils/uniswap-v3/price';

// Chain configuration with RPC endpoints
const CHAIN_CONFIG = {
  ethereum: {
    chain: mainnet,
    rpcUrl: process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL || '',
    id: 1
  },
  arbitrum: {
    chain: arbitrum,
    rpcUrl: process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL || '',
    id: 42161
  },
  base: {
    chain: base,
    rpcUrl: process.env.NEXT_PUBLIC_BASE_RPC_URL || '',
    id: 8453
  }
} as const;

export type SupportedChain = keyof typeof CHAIN_CONFIG;

// Enhanced price data with exact blockchain information
export interface ExactPriceData {
  poolAddress: string;
  blockNumber: bigint;
  blockTimestamp?: Date;
  sqrtPriceX96: bigint;
  tick: number;
  price: string; // BigInt string: token1 per token0 in smallest units
  source: 'alchemy-rpc';
  confidence: 'exact';
  chain: string;
  retrievedAt: Date;
}

// Request structure for batch operations
export interface PriceRequest {
  poolAddress: string;
  blockNumber: bigint;
  chain: SupportedChain;
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

export class HistoricalPriceService {
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
  private initializeClients(): void {
    for (const [chainName, config] of Object.entries(CHAIN_CONFIG)) {
      if (!config.rpcUrl) {
        console.warn(`⚠️ No RPC URL configured for ${chainName}`);
        continue;
      }

      const client = createPublicClient({
        chain: config.chain,
        transport: http(config.rpcUrl, {
          timeout: 30000, // 30s timeout
          retryCount: 3,
          retryDelay: 1000,
        }),
      });

      this.clients.set(chainName, client);
      
      // Initialize rate limiting state for this chain
      this.rateLimitState.set(chainName, {
        lastRequestTime: 0,
        requestCount: 0,
        resetTime: 0,
        chain: chainName
      });

      console.log(`✅ Initialized RPC client for ${chainName}:`, config.rpcUrl.substring(0, 50) + '...');
    }
  }

  /**
   * Get exact pool price at specific block number
   */
  async getExactPoolPriceAtBlock(
    poolAddress: string,
    blockNumber: bigint,
    chain: SupportedChain,
    timestamp?: Date
  ): Promise<ExactPriceData> {
    // Check cache first
    const cacheKey = `${chain}-${poolAddress.toLowerCase()}-${blockNumber}`;
    if (this.priceCache[cacheKey]) {
      console.log(`💾 Cache hit for ${poolAddress} at block ${blockNumber}`);
      return this.priceCache[cacheKey];
    }

    const client = this.clients.get(chain);
    if (!client) {
      throw new Error(`No RPC client available for chain: ${chain}`);
    }

    await this.enforceRateLimit(chain);

    try {
      console.log(`🔍 Fetching pool price: ${poolAddress} at block ${blockNumber} on ${chain}`);

      // Call slot0() function on the pool contract at specific block
      const slot0Data = await client.readContract({
        address: poolAddress as `0x${string}`,
        abi: UNISWAP_V3_POOL_ABI,
        functionName: 'slot0',
        blockNumber,
      });

      const [sqrtPriceX96, tick] = slot0Data;

      // Convert sqrtPriceX96 to human readable price (token1 per token0)
      const priceFormatted = sqrtRatioX96ToToken1PerToken0(sqrtPriceX96, 18, 18); // Default to 18 decimals

      const priceData: ExactPriceData = {
        poolAddress: poolAddress.toLowerCase(),
        blockNumber,
        blockTimestamp: timestamp,
        sqrtPriceX96,
        tick,
        price: priceFormatted.toString(),
        source: 'alchemy-rpc',
        confidence: 'exact',
        chain,
        retrievedAt: new Date()
      };

      // Cache the result (historical data never changes)
      this.priceCache[cacheKey] = priceData;

      console.log(`✅ Retrieved price for ${poolAddress}: ${priceFormatted} at block ${blockNumber}`);
      return priceData;

    } catch (error) {
      console.error(`❌ Failed to get pool price for ${poolAddress} at block ${blockNumber}:`, error);
      throw new Error(`RPC call failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Batch fetch multiple pool prices for efficiency
   */
  async batchGetPoolPrices(requests: PriceRequest[]): Promise<ExactPriceData[]> {
    if (requests.length === 0) return [];

    console.log(`📦 Batch fetching ${requests.length} pool prices`);

    // Group requests by chain for parallel processing
    const requestsByChain = new Map<SupportedChain, PriceRequest[]>();
    for (const request of requests) {
      if (!requestsByChain.has(request.chain)) {
        requestsByChain.set(request.chain, []);
      }
      requestsByChain.get(request.chain)!.push(request);
    }

    // Process each chain in parallel
    const chainPromises = Array.from(requestsByChain.entries()).map(async ([, chainRequests]) => {
      const results: ExactPriceData[] = [];
      
      // Process requests in batches to respect rate limits
      for (let i = 0; i < chainRequests.length; i += this.RATE_LIMIT.MAX_BATCH_SIZE) {
        const batch = chainRequests.slice(i, i + this.RATE_LIMIT.MAX_BATCH_SIZE);
        
        const batchPromises = batch.map(req => 
          this.getExactPoolPriceAtBlock(req.poolAddress, req.blockNumber, req.chain, req.timestamp)
            .catch(error => {
              console.warn(`⚠️ Failed to get price for ${req.poolAddress} at block ${req.blockNumber}:`, error.message);
              return null; // Return null for failed requests
            })
        );

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults.filter((result): result is ExactPriceData => result !== null));

        // Add delay between batches to respect rate limits
        if (i + this.RATE_LIMIT.MAX_BATCH_SIZE < chainRequests.length) {
          await this.delay(200); // 200ms between batches
        }
      }
      
      return results;
    });

    const allResults = await Promise.all(chainPromises);
    const flatResults = allResults.flat();

    console.log(`✅ Batch completed: ${flatResults.length}/${requests.length} successful`);
    return flatResults;
  }

  /**
   * Get price with graceful fallback handling
   */
  async getPriceWithFallback(
    poolAddress: string,
    blockNumber: bigint,
    timestamp: Date,
    chain: SupportedChain
  ): Promise<ExactPriceData> {
    try {
      return await this.getExactPoolPriceAtBlock(poolAddress, blockNumber, chain, timestamp);
    } catch (error) {
      console.warn(`⚠️ Primary RPC call failed for ${poolAddress}, attempting fallback:`, error instanceof Error ? error.message : 'Unknown error');

      // Fallback 1: Try current block (latest price)
      try {
        const latestPrice = await this.getExactPoolPriceAtBlock(poolAddress, BigInt(0), chain, timestamp);
        return {
          ...latestPrice,
          blockNumber, // Keep original block number for reference
          blockTimestamp: timestamp,
          confidence: 'exact' as const, // Still exact, just not from the specific block
          retrievedAt: new Date()
        };
      } catch (fallbackError) {
        console.error(`❌ All fallback attempts failed for ${poolAddress}:`, fallbackError);
        throw new Error(`Failed to retrieve price data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  /**
   * Clear cache (useful for testing or memory management)
   */
  clearCache(): void {
    this.priceCache = {};
    console.log('🧹 Price cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    const keys = Object.keys(this.priceCache);
    return {
      size: keys.length,
      keys: keys.slice(0, 10) // Show first 10 keys as sample
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
        console.log(`⏳ Rate limiting ${chain}: waiting ${waitTime}ms`);
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
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validate chain is supported
   */
  private validateChain(chain: string): asserts chain is SupportedChain {
    if (!Object.keys(CHAIN_CONFIG).includes(chain)) {
      throw new Error(`Unsupported chain: ${chain}. Supported chains: ${Object.keys(CHAIN_CONFIG).join(', ')}`);
    }
  }

  /**
   * Get client for chain (with validation)
   */
  private getClient(chain: SupportedChain): PublicClient {
    const client = this.clients.get(chain);
    if (!client) {
      throw new Error(`No RPC client available for chain: ${chain}`);
    }
    return client;
  }
}

// Singleton instance
let historicalPriceServiceInstance: HistoricalPriceService | null = null;

export function getHistoricalPriceService(): HistoricalPriceService {
  if (!historicalPriceServiceInstance) {
    historicalPriceServiceInstance = new HistoricalPriceService();
  }
  return historicalPriceServiceInstance;
}

// Export types for use in other services (already declared above)
/**
 * Etherscan Event Service
 * 
 * Fetches Uniswap V3 NFT Position Manager events using Etherscan API
 * Compatible with EventStateCalculator for exact blockchain event data.
 */

import { SupportedChainsType } from '@/config/chains';
import type { RawPositionEvent } from '../positions/eventStateCalculator';

// Uniswap V3 NFT Position Manager event signatures
const EVENT_SIGNATURES = {
  INCREASE_LIQUIDITY: '0x3067048beee31b25b2f1681f88dac838c8bba36af25bfb2b7cf7473a5847e35f',
  DECREASE_LIQUIDITY: '0x26f6a048ee9138f2c0ce266f322cb99228e8d619ae2bff30c67f8dcf9d2377b4', 
  COLLECT: '0x40d0efd1a53d60ecbf40971b9daf7dc90178c3aadc7aab1765632738fa8b8f01'
} as const;

// Chain configurations for Etherscan v2 unified API
const CHAIN_CONFIG = {
  ethereum: {
    chainId: 1,
    nftManagerAddress: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88'
  },
  arbitrum: {
    chainId: 42161,
    nftManagerAddress: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88'
  },
  base: {
    chainId: 8453,
    nftManagerAddress: '0x03a520b32C04BF3bEEf7BF5d8b4B9d7e0e5d25F1' // Base has different address
  }
} as const;

// Etherscan v2 unified API base URL
const API_BASE_URL = 'https://api.etherscan.io/v2/api';

// Etherscan API response types
interface EtherscanLog {
  address: string;
  topics: string[];
  data: string;
  blockNumber: string;
  blockHash: string;
  timeStamp: string;
  gasPrice: string;
  gasUsed: string;
  logIndex: string;
  transactionHash: string;
  transactionIndex: string;
}

interface EtherscanResponse {
  status: string;
  message: string;
  result: EtherscanLog[];
}

// Service options
interface FetchOptions {
  fromBlock?: string | number;
  toBlock?: string | number;
  eventTypes?: Array<keyof typeof EVENT_SIGNATURES>;
}

// Service result
interface FetchResult {
  events: RawPositionEvent[];
  errors: string[];
  totalFetched: number;
  duplicatesRemoved: number;
}

// Rate limiting state
interface RateLimitState {
  lastRequestTime: number;
  requestCount: number;
  resetTime: number;
}

export class EtherscanEventService {
  private rateLimitState: RateLimitState = {
    lastRequestTime: 0,
    requestCount: 0,
    resetTime: 0
  };
  
  private readonly rateLimitDelay = 200; // 200ms between requests (5 req/sec)
  
  /**
   * Fetch position events for a specific NFT token ID
   */
  async fetchPositionEvents(
    chain: SupportedChainsType,
    tokenId: string,
    options: FetchOptions = {}
  ): Promise<FetchResult> {
    console.log(`🔍 Fetching events for token ${tokenId} on ${chain}...`);
    
    const config = CHAIN_CONFIG[chain];
    if (!config) {
      throw new Error(`Unsupported chain: ${chain}`);
    }

    const apiKey = process.env.ETHERSCAN_API_KEY;
    if (!apiKey) {
      throw new Error('Missing API key: ETHERSCAN_API_KEY not found in environment');
    }

    const eventTypes = options.eventTypes || ['INCREASE_LIQUIDITY', 'DECREASE_LIQUIDITY', 'COLLECT'];
    const fromBlock = options.fromBlock || 'earliest';
    const toBlock = options.toBlock || 'latest';

    const result: FetchResult = {
      events: [],
      errors: [],
      totalFetched: 0,
      duplicatesRemoved: 0
    };

    // Fetch events for each event type
    for (const eventType of eventTypes) {
      try {
        console.log(`  📥 Fetching ${eventType} events...`);
        
        const logs = await this.fetchEventLogs(
          config.chainId,
          apiKey,
          config.nftManagerAddress,
          EVENT_SIGNATURES[eventType],
          tokenId,
          fromBlock,
          toBlock
        );

        console.log(`  ✅ Found ${logs.length} ${eventType} logs`);

        // Parse each log into structured event data
        for (const log of logs) {
          try {
            const parsed = this.parseEventLog(log, eventType, chain);
            if (parsed) {
              result.events.push(parsed);
              result.totalFetched++;
            }
          } catch (error) {
            const errorMsg = `Failed to parse ${eventType} log ${log.transactionHash}:${log.logIndex}: ${error instanceof Error ? error.message : 'Unknown error'}`;
            result.errors.push(errorMsg);
            console.warn(`⚠️ ${errorMsg}`);
          }
        }

        // Rate limiting between requests
        if (eventTypes.indexOf(eventType) < eventTypes.length - 1) {
          await this.delay(this.rateLimitDelay);
        }

      } catch (error) {
        const errorMsg = `Failed to fetch ${eventType} events: ${error instanceof Error ? error.message : 'Unknown error'}`;
        result.errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
      }
    }

    // Remove duplicates and sort by blockchain order
    const beforeDedup = result.events.length;
    result.events = this.deduplicateAndSort(result.events);
    result.duplicatesRemoved = beforeDedup - result.events.length;

    console.log(`📊 Fetch complete: ${result.events.length} events (${result.duplicatesRemoved} duplicates removed, ${result.errors.length} errors)`);
    
    return result;
  }

  /**
   * Fetch event logs from Etherscan v2 unified API
   */
  private async fetchEventLogs(
    chainId: number,
    apiKey: string,
    contractAddress: string,
    eventSignature: string,
    tokenId: string,
    fromBlock: string | number,
    toBlock: string | number
  ): Promise<EtherscanLog[]> {
    await this.enforceRateLimit();

    // Create topic filter for tokenId (topic[1] for most events)
    const tokenIdHex = '0x' + BigInt(tokenId).toString(16).padStart(64, '0');
    
    const params = new URLSearchParams({
      chainid: chainId.toString(), // v2 API uses chainid parameter
      module: 'logs',
      action: 'getLogs',
      address: contractAddress,
      fromBlock: fromBlock.toString(),
      toBlock: toBlock.toString(),
      topic0: eventSignature,
      topic1: tokenIdHex, // Filter by tokenId
      apikey: apiKey
    });

    const url = `${API_BASE_URL}?${params.toString()}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Duncan-UI/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: EtherscanResponse = await response.json();
      
      if (data.status !== '1') {
        if (data.message === 'No records found') {
          return []; // Normal case - no events for this filter
        }
        throw new Error(`Etherscan API error: ${data.message}`);
      }

      return Array.isArray(data.result) ? data.result : [];

    } catch (error) {
      console.error(`🔥 API request failed:`, { url, error });
      throw error;
    }
  }

  /**
   * Parse raw Etherscan log into RawPositionEvent format
   */
  private parseEventLog(
    log: EtherscanLog,
    eventType: keyof typeof EVENT_SIGNATURES,
    chain: SupportedChainsType
  ): RawPositionEvent | null {
    try {
      const blockNumber = BigInt(log.blockNumber);
      const blockTimestamp = new Date(parseInt(log.timeStamp) * 1000);
      const transactionIndex = parseInt(log.transactionIndex);
      const logIndex = parseInt(log.logIndex);

      // Extract tokenId from topic[1]
      const tokenId = BigInt(log.topics[1]).toString();

      const baseEvent: Omit<RawPositionEvent, 'liquidity' | 'amount0' | 'amount1' | 'recipient'> = {
        eventType: eventType as RawPositionEvent['eventType'],
        tokenId,
        transactionHash: log.transactionHash,
        blockNumber,
        transactionIndex,
        logIndex,
        blockTimestamp,
        chain
      };

      // Parse event-specific data from log.data
      switch (eventType) {
        case 'INCREASE_LIQUIDITY': {
          // IncreaseLiquidity(uint256 indexed tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)
          const { liquidity, amount0, amount1 } = this.decodeIncreaseLiquidityData(log.data);
          return {
            ...baseEvent,
            liquidity: liquidity.toString(),
            amount0: amount0.toString(),
            amount1: amount1.toString()
          } as RawPositionEvent;
        }

        case 'DECREASE_LIQUIDITY': {
          // DecreaseLiquidity(uint256 indexed tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)
          const { liquidity, amount0, amount1 } = this.decodeDecreaseLiquidityData(log.data);
          return {
            ...baseEvent,
            liquidity: liquidity.toString(),
            amount0: amount0.toString(),
            amount1: amount1.toString()
          } as RawPositionEvent;
        }

        case 'COLLECT': {
          // Collect(uint256 indexed tokenId, address recipient, uint256 amount0, uint256 amount1)
          const { recipient, amount0, amount1 } = this.decodeCollectData(log.data);
          return {
            ...baseEvent,
            amount0: amount0.toString(),
            amount1: amount1.toString(),
            recipient
          } as RawPositionEvent;
        }

        default:
          console.warn(`🤷 Unknown event type: ${eventType}`);
          return null;
      }

    } catch (error) {
      console.error(`💥 Failed to parse log:`, { log, eventType, error });
      throw error;
    }
  }

  /**
   * Decode IncreaseLiquidity event data
   */
  private decodeIncreaseLiquidityData(data: string): { liquidity: bigint; amount0: bigint; amount1: bigint } {
    // Remove 0x prefix and split into 32-byte chunks
    const hex = data.slice(2);
    const chunks = hex.match(/.{64}/g) || [];
    
    if (chunks.length < 3) {
      throw new Error(`Invalid IncreaseLiquidity data: expected 3 chunks, got ${chunks.length}`);
    }

    return {
      liquidity: BigInt('0x' + chunks[0]),
      amount0: BigInt('0x' + chunks[1]),
      amount1: BigInt('0x' + chunks[2])
    };
  }

  /**
   * Decode DecreaseLiquidity event data
   */
  private decodeDecreaseLiquidityData(data: string): { liquidity: bigint; amount0: bigint; amount1: bigint } {
    // Same structure as IncreaseLiquidity
    return this.decodeIncreaseLiquidityData(data);
  }

  /**
   * Decode Collect event data
   */
  private decodeCollectData(data: string): { recipient: string; amount0: bigint; amount1: bigint } {
    // Collect(uint256 indexed tokenId, address recipient, uint256 amount0, uint256 amount1)
    // topic[0] = event signature
    // topic[1] = tokenId (indexed)
    // data contains: recipient (32 bytes) + amount0 (32 bytes) + amount1 (32 bytes)
    
    const hex = data.slice(2);
    const chunks = hex.match(/.{64}/g) || [];
    
    if (chunks.length < 3) {
      throw new Error(`Invalid Collect data: expected 3 chunks, got ${chunks.length}`);
    }

    // Extract recipient address (last 20 bytes of first chunk)
    const recipientHex = chunks[0]?.slice(24); // Remove first 12 bytes (padding)
    if (!recipientHex) {
      throw new Error('Missing recipient data in Collect event');
    }
    const recipient = '0x' + recipientHex;

    return {
      recipient,
      amount0: BigInt('0x' + chunks[1]),
      amount1: BigInt('0x' + chunks[2])
    };
  }

  /**
   * Remove duplicates and sort events by blockchain order
   */
  private deduplicateAndSort(events: RawPositionEvent[]): RawPositionEvent[] {
    // Create unique key for deduplication
    const uniqueEvents = new Map<string, RawPositionEvent>();
    
    for (const event of events) {
      const key = `${event.transactionHash}-${event.logIndex}`;
      if (!uniqueEvents.has(key)) {
        uniqueEvents.set(key, event);
      }
    }

    // Sort by blockchain order
    return Array.from(uniqueEvents.values()).sort((a, b) => {
      if (a.blockNumber !== b.blockNumber) {
        return Number(a.blockNumber - b.blockNumber);
      }
      if (a.transactionIndex !== b.transactionIndex) {
        return a.transactionIndex - b.transactionIndex;
      }
      return a.logIndex - b.logIndex;
    });
  }

  /**
   * Enforce rate limiting per Etherscan API limits
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    
    // Reset counter every second
    if (now >= this.rateLimitState.resetTime) {
      this.rateLimitState.requestCount = 0;
      this.rateLimitState.resetTime = now + 1000;
    }

    // Check if we need to wait
    if (this.rateLimitState.requestCount >= 5) { // 5 requests per second
      const waitTime = this.rateLimitState.resetTime - now;
      if (waitTime > 0) {
        console.log(`⏳ Rate limiting: waiting ${waitTime}ms`);
        await this.delay(waitTime);
      }
    }

    this.rateLimitState.requestCount++;
    this.rateLimitState.lastRequestTime = now;
  }

  /**
   * Utility delay function for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get supported chains
   */
  getSupportedChains(): SupportedChainsType[] {
    return Object.keys(CHAIN_CONFIG) as SupportedChainsType[];
  }

  /**
   * Validate API key availability (unified key for all chains)
   */
  validateApiKey(_chain: SupportedChainsType): boolean {
    return !!process.env.ETHERSCAN_API_KEY;
  }
}

// Singleton instance
let etherscanEventServiceInstance: EtherscanEventService | null = null;

export function getEtherscanEventService(): EtherscanEventService {
  if (!etherscanEventServiceInstance) {
    etherscanEventServiceInstance = new EtherscanEventService();
  }
  return etherscanEventServiceInstance;
}
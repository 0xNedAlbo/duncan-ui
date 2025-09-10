/**
 * EtherscanEventService
 * Query Uniswap V3 NFT Position Manager events via Etherscan API
 * Provides precise event filtering by tokenId for position event sync
 */

import { decodeAbiParameters, parseAbiParameters } from 'viem';
import { 
  NFT_POSITION_MANAGER_ADDRESSES, 
  CHAIN_IDS, 
  EVENT_SIGNATURES,
  RATE_LIMIT,
  ETHERSCAN_API,
  type ChainSlug
} from './constants';
import {
  type EtherscanLogResponse,
  type EtherscanLog,
  type ParsedNftEvent,
  type ParsedIncreaseLiquidityEvent,
  type ParsedDecreaseLiquidityEvent,
  type ParsedCollectEvent,
  type ParsedTransferEvent,
  type EventQueryParams,
  type EventFetchResult,
  type RateLimitState
} from './types';

export class EtherscanEventService {
  private rateLimitState: RateLimitState = {
    lastRequestTime: 0,
    requestCount: 0,
    resetTime: 0
  };

  /**
   * Fetch all events for a specific NFT position
   */
  async fetchPositionEvents(
    chain: ChainSlug,
    tokenId: string,
    params: Partial<EventQueryParams> = {}
  ): Promise<EventFetchResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const allEvents: ParsedNftEvent[] = [];

    const queryParams = {
      tokenId,
      fromBlock: params.fromBlock || 'earliest',
      toBlock: params.toBlock || 'latest',
      eventTypes: params.eventTypes || ['INCREASE_LIQUIDITY', 'DECREASE_LIQUIDITY', 'COLLECT']
    };

    try {
      // Query each event type
      for (const eventType of queryParams.eventTypes) {
        try {
          const events = await this.fetchEventsByType(chain, tokenId, eventType, queryParams);
          allEvents.push(...events);
        } catch (error) {
          errors.push(`Error fetching ${eventType} events: ${error instanceof Error ? error.message : 'Unknown error'}`);
          console.error(`Etherscan ${eventType} events error:`, error);
        }
      }

      // Sort events chronologically
      allEvents.sort((a, b) => {
        if (a.blockNumber !== b.blockNumber) {
          return a.blockNumber - b.blockNumber;
        }
        return a.logIndex - b.logIndex;
      });

    } catch (error) {
      errors.push(`Event fetching error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('Etherscan event fetching error:', error);
    }

    return {
      events: allEvents,
      totalEvents: allEvents.length,
      fromBlock: typeof queryParams.fromBlock === 'number' ? queryParams.fromBlock : 0,
      toBlock: typeof queryParams.toBlock === 'number' ? queryParams.toBlock : 999999999,
      queryDuration: Date.now() - startTime,
      errors
    };
  }

  /**
   * Fetch events by specific type
   */
  private async fetchEventsByType(
    chain: ChainSlug,
    tokenId: string,
    eventType: string,
    params: EventQueryParams
  ): Promise<ParsedNftEvent[]> {
    const contractAddress = NFT_POSITION_MANAGER_ADDRESSES[chain];
    const eventSignature = EVENT_SIGNATURES[eventType as keyof typeof EVENT_SIGNATURES];
    
    if (!contractAddress || !eventSignature) {
      throw new Error(`Unsupported chain or event type: ${chain}, ${eventType}`);
    }

    // Convert tokenId to hex topic format (padded to 32 bytes)
    const tokenIdHex = `0x${BigInt(tokenId).toString(16).padStart(64, '0')}`;

    // Query Etherscan API with tokenId filtering via topic1
    const logs = await this.queryEtherscanLogs({
      address: contractAddress,
      topic0: eventSignature,
      topic1: tokenIdHex, // Filter by tokenId directly in API call
      fromBlock: params.fromBlock,
      toBlock: params.toBlock,
      chainId: CHAIN_IDS[chain]
    });

    // Parse events (no need to filter by tokenId since API already filtered)
    const parsedEvents: ParsedNftEvent[] = [];
    for (const log of logs) {
      try {
        const parsedEvent = this.parseEventLog(log, eventType);
        if (parsedEvent) {
          parsedEvents.push(parsedEvent);
        }
      } catch (error) {
        console.warn(`Failed to parse event log:`, error, log);
      }
    }

    console.log(`🔍 Etherscan ${eventType} events found for tokenId ${tokenId}:`, parsedEvents.length);
    return parsedEvents;
  }

  /**
   * Query Etherscan API for logs
   */
  private async queryEtherscanLogs(params: {
    address: string;
    topic0: string;
    topic1?: string;
    fromBlock: number | string;
    toBlock: number | string;
    chainId: number;
  }): Promise<EtherscanLog[]> {
    await this.enforceRateLimit();

    const apiKey = process.env.ETHERSCAN_API_KEY;
    if (!apiKey) {
      throw new Error('ETHERSCAN_API_KEY environment variable not set');
    }

    const queryParams = new URLSearchParams({
      module: 'logs',
      action: 'getLogs',
      address: params.address,
      topic0: params.topic0,
      fromBlock: params.fromBlock.toString(),
      toBlock: params.toBlock.toString(),
      chainid: params.chainId.toString(),
      apikey: apiKey
    });

    // Add topic1 filter if provided (for tokenId filtering)
    if (params.topic1) {
      queryParams.set('topic1', params.topic1);
      queryParams.set('topic0_1_opr', 'and');
    }

    const url = `${ETHERSCAN_API.BASE_URL}?${queryParams.toString()}`;
    
    console.log(`🔍 Querying Etherscan API:`, {
      chain: params.chainId,
      address: params.address,
      topic0: params.topic0,
      fromBlock: params.fromBlock,
      toBlock: params.toBlock
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ETHERSCAN_API.TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Duncan-UI/1.0'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: EtherscanLogResponse = await response.json();

      if (data.status !== '1') {
        if (data.message === 'No records found') {
          return [];
        }
        throw new Error(`Etherscan API error: ${data.message}`);
      }

      console.log(`✅ Etherscan API returned ${data.result.length} logs`);
      return data.result;

    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Etherscan API request timeout');
      }
      throw error;
    }
  }

  /**
   * Parse event log based on event type
   */
  private parseEventLog(log: EtherscanLog, eventType: string): ParsedNftEvent | null {
    const timestamp = new Date(parseInt(log.timeStamp) * 1000);
    const blockNumber = parseInt(log.blockNumber);
    const logIndex = parseInt(log.logIndex);

    try {
      switch (eventType) {
        case 'INCREASE_LIQUIDITY':
          return this.parseIncreaseLiquidityEvent(log, timestamp, blockNumber, logIndex);
          
        case 'DECREASE_LIQUIDITY':
          return this.parseDecreaseLiquidityEvent(log, timestamp, blockNumber, logIndex);
          
        case 'COLLECT':
          return this.parseCollectEvent(log, timestamp, blockNumber, logIndex);
          
        case 'TRANSFER':
          return this.parseTransferEvent(log, timestamp, blockNumber, logIndex);
          
        default:
          console.warn(`Unknown event type: ${eventType}`);
          return null;
      }
    } catch (error) {
      console.warn(`Failed to parse ${eventType} event:`, error, log);
      return null;
    }
  }

  /**
   * Parse IncreaseLiquidity event
   * IncreaseLiquidity(uint256 indexed tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)
   */
  private parseIncreaseLiquidityEvent(
    log: EtherscanLog, 
    timestamp: Date, 
    blockNumber: number, 
    logIndex: number
  ): ParsedIncreaseLiquidityEvent {
    // tokenId is indexed (topic1)
    const tokenId = BigInt(log.topics[1]).toString();
    
    // Decode non-indexed parameters from data
    const decoded = decodeAbiParameters(
      parseAbiParameters('uint128 liquidity, uint256 amount0, uint256 amount1'),
      log.data as `0x${string}`
    );

    return {
      eventType: 'INCREASE_LIQUIDITY',
      tokenId,
      liquidity: decoded[0].toString(),
      amount0: decoded[1].toString(),
      amount1: decoded[2].toString(),
      blockNumber,
      timestamp,
      transactionHash: log.transactionHash,
      logIndex
    };
  }

  /**
   * Parse DecreaseLiquidity event
   * DecreaseLiquidity(uint256 indexed tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)
   */
  private parseDecreaseLiquidityEvent(
    log: EtherscanLog, 
    timestamp: Date, 
    blockNumber: number, 
    logIndex: number
  ): ParsedDecreaseLiquidityEvent {
    // tokenId is indexed (topic1)
    const tokenId = BigInt(log.topics[1]).toString();
    
    // Decode non-indexed parameters from data
    const decoded = decodeAbiParameters(
      parseAbiParameters('uint128 liquidity, uint256 amount0, uint256 amount1'),
      log.data as `0x${string}`
    );

    return {
      eventType: 'DECREASE_LIQUIDITY',
      tokenId,
      liquidity: decoded[0].toString(),
      amount0: decoded[1].toString(),
      amount1: decoded[2].toString(),
      blockNumber,
      timestamp,
      transactionHash: log.transactionHash,
      logIndex
    };
  }

  /**
   * Parse Collect event
   * Collect(uint256 indexed tokenId, address recipient, uint256 amount0, uint256 amount1)
   */
  private parseCollectEvent(
    log: EtherscanLog, 
    timestamp: Date, 
    blockNumber: number, 
    logIndex: number
  ): ParsedCollectEvent {
    // tokenId is indexed (topic1)
    const tokenId = BigInt(log.topics[1]).toString();
    
    // Decode non-indexed parameters from data
    const decoded = decodeAbiParameters(
      parseAbiParameters('address recipient, uint256 amount0, uint256 amount1'),
      log.data as `0x${string}`
    );

    return {
      eventType: 'COLLECT',
      tokenId,
      recipient: decoded[0],
      amount0: decoded[1].toString(),
      amount1: decoded[2].toString(),
      blockNumber,
      timestamp,
      transactionHash: log.transactionHash,
      logIndex
    };
  }

  /**
   * Parse Transfer event
   * Transfer(address indexed from, address indexed to, uint256 indexed tokenId)
   */
  private parseTransferEvent(
    log: EtherscanLog, 
    timestamp: Date, 
    blockNumber: number, 
    logIndex: number
  ): ParsedTransferEvent {
    // All parameters are indexed for Transfer event
    const from = `0x${log.topics[1].slice(26)}`; // Remove padding
    const to = `0x${log.topics[2].slice(26)}`; // Remove padding  
    const tokenId = BigInt(log.topics[3]).toString();

    return {
      eventType: 'TRANSFER',
      tokenId,
      from,
      to,
      blockNumber,
      timestamp,
      transactionHash: log.transactionHash,
      logIndex
    };
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
    if (this.rateLimitState.requestCount >= RATE_LIMIT.REQUESTS_PER_SECOND) {
      const waitTime = this.rateLimitState.resetTime - now;
      if (waitTime > 0) {
        console.log(`⏳ Rate limiting: waiting ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    this.rateLimitState.requestCount++;
    this.rateLimitState.lastRequestTime = now;
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
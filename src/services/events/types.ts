/**
 * Types for Etherscan event service
 * Interfaces for NFT position event querying and parsing
 */

// Etherscan API response structure
export interface EtherscanLogResponse {
  status: string;
  message: string;
  result: EtherscanLog[];
}

export interface EtherscanLog {
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

// Parsed NFT Position Manager events
export interface ParsedIncreaseLiquidityEvent {
  eventType: 'INCREASE_LIQUIDITY';
  tokenId: string;
  liquidity: string;
  amount0: string;
  amount1: string;
  blockNumber: number;
  timestamp: Date;
  transactionHash: string;
  logIndex: number;
}

export interface ParsedDecreaseLiquidityEvent {
  eventType: 'DECREASE_LIQUIDITY';
  tokenId: string;
  liquidity: string;
  amount0: string;
  amount1: string;
  blockNumber: number;
  timestamp: Date;
  transactionHash: string;
  logIndex: number;
}

export interface ParsedCollectEvent {
  eventType: 'COLLECT';
  tokenId: string;
  recipient: string;
  amount0: string;
  amount1: string;
  blockNumber: number;
  timestamp: Date;
  transactionHash: string;
  logIndex: number;
}

export interface ParsedTransferEvent {
  eventType: 'TRANSFER';
  tokenId: string;
  from: string;
  to: string;
  blockNumber: number;
  timestamp: Date;
  transactionHash: string;
  logIndex: number;
}

// Union type for all parsed events
export type ParsedNftEvent = 
  | ParsedIncreaseLiquidityEvent
  | ParsedDecreaseLiquidityEvent  
  | ParsedCollectEvent
  | ParsedTransferEvent;

// Query parameters for event fetching
export interface EventQueryParams {
  tokenId: string;
  fromBlock?: number | 'earliest';
  toBlock?: number | 'latest';
  eventTypes?: ('INCREASE_LIQUIDITY' | 'DECREASE_LIQUIDITY' | 'COLLECT' | 'TRANSFER')[];
}

// Service response with metadata
export interface EventFetchResult {
  events: ParsedNftEvent[];
  totalEvents: number;
  fromBlock: number;
  toBlock: number;
  queryDuration: number;
  errors: string[];
}

// Rate limiting state
export interface RateLimitState {
  lastRequestTime: number;
  requestCount: number;
  resetTime: number;
}
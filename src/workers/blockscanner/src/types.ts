/**
 * Type definitions for Blockscanner Worker
 */

import { Address } from 'viem';

/**
 * Block header data for reorg detection
 */
export interface BlockHeaderData {
  chain: string;
  blockNumber: bigint;
  hash: string;
  parentHash: string;
  timestamp: Date;
}

/**
 * Watermark state for chain scanning progress
 */
export interface WatermarkData {
  chain: string;
  lastProcessedHeight: bigint;
}

/**
 * Uniswap V3 NFPM event types
 */
export type NFPMEventType = 'IncreaseLiquidity' | 'DecreaseLiquidity' | 'Collect';

/**
 * Parsed IncreaseLiquidity event
 */
export interface IncreaseLiquidityEvent {
  type: 'IncreaseLiquidity';
  tokenId: bigint;
  liquidity: bigint;
  amount0: bigint;
  amount1: bigint;
  blockNumber: bigint;
  blockTimestamp: Date;
  transactionHash: string;
  transactionIndex: number;
  logIndex: number;
}

/**
 * Parsed DecreaseLiquidity event
 */
export interface DecreaseLiquidityEvent {
  type: 'DecreaseLiquidity';
  tokenId: bigint;
  liquidity: bigint;
  amount0: bigint;
  amount1: bigint;
  blockNumber: bigint;
  blockTimestamp: Date;
  transactionHash: string;
  transactionIndex: number;
  logIndex: number;
}

/**
 * Parsed Collect event
 */
export interface CollectEvent {
  type: 'Collect';
  tokenId: bigint;
  recipient: Address;
  amount0: bigint;
  amount1: bigint;
  blockNumber: bigint;
  blockTimestamp: Date;
  transactionHash: string;
  transactionIndex: number;
  logIndex: number;
}

/**
 * Union type for all NFPM events
 */
export type NFPMEvent = IncreaseLiquidityEvent | DecreaseLiquidityEvent | CollectEvent;

/**
 * Chain configuration for scanner
 */
export interface ChainScannerConfig {
  chain: string;
  chainId: number;
  rpcUrl: string;
  nfpmAddress: Address;
  confirmationsFallback: number; // Number of blocks to wait if finalized/safe not supported
  supportsFinalized: boolean; // Whether chain supports 'finalized' block tag
  supportsSafe: boolean; // Whether chain supports 'safe' block tag
  pollIntervalMs: number; // Polling interval in milliseconds
}

/**
 * Reorg detection result
 */
export interface ReorgDetection {
  hasReorg: boolean;
  commonAncestor?: bigint; // Block number of common ancestor (if reorg detected)
  reorgDepth?: number; // Number of blocks affected by reorg
}

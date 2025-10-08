// Blockscanner Worker Type Definitions

import type { EtherscanLog } from "@/services/etherscan/etherscanClient";

// ═══════════════════════════════════════════════════════════════════════════════
// EVENT LOG TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type EventType = "INCREASE_LIQUIDITY" | "DECREASE_LIQUIDITY" | "COLLECT";

// Unique identifier for a log entry
export interface LogKey {
  txHash: string;
  logIndex: number;
  blockHash: string;
}

// Full log record with parsed event data
export interface LogRecord {
  blockNumber: bigint;
  blockHash: string;
  transactionIndex: number;
  logIndex: number;
  txHash: string;
  eventType: EventType;
  rawLog: EtherscanLog; // Original Etherscan log for reference
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDING WINDOW TYPES
// ═══════════════════════════════════════════════════════════════════════════════

// Window entry for reorg detection (compact format)
export interface WindowEntry {
  blockNumber: bigint;
  blockHash: string;
  transactionIndex: number;
  logIndex: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAIN STATE
// ═══════════════════════════════════════════════════════════════════════════════

// Per-chain state tracking
export interface ChainState {
  chain: string;
  watermark: bigint; // Last processed block height
  recentWindow: Map<string, WindowEntry>; // txHash -> WindowEntry
}

// ═══════════════════════════════════════════════════════════════════════════════
// ETHERSCAN API RESPONSE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

// Result from adaptive getLogs fetch
export interface FetchLogsResult {
  logs: EtherscanLog[];
  success: boolean;
  fromBlock: bigint;
  toBlock: bigint;
}

// ═══════════════════════════════════════════════════════════════════════════════
// REORG DETECTION TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ReorgDetectionResult {
  reorgDetected: boolean;
  minAffectedBlock: bigint | null; // Earliest block affected by reorg
}

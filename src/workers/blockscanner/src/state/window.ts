// Recent Window State Management (In-Memory)
// Implements RecentWindow Map for reorg detection

import type { Logger } from "pino";
import type { EtherscanLog } from "@/services/etherscan/etherscanClient";
import type { WindowEntry } from "../types.js";

// ═══════════════════════════════════════════════════════════════════════════════
// WINDOW OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Upsert a log entry into the recent window
 * Key: txHash, Value: WindowEntry with latest observation
 */
export function upsertWindowEntry(
  window: Map<string, WindowEntry>,
  log: EtherscanLog
): void {
  if (!log.blockHash || !log.transactionHash) {
    // Skip logs without complete metadata (shouldn't happen in practice)
    return;
  }

  const entry: WindowEntry = {
    blockNumber: BigInt(log.blockNumber),
    blockHash: log.blockHash,
    transactionIndex: parseInt(log.transactionIndex),
    logIndex: parseInt(log.logIndex),
  };

  window.set(log.transactionHash, entry);
}

/**
 * Batch upsert logs into the window
 */
export function upsertWindowEntries(
  window: Map<string, WindowEntry>,
  logs: EtherscanLog[]
): void {
  for (const log of logs) {
    upsertWindowEntry(window, log);
  }
}

/**
 * Prune window entries below the boundary block height
 * Removes all entries with blockNumber <= boundary
 */
export function pruneWindow(
  window: Map<string, WindowEntry>,
  boundary: bigint,
  chain: string,
  log: Logger
): void {
  const _initialSize = window.size;
  const entriesToDelete: string[] = [];

  for (const [txHash, entry] of window.entries()) {
    if (entry.blockNumber <= boundary) {
      entriesToDelete.push(txHash);
    }
  }

  for (const txHash of entriesToDelete) {
    window.delete(txHash);
  }

  const pruned = entriesToDelete.length;
  if (pruned > 0) {
    log.debug(
      {
        chain,
        boundary: boundary.toString(),
        pruned,
        remainingEntries: window.size,
      },
      "Window pruned"
    );
  }
}

/**
 * Clear all entries from the window (used during rollback)
 */
export function clearWindow(
  window: Map<string, WindowEntry>,
  chain: string,
  log: Logger
): void {
  const size = window.size;
  window.clear();

  log.info(
    {
      chain,
      clearedEntries: size,
    },
    "Window cleared for rollback"
  );
}

/**
 * Remove entries above a specific block height (used during rollback)
 */
export function removeEntriesAbove(
  window: Map<string, WindowEntry>,
  height: bigint,
  chain: string,
  log: Logger
): void {
  const entriesToDelete: string[] = [];

  for (const [txHash, entry] of window.entries()) {
    if (entry.blockNumber > height) {
      entriesToDelete.push(txHash);
    }
  }

  for (const txHash of entriesToDelete) {
    window.delete(txHash);
  }

  if (entriesToDelete.length > 0) {
    log.info(
      {
        chain,
        height: height.toString(),
        removedEntries: entriesToDelete.length,
        remainingEntries: window.size,
      },
      "Window entries removed above height"
    );
  }
}

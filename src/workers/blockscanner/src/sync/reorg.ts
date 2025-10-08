// Reorg Detection and Recovery
// Implements diff-based reorg detection and rollback/replay logic

import type { EtherscanClient } from "@/services/etherscan/etherscanClient";
import type { EvmBlockInfoService } from "@/services/evm/evmBlockInfoService";
import type { PositionLedgerService } from "@/services/positions/positionLedgerService";
import type { SupportedChainsType } from "@/config/chains";
import type { Logger } from "pino";
import type { ChainState, ReorgDetectionResult } from "../types.js";
import { WINDOW_BLOCKS, SAFETY_BUFFER } from "../config.js";
import { adaptiveGetLogs } from "../rpc/logs-fetcher.js";
import { parseAndProcessEvents } from "../events/logger.js";
import { upsertWindowEntries, removeEntriesAbove } from "../state/window.js";
import { rollbackWatermark, setWatermark } from "../state/watermark.js";

// ═══════════════════════════════════════════════════════════════════════════════
// REORG DETECTION (Diff-based)
// ═══════════════════════════════════════════════════════════════════════════════

interface ReorgCheckOptions {
  etherscanClient: EtherscanClient;
  blockInfoService: EvmBlockInfoService;
  positionLedgerService: PositionLedgerService;
  chain: SupportedChainsType;
  state: ChainState;
  log: Logger;
}

/**
 * Check for reorgs by comparing current canonical window vs our RecentWindow
 * Returns the minimum affected block height if reorg detected
 */
export async function reorgCheck(
  options: ReorgCheckOptions
): Promise<ReorgDetectionResult> {
  const { etherscanClient, blockInfoService, positionLedgerService: _positionLedgerService, chain, state, log } = options;
  const { watermark: _watermark, recentWindow } = state;

  try {
    // Get latest block via RPC to define window boundaries
    const latestBlock = await blockInfoService.getBlockNumber(chain);
    const windowStart = latestBlock > BigInt(WINDOW_BLOCKS)
      ? latestBlock - BigInt(WINDOW_BLOCKS)
      : 0n;

    // Skip check if window is empty (cold start or just after rollback)
    if (recentWindow.size === 0) {
      log.debug({ chain }, "RecentWindow empty, skipping reorg check");
      return { reorgDetected: false, minAffectedBlock: null };
    }

    log.debug(
      {
        chain,
        windowStart: windowStart.toString(),
        latestBlock: latestBlock.toString(),
        windowSize: recentWindow.size,
      },
      "Starting reorg check"
    );

    // Fetch current canonical logs for the window (Etherscan API)
    const currentLogs = await adaptiveGetLogs({
      etherscanClient,
      chain,
      fromBlock: windowStart,
      toBlock: latestBlock,
      log,
    });

    // Build index of current canonical logs: txHash -> {blockHash, logIndex, blockNumber}
    const currentIndex = new Map<
      string,
      { blockHash: string; logIndex: number; blockNumber: bigint }
    >();

    for (const l of currentLogs) {
      if (l.transactionHash && l.blockHash) {
        currentIndex.set(l.transactionHash, {
          blockHash: l.blockHash,
          logIndex: parseInt(l.logIndex),
          blockNumber: BigInt(l.blockNumber),
        });
      }
    }

    // Diff against our RecentWindow
    let minAffected: bigint | null = null;

    for (const [txHash, prevEntry] of recentWindow.entries()) {
      const current = currentIndex.get(txHash);

      if (!current) {
        // Transaction disappeared from canonical chain
        log.warn(
          {
            chain,
            txHash,
            previousBlock: prevEntry.blockNumber.toString(),
          },
          "Reorg detected: transaction disappeared"
        );

        if (minAffected === null || prevEntry.blockNumber < minAffected) {
          minAffected = prevEntry.blockNumber;
        }
        continue;
      }

      // Check if transaction moved to different block or changed position
      if (
        current.blockHash !== prevEntry.blockHash ||
        current.logIndex !== prevEntry.logIndex
      ) {
        log.warn(
          {
            chain,
            txHash,
            previousBlock: prevEntry.blockNumber.toString(),
            previousBlockHash: prevEntry.blockHash,
            currentBlock: current.blockNumber.toString(),
            currentBlockHash: current.blockHash,
          },
          "Reorg detected: transaction moved or changed"
        );

        const affectedBlock = current.blockNumber < prevEntry.blockNumber
          ? current.blockNumber
          : prevEntry.blockNumber;

        if (minAffected === null || affectedBlock < minAffected) {
          minAffected = affectedBlock;
        }
      }
    }

    if (minAffected !== null) {
      log.warn(
        {
          chain,
          minAffectedBlock: minAffected.toString(),
          windowStart: windowStart.toString(),
          latestBlock: latestBlock.toString(),
        },
        "Reorg detected via diff-based check"
      );

      return { reorgDetected: true, minAffectedBlock: minAffected };
    }

    log.debug({ chain }, "No reorg detected");
    return { reorgDetected: false, minAffectedBlock: null };
  } catch (error) {
    log.error(
      {
        chain,
        error: error instanceof Error ? error.message : String(error),
      },
      "Reorg check failed"
    );
    // Return no reorg on error to avoid false positives
    return { reorgDetected: false, minAffectedBlock: null };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROLLBACK AND REPLAY
// ═══════════════════════════════════════════════════════════════════════════════

interface RollbackAndReplayOptions {
  etherscanClient: EtherscanClient;
  blockInfoService: EvmBlockInfoService;
  positionLedgerService: PositionLedgerService;
  chain: SupportedChainsType;
  state: ChainState;
  minAffectedBlock: bigint;
  log: Logger;
}

/**
 * Rollback state to safe ancestor and replay from that point
 */
export async function rollbackAndReplay(
  options: RollbackAndReplayOptions
): Promise<boolean> {
  const { etherscanClient, blockInfoService, positionLedgerService, chain, state, minAffectedBlock, log } = options;
  const { recentWindow } = state;

  try {
    // Calculate safe ancestor (rollback with safety buffer)
    const ancestor = minAffectedBlock > BigInt(SAFETY_BUFFER)
      ? minAffectedBlock - BigInt(SAFETY_BUFFER)
      : 0n;

    log.warn(
      {
        chain,
        minAffectedBlock: minAffectedBlock.toString(),
        ancestor: ancestor.toString(),
        safetyBuffer: SAFETY_BUFFER,
      },
      "Starting rollback and replay"
    );

    // Remove window entries above ancestor
    removeEntriesAbove(recentWindow, ancestor, chain, log);

    // Rollback watermark to ancestor
    await rollbackWatermark(chain, ancestor, log);
    state.watermark = ancestor;

    // Rollback database events above ancestor (delete invalidated events)
    log.info(
      { chain, minAffectedBlock: ancestor.toString() },
      "Rolling back database events above ancestor block"
    );
    const rollbackResult = await positionLedgerService.rollbackEventsAboveBlock(
      chain,
      ancestor
    );
    log.info(
      {
        chain,
        deletedEvents: rollbackResult.deletedEvents,
        affectedUsers: rollbackResult.affectedUsers,
        affectedPositions: rollbackResult.affectedPositions,
      },
      "Database rollback completed"
    );

    // Replay from ancestor+1 to latest
    const latestBlock = await blockInfoService.getBlockNumber(chain);
    const replayStart = ancestor + 1n;

    if (replayStart > latestBlock) {
      log.info(
        {
          chain,
          ancestor: ancestor.toString(),
          latest: latestBlock.toString(),
        },
        "No blocks to replay (ancestor is at or beyond latest)"
      );
      return true;
    }

    log.info(
      {
        chain,
        replayStart: replayStart.toString(),
        replayEnd: latestBlock.toString(),
        blocks: (latestBlock - replayStart + 1n).toString(),
      },
      "Replaying blocks after rollback"
    );

    // Fetch logs for replay range (Etherscan API)
    const logs = await adaptiveGetLogs({
      etherscanClient,
      chain,
      fromBlock: replayStart,
      toBlock: latestBlock,
      log,
    });

    // Parse and process events (async - calls service for each event)
    await parseAndProcessEvents(logs, chain, positionLedgerService, log);

    // Update recent window
    upsertWindowEntries(recentWindow, logs);

    // Update watermark
    await setWatermark(chain, latestBlock, log);
    state.watermark = latestBlock;

    log.warn(
      {
        chain,
        replayedBlocks: (latestBlock - replayStart + 1n).toString(),
        eventsFound: logs.length,
        newWatermark: latestBlock.toString(),
        windowSize: recentWindow.size,
      },
      "Rollback and replay completed successfully"
    );

    return true;
  } catch (error) {
    log.error(
      {
        chain,
        minAffectedBlock: minAffectedBlock.toString(),
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      "Rollback and replay failed"
    );
    return false;
  }
}

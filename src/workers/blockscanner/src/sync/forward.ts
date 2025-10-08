// Forward Sync Implementation
// Fetches and processes new events from watermark to latest block

import type { EtherscanClient } from "@/services/etherscan/etherscanClient";
import type { EvmBlockInfoService } from "@/services/evm/evmBlockInfoService";
import type { PositionLedgerService } from "@/services/positions/positionLedgerService";
import type { SupportedChainsType } from "@/config/chains";
import type { Logger } from "pino";
import type { ChainState } from "../types.js";
import { adaptiveGetLogs } from "../rpc/logs-fetcher.js";
import { parseAndProcessEvents } from "../events/logger.js";
import { upsertWindowEntries } from "../state/window.js";
import { setWatermark } from "../state/watermark.js";

// ═══════════════════════════════════════════════════════════════════════════════
// FORWARD SYNC
// ═══════════════════════════════════════════════════════════════════════════════

interface ForwardSyncOptions {
  etherscanClient: EtherscanClient;
  blockInfoService: EvmBlockInfoService;
  positionLedgerService: PositionLedgerService;
  chain: SupportedChainsType;
  state: ChainState;
  log: Logger;
}

/**
 * Forward sync: Fetch events from watermark+1 to latest block
 * Updates watermark and recent window on success
 */
export async function forwardSync(
  options: ForwardSyncOptions
): Promise<boolean> {
  const { etherscanClient, blockInfoService, positionLedgerService, chain, state, log } = options;
  const { watermark, recentWindow } = state;

  try {
    // Get latest block via RPC
    const latestBlock = await blockInfoService.getBlockNumber(chain);

    if (latestBlock <= watermark) {
      log.debug(
        {
          chain,
          watermark: watermark.toString(),
          latest: latestBlock.toString(),
        },
        "No new blocks to sync"
      );
      return true;
    }

    const fromBlock = watermark + 1n;
    const toBlock = latestBlock;

    log.info(
      {
        chain,
        fromBlock: fromBlock.toString(),
        toBlock: toBlock.toString(),
        blocks: (toBlock - fromBlock + 1n).toString(),
      },
      "Starting forward sync"
    );

    // Fetch logs using adaptive chunking (Etherscan API)
    const logs = await adaptiveGetLogs({
      etherscanClient,
      chain,
      fromBlock,
      toBlock,
      log,
    });

    // Parse and process events (async - calls service for each event)
    // Note: Service fetches blockTimestamp only when positions exist (optimization)
    await parseAndProcessEvents(logs, chain, positionLedgerService, log);

    // Update recent window
    upsertWindowEntries(recentWindow, logs);

    // Update watermark
    await setWatermark(chain, toBlock, log);
    state.watermark = toBlock;

    log.info(
      {
        chain,
        processedBlocks: (toBlock - fromBlock + 1n).toString(),
        eventsFound: logs.length,
        newWatermark: toBlock.toString(),
        windowSize: recentWindow.size,
      },
      "Forward sync completed"
    );

    return true;
  } catch (error) {
    log.error(
      {
        chain,
        watermark: watermark.toString(),
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      "Forward sync failed"
    );
    return false;
  }
}

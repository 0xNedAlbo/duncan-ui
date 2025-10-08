// Blockscanner Worker - Main Entry Point
// Scans blockchain events with reorg detection and adaptive chunking

import pino from "pino";
import { POLL_INTERVAL_MS, LOG_LEVEL, initializeChainClients, WINDOW_BLOCKS } from "./config.js";
import { getWatermark, closeWatermarkConnection } from "./state/watermark.js";
import { pruneWindow } from "./state/window.js";
import { forwardSync } from "./sync/forward.js";
import { reorgCheck, rollbackAndReplay } from "./sync/reorg.js";
import type { ChainState } from "./types.js";
import type { SupportedChainsType } from "@/config/chains";

// ═══════════════════════════════════════════════════════════════════════════════
// LOGGER SETUP
// ═══════════════════════════════════════════════════════════════════════════════

const logger = pino({
  level: LOG_LEVEL,
  transport:
    process.env.NODE_ENV !== "production"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            ignore: "pid,hostname",
            translateTime: "HH:MM:ss.l",
          },
        }
      : undefined,
});

// ═══════════════════════════════════════════════════════════════════════════════
// GLOBAL STATE
// ═══════════════════════════════════════════════════════════════════════════════

let isShuttingDown = false;
const chainStates = new Map<string, ChainState>();

// ═══════════════════════════════════════════════════════════════════════════════
// BOUNDARY HEIGHT CALCULATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate boundary height for window pruning
 * Prefers finalized/safe block tags if supported, falls back to latest - WINDOW_BLOCKS
 */
async function getBoundaryHeight(
  blockInfoService: any,
  chain: SupportedChainsType
): Promise<bigint> {
  try {
    // Try finalized tag first
    const finalizedBlock = await blockInfoService.getBlockByTag("finalized", chain);
    if (finalizedBlock?.number) {
      logger.debug(
        { chain, boundary: finalizedBlock.number.toString() },
        "Using finalized block as boundary"
      );
      return finalizedBlock.number;
    }

    // Try safe tag
    const safeBlock = await blockInfoService.getBlockByTag("safe", chain);
    if (safeBlock?.number) {
      logger.debug(
        { chain, boundary: safeBlock.number.toString() },
        "Using safe block as boundary"
      );
      return safeBlock.number;
    }

    // Fallback: latest - WINDOW_BLOCKS
    const latestBlock = await blockInfoService.getBlockNumber(chain);
    const boundary = latestBlock > BigInt(WINDOW_BLOCKS)
      ? latestBlock - BigInt(WINDOW_BLOCKS)
      : 0n;

    logger.debug(
      { chain, boundary: boundary.toString(), method: "latest - WINDOW_BLOCKS" },
      "Using calculated boundary"
    );

    return boundary;
  } catch (error) {
    logger.error(
      {
        chain,
        error: error instanceof Error ? error.message : String(error),
      },
      "Failed to get boundary height, using 0"
    );
    return 0n;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// COLD START INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Initialize chain state on cold start
 */
async function initializeChainState(
  chain: SupportedChainsType,
  blockInfoService: any
): Promise<ChainState> {
  const existingWatermark = await getWatermark(chain, logger);

  let watermark: bigint;

  if (existingWatermark === null) {
    // Cold start: use latest block as starting point
    const latestBlock = await blockInfoService.getBlockNumber(chain);
    watermark = latestBlock;

    logger.info(
      { chain, startingBlock: watermark.toString() },
      "Cold start: initialized watermark at latest block"
    );
  } else {
    watermark = existingWatermark;

    logger.info(
      { chain, watermark: watermark.toString() },
      "Resuming from persisted watermark"
    );
  }

  return {
    chain,
    watermark,
    recentWindow: new Map(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN TICK LOOP
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Single tick: prune → forward sync → reorg check → rollback if needed
 */
async function tick(): Promise<void> {
  const chainClients = initializeChainClients();

  for (const { chain, etherscanClient, blockInfoService, positionLedgerService } of chainClients) {
    if (isShuttingDown) break;

    const chainLog = logger.child({ chain });

    try {
      // Initialize state if needed
      if (!chainStates.has(chain)) {
        const state = await initializeChainState(chain, blockInfoService);
        chainStates.set(chain, state);
      }

      const state = chainStates.get(chain)!;

      // Calculate boundary and prune old window entries
      const boundary = await getBoundaryHeight(blockInfoService, chain);
      pruneWindow(state.recentWindow, boundary, chain, chainLog);

      // Forward sync: fetch new events
      const syncSuccess = await forwardSync({
        etherscanClient,
        blockInfoService,
        positionLedgerService,
        chain,
        state,
        log: chainLog,
      });

      if (!syncSuccess) {
        chainLog.error("Forward sync failed, skipping reorg check");
        continue;
      }

      // Reorg detection
      const reorgResult = await reorgCheck({
        etherscanClient,
        blockInfoService,
        positionLedgerService,
        chain,
        state,
        log: chainLog,
      });

      if (reorgResult.reorgDetected && reorgResult.minAffectedBlock !== null) {
        chainLog.warn(
          { minAffectedBlock: reorgResult.minAffectedBlock.toString() },
          "Reorg detected, initiating rollback and replay"
        );

        await rollbackAndReplay({
          etherscanClient,
          blockInfoService,
          positionLedgerService,
          chain,
          state,
          minAffectedBlock: reorgResult.minAffectedBlock,
          log: chainLog,
        });
      }
    } catch (error) {
      chainLog.error(
        {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        },
        "Tick failed for chain"
      );
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GRACEFUL SHUTDOWN
// ═══════════════════════════════════════════════════════════════════════════════

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, "Received shutdown signal");
  isShuttingDown = true;

  // Close database connections
  await closeWatermarkConnection();

  logger.info("Blockscanner worker stopped gracefully");
  process.exit(0);
}

// Register signal handlers
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN RUN LOOP
// ═══════════════════════════════════════════════════════════════════════════════

async function run(): Promise<void> {
  logger.info(
    {
      pollInterval: `${POLL_INTERVAL_MS}ms`,
      windowBlocks: WINDOW_BLOCKS,
      logLevel: LOG_LEVEL,
    },
    "Blockscanner worker starting"
  );

  // Initial tick (cold start or catch-up)
  try {
    await tick();
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      "Initial tick failed"
    );
  }

  // Periodic tick loop
  const intervalId = setInterval(async () => {
    if (isShuttingDown) {
      clearInterval(intervalId);
      return;
    }

    try {
      await tick();
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        },
        "Tick failed, will retry next interval"
      );

      // Backoff on persistent errors
      await new Promise((resolve) =>
        setTimeout(resolve, Math.min(60_000, POLL_INTERVAL_MS * 2))
      );
    }
  }, POLL_INTERVAL_MS);
}

// ═══════════════════════════════════════════════════════════════════════════════
// START WORKER
// ═══════════════════════════════════════════════════════════════════════════════

run().catch((error) => {
  logger.fatal(
    {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    },
    "Fatal error in worker"
  );
  process.exit(1);
});

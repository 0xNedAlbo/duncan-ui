// Watermark State Management (DB-backed via Prisma)
// Implements persisted watermark tracking per chain

import { PrismaClient } from "@prisma/client";
import type { Logger } from "pino";

const prisma = new PrismaClient();

// ═══════════════════════════════════════════════════════════════════════════════
// WATERMARK OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get the current watermark (last processed block height) for a chain
 * Returns null if no watermark exists (cold start)
 */
export async function getWatermark(
  chain: string,
  log: Logger
): Promise<bigint | null> {
  try {
    const record = await prisma.blockScannerWatermark.findUnique({
      where: { chain },
    });

    if (!record) {
      log.info({ chain }, "No watermark found (cold start)");
      return null;
    }

    log.debug(
      { chain, watermark: record.lastProcessedHeight.toString() },
      "Watermark retrieved"
    );

    return record.lastProcessedHeight;
  } catch (error) {
    log.error(
      {
        chain,
        error: error instanceof Error ? error.message : String(error),
      },
      "Failed to retrieve watermark"
    );
    throw error;
  }
}

/**
 * Set the watermark (last processed block height) for a chain
 * Creates new record if none exists, updates if exists
 */
export async function setWatermark(
  chain: string,
  height: bigint,
  log: Logger
): Promise<void> {
  try {
    await prisma.blockScannerWatermark.upsert({
      where: { chain },
      update: {
        lastProcessedHeight: height,
        updatedAt: new Date(),
      },
      create: {
        chain,
        lastProcessedHeight: height,
      },
    });

    log.debug(
      { chain, watermark: height.toString() },
      "Watermark updated"
    );
  } catch (error) {
    log.error(
      {
        chain,
        height: height.toString(),
        error: error instanceof Error ? error.message : String(error),
      },
      "Failed to set watermark"
    );
    throw error;
  }
}

/**
 * Rollback watermark to a specific height (used during reorg recovery)
 */
export async function rollbackWatermark(
  chain: string,
  height: bigint,
  log: Logger
): Promise<void> {
  try {
    const current = await getWatermark(chain, log);

    if (current !== null && height > current) {
      log.warn(
        {
          chain,
          currentWatermark: current.toString(),
          requestedHeight: height.toString(),
        },
        "Attempted to rollback to higher block (ignoring)"
      );
      return;
    }

    await setWatermark(chain, height, log);

    log.info(
      {
        chain,
        previousWatermark: current?.toString() ?? "null",
        newWatermark: height.toString(),
      },
      "Watermark rolled back due to reorg"
    );
  } catch (error) {
    log.error(
      {
        chain,
        height: height.toString(),
        error: error instanceof Error ? error.message : String(error),
      },
      "Failed to rollback watermark"
    );
    throw error;
  }
}

/**
 * Get the starting block for cold start (earliest block to begin scanning)
 * For now, returns null to indicate we should query the latest block
 */
export async function getStartingBlock(
  chain: string,
  log: Logger
): Promise<bigint | null> {
  // Future: could read from config or use earliest NFPM deployment block
  log.info({ chain }, "Cold start - will determine starting block from latest");
  return null;
}

/**
 * Close Prisma connection (for graceful shutdown)
 */
export async function closeWatermarkConnection(): Promise<void> {
  await prisma.$disconnect();
}

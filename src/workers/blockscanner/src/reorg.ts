/**
 * Reorg detection and rollback logic
 */

import type { PublicClient } from 'viem';
import type { Logger } from 'pino';
import type { ReorgDetection } from './types';
import * as HeaderDB from './db/headers';
import * as WatermarkDB from './db/watermarks';
import * as EventDB from './db/events';

/**
 * Detect blockchain reorganization by comparing stored headers with canonical chain
 *
 * Compares block hashes from our database with current canonical chain.
 * If a mismatch is found, determines the common ancestor block.
 */
export async function detectReorg(
  chain: string,
  boundary: bigint,
  client: PublicClient,
  logger: Logger
): Promise<ReorgDetection> {
  // Get all stored headers above boundary
  const storedHeaders = await HeaderDB.getHeadersAbove(chain, boundary);

  if (storedHeaders.length === 0) {
    return { hasReorg: false };
  }

  // Check each stored header against canonical chain
  for (const stored of storedHeaders) {
    try {
      const canonicalBlock = await client.getBlock({
        blockNumber: stored.blockNumber,
      });

      // Hash mismatch = reorg detected
      if (canonicalBlock.hash !== stored.hash) {
        logger.warn(
          {
            chain,
            blockNumber: stored.blockNumber.toString(),
            storedHash: stored.hash,
            canonicalHash: canonicalBlock.hash,
          },
          'Reorg detected - hash mismatch'
        );

        // Find common ancestor by walking back the parent chain
        const commonAncestor = await findCommonAncestor(
          chain,
          stored.blockNumber - 1n,
          client,
          logger
        );

        const reorgDepth = Number(stored.blockNumber - commonAncestor);

        return {
          hasReorg: true,
          commonAncestor,
          reorgDepth,
        };
      }
    } catch (error) {
      logger.error(
        { chain, blockNumber: stored.blockNumber.toString(), error },
        'Error checking block during reorg detection'
      );
      // Continue checking other blocks
    }
  }

  return { hasReorg: false };
}

/**
 * Find common ancestor by walking back the chain
 */
async function findCommonAncestor(
  chain: string,
  startBlock: bigint,
  client: PublicClient,
  logger: Logger
): Promise<bigint> {
  let currentBlock = startBlock;

  // Walk back maximum 100 blocks to find common ancestor
  const maxDepth = 100;
  let depth = 0;

  while (currentBlock > 0n && depth < maxDepth) {
    const stored = await HeaderDB.getHeaderByNumber(chain, currentBlock);

    if (!stored) {
      // No stored header at this height, go back further
      currentBlock--;
      depth++;
      continue;
    }

    try {
      const canonical = await client.getBlock({ blockNumber: currentBlock });

      if (canonical.hash === stored.hash) {
        // Found common ancestor
        logger.info(
          { chain, commonAncestor: currentBlock.toString(), depth },
          'Found common ancestor'
        );
        return currentBlock;
      }
    } catch (error) {
      logger.error(
        { chain, blockNumber: currentBlock.toString(), error },
        'Error fetching block during ancestor search'
      );
    }

    currentBlock--;
    depth++;
  }

  // If we couldn't find common ancestor in last 100 blocks, use boundary as fallback
  logger.warn(
    { chain, startBlock: startBlock.toString(), searchedDepth: depth },
    'Could not find common ancestor, using start block as fallback'
  );
  return currentBlock;
}

/**
 * Rollback database state to common ancestor after reorg
 *
 * Deletes headers and events above the common ancestor block.
 * Resets watermark to common ancestor.
 */
export async function rollback(
  chain: string,
  commonAncestor: bigint,
  logger: Logger
): Promise<void> {
  logger.info(
    { chain, commonAncestor: commonAncestor.toString() },
    'Starting rollback'
  );

  // Delete headers above common ancestor
  const deletedHeaders = await HeaderDB.deleteHeadersAbove(chain, commonAncestor);
  logger.info(
    { chain, deletedHeaders },
    'Deleted headers during rollback'
  );

  // Delete events above common ancestor
  const deletedEvents = await EventDB.deleteEventsAbove(chain, commonAncestor);
  logger.info(
    { chain, deletedEvents },
    'Deleted events during rollback'
  );

  // Reset watermark to common ancestor
  await WatermarkDB.setWatermark(chain, commonAncestor);
  logger.info(
    { chain, newWatermark: commonAncestor.toString() },
    'Rollback complete, watermark reset'
  );
}

/**
 * Database layer for Position Event operations (stub for now)
 *
 * For now, we only log events. Actual database writes will be implemented later.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Delete position events above a certain block number (for rollback)
 *
 * This function will be used during reorg rollback to remove events
 * from blocks that are no longer part of the canonical chain.
 */
export async function deleteEventsAbove(
  chain: string,
  blockNumber: bigint
): Promise<number> {
  const result = await prisma.positionEvent.deleteMany({
    where: {
      positionChain: chain,
      blockNumber: {
        gt: blockNumber,
      },
      source: 'onchain', // Only delete onchain events, not manual entries
    },
  });

  return result.count;
}

/**
 * Close Prisma connection
 */
export async function disconnect(): Promise<void> {
  await prisma.$disconnect();
}

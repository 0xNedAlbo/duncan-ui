/**
 * Database layer for BlockScannerHeader operations
 */

import { PrismaClient } from '@prisma/client';
import type { BlockHeaderData } from '../types';

const prisma = new PrismaClient();

/**
 * Store a block header
 */
export async function storeHeader(header: BlockHeaderData): Promise<void> {
  await prisma.blockScannerHeader.upsert({
    where: {
      chain_blockNumber: {
        chain: header.chain,
        blockNumber: header.blockNumber,
      },
    },
    create: {
      chain: header.chain,
      blockNumber: header.blockNumber,
      hash: header.hash,
      parentHash: header.parentHash,
      timestamp: header.timestamp,
    },
    update: {
      hash: header.hash,
      parentHash: header.parentHash,
      timestamp: header.timestamp,
    },
  });
}

/**
 * Get header by block number
 */
export async function getHeaderByNumber(
  chain: string,
  blockNumber: bigint
): Promise<BlockHeaderData | null> {
  const header = await prisma.blockScannerHeader.findUnique({
    where: {
      chain_blockNumber: {
        chain,
        blockNumber,
      },
    },
  });

  if (!header) return null;

  return {
    chain: header.chain,
    blockNumber: header.blockNumber,
    hash: header.hash,
    parentHash: header.parentHash,
    timestamp: header.timestamp,
  };
}

/**
 * Get header by hash
 */
export async function getHeaderByHash(
  chain: string,
  hash: string
): Promise<BlockHeaderData | null> {
  const header = await prisma.blockScannerHeader.findFirst({
    where: {
      chain,
      hash,
    },
  });

  if (!header) return null;

  return {
    chain: header.chain,
    blockNumber: header.blockNumber,
    hash: header.hash,
    parentHash: header.parentHash,
    timestamp: header.timestamp,
  };
}

/**
 * Get all headers above a certain block number
 */
export async function getHeadersAbove(
  chain: string,
  blockNumber: bigint
): Promise<BlockHeaderData[]> {
  const headers = await prisma.blockScannerHeader.findMany({
    where: {
      chain,
      blockNumber: {
        gt: blockNumber,
      },
    },
    orderBy: {
      blockNumber: 'asc',
    },
  });

  return headers.map((h) => ({
    chain: h.chain,
    blockNumber: h.blockNumber,
    hash: h.hash,
    parentHash: h.parentHash,
    timestamp: h.timestamp,
  }));
}

/**
 * Prune headers at or below boundary block
 */
export async function pruneHeaders(chain: string, boundary: bigint): Promise<number> {
  const result = await prisma.blockScannerHeader.deleteMany({
    where: {
      chain,
      blockNumber: {
        lte: boundary,
      },
    },
  });

  return result.count;
}

/**
 * Delete headers above a certain block number (for rollback)
 */
export async function deleteHeadersAbove(chain: string, blockNumber: bigint): Promise<number> {
  const result = await prisma.blockScannerHeader.deleteMany({
    where: {
      chain,
      blockNumber: {
        gt: blockNumber,
      },
    },
  });

  return result.count;
}

/**
 * Get highest block number we have a header for
 */
export async function getHighestHeaderBlock(chain: string): Promise<bigint | null> {
  const header = await prisma.blockScannerHeader.findFirst({
    where: { chain },
    orderBy: { blockNumber: 'desc' },
    select: { blockNumber: true },
  });

  return header?.blockNumber ?? null;
}

/**
 * Delete all headers for a chain (clean state on startup)
 */
export async function deleteAllHeaders(chain: string): Promise<number> {
  const result = await prisma.blockScannerHeader.deleteMany({
    where: { chain },
  });

  return result.count;
}

/**
 * Close Prisma connection
 */
export async function disconnect(): Promise<void> {
  await prisma.$disconnect();
}

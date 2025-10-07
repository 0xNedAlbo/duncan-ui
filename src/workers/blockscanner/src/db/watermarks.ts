/**
 * Database layer for BlockScannerWatermark operations
 */

import { PrismaClient } from '@prisma/client';
import type { WatermarkData } from '../types';

const prisma = new PrismaClient();

/**
 * Get watermark for a chain
 */
export async function getWatermark(chain: string): Promise<bigint | null> {
  const watermark = await prisma.blockScannerWatermark.findUnique({
    where: { chain },
  });

  return watermark?.lastProcessedHeight ?? null;
}

/**
 * Set watermark for a chain
 */
export async function setWatermark(chain: string, height: bigint): Promise<void> {
  await prisma.blockScannerWatermark.upsert({
    where: { chain },
    create: {
      chain,
      lastProcessedHeight: height,
    },
    update: {
      lastProcessedHeight: height,
    },
  });
}

/**
 * Initialize watermark if it doesn't exist
 */
export async function initializeWatermark(chain: string, height: bigint): Promise<void> {
  const existing = await prisma.blockScannerWatermark.findUnique({
    where: { chain },
  });

  if (!existing) {
    await prisma.blockScannerWatermark.create({
      data: {
        chain,
        lastProcessedHeight: height,
      },
    });
  }
}

/**
 * Get all watermarks
 */
export async function getAllWatermarks(): Promise<WatermarkData[]> {
  const watermarks = await prisma.blockScannerWatermark.findMany();

  return watermarks.map((w) => ({
    chain: w.chain,
    lastProcessedHeight: w.lastProcessedHeight,
  }));
}

/**
 * Close Prisma connection
 */
export async function disconnect(): Promise<void> {
  await prisma.$disconnect();
}

#!/usr/bin/env tsx

/**
 * Script to check and fix non-EIP-55 owner addresses in positions table
 */

import { PrismaClient } from '@prisma/client';
import { normalizeAddress, isValidAddress } from '../../src/lib/utils/evm';

const prisma = new PrismaClient();

async function main() {
  try {
    // Get all positions with owner addresses
    const positions = await prisma.position.findMany({
      where: {
        owner: {
          not: null
        }
      },
      select: {
        userId: true,
        chain: true,
        protocol: true,
        nftId: true,
        owner: true
      }
    });

    const results = {
      total: positions.length,
      needsFixing: [] as Array<{
        userId: string;
        chain: string;
        protocol: string;
        nftId: string;
        currentOwner: string;
        normalizedOwner: string;
      }>,
      invalid: [] as Array<{
        userId: string;
        chain: string;
        protocol: string;
        nftId: string;
        owner: string;
      }>
    };

    for (const position of positions) {
      if (!position.owner) continue;

      // Check if address is valid
      if (!isValidAddress(position.owner)) {
        results.invalid.push({
          userId: position.userId,
          chain: position.chain,
          protocol: position.protocol,
          nftId: position.nftId,
          owner: position.owner
        });
        continue;
      }

      // Check if address needs normalization
      const normalizedOwner = normalizeAddress(position.owner);
      if (position.owner !== normalizedOwner) {
        results.needsFixing.push({
          userId: position.userId,
          chain: position.chain,
          protocol: position.protocol,
          nftId: position.nftId,
          currentOwner: position.owner,
          normalizedOwner
        });
      }
    }

    // Output results as JSON
    console.log(JSON.stringify(results, null, 2));

  } catch (error) {
    console.log(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error"
    }));
  } finally {
    await prisma.$disconnect();
  }
}

main();
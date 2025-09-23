#!/usr/bin/env tsx

/**
 * Script to normalize existing non-EIP-55 owner addresses in positions table
 */

import { PrismaClient } from '@prisma/client';
import { normalizeAddress, isValidAddress } from '../../src/lib/utils/evm';

const prisma = new PrismaClient();

async function main() {
  try {
    // Get all positions with owner addresses that need normalization
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
      processed: 0,
      updated: 0,
      errors: [] as Array<{
        position: string;
        error: string;
      }>
    };

    for (const position of positions) {
      if (!position.owner) continue;

      results.processed++;

      try {
        // Check if address is valid
        if (!isValidAddress(position.owner)) {
          results.errors.push({
            position: `${position.userId}-${position.chain}-${position.protocol}-${position.nftId}`,
            error: `Invalid address: ${position.owner}`
          });
          continue;
        }

        // Check if address needs normalization
        const normalizedOwner = normalizeAddress(position.owner);
        if (position.owner !== normalizedOwner) {
          // Update the position with normalized address
          await prisma.position.update({
            where: {
              userId_chain_protocol_nftId: {
                userId: position.userId,
                chain: position.chain,
                protocol: position.protocol,
                nftId: position.nftId
              }
            },
            data: {
              owner: normalizedOwner
            }
          });

          results.updated++;
        }
      } catch (error) {
        results.errors.push({
          position: `${position.userId}-${position.chain}-${position.protocol}-${position.nftId}`,
          error: error instanceof Error ? error.message : "Unknown error"
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
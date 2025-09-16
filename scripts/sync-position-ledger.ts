#!/usr/bin/env tsx

// Load environment variables FIRST, before any other imports
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

/**
 * Sync Position Ledger Script
 *
 * Syncs ledger entries for an existing position using the PositionLedgerService.
 * Fetches events from blockchain and processes them through the ledger service.
 * Outputs only the synced events as JSON array.
 *
 * Usage:
 *   npx tsx scripts/sync-position-ledger.ts <username> <chain> <nftId>
 *
 * Example:
 *   npx tsx scripts/sync-position-ledger.ts testuser ethereum 123456
 */

import { getChainConfig, SupportedChainsType } from '@/config/chains';
import { DefaultServiceFactory } from '@/services/ServiceFactory';
import { DefaultClientsFactory } from '@/services/ClientsFactory';
import { PositionLedgerService } from '@/services/positions/positionLedgerService';
import { EtherscanEventService } from '@/services/etherscan/etherscanEventService';

// Parse command line arguments
function parseArguments(): { username: string; chain: SupportedChainsType; nftId: string } {
  const args = process.argv.slice(2);

  if (args.length !== 3) {
    console.log(JSON.stringify({
      error: 'Usage: npx tsx scripts/sync-position-ledger.ts <username> <chain> <nftId>'
    }));
    process.exit(1);
  }

  const [username, chainInput, nftId] = args;

  // Validate chain
  const chain = chainInput.toLowerCase() as SupportedChainsType;
  try {
    getChainConfig(chain);
  } catch (error) {
    console.log(JSON.stringify({
      error: `Invalid chain: ${chainInput}. Supported chains: ethereum, polygon, arbitrum, optimism, base`
    }));
    process.exit(1);
  }

  // Validate nftId is numeric
  if (!/^\d+$/.test(nftId)) {
    console.log(JSON.stringify({
      error: `Invalid nftId: ${nftId}. Must be a positive integer.`
    }));
    process.exit(1);
  }

  return { username, chain, nftId };
}

// Main sync function
async function syncPositionLedger() {
  // Parse arguments
  const { username, chain, nftId } = parseArguments();

  // Initialize services using factory pattern
  const { prisma } = DefaultClientsFactory.getInstance().getClients();
  const { positionLedgerService, positionService } = DefaultServiceFactory.getInstance().getServices();

  try {
    // Find user by email first
    const user = await prisma.user.findUnique({
      where: { email: username }
    });

    if (!user) {
      console.log(JSON.stringify({
        error: `User not found: ${username}`
      }));
      process.exit(1);
    }

    // Find position using PositionService
    const allUserPositions = await positionService.listPositions({
      userId: user.id
    });

    // Try to find position by nftId and chain
    const position = allUserPositions.find(p =>
      p.nftId === nftId && p.chain.toLowerCase() === chain.toLowerCase()
    );

    if (!position) {
      console.log(JSON.stringify({
        error: `Position not found in database for username: ${username}, chain: ${chain}, nftId: ${nftId}`
      }));
      process.exit(1);
    }

    // Create position sync info for ledger service
    const positionSyncInfo = PositionLedgerService.createSyncInfo({
      id: position.id,
      token0IsQuote: position.token0IsQuote,
      pool: {
        poolAddress: position.pool.poolAddress,
        chain: position.pool.chain,
        token0: {
          decimals: position.pool.token0.decimals
        },
        token1: {
          decimals: position.pool.token1.decimals
        }
      }
    } as any);

    // Fetch events from blockchain using Etherscan
    const { etherscanClient } = DefaultClientsFactory.getInstance().getClients();
    const etherscanEventService = new EtherscanEventService({
      etherscanClient
    });

    const rawEvents = await etherscanEventService.fetchPositionEvents(
      chain,
      nftId // tokenId as string, not BigInt
    );

    if (rawEvents.length === 0) {
      console.log(JSON.stringify([]));
      return;
    }

    const syncedEvents = await positionLedgerService.syncPositionEvents(
      positionSyncInfo,
      rawEvents
    );

    // Convert BigInt values to strings for JSON serialization
    const eventsForJson = syncedEvents.map(event => ({
      ...event,
      blockNumber: event.blockNumber.toString(),
      liquidityBefore: event.liquidityBefore.toString(),
      liquidityAfter: event.liquidityAfter.toString(),
      costBasisBefore: event.costBasisBefore.toString(),
      costBasisAfter: event.costBasisAfter.toString(),
      realizedPnLBefore: event.realizedPnLBefore.toString(),
      realizedPnLAfter: event.realizedPnLAfter.toString()
    }));

    // Output only the synced events as JSON array
    console.log(JSON.stringify(eventsForJson, null, 2));

  } catch (error) {
    console.log(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error'
    }));
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  syncPositionLedger().catch((error) => {
    console.log(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error'
    }));
    process.exit(1);
  });
}
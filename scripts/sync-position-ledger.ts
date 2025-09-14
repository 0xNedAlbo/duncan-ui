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
    console.error('❌ Usage: npx tsx scripts/sync-position-ledger.ts <username> <chain> <nftId>');
    console.error('');
    console.error('Example:');
    console.error('  npx tsx scripts/sync-position-ledger.ts testuser ethereum 123456');
    process.exit(1);
  }

  const [username, chainInput, nftId] = args;

  // Validate chain
  const chain = chainInput.toLowerCase() as SupportedChainsType;
  try {
    getChainConfig(chain);
  } catch (error) {
    console.error(`❌ Invalid chain: ${chainInput}`);
    console.error('Supported chains: ethereum, polygon, arbitrum, optimism, base');
    process.exit(1);
  }

  // Validate nftId is numeric
  if (!/^\d+$/.test(nftId)) {
    console.error(`❌ Invalid nftId: ${nftId}. Must be a positive integer.`);
    process.exit(1);
  }

  return { username, chain, nftId };
}

// Main sync function
async function syncPositionLedger() {
  console.log('🚀 Starting position ledger sync...');

  // Parse arguments
  const { username, chain, nftId } = parseArguments();

  console.log(`📍 Target position: ${username} on ${chain} NFT ${nftId}`);

  // Initialize services using factory pattern
  const { prisma } = DefaultClientsFactory.getInstance().getClients();
  const { positionLedgerService, positionService } = DefaultServiceFactory.getInstance().getServices();

  try {
    // Find user by email first
    const user = await prisma.user.findUnique({
      where: { email: username }
    });

    if (!user) {
      console.error(`❌ User not found: ${username}`);
      console.error('Available users:');
      const users = await prisma.user.findMany({
        select: { email: true, name: true }
      });
      users.forEach(u => console.error(`  - ${u.email} (${u.name})`));
      process.exit(1);
    }

    // Find position using PositionService - first get all positions for debugging
    console.log(`🔍 Looking for positions for user ${user.name} (${user.email})...`);

    const allUserPositions = await positionService.listPositions({
      userId: user.id
      // Don't filter by status - include all positions
    });

    console.log(`📦 Found ${allUserPositions.length} total positions for user`);

    if (allUserPositions.length > 0) {
      console.log('Available positions:');
      allUserPositions.forEach(p => {
        console.log(`  - NFT ID: ${p.nftId}, Chain: ${p.chain}, Pool: ${p.pool.token0.symbol}/${p.pool.token1.symbol}, Status: ${p.status}`);
      });
    }

    // Try to find position by nftId and chain
    const position = allUserPositions.find(p =>
      p.nftId === nftId && p.chain.toLowerCase() === chain.toLowerCase()
    );

    if (!position) {
      console.error(`❌ Position not found in database:`);
      console.error(`   Username: ${username}`);
      console.error(`   Chain: ${chain}`);
      console.error(`   NFT ID: ${nftId}`);
      console.error('');
      console.error('💡 Make sure the position has been imported first using the position import script.');
      process.exit(1);
    }

    console.log(`✅ Position found: ${position.id}`);
    console.log(`   Pool: ${position.pool.token0.symbol}/${position.pool.token1.symbol}`);
    console.log(`   Range: ${position.tickLower} to ${position.tickUpper}`);
    console.log(`   Owner: ${user.email}`);

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
    console.log('🔍 Fetching position events from blockchain...');

    // Get clients for event service
    const { etherscanClient } = DefaultClientsFactory.getInstance().getClients();
    const etherscanEventService = new EtherscanEventService({
      etherscanClient
    });

    const rawEvents = await etherscanEventService.fetchPositionEvents(
      chain,
      nftId // tokenId as string, not BigInt
    );

    console.log(`📦 Found ${rawEvents.length} blockchain events`);

    if (rawEvents.length === 0) {
      console.log('⚠️  No events found on blockchain. Position might be very new or inactive.');
      return;
    }

    // Display event summary
    const eventSummary: Record<string, number> = {};
    rawEvents.forEach(event => {
      eventSummary[event.eventType] = (eventSummary[event.eventType] || 0) + 1;
    });

    console.log('📊 Event summary:');
    Object.entries(eventSummary).forEach(([eventType, count]) => {
      console.log(`   ${eventType}: ${count}`);
    });

    // Get existing events before sync for comparison
    const { prisma: syncPrisma } = DefaultClientsFactory.getInstance().getClients();
    const existingEventsBefore = await syncPrisma.positionEvent.findMany({
      where: { positionId: position.id },
      select: { transactionHash: true, logIndex: true, eventType: true }
    });

    const existingTxHashes = new Set(
      existingEventsBefore.map(e => `${e.transactionHash}-${e.logIndex}`)
    );

    console.log('🔄 Syncing events through ledger service...');

    // Process each raw event and show status
    console.log('\n📋 Processing blockchain events:');
    console.log('─'.repeat(100));

    rawEvents.forEach((event, index) => {
      const eventKey = `${event.transactionHash}-${event.logIndex}`;
      const status = existingTxHashes.has(eventKey) ? '🔄 ALREADY IN DB' : '➕ ADDING TO DB';
      const eventNum = `${index + 1}`.padStart(3, ' ');
      const blockInfo = `Block ${event.blockNumber}:${event.transactionIndex}:${event.logIndex}`;
      const timestamp = event.blockTimestamp.toISOString().split('T')[0];
      const eventType = event.eventType.padEnd(12, ' ');

      console.log(`${eventNum}. ${blockInfo.padEnd(25)} ${timestamp} ${eventType} ${status}`);
    });

    console.log('─'.repeat(100));

    const syncedEvents = await positionLedgerService.syncPositionEvents(
      positionSyncInfo,
      rawEvents
    );

    console.log(`✅ Ledger sync completed successfully!`);
    console.log(`   Position ID: ${position.id}`);
    console.log(`   Processed: ${rawEvents.length} blockchain events`);

    // Calculate processing statistics
    const alreadyInDb = rawEvents.filter(event => {
      const eventKey = `${event.transactionHash}-${event.logIndex}`;
      return existingTxHashes.has(eventKey);
    }).length;
    const addedToDb = rawEvents.length - alreadyInDb;

    console.log(`   📊 Processing summary:`);
    console.log(`      ➕ Added to database: ${addedToDb}`);
    console.log(`      🔄 Already in database: ${alreadyInDb}`);
    console.log(`      📁 Total events in ledger: ${syncedEvents.length}`);

    // Display synced events
    if (syncedEvents.length > 0) {
      console.log('\n📋 Synced events in chronological order:');
      console.log('─'.repeat(120));

      syncedEvents.forEach((event, index) => {
        const eventNum = `${index + 1}`.padStart(3, ' ');
        const blockInfo = `Block ${event.blockNumber}:${event.transactionIndex}:${event.logIndex}`;
        const timestamp = event.blockTimestamp.toISOString().split('T')[0];
        const eventType = event.eventType.padEnd(12, ' ');
        const source = event.source.padEnd(8, ' ');
        const liquidity = event.liquidityAfter === '0' ? '0' : `${event.liquidityAfter.slice(0, 10)}...`;
        const costBasis = event.costBasisAfter === '0' ? '0' : `${event.costBasisAfter.slice(0, 10)}...`;

        console.log(`${eventNum}. ${blockInfo.padEnd(20)} ${timestamp} ${source} ${eventType} L=${liquidity.padEnd(12)} CB=${costBasis.padEnd(12)} ${event.ledgerIgnore ? '(IGNORED)' : ''}`);
      });
      console.log('─'.repeat(120));

      // Show final state
      const lastEvent = syncedEvents[syncedEvents.length - 1];
      console.log('\n📊 Final position state:');
      console.log(`   Final Liquidity: ${lastEvent.liquidityAfter}`);
      console.log(`   Final Cost Basis: ${lastEvent.costBasisAfter}`);
      console.log(`   Final Realized PnL: ${lastEvent.realizedPnLAfter}`);
    }

    // Calculate final position status
    const positionStatus = positionLedgerService.calculatePositionStatus(rawEvents);
    console.log(`\n🎯 Position Status: ${positionStatus.status}`);
    console.log(`   Current Liquidity: ${positionStatus.currentLiquidity.toString()}`);

  } catch (error) {
    console.error('❌ Error during ledger sync:');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  syncPositionLedger().catch(console.error);
}
/**
 * Blockscanner Worker
 *
 * Scans blockchain events and updates position data in real-time.
 * Implements reorg-resistant event scanning per sync-algo.md specification.
 * Deployed as a standalone Docker container on Fly.io.
 */

import pino from 'pino';
import { BlockScanner } from './scanner';
import { getSupportedChains } from './config';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport:
    process.env.NODE_ENV === 'development'
      ? { target: 'pino-pretty' }
      : undefined,
});

// Track all active scanners
const scanners: BlockScanner[] = [];

async function main() {
  logger.info('🚀 Blockscanner worker starting...');

  // Get chains to scan from environment or use all supported chains
  const chainsToScan = process.env.SCAN_CHAINS
    ? process.env.SCAN_CHAINS.split(',').map((c) => c.trim())
    : getSupportedChains();

  logger.info({ chains: chainsToScan }, 'Initializing scanners for chains');

  // Create scanner for each chain
  for (const chain of chainsToScan) {
    try {
      const scanner = new BlockScanner(chain, logger);

      // Run startup sequence (probe finality, catch-up, reorg check)
      await scanner.startup();

      // Start main polling loop
      await scanner.start();

      scanners.push(scanner);

      logger.info({ chain }, '✅ Scanner started successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(
        { chain, error: errorMessage, stack: error instanceof Error ? error.stack : undefined },
        '❌ Failed to start scanner for chain'
      );
      // Continue with other chains even if one fails
    }
  }

  if (scanners.length === 0) {
    logger.error('No scanners started successfully, exiting');
    process.exit(1);
  }

  logger.info(
    { activeScannersCount: scanners.length },
    '✅ All scanners initialized and running'
  );

  // Graceful shutdown handlers
  async function shutdown(signal: string) {
    logger.info({ signal }, '⏹️  Shutdown signal received');

    // Stop all scanners gracefully
    for (const scanner of scanners) {
      try {
        await scanner.stop();
      } catch (error) {
        logger.error({ error }, 'Error stopping scanner');
      }
    }

    logger.info('Shutdown complete');
    process.exit(0);
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Heartbeat to monitor worker health
  setInterval(() => {
    logger.debug(
      { activeScannersCount: scanners.length },
      '💓 Blockscanner heartbeat'
    );
  }, 60000); // Every 60 seconds
}

main().catch((error) => {
  logger.error({ err: error }, '❌ Fatal error in blockscanner worker');
  process.exit(1);
});

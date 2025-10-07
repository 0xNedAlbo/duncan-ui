/**
 * BlockScanner - Main scanner class implementing the sync algorithm
 */

import { createPublicClient, http, type PublicClient } from 'viem';
import type { Logger } from 'pino';
import type { ChainScannerConfig } from './types';
import { getChainScannerConfig } from './config';
import { getBoundary, probeFinalitySupport } from './boundary';
import { detectReorg, rollback } from './reorg';
import { processBlock } from './processor';
import * as HeaderDB from './db/headers';
import * as WatermarkDB from './db/watermarks';

export class BlockScanner {
  private config: ChainScannerConfig;
  private client: PublicClient;
  private logger: Logger;
  private isRunning: boolean = false;
  private pollTimer?: NodeJS.Timeout;

  constructor(chain: string, logger: Logger) {
    this.config = getChainScannerConfig(chain);
    this.logger = logger.child({ chain: this.config.chain });

    this.client = createPublicClient({
      transport: http(this.config.rpcUrl),
    });
  }

  /**
   * Startup sequence: clean state, probe finality, initialize watermark
   */
  async startup(): Promise<void> {
    this.logger.info('🚀 Starting blockchain scanner');

    // 1. Clean state: delete all old headers for this chain
    const deletedHeaders = await HeaderDB.deleteAllHeaders(this.config.chain);
    if (deletedHeaders > 0) {
      this.logger.info({ deletedHeaders }, 'Deleted all old headers for clean state');
    }

    // 2. Probe finality support
    await probeFinalitySupport(this.config, this.client, this.logger);

    // 3. Initialize watermark to current block - 1
    await this.catchUp();

    this.logger.info('✅ Startup sequence complete');
  }

  /**
   * Initialize watermark to current block
   *
   * Always starts from the current block - 1 to ensure clean state.
   * Historical events are handled by the existing position sync mechanism.
   */
  private async catchUp(): Promise<void> {
    // Always reset to current block - 1 for clean state
    const latestBlock = await this.client.getBlock({ blockTag: 'latest' });
    const watermark = latestBlock.number - 1n;

    // Set watermark (creates or updates)
    await WatermarkDB.setWatermark(this.config.chain, watermark);

    this.logger.info(
      { watermark: watermark.toString(), latest: latestBlock.number.toString() },
      'Watermark set to current block - 1 (clean state, no catch-up)'
    );
  }

  /**
   * Main polling loop
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Scanner already running');
      return;
    }

    this.isRunning = true;
    this.logger.info(
      { pollIntervalMs: this.config.pollIntervalMs },
      'Starting main polling loop'
    );

    // Run first tick immediately
    await this.tick();

    // Schedule recurring ticks
    this.pollTimer = setInterval(async () => {
      await this.tick();
    }, this.config.pollIntervalMs);
  }

  /**
   * Single polling tick: boundary → prune → reorg check → process new blocks
   */
  private async tick(): Promise<void> {
    try {
      // 1. Get current boundary
      const boundary = await getBoundary(this.config, this.client, this.logger);

      // 2. Prune old headers
      await HeaderDB.pruneHeaders(this.config.chain, boundary);

      // 3. Detect reorgs
      const reorgResult = await detectReorg(
        this.config.chain,
        boundary,
        this.client,
        this.logger
      );

      if (reorgResult.hasReorg && reorgResult.commonAncestor !== undefined) {
        this.logger.warn(
          {
            commonAncestor: reorgResult.commonAncestor.toString(),
            reorgDepth: reorgResult.reorgDepth,
          },
          '⚠️  Reorg detected, rolling back'
        );

        await rollback(this.config.chain, reorgResult.commonAncestor, this.logger);
      }

      // 4. Process new blocks
      const watermark = await WatermarkDB.getWatermark(this.config.chain);
      if (watermark === null) {
        this.logger.error('Watermark is null after startup');
        return;
      }

      const latestBlock = await this.client.getBlock({ blockTag: 'latest' });

      // Process up to 50 blocks per tick to avoid overwhelming the worker
      const maxBlocksPerTick = 50;
      const endBlock = watermark + BigInt(maxBlocksPerTick);
      const targetBlock = endBlock < latestBlock.number ? endBlock : latestBlock.number;

      if (targetBlock > watermark) {
        for (let blockNum = watermark + 1n; blockNum <= targetBlock; blockNum++) {
          await processBlock(blockNum, this.config, this.client, this.logger);
          await WatermarkDB.setWatermark(this.config.chain, blockNum);
        }

        this.logger.debug(
          {
            processedBlocks: Number(targetBlock - watermark),
            newWatermark: targetBlock.toString(),
          },
          'Processed new blocks'
        );
      }
    } catch (error) {
      this.logger.error({ error }, 'Error during tick');
    }
  }

  /**
   * Stop the scanner
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.logger.info('Stopping scanner');
    this.isRunning = false;

    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = undefined;
    }

    // Disconnect database connections
    await HeaderDB.disconnect();
    await WatermarkDB.disconnect();

    this.logger.info('Scanner stopped');
  }
}

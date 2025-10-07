/**
 * Block and event processing logic
 */

import {
  type PublicClient,
  type Log,
  decodeEventLog,
  parseAbiItem,
} from 'viem';
import type { Logger } from 'pino';
import type { ChainScannerConfig, NFPMEvent } from './types';
import * as HeaderDB from './db/headers';
import { EVENT_SIGNATURES } from './config';

/**
 * Process a single block: fetch header, fetch logs, parse events
 */
export async function processBlock(
  blockNumber: bigint,
  config: ChainScannerConfig,
  client: PublicClient,
  logger: Logger
): Promise<void> {
  const blockLogger = logger.child({ chain: config.chain, blockNumber: blockNumber.toString() });

  try {
    // 1. Fetch and store block header
    const block = await client.getBlock({ blockNumber });

    await HeaderDB.storeHeader({
      chain: config.chain,
      blockNumber: block.number,
      hash: block.hash!,
      parentHash: block.parentHash,
      timestamp: new Date(Number(block.timestamp) * 1000),
    });

    blockLogger.debug('Block header stored');

    // 2. Fetch logs for NFPM events
    const logs = await client.getLogs({
      address: config.nfpmAddress,
      fromBlock: blockNumber,
      toBlock: blockNumber,
      topics: [
        [
          EVENT_SIGNATURES.IncreaseLiquidity,
          EVENT_SIGNATURES.DecreaseLiquidity,
          EVENT_SIGNATURES.Collect,
        ],
      ],
    });

    if (logs.length === 0) {
      blockLogger.debug('No NFPM events found');
      return;
    }

    blockLogger.info({ eventCount: logs.length }, 'Found NFPM events');

    // 3. Parse and process each event
    for (const log of logs) {
      try {
        const event = parseNFPMEvent(log, block.timestamp);

        // Skip if event was not recognized (e.g., ERC721 Transfer/Approval)
        if (!event) {
          blockLogger.debug(
            { topic: log.topics[0] },
            'Skipping non-NFPM event (likely ERC721 event)'
          );
          continue;
        }

        // For now, just log the event (actual database write will be implemented later)
        logEvent(event, blockLogger);
      } catch (error) {
        blockLogger.error(
          { logIndex: log.logIndex, txHash: log.transactionHash, error },
          'Failed to parse NFPM event'
        );
      }
    }
  } catch (error) {
    blockLogger.error({ error }, 'Failed to process block');
    throw error;
  }
}

/**
 * Parse NFPM event log into typed event object
 * Returns null if the event is not one of the NFPM events we're tracking
 */
function parseNFPMEvent(log: Log, blockTimestamp: bigint): NFPMEvent | null {
  const topic = log.topics[0];

  // Parse IncreaseLiquidity event
  if (topic === EVENT_SIGNATURES.IncreaseLiquidity) {
    const decoded = decodeEventLog({
      abi: [
        parseAbiItem(
          'event IncreaseLiquidity(uint256 indexed tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)'
        ),
      ],
      data: log.data,
      topics: log.topics,
    });

    return {
      type: 'IncreaseLiquidity',
      tokenId: decoded.args.tokenId,
      liquidity: decoded.args.liquidity,
      amount0: decoded.args.amount0,
      amount1: decoded.args.amount1,
      blockNumber: log.blockNumber!,
      blockTimestamp: new Date(Number(blockTimestamp) * 1000),
      transactionHash: log.transactionHash!,
      transactionIndex: log.transactionIndex!,
      logIndex: log.logIndex!,
    };
  }

  // Parse DecreaseLiquidity event
  if (topic === EVENT_SIGNATURES.DecreaseLiquidity) {
    const decoded = decodeEventLog({
      abi: [
        parseAbiItem(
          'event DecreaseLiquidity(uint256 indexed tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)'
        ),
      ],
      data: log.data,
      topics: log.topics,
    });

    return {
      type: 'DecreaseLiquidity',
      tokenId: decoded.args.tokenId,
      liquidity: decoded.args.liquidity,
      amount0: decoded.args.amount0,
      amount1: decoded.args.amount1,
      blockNumber: log.blockNumber!,
      blockTimestamp: new Date(Number(blockTimestamp) * 1000),
      transactionHash: log.transactionHash!,
      transactionIndex: log.transactionIndex!,
      logIndex: log.logIndex!,
    };
  }

  // Parse Collect event
  if (topic === EVENT_SIGNATURES.Collect) {
    const decoded = decodeEventLog({
      abi: [
        parseAbiItem(
          'event Collect(uint256 indexed tokenId, address recipient, uint256 amount0, uint256 amount1)'
        ),
      ],
      data: log.data,
      topics: log.topics,
    });

    return {
      type: 'Collect',
      tokenId: decoded.args.tokenId,
      recipient: decoded.args.recipient,
      amount0: decoded.args.amount0,
      amount1: decoded.args.amount1,
      blockNumber: log.blockNumber!,
      blockTimestamp: new Date(Number(blockTimestamp) * 1000),
      transactionHash: log.transactionHash!,
      transactionIndex: log.transactionIndex!,
      logIndex: log.logIndex!,
    };
  }

  // Unknown event signature (likely ERC721 Transfer/Approval or other contract events)
  // Return null to skip silently
  return null;
}

/**
 * Log NFPM event (stub implementation)
 *
 * For now, we just log events. Actual database writes will be implemented later.
 */
function logEvent(event: NFPMEvent, logger: Logger): void {
  switch (event.type) {
    case 'IncreaseLiquidity':
      logger.info(
        {
          eventType: 'IncreaseLiquidity',
          tokenId: event.tokenId.toString(),
          liquidity: event.liquidity.toString(),
          amount0: event.amount0.toString(),
          amount1: event.amount1.toString(),
          txHash: event.transactionHash,
          txIndex: event.transactionIndex,
          logIndex: event.logIndex,
        },
        '📈 IncreaseLiquidity event detected'
      );
      break;

    case 'DecreaseLiquidity':
      logger.info(
        {
          eventType: 'DecreaseLiquidity',
          tokenId: event.tokenId.toString(),
          liquidity: event.liquidity.toString(),
          amount0: event.amount0.toString(),
          amount1: event.amount1.toString(),
          txHash: event.transactionHash,
          txIndex: event.transactionIndex,
          logIndex: event.logIndex,
        },
        '📉 DecreaseLiquidity event detected'
      );
      break;

    case 'Collect':
      logger.info(
        {
          eventType: 'Collect',
          tokenId: event.tokenId.toString(),
          recipient: event.recipient,
          amount0: event.amount0.toString(),
          amount1: event.amount1.toString(),
          txHash: event.transactionHash,
          txIndex: event.transactionIndex,
          logIndex: event.logIndex,
        },
        '💰 Collect event detected'
      );
      break;
  }
}

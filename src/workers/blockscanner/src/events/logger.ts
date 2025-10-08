// Event Parser and Processor
// Parses Uniswap V3 events from Etherscan logs and calls service to process them

import type { EtherscanLog } from "@/services/etherscan/etherscanClient";
import type { Logger } from "pino";
import type { SupportedChainsType } from "@/config/chains";
import type { PositionLedgerService } from "@/services/positions/positionLedgerService";
import { TOPICS } from "../config.js";
import type { EventType, LogRecord } from "../types.js";

// ═══════════════════════════════════════════════════════════════════════════════
// EVENT TYPE DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

function getEventType(log: EtherscanLog): EventType | null {
  const topic = log.topics[0];

  if (topic === TOPICS.INCREASE_LIQUIDITY) {
    return "INCREASE_LIQUIDITY";
  } else if (topic === TOPICS.DECREASE_LIQUIDITY) {
    return "DECREASE_LIQUIDITY";
  } else if (topic === TOPICS.COLLECT) {
    return "COLLECT";
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVENT DATA DECODING
// ═══════════════════════════════════════════════════════════════════════════════

function decodeIncreaseLiquidityData(data: string): {
  liquidity: bigint;
  amount0: bigint;
  amount1: bigint;
} {
  // Remove 0x prefix and split into 32-byte chunks
  const hex = data.slice(2);
  const chunks = hex.match(/.{64}/g) || [];

  if (chunks.length < 3) {
    throw new Error(
      `Invalid IncreaseLiquidity data: expected 3 chunks, got ${chunks.length}`
    );
  }

  return {
    liquidity: BigInt("0x" + chunks[0]),
    amount0: BigInt("0x" + chunks[1]),
    amount1: BigInt("0x" + chunks[2]),
  };
}

function decodeDecreaseLiquidityData(data: string): {
  liquidity: bigint;
  amount0: bigint;
  amount1: bigint;
} {
  // Same structure as IncreaseLiquidity
  return decodeIncreaseLiquidityData(data);
}

function decodeCollectData(data: string): {
  recipient: string;
  amount0: bigint;
  amount1: bigint;
} {
  // Collect(uint256 indexed tokenId, address recipient, uint256 amount0, uint256 amount1)
  // data contains: recipient (32 bytes) + amount0 (32 bytes) + amount1 (32 bytes)
  const hex = data.slice(2);
  const chunks = hex.match(/.{64}/g) || [];

  if (chunks.length < 3) {
    throw new Error(
      `Invalid Collect data: expected 3 chunks, got ${chunks.length}`
    );
  }

  // Extract recipient address (last 20 bytes of first chunk)
  const recipientHex = chunks[0]?.slice(24);
  if (!recipientHex) {
    throw new Error("Missing recipient data in Collect event");
  }
  const recipient = "0x" + recipientHex;

  return {
    recipient,
    amount0: BigInt("0x" + chunks[1]),
    amount1: BigInt("0x" + chunks[2]),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVENT PARSING AND LOGGING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parse and process a single event through PositionLedgerService
 * Note: blockTimestamp is fetched by service only if positions exist
 */
export async function parseAndProcessEvent(
  log: EtherscanLog,
  chain: SupportedChainsType,
  positionLedgerService: PositionLedgerService,
  logger: Logger
): Promise<LogRecord | null> {
  const eventType = getEventType(log);

  if (!eventType) {
    logger.warn(
      {
        chain,
        txHash: log.transactionHash,
        topic: log.topics[0],
      },
      "Unknown event topic (skipping)"
    );
    return null;
  }

  try {
    // Extract tokenId from topic[1]
    const tokenId = BigInt(log.topics[1]).toString();

    // Build structured log output
    const eventData: any = {
      chain,
      eventType,
      blockNumber: log.blockNumber,
      blockHash: log.blockHash,
      transactionIndex: parseInt(log.transactionIndex),
      transactionHash: log.transactionHash,
      logIndex: parseInt(log.logIndex),
      tokenId,
    };

    // Decode and add event-specific fields
    if (eventType === "INCREASE_LIQUIDITY") {
      const decoded = decodeIncreaseLiquidityData(log.data);
      eventData.liquidity = decoded.liquidity.toString();
      eventData.amount0 = decoded.amount0.toString();
      eventData.amount1 = decoded.amount1.toString();
    } else if (eventType === "DECREASE_LIQUIDITY") {
      const decoded = decodeDecreaseLiquidityData(log.data);
      eventData.liquidity = decoded.liquidity.toString();
      eventData.amount0 = decoded.amount0.toString();
      eventData.amount1 = decoded.amount1.toString();
    } else if (eventType === "COLLECT") {
      const decoded = decodeCollectData(log.data);
      eventData.recipient = decoded.recipient;
      eventData.amount0 = decoded.amount0.toString();
      eventData.amount1 = decoded.amount1.toString();
    }

    // Call PositionLedgerService to process the event for all affected users
    try {
      const results = await positionLedgerService.processBlockchainEvent({
        chain,
        protocol: "uniswapv3",
        nftId: tokenId,
        eventType,
        blockNumber: BigInt(log.blockNumber),
        blockHash: log.blockHash,
        transactionIndex: parseInt(log.transactionIndex),
        transactionHash: log.transactionHash,
        logIndex: parseInt(log.logIndex),
        amount0: eventData.amount0 || "0",
        amount1: eventData.amount1 || "0",
        liquidity: eventData.liquidity || "0",
        recipient: eventData.recipient,
      });

      // Log results per user
      const successCount = results.filter((r) => r.success).length;
      const failureCount = results.filter((r) => !r.success).length;

      if (failureCount > 0) {
        logger.warn(
          {
            ...eventData,
            successCount,
            failureCount,
            failures: results.filter((r) => !r.success),
          },
          `Event processed with ${failureCount} failures: ${eventType}`
        );
      } else if (successCount > 0) {
        logger.info(
          { ...eventData, userCount: successCount },
          `Event processed for ${successCount} users: ${eventType}`
        );
      } else {
        logger.debug(
          eventData,
          `Event found but no users own this NFT: ${eventType}`
        );
      }
    } catch (serviceError) {
      logger.error(
        {
          chain,
          txHash: log.transactionHash,
          eventType,
          error:
            serviceError instanceof Error
              ? serviceError.message
              : String(serviceError),
        },
        "Failed to process event through service"
      );
      return null;
    }

    // Return LogRecord for internal tracking
    return {
      blockNumber: BigInt(log.blockNumber),
      blockHash: log.blockHash,
      transactionIndex: parseInt(log.transactionIndex),
      logIndex: parseInt(log.logIndex),
      txHash: log.transactionHash,
      eventType,
      rawLog: log,
    };
  } catch (error) {
    logger.error(
      {
        chain,
        txHash: log.transactionHash,
        eventType,
        error: error instanceof Error ? error.message : String(error),
      },
      "Failed to decode event"
    );
    return null;
  }
}

/**
 * Parse and process multiple events
 * Note: blockTimestamp is fetched by service only when positions exist (optimization)
 */
export async function parseAndProcessEvents(
  logs: EtherscanLog[],
  chain: SupportedChainsType,
  positionLedgerService: PositionLedgerService,
  logger: Logger
): Promise<LogRecord[]> {
  const records: LogRecord[] = [];

  for (const log of logs) {
    const record = await parseAndProcessEvent(
      log,
      chain,
      positionLedgerService,
      logger
    );
    if (record) {
      records.push(record);
    }
  }

  return records;
}

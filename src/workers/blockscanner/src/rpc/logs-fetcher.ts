// Etherscan Logs Fetcher with Adaptive Chunking
// Implements the adaptiveGetLogs() function using Etherscan API

import type { Logger } from "pino";
import type { EtherscanClient, EtherscanLog } from "@/services/etherscan/etherscanClient";
import type { SupportedChainsType } from "@/config/chains";
import {
  getNFPMAddress,
  TOPICS,
  CHUNK_MIN,
  CHUNK_MAX,
  TARGET_LOGS_PER_CALL,
} from "../config.js";
import type { FetchLogsResult } from "../types.js";

// ═══════════════════════════════════════════════════════════════════════════════
// ADAPTIVE GETLOGS IMPLEMENTATION (ETHERSCAN API)
// ═══════════════════════════════════════════════════════════════════════════════

interface AdaptiveGetLogsOptions {
  etherscanClient: EtherscanClient;
  chain: SupportedChainsType;
  fromBlock: bigint;
  toBlock: bigint;
  log: Logger;
}

export async function adaptiveGetLogs(
  options: AdaptiveGetLogsOptions
): Promise<EtherscanLog[]> {
  const { etherscanClient, chain, fromBlock, toBlock, log } = options;

  const allLogs: EtherscanLog[] = [];
  let currentStart = fromBlock;
  let currentSpan = BigInt(
    Math.min(CHUNK_MAX, Number(toBlock - fromBlock + 1n))
  );

  while (currentStart <= toBlock) {
    const currentEnd = currentStart + currentSpan - 1n > toBlock
      ? toBlock
      : currentStart + currentSpan - 1n;

    const result = await tryGetLogsOnce({
      etherscanClient,
      chain,
      fromBlock: currentStart,
      toBlock: currentEnd,
      log,
    });

    if (!result.success) {
      // Backoff: shrink chunk size and retry
      currentSpan = BigInt(Math.max(CHUNK_MIN, Number(currentSpan) / 2));
      log.warn(
        {
          chain,
          fromBlock: currentStart.toString(),
          toBlock: currentEnd.toString(),
          newSpan: currentSpan.toString(),
        },
        "Etherscan API call failed, reducing chunk size"
      );
      continue;
    }

    allLogs.push(...result.logs);

    // Adaptive span adjustment based on log count
    const logCount = result.logs.length;
    if (logCount < TARGET_LOGS_PER_CALL / 2) {
      // Too few logs, increase span
      currentSpan = BigInt(Math.min(CHUNK_MAX, Number(currentSpan) * 2));
    } else if (logCount > TARGET_LOGS_PER_CALL * 2) {
      // Too many logs, decrease span
      currentSpan = BigInt(Math.max(CHUNK_MIN, Number(currentSpan) / 2));
    }

    // Move to next chunk
    currentStart = currentEnd + 1n;
  }

  log.debug(
    {
      chain,
      fromBlock: fromBlock.toString(),
      toBlock: toBlock.toString(),
      totalLogs: allLogs.length,
    },
    "Adaptive getLogs completed"
  );

  return allLogs;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLE ETHERSCAN API CALL WRAPPER
// ═══════════════════════════════════════════════════════════════════════════════

interface TryGetLogsOnceOptions {
  etherscanClient: EtherscanClient;
  chain: SupportedChainsType;
  fromBlock: bigint;
  toBlock: bigint;
  log: Logger;
}

async function tryGetLogsOnce(
  options: TryGetLogsOnceOptions
): Promise<FetchLogsResult> {
  const { etherscanClient, chain, fromBlock, toBlock, log } = options;

  try {
    // Get chain-specific NFPM address
    const nfpmAddress = getNFPMAddress(chain);

    // Fetch logs for all three event types in parallel
    const [increaseLogs, decreaseLogs, collectLogs] = await Promise.all([
      etherscanClient.fetchLogs(chain, nfpmAddress, {
        fromBlock: Number(fromBlock),
        toBlock: Number(toBlock),
        topic0: TOPICS.INCREASE_LIQUIDITY,
      }),
      etherscanClient.fetchLogs(chain, nfpmAddress, {
        fromBlock: Number(fromBlock),
        toBlock: Number(toBlock),
        topic0: TOPICS.DECREASE_LIQUIDITY,
      }),
      etherscanClient.fetchLogs(chain, nfpmAddress, {
        fromBlock: Number(fromBlock),
        toBlock: Number(toBlock),
        topic0: TOPICS.COLLECT,
      }),
    ]);

    const allLogs = [...increaseLogs, ...decreaseLogs, ...collectLogs];

    // Sort logs by blockchain order (blockNumber, transactionIndex, logIndex)
    allLogs.sort((a, b) => {
      const blockDiff = parseInt(a.blockNumber) - parseInt(b.blockNumber);
      if (blockDiff !== 0) return blockDiff;

      const txDiff = parseInt(a.transactionIndex) - parseInt(b.transactionIndex);
      if (txDiff !== 0) return txDiff;

      return parseInt(a.logIndex) - parseInt(b.logIndex);
    });

    log.debug(
      {
        chain,
        fromBlock: fromBlock.toString(),
        toBlock: toBlock.toString(),
        logsFound: allLogs.length,
        breakdown: {
          increase: increaseLogs.length,
          decrease: decreaseLogs.length,
          collect: collectLogs.length,
        },
      },
      "Etherscan getLogs successful"
    );

    return {
      logs: allLogs,
      success: true,
      fromBlock,
      toBlock,
    };
  } catch (error) {
    // Etherscan client handles rate limiting automatically with retries
    // If we reach here, it's likely a more serious error
    const errorMessage = error instanceof Error ? error.message : String(error);

    log.error(
      {
        chain,
        fromBlock: fromBlock.toString(),
        toBlock: toBlock.toString(),
        error: errorMessage,
      },
      "Etherscan API error"
    );

    return {
      logs: [],
      success: false,
      fromBlock,
      toBlock,
    };
  }
}

/**
 * Parse IncreaseLiquidity event from mint transaction receipt
 *
 * Extracts the IncreaseLiquidity event emitted during position minting
 * to enable immediate cost basis calculation before blockscanner syncs.
 */

import type { TransactionReceipt, Address } from 'viem';
import { decodeEventLog } from 'viem';

// IncreaseLiquidity event signature
// event IncreaseLiquidity(uint256 indexed tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)
const INCREASE_LIQUIDITY_SIGNATURE = '0x3067048beee31b25b2f1681f88dac838c8bba36af25bfb2b7cf7473a5847e35f';

// ABI for IncreaseLiquidity event
const INCREASE_LIQUIDITY_ABI = [
  {
    type: 'event',
    name: 'IncreaseLiquidity',
    inputs: [
      {
        indexed: true,
        name: 'tokenId',
        type: 'uint256',
      },
      {
        indexed: false,
        name: 'liquidity',
        type: 'uint128',
      },
      {
        indexed: false,
        name: 'amount0',
        type: 'uint256',
      },
      {
        indexed: false,
        name: 'amount1',
        type: 'uint256',
      },
    ],
  },
] as const;

export interface ParsedIncreaseLiquidityEvent {
  tokenId: string;
  liquidity: string;
  amount0: string;
  amount1: string;
  blockNumber: bigint;
  transactionIndex: number;
  logIndex: number;
  transactionHash: string;
}

/**
 * Parse IncreaseLiquidity event from transaction receipt
 *
 * @param receipt - Transaction receipt from mint operation
 * @param nftManagerAddress - NonfungiblePositionManager contract address
 * @returns Parsed event data or null if not found
 */
export function parseIncreaseLiquidityEvent(
  receipt: TransactionReceipt,
  nftManagerAddress: Address
): ParsedIncreaseLiquidityEvent | null {
  // Find the IncreaseLiquidity event log
  const log = receipt.logs.find(
    (l) =>
      l.address.toLowerCase() === nftManagerAddress.toLowerCase() &&
      l.topics[0] === INCREASE_LIQUIDITY_SIGNATURE
  );

  if (!log) {
    return null;
  }

  try {
    // Decode the event log
    const decoded = decodeEventLog({
      abi: INCREASE_LIQUIDITY_ABI,
      data: log.data,
      topics: log.topics,
    });

    // Extract values from decoded event
    const args = decoded.args as {
      tokenId: bigint;
      liquidity: bigint;
      amount0: bigint;
      amount1: bigint;
    };

    return {
      tokenId: args.tokenId.toString(),
      liquidity: args.liquidity.toString(),
      amount0: args.amount0.toString(),
      amount1: args.amount1.toString(),
      blockNumber: receipt.blockNumber,
      transactionIndex: receipt.transactionIndex,
      logIndex: log.logIndex ?? 0,
      transactionHash: receipt.transactionHash,
    };
  } catch (error) {
    console.error('Failed to parse IncreaseLiquidity event:', error);
    return null;
  }
}

/**
 * Parse Uniswap V3 position events from transaction receipts
 *
 * Extracts INCREASE_LIQUIDITY, DECREASE_LIQUIDITY, and COLLECT events
 * to enable immediate database seeding before blockscanner syncs.
 */

import type { TransactionReceipt, Address } from 'viem';
import { decodeEventLog } from 'viem';

// Event signatures from etherscanEventService.ts
export const EVENT_SIGNATURES = {
    INCREASE_LIQUIDITY: '0x3067048beee31b25b2f1681f88dac838c8bba36af25bfb2b7cf7473a5847e35f',
    DECREASE_LIQUIDITY: '0x26f6a048ee9138f2c0ce266f322cb99228e8d619ae2bff30c67f8dcf9d2377b4',
    COLLECT: '0x40d0efd1a53d60ecbf40971b9daf7dc90178c3aadc7aab1765632738fa8b8f01',
} as const;

// ABIs for each event type
const INCREASE_LIQUIDITY_ABI = [
    {
        type: 'event',
        name: 'IncreaseLiquidity',
        inputs: [
            { indexed: true, name: 'tokenId', type: 'uint256' },
            { indexed: false, name: 'liquidity', type: 'uint128' },
            { indexed: false, name: 'amount0', type: 'uint256' },
            { indexed: false, name: 'amount1', type: 'uint256' }
        ]
    }
] as const;

const DECREASE_LIQUIDITY_ABI = [
    {
        type: 'event',
        name: 'DecreaseLiquidity',
        inputs: [
            { indexed: true, name: 'tokenId', type: 'uint256' },
            { indexed: false, name: 'liquidity', type: 'uint128' },
            { indexed: false, name: 'amount0', type: 'uint256' },
            { indexed: false, name: 'amount1', type: 'uint256' }
        ]
    }
] as const;

const COLLECT_ABI = [
    {
        type: 'event',
        name: 'Collect',
        inputs: [
            { indexed: true, name: 'tokenId', type: 'uint256' },
            { indexed: false, name: 'recipient', type: 'address' },
            { indexed: false, name: 'amount0', type: 'uint256' },
            { indexed: false, name: 'amount1', type: 'uint256' }
        ]
    }
] as const;

export interface ParsedLiquidityEvent {
    eventType: 'INCREASE_LIQUIDITY' | 'DECREASE_LIQUIDITY' | 'COLLECT';
    transactionHash: string;
    blockNumber: string;
    transactionIndex: number;
    logIndex: number;
    liquidity?: string;
    amount0?: string;
    amount1?: string;
    recipient?: string;
}

/**
 * Parse IncreaseLiquidity event from transaction receipt
 *
 * @param receipt - Transaction receipt from increase liquidity operation
 * @param nftManagerAddress - NonfungiblePositionManager contract address
 * @returns Parsed event data or null if not found
 */
export function parseIncreaseLiquidityEvent(
    receipt: TransactionReceipt,
    nftManagerAddress: Address
): ParsedLiquidityEvent | null {
    const log = receipt.logs.find(
        l => l.address.toLowerCase() === nftManagerAddress.toLowerCase() &&
             l.topics[0] === EVENT_SIGNATURES.INCREASE_LIQUIDITY
    );

    if (!log) return null;

    try {
        const decoded = decodeEventLog({
            abi: INCREASE_LIQUIDITY_ABI,
            data: log.data,
            topics: log.topics
        });

        const args = decoded.args as {
            tokenId: bigint;
            liquidity: bigint;
            amount0: bigint;
            amount1: bigint;
        };

        return {
            eventType: 'INCREASE_LIQUIDITY',
            transactionHash: receipt.transactionHash,
            blockNumber: receipt.blockNumber.toString(),
            transactionIndex: receipt.transactionIndex,
            logIndex: log.logIndex ?? 0,
            liquidity: args.liquidity.toString(),
            amount0: args.amount0.toString(),
            amount1: args.amount1.toString()
        };
    } catch (error) {
        console.error('Failed to parse IncreaseLiquidity event:', error);
        return null;
    }
}

/**
 * Parse DecreaseLiquidity event from transaction receipt
 *
 * @param receipt - Transaction receipt from decrease liquidity operation
 * @param nftManagerAddress - NonfungiblePositionManager contract address
 * @returns Parsed event data or null if not found
 */
export function parseDecreaseLiquidityEvent(
    receipt: TransactionReceipt,
    nftManagerAddress: Address
): ParsedLiquidityEvent | null {
    const log = receipt.logs.find(
        l => l.address.toLowerCase() === nftManagerAddress.toLowerCase() &&
             l.topics[0] === EVENT_SIGNATURES.DECREASE_LIQUIDITY
    );

    if (!log) return null;

    try {
        const decoded = decodeEventLog({
            abi: DECREASE_LIQUIDITY_ABI,
            data: log.data,
            topics: log.topics
        });

        const args = decoded.args as {
            tokenId: bigint;
            liquidity: bigint;
            amount0: bigint;
            amount1: bigint;
        };

        return {
            eventType: 'DECREASE_LIQUIDITY',
            transactionHash: receipt.transactionHash,
            blockNumber: receipt.blockNumber.toString(),
            transactionIndex: receipt.transactionIndex,
            logIndex: log.logIndex ?? 0,
            liquidity: args.liquidity.toString(),
            amount0: args.amount0.toString(),
            amount1: args.amount1.toString()
        };
    } catch (error) {
        console.error('Failed to parse DecreaseLiquidity event:', error);
        return null;
    }
}

/**
 * Parse Collect event from transaction receipt
 *
 * @param receipt - Transaction receipt from collect fees operation
 * @param nftManagerAddress - NonfungiblePositionManager contract address
 * @returns Parsed event data or null if not found
 */
export function parseCollectEvent(
    receipt: TransactionReceipt,
    nftManagerAddress: Address
): ParsedLiquidityEvent | null {
    const log = receipt.logs.find(
        l => l.address.toLowerCase() === nftManagerAddress.toLowerCase() &&
             l.topics[0] === EVENT_SIGNATURES.COLLECT
    );

    if (!log) return null;

    try {
        const decoded = decodeEventLog({
            abi: COLLECT_ABI,
            data: log.data,
            topics: log.topics
        });

        const args = decoded.args as {
            tokenId: bigint;
            recipient: Address;
            amount0: bigint;
            amount1: bigint;
        };

        return {
            eventType: 'COLLECT',
            transactionHash: receipt.transactionHash,
            blockNumber: receipt.blockNumber.toString(),
            transactionIndex: receipt.transactionIndex,
            logIndex: log.logIndex ?? 0,
            amount0: args.amount0.toString(),
            amount1: args.amount1.toString(),
            recipient: args.recipient
        };
    } catch (error) {
        console.error('Failed to parse Collect event:', error);
        return null;
    }
}

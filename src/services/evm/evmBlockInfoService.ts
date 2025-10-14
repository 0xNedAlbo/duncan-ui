/**
 * EVM Block Info Service
 *
 * Retrieves block information from EVM-compatible chains using RPC calls.
 * Uses Viem public clients for consistent blockchain interaction.
 */

import { SupportedChainsType, getFinalityConfig } from "@/config/chains";
import type { PublicClient } from "viem";

export interface BlockInfo {
    hash: string;
    number: bigint;
    timestamp: bigint;
    gasUsed: bigint;
    gasLimit: bigint;
    baseFeePerGas: bigint | null;
    transactionCount: number;
    parentHash: string;
    blockTag?: string;
}

export class EvmBlockInfoService {
    private rpcClients: Map<SupportedChainsType, PublicClient>;

    constructor(rpcClients: Map<SupportedChainsType, PublicClient>) {
        this.rpcClients = rpcClients;
    }

    /**
     * Get block information by block number
     *
     * @param blockNumber - Block number to retrieve (as bigint)
     * @param chain - Blockchain to query
     * @returns BlockInfo structure with essential block data
     * @throws Error if chain is not supported or RPC call fails
     */
    async getBlockByNumber(
        blockNumber: bigint,
        chain: SupportedChainsType
    ): Promise<BlockInfo> {
        const client = this.rpcClients.get(chain);
        if (!client) {
            throw new Error(`RPC client not found for chain: ${chain}`);
        }

        try {
            const block = await client.getBlock({
                blockNumber,
                includeTransactions: false
            });

            if (!block) {
                throw new Error(`Block not found: ${blockNumber} on ${chain}`);
            }

            return {
                hash: block.hash!,
                number: block.number!,
                timestamp: block.timestamp,
                gasUsed: block.gasUsed,
                gasLimit: block.gasLimit,
                baseFeePerGas: block.baseFeePerGas,
                transactionCount: block.transactions.length,
                parentHash: block.parentHash,
                blockTag: (block as any).blockTag
            };

        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`Failed to get block ${blockNumber} on ${chain}: ${error.message}`);
            }
            throw new Error(`Unknown error getting block ${blockNumber} on ${chain}`);
        }
    }

    /**
     * Get block information by block tag (finalized, safe, latest)
     *
     * @param blockTag - Block tag to retrieve ("finalized", "safe", "latest")
     * @param chain - Blockchain to query
     * @returns BlockInfo structure with essential block data, or null if tag not supported
     * @throws Error if chain is not supported or RPC call fails
     */
    async getBlockByTag(
        blockTag: "finalized" | "safe" | "latest",
        chain: SupportedChainsType
    ): Promise<BlockInfo | null> {
        const client = this.rpcClients.get(chain);
        if (!client) {
            throw new Error(`RPC client not found for chain: ${chain}`);
        }

        try {
            const block = await client.getBlock({
                blockTag,
                includeTransactions: false
            });

            if (!block || !block.number) {
                return null;
            }

            return {
                hash: block.hash!,
                number: block.number,
                timestamp: block.timestamp,
                gasUsed: block.gasUsed,
                gasLimit: block.gasLimit,
                baseFeePerGas: block.baseFeePerGas,
                transactionCount: block.transactions.length,
                parentHash: block.parentHash,
                blockTag
            };
        } catch {
            // Block tag not supported by chain (e.g., "finalized" on older chains)
            return null;
        }
    }

    /**
     * Get latest block number
     *
     * @param chain - Blockchain to query
     * @returns Latest block number
     * @throws Error if chain is not supported or RPC call fails
     */
    async getBlockNumber(chain: SupportedChainsType): Promise<bigint> {
        const client = this.rpcClients.get(chain);
        if (!client) {
            throw new Error(`RPC client not found for chain: ${chain}`);
        }

        try {
            return await client.getBlockNumber();
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`Failed to get block number on ${chain}: ${error.message}`);
            }
            throw new Error(`Unknown error getting block number on ${chain}`);
        }
    }

    /**
     * Check if a transaction in a specific block is final
     *
     * @param transactionBlockNumber - Block number containing the transaction
     * @param chain - Blockchain to check
     * @returns Promise<boolean> - true if transaction is final, false otherwise
     * @throws Error if chain is not supported or RPC call fails
     */
    async isTransactionFinal(
        transactionBlockNumber: bigint,
        chain: SupportedChainsType
    ): Promise<boolean> {
        const client = this.rpcClients.get(chain);
        if (!client) {
            throw new Error(`RPC client not found for chain: ${chain}`);
        }

        const finalityConfig = getFinalityConfig(chain);

        try {
            if (finalityConfig.type === "blockTag") {
                const finalBlock = await client.getBlock({
                    blockTag: "finalized"
                });

                if (!finalBlock || !finalBlock.number) {
                    return false;
                }

                return transactionBlockNumber <= finalBlock.number;

            } else if (finalityConfig.type === "blockHeight") {
                const latestBlock = await client.getBlock({
                    blockTag: "latest"
                });

                if (!latestBlock || !latestBlock.number) {
                    return false;
                }

                const confirmations = Number(latestBlock.number - transactionBlockNumber);
                return confirmations >= finalityConfig.minBlockHeight;
            }

            return false;

        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`Failed to check finality for block ${transactionBlockNumber} on ${chain}: ${error.message}`);
            }
            throw new Error(`Unknown error checking finality for block ${transactionBlockNumber} on ${chain}`);
        }
    }

    /**
     * Get the last finalized block number for a chain
     *
     * @param chain - Blockchain to query
     * @returns Promise<bigint | null> - Last finalized block number, or null if no finalized blocks
     * @throws Error if chain is not supported or RPC call fails
     */
    async getLastFinalizedBlockNumber(chain: SupportedChainsType): Promise<bigint | null> {
        const client = this.rpcClients.get(chain);
        if (!client) {
            throw new Error(`RPC client not found for chain: ${chain}`);
        }

        const finalityConfig = getFinalityConfig(chain);

        try {
            if (finalityConfig.type === "blockTag") {
                const finalizedBlock = await client.getBlock({
                    blockTag: "finalized"
                });

                return finalizedBlock?.number || null;

            } else if (finalityConfig.type === "blockHeight") {
                const latestBlock = await client.getBlock({
                    blockTag: "latest"
                });

                if (!latestBlock?.number) {
                    return null;
                }

                const finalizedBlockNumber = latestBlock.number - BigInt(finalityConfig.minBlockHeight);
                return finalizedBlockNumber >= 0n ? finalizedBlockNumber : null;
            }

            return null;

        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`Failed to get last finalized block for ${chain}: ${error.message}`);
            }
            throw new Error(`Unknown error getting last finalized block for ${chain}`);
        }
    }
}
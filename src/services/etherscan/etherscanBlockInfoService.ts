/**
 * Etherscan Block Info Service
 *
 * Provides block-related information using Etherscan API,
 * specifically for timestamp-to-block conversion.
 * Uses the existing EtherscanClient for consistent API handling.
 */

import { SupportedChainsType } from "@/config/chains";
import type { Clients } from "../ClientsFactory";
import type { EtherscanClient } from "./etherscanClient";

export class EtherscanBlockInfoService {
    private etherscanClient: EtherscanClient;

    constructor(requiredClients: Pick<Clients, "etherscanClient">) {
        this.etherscanClient = requiredClients.etherscanClient;
    }

    /**
     * Get block number for a given timestamp
     * Wrapper around EtherscanClient for consistent API usage
     *
     * @param timestamp - JavaScript Date object
     * @param chain - Blockchain to query
     * @param closest - Whether to get block "before" or "after" timestamp
     * @returns Block number as BigInt
     * @throws Error if timestamp is too old, too new, or API fails
     */
    async getBlockNumberForTimestamp(
        timestamp: Date,
        chain: SupportedChainsType,
        closest: "before" | "after" = "before"
    ): Promise<bigint> {
        // Convert JavaScript Date to Unix timestamp (seconds)
        const unixTimestamp = Math.floor(timestamp.getTime() / 1000);

        try {
            // Use existing etherscanClient for consistent rate limiting and error handling
            const blockNumberString = await this.etherscanClient.getBlockNumberForTimestamp(
                chain,
                unixTimestamp,
                closest
            );

            // Convert string result to BigInt
            return BigInt(blockNumberString);

        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error(`Unknown error during block lookup: ${error}`);
        }
    }
}
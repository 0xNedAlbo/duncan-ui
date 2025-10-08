/**
 * Etherscan Client
 *
 * Generic client for interacting with the Etherscan V2 API.
 * Handles API communication, rate limiting, and basic response parsing.
 */

import { SupportedChainsType } from "@/config/chains";
import { globalScheduler } from "@/lib/utils/request-scheduler";
import { withRetries } from "@/lib/utils/http-retry";
import { createServiceLogger } from "@/lib/logging/loggerFactory";

// Etherscan v2 unified API base URL
const API_BASE_URL = "https://api.etherscan.io/v2/api";

// Chain configurations for Etherscan v2 unified API
const CHAIN_CONFIG = {
    ethereum: { chainId: 1 },
    arbitrum: { chainId: 42161 },
    base: { chainId: 8453 },
} as const;

// Generic Etherscan log structure
export interface EtherscanLog {
    address: string;
    topics: string[];
    data: string;
    blockNumber: string;
    blockHash: string;
    timeStamp: string;
    gasPrice: string;
    gasUsed: string;
    logIndex: string;
    transactionHash: string;
    transactionIndex: string;
}

// Generic Etherscan API response
export interface EtherscanResponse {
    status: string;
    message: string;
    result: EtherscanLog[];
}

// Response for block number lookup
export interface BlockNumberResponse {
    status: string;
    message: string;
    result: string; // Block number as string
}

// Response for contract creation lookup
export interface ContractCreationResponse {
    status: string;
    message: string;
    result: Array<{
        contractAddress: string;
        contractCreator: string;
        txHash: string;
        blockNumber: string;
    }>;
}

// Options for fetching logs
export interface LogOptions {
    fromBlock?: string | number;
    toBlock?: string | number;
    topic0?: string; // Event signature
    topic1?: string; // First indexed parameter
    topic2?: string; // Second indexed parameter
    topic3?: string; // Third indexed parameter
}

const logger = createServiceLogger("EtherscanClient");

export class EtherscanClient {
    constructor() {
        this.validateApiKey();
    }

    /**
     * Check if Etherscan API response indicates rate limiting
     */
    private isEtherscanRateLimited(data: any): boolean {
        return (
            data.status !== "1" &&
            data.message === "NOTOK" &&
            typeof data.result === "string" &&
            data.result.toLowerCase().includes("max calls per sec")
        );
    }

    /**
     * Execute HTTP fetch with Etherscan-specific rate limit detection and retry
     */
    private async doFetch<T>(url: string): Promise<T> {
        const call = async () => {
            const response = await fetch(url, {
                headers: {
                    "User-Agent": "Midcurve-UI/1.0",
                },
            });

            if (!response.ok) {
                const error: any = new Error(
                    `HTTP ${response.status}: ${response.statusText}`
                );
                error.status = response.status;
                throw error;
            }

            const data = await response.json();

            // Check for Etherscan-specific rate limit response
            if (this.isEtherscanRateLimited(data)) {
                logger.debug(
                    {
                        status: data.status,
                        message: data.message,
                        result: data.result,
                    },
                    "Etherscan API rate limit detected, will retry with backoff"
                );
                const error: any = new Error(
                    `Etherscan API error: ${data.message} ${data.result}`
                );
                error.status = 429; // Mark as rate limit error for retry logic
                throw error;
            }

            return data as T;
        };

        // 1) Process-wide serialization + spacing via global scheduler
        // 2) Automatic retries with exponential backoff on rate limit errors (HTTP 429 or Etherscan NOTOK)
        return globalScheduler.schedule(() => withRetries(call));
    }

    /**
     * Fetch event logs from Etherscan v2 unified API
     */
    async fetchLogs(
        chain: SupportedChainsType,
        contractAddress: string,
        options: LogOptions = {}
    ): Promise<EtherscanLog[]> {
        this.validateApiKey();
        const config = CHAIN_CONFIG[chain];
        if (!config) {
            throw new Error(`Unsupported chain: ${chain}`);
        }

        const {
            fromBlock = "earliest",
            toBlock = "latest",
            topic0,
            topic1,
            topic2,
            topic3,
        } = options;

        const params = new URLSearchParams({
            chainid: config.chainId.toString(),
            module: "logs",
            action: "getLogs",
            address: contractAddress,
            fromBlock: fromBlock.toString(),
            toBlock: toBlock.toString(),
            apikey: process.env.ETHERSCAN_API_KEY!,
        });

        // Add topic filters if provided
        if (topic0) params.append("topic0", topic0);
        if (topic1) params.append("topic1", topic1);
        if (topic2) params.append("topic2", topic2);
        if (topic3) params.append("topic3", topic3);

        const url = `${API_BASE_URL}?${params.toString()}`;
        const data = await this.doFetch<EtherscanResponse>(url);

        if (data.status !== "1") {
            if (data.message === "No records found") {
                return []; // Normal case - no events for this filter
            }
            throw new Error(
                `Etherscan API error: ${data.message} ${
                    Array.isArray(data.result) ? "" : data.result
                }`
            );
        }

        return Array.isArray(data.result) ? data.result : [];
    }

    /**
     * Get chain ID for a supported chain
     */
    getChainId(chain: SupportedChainsType): number {
        const config = CHAIN_CONFIG[chain];
        if (!config) {
            throw new Error(`Unsupported chain: ${chain}`);
        }
        return config.chainId;
    }

    /**
     * Get supported chains
     */
    getSupportedChains(): SupportedChainsType[] {
        return Object.keys(CHAIN_CONFIG) as SupportedChainsType[];
    }

    /**
     * Get block number for timestamp using Etherscan API
     */
    async getBlockNumberForTimestamp(
        chain: SupportedChainsType,
        timestamp: number,
        closest: "before" | "after" = "before"
    ): Promise<string> {
        this.validateApiKey();
        const config = CHAIN_CONFIG[chain];
        if (!config) {
            throw new Error(`Unsupported chain: ${chain}`);
        }

        const params = new URLSearchParams({
            chainid: config.chainId.toString(),
            module: "block",
            action: "getblocknobytime",
            timestamp: timestamp.toString(),
            closest: closest,
            apikey: process.env.ETHERSCAN_API_KEY!,
        });

        const url = `${API_BASE_URL}?${params.toString()}`;
        const data = await this.doFetch<BlockNumberResponse>(url);

        if (data.status !== "1") {
            if (data.message?.includes("Invalid timestamp")) {
                throw new Error(
                    `Timestamp too old or too new: ${new Date(
                        timestamp * 1000
                    ).toISOString()}`
                );
            }
            throw new Error(
                `Etherscan API error: ${data.message} ${data.result}`
            );
        }

        return data.result;
    }

    /**
     * Get contract creation information (block number, creator, txHash)
     * Uses Etherscan API v2 getcontractcreation endpoint
     */
    async fetchContractCreation(
        chain: SupportedChainsType,
        contractAddress: string
    ): Promise<{ blockNumber: string; txHash: string; contractCreator: string }> {
        this.validateApiKey();
        const config = CHAIN_CONFIG[chain];
        if (!config) {
            throw new Error(`Unsupported chain: ${chain}`);
        }

        const params = new URLSearchParams({
            chainid: config.chainId.toString(),
            module: "contract",
            action: "getcontractcreation",
            contractaddresses: contractAddress,
            apikey: process.env.ETHERSCAN_API_KEY!,
        });

        const url = `${API_BASE_URL}?${params.toString()}`;
        const data = await this.doFetch<ContractCreationResponse>(url);

        if (data.status !== "1") {
            throw new Error(
                `Etherscan API error: ${data.message} ${
                    Array.isArray(data.result) ? "" : data.result
                }`
            );
        }

        if (!data.result || data.result.length === 0) {
            throw new Error(
                `Contract creation not found for ${contractAddress} on ${chain}`
            );
        }

        return data.result[0];
    }

    /**
     * Validate API key availability (unified key for all chains)
     */
    validateApiKey(): void {
        if (!process.env.ETHERSCAN_API_KEY) {
            throw new Error(
                "ETHERSCAN_API_KEY environment variable is not set"
            );
        }
    }
}

/**
 * Etherscan Client
 * 
 * Generic client for interacting with the Etherscan V2 API.
 * Handles API communication, rate limiting, and basic response parsing.
 */

import { SupportedChainsType } from "@/config/chains";

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

// Options for fetching logs
export interface LogOptions {
    fromBlock?: string | number;
    toBlock?: string | number;
    topic0?: string;        // Event signature
    topic1?: string;        // First indexed parameter  
    topic2?: string;        // Second indexed parameter
    topic3?: string;        // Third indexed parameter
}

// Rate limiting state
interface RateLimitState {
    lastRequestTime: number;
    requestCount: number;
    resetTime: number;
}

export class EtherscanClient {
    private rateLimitState: RateLimitState = {
        lastRequestTime: 0,
        requestCount: 0,
        resetTime: 0,
    };

    private readonly rateLimitDelay = 200; // 200ms between requests (5 req/sec)

    constructor() {
        this.validateApiKey();
    }

    /**
     * Fetch event logs from Etherscan v2 unified API
     */
    async fetchLogs(
        chain: SupportedChainsType,
        contractAddress: string,
        options: LogOptions = {}
    ): Promise<EtherscanLog[]> {
        const config = CHAIN_CONFIG[chain];
        if (!config) {
            throw new Error(`Unsupported chain: ${chain}`);
        }

        const apiKey = process.env.ETHERSCAN_API_KEY;
        if (!apiKey) {
            throw new Error(
                "Missing API key: ETHERSCAN_API_KEY not found in environment"
            );
        }

        await this.enforceRateLimit();

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
            apikey: apiKey,
        });

        // Add topic filters if provided
        if (topic0) params.append("topic0", topic0);
        if (topic1) params.append("topic1", topic1);
        if (topic2) params.append("topic2", topic2);
        if (topic3) params.append("topic3", topic3);

        const url = `${API_BASE_URL}?${params.toString()}`;

        try {
            const response = await fetch(url, {
                headers: {
                    "User-Agent": "Duncan-UI/1.0",
                },
            });

            if (!response.ok) {
                throw new Error(
                    `HTTP ${response.status}: ${response.statusText}`
                );
            }

            const data: EtherscanResponse = await response.json();

            if (data.status !== "1") {
                if (data.message === "No records found") {
                    return []; // Normal case - no events for this filter
                }
                throw new Error(`Etherscan API error: ${data.message}`);
            }

            return Array.isArray(data.result) ? data.result : [];
        } catch (error) {
            console.error(`🔥 Etherscan API request failed:`, { url, error });
            throw error;
        }
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
     * Validate API key availability (unified key for all chains)
     */
    validateApiKey(): void {
        if (!process.env.ETHERSCAN_API_KEY) {
            throw new Error("ETHERSCAN_API_KEY environment variable is not set");
        }
    }

    /**
     * Enforce rate limiting per Etherscan API limits (5 requests per second)
     */
    private async enforceRateLimit(): Promise<void> {
        const now = Date.now();

        // Reset counter every second
        if (now >= this.rateLimitState.resetTime) {
            this.rateLimitState.requestCount = 0;
            this.rateLimitState.resetTime = now + 1000;
        }

        // Check if we need to wait
        if (this.rateLimitState.requestCount >= 5) {
            // 5 requests per second
            const waitTime = this.rateLimitState.resetTime - now;
            if (waitTime > 0) {
                console.log(`⏳ Rate limiting: waiting ${waitTime}ms`);
                await this.delay(waitTime);
            }
        }

        this.rateLimitState.requestCount++;
        this.rateLimitState.lastRequestTime = now;
    }

    /**
     * Utility delay function for rate limiting
     */
    private delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
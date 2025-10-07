/**
 * Chain-specific configuration for Blockscanner Worker
 */

import type { ChainScannerConfig } from "./types";
import { NONFUNGIBLE_POSITION_MANAGER_ADDRESSES } from "../../../lib/contracts/nonfungiblePositionManager";

/**
 * Get scanner configuration for a chain
 */
export function getChainScannerConfig(chain: string): ChainScannerConfig {
    const configs: Record<string, ChainScannerConfig> = {
        ethereum: {
            chain: "ethereum",
            chainId: 1,
            rpcUrl: process.env.ETHEREUM_RPC_URL || process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL || "",
            nfpmAddress: NONFUNGIBLE_POSITION_MANAGER_ADDRESSES[1],
            confirmationsFallback: 12, // Ethereum: wait 12 blocks if finalized not available
            supportsFinalized: true,
            supportsSafe: true,
            pollIntervalMs: 12_000, // 12 seconds (Ethereum block time)
        },
        arbitrum: {
            chain: "arbitrum",
            chainId: 42161,
            rpcUrl: process.env.ARBITRUM_RPC_URL || process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL || "",
            nfpmAddress: NONFUNGIBLE_POSITION_MANAGER_ADDRESSES[42161],
            confirmationsFallback: 20, // Arbitrum: wait 20 blocks (~5 seconds)
            supportsFinalized: false, // Arbitrum doesn't support 'finalized'
            supportsSafe: false, // Arbitrum doesn't support 'safe'
            pollIntervalMs: 2_000, // 2 seconds (fast L2)
        },
        base: {
            chain: "base",
            chainId: 8453,
            rpcUrl: process.env.BASE_RPC_URL || process.env.NEXT_PUBLIC_BASE_RPC_URL || "",
            nfpmAddress: NONFUNGIBLE_POSITION_MANAGER_ADDRESSES[8453],
            confirmationsFallback: 20, // Base: wait 20 blocks (~40 seconds)
            supportsFinalized: true,
            supportsSafe: true,
            pollIntervalMs: 2_000, // 2 seconds (Base block time)
        },
    };

    const config = configs[chain.toLowerCase()];
    if (!config) {
        throw new Error(`Unsupported chain: ${chain}`);
    }

    if (!config.rpcUrl) {
        throw new Error(
            `Missing RPC URL for chain: ${chain}. Set ${chain.toUpperCase()}_RPC_URL or NEXT_PUBLIC_${chain.toUpperCase()}_RPC_URL environment variable.`
        );
    }

    return config;
}

/**
 * Get all supported chains for scanning
 */
export function getSupportedChains(): string[] {
    return ["ethereum", "arbitrum", "base"];
}

/**
 * Event signatures for NFPM events
 */
export const EVENT_SIGNATURES = {
    IncreaseLiquidity:
        "0x3067048beee31b25b2f1681f88dac838c8bba36af25bfb2b7cf7473a5847e35f",
    DecreaseLiquidity:
        "0x26f6a048ee9138f2c0ce266f322cb99228e8d619ae2bff30c67f8dcf9d2377b4",
    Collect:
        "0x40d0efd1a53d60ecbf40971b9daf7dc90178c3aadc7aab1765632738fa8b8f01",
} as const;

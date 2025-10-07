/**
 * Finality boundary detection for different chains
 *
 * Determines the "safe" boundary block number using the best available finality level:
 * - finalized.number (if supported)
 * - safe.number (if supported)
 * - latest.number - confirmationsFallback
 */

import { type PublicClient } from "viem";
import type { ChainScannerConfig } from "./types";
import type { Logger } from "pino";

/**
 * Get the boundary block number for a chain
 *
 * Tries finalized → safe → latest-N fallback based on chain support
 */
export async function getBoundary(
    config: ChainScannerConfig,
    client: PublicClient,
    logger: Logger
): Promise<bigint> {
    // Try 'finalized' block tag first
    if (config.supportsFinalized) {
        try {
            const block = await client.getBlock({ blockTag: "finalized" });
            logger.debug(
                {
                    chain: config.chain,
                    blockNumber: block.number.toString(),
                    method: "finalized",
                },
                "Boundary determined using finalized block"
            );
            return block.number;
        } catch (error) {
            logger.warn(
                { chain: config.chain, error },
                "Failed to get finalized block, falling back to safe"
            );
        }
    }

    // Try 'safe' block tag
    if (config.supportsSafe) {
        try {
            const block = await client.getBlock({ blockTag: "safe" });
            logger.debug(
                {
                    chain: config.chain,
                    blockNumber: block.number.toString(),
                    method: "safe",
                },
                "Boundary determined using safe block"
            );
            return block.number;
        } catch (error) {
            logger.warn(
                { chain: config.chain, error },
                "Failed to get safe block, falling back to latest-N"
            );
        }
    }

    // Fallback: latest - confirmationsFallback
    const latestBlock = await client.getBlock({ blockTag: "latest" });
    const boundary = latestBlock.number - BigInt(config.confirmationsFallback);

    logger.debug(
        {
            chain: config.chain,
            latestBlock: latestBlock.number.toString(),
            confirmations: config.confirmationsFallback,
            boundary: boundary.toString(),
            method: "latest-confirmations",
        },
        "Boundary determined using confirmation fallback"
    );

    return boundary > 0n ? boundary : 0n;
}

/**
 * Probe chain for finality support
 *
 * Attempts to call 'finalized' and 'safe' block tags to detect support.
 * Updates config.supportsFinalized and config.supportsSafe based on results.
 */
export async function probeFinalitySupport(
    config: ChainScannerConfig,
    client: PublicClient,
    logger: Logger
): Promise<void> {
    // Test 'finalized' support
    try {
        await client.getBlock({ blockTag: "finalized" });
        config.supportsFinalized = true;
        logger.info(
            { chain: config.chain },
            "Chain supports 'finalized' block tag"
        );
    } catch {
        config.supportsFinalized = false;
        logger.info(
            { chain: config.chain },
            "Chain does not support 'finalized' block tag"
        );
    }

    // Test 'safe' support
    try {
        await client.getBlock({ blockTag: "safe" });
        config.supportsSafe = true;
        logger.info({ chain: config.chain }, "Chain supports 'safe' block tag");
    } catch {
        config.supportsSafe = false;
        logger.info(
            { chain: config.chain },
            "Chain does not support 'safe' block tag"
        );
    }
}

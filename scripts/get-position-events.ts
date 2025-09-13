#!/usr/bin/env tsx

// Load environment variables FIRST, before any other imports
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

/**
 * Position Events Retrieval Script
 *
 * Retrieves raw Uniswap V3 position events (IncreaseLiquidity, DecreaseLiquidity, Collect)
 * for a specific NFT position using blockchain data via Etherscan API.
 * Returns events in chronological order or empty array if position doesn't exist.
 *
 * Usage:
 *   npx tsx scripts/get-position-events.ts <chain> <nftId> [fromBlock] [toBlock]
 *
 * Examples:
 *   npx tsx scripts/get-position-events.ts ethereum 12345
 *   npx tsx scripts/get-position-events.ts arbitrum 67890 15000000 latest
 *   npx tsx scripts/get-position-events.ts base 555 earliest 8000000
 */

import { SupportedChainsType } from "@/config/chains";
import { DefaultClientsFactory } from "@/services/ClientsFactory";
import { EtherscanEventService } from "@/services/etherscan/etherscanEventService";

// Parse command line arguments
const args = process.argv.slice(2);

// Check for help flag
if (args.includes("--help") || args.includes("-h")) {
    console.error("Position Events Retrieval Script");
    console.error("");
    console.error("Usage:");
    console.error("  npx tsx scripts/get-position-events.ts <chain> <nftId> [fromBlock] [toBlock]");
    console.error("");
    console.error("Arguments:");
    console.error("  chain     - Blockchain name (ethereum, arbitrum, base)");
    console.error("  nftId     - NFT token ID to fetch events for");
    console.error("  fromBlock - Starting block (optional, defaults to 'earliest')");
    console.error("  toBlock   - Ending block (optional, defaults to 'latest')");
    console.error("");
    console.error("Examples:");
    console.error("  npx tsx scripts/get-position-events.ts ethereum 12345");
    console.error("  npx tsx scripts/get-position-events.ts arbitrum 67890 15000000 latest");
    console.error("  npx tsx scripts/get-position-events.ts base 555 earliest 8000000");
    console.error("");
    console.error("Supported chains: ethereum, arbitrum, base");
    process.exit(0);
}

if (args.length < 2 || args.length > 4) {
    console.error("Error: Expected 2-4 arguments: <chain> <nftId> [fromBlock] [toBlock]");
    console.error("");
    console.error("Usage:");
    console.error("  npx tsx scripts/get-position-events.ts <chain> <nftId> [fromBlock] [toBlock]");
    console.error("");
    console.error("Run with --help for more information");
    process.exit(1);
}

const [chain, nftId, fromBlock, toBlock] = args;

// Validate inputs
if (!chain || !nftId) {
    console.error("Error: Both chain and nftId are required");
    process.exit(1);
}

// Validate chain
const supportedChains = ["ethereum", "arbitrum", "base"];
if (!supportedChains.includes(chain.toLowerCase())) {
    console.error(`Error: Unsupported chain "${chain}". Supported chains: ${supportedChains.join(", ")}`);
    process.exit(1);
}

// Validate NFT ID
if (!/^\d+$/.test(nftId)) {
    console.error("Error: NFT ID must be a positive integer");
    process.exit(1);
}

async function main() {
    try {
        // Get clients from factory
        const { etherscanClient } = DefaultClientsFactory.getInstance().getClients();

        // Create EtherscanEventService instance
        const etherscanEventService = new EtherscanEventService({ etherscanClient });

        // Fetch position events
        const events = await etherscanEventService.fetchPositionEvents(
            chain as SupportedChainsType,
            nftId,
            {
                fromBlock: fromBlock || undefined,
                toBlock: toBlock || undefined
            }
        );

        // Convert BigInt values to strings for JSON serialization
        const eventsForJson = events.map(event => ({
            ...event,
            blockNumber: event.blockNumber.toString()
        }));

        // Output results as JSON
        console.log(JSON.stringify({
            success: true,
            message: `Successfully fetched ${events.length} raw events for position ${nftId}`,
            metadata: {
                chain,
                nftId,
                eventsCount: events.length,
                blockRange: {
                    from: fromBlock || "earliest",
                    to: toBlock || "latest"
                },
                fetchedAt: new Date().toISOString()
            },
            events: eventsForJson
        }, null, 2));

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error(`❌ Error: ${errorMessage}`);
        
        // Output error as JSON for consistency
        console.log(JSON.stringify({
            success: false,
            message: `Failed to fetch events: ${errorMessage}`,
            metadata: {
                chain,
                nftId,
                eventsCount: 0,
                blockRange: {
                    from: fromBlock || "earliest",
                    to: toBlock || "latest"
                },
                fetchedAt: new Date().toISOString()
            },
            events: [],
            error: errorMessage
        }, null, 2));
        
        process.exit(1);
    }
}

main().catch((error) => {
    console.error("❌ Fatal error:", error);
    process.exit(1);
});
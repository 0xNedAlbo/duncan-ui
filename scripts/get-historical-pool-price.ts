#!/usr/bin/env tsx

/**
 * Historical Price Retrieval Script
 *
 * Retrieves exact pool price data at a specific block number using the PoolPriceService.
 * Outputs results as formatted JSON for easy consumption.
 *
 * Usage:
 *   npx tsx scripts/get-historical-pool-price.ts <poolAddress> <blockNumber> [chain]
 *
 * Examples:
 *   npx tsx scripts/get-historical-pool-price.ts 0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640 18800000
 *   npx tsx scripts/get-historical-pool-price.ts 0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640 18800000 ethereum
 */

// Load environment variables FIRST, before any other imports
import { SupportedChainsType } from "@/config/chains";
import { getPoolPriceService } from "@/services/positions/poolPriceService";
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length < 2 || args.length > 3) {
    console.error(
        "Usage: npx tsx scripts/get-historical-pool-price.ts <poolAddress> <blockNumber> [chain]"
    );
    console.error("");
    console.error("Arguments:");
    console.error(
        "  poolAddress  - Uniswap V3 pool contract address (e.g., 0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640)"
    );
    console.error("  blockNumber  - Block number to query (e.g., 18800000)");
    console.error(
        "  chain        - Chain name (optional, defaults to ethereum)"
    );
    console.error("");
    console.error("Supported chains: ethereum, arbitrum, base");
    console.error("");
    console.error("Examples:");
    console.error(
        "  npx tsx scripts/get-historical-pool-price.ts 0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640 18800000"
    );
    console.error(
        "  npx tsx scripts/get-historical-pool-price.ts 0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640 18800000 ethereum"
    );
    process.exit(1);
}

const poolAddress = args[0];
const blockNumber = BigInt(args[1]);
const chain = (args[2] || "ethereum") as SupportedChainsType;

// Validate inputs
if (!poolAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
    console.error(
        "Error: Invalid pool address format. Must be a valid Ethereum address (0x followed by 40 hex characters)"
    );
    process.exit(1);
}

if (blockNumber <= 0n) {
    console.error("Error: Block number must be a positive integer");
    process.exit(1);
}

const supportedChains = ["ethereum", "arbitrum", "base"];
if (!supportedChains.includes(chain)) {
    console.error(
        `Error: Unsupported chain "${chain}". Supported chains: ${supportedChains.join(
            ", "
        )}`
    );
    process.exit(1);
}

async function main() {
    try {
        const service = getPoolPriceService();

        const priceData = await service.getExactPoolPriceAtBlock(
            poolAddress,
            chain,
            blockNumber
        );

        // Format the result as clean JSON
        const result = {
            poolAddress: priceData.poolAddress,
            blockNumber: priceData.blockNumber.toString(),
            blockTimestamp: priceData.blockTimestamp.toISOString(),
            sqrtPriceX96: priceData.sqrtPriceX96.toString(),
            tick: priceData.tick,
            source: priceData.source,
            confidence: priceData.confidence,
            chain: priceData.chain,
            retrievedAt: priceData.retrievedAt.toISOString(),
        };

        console.log(JSON.stringify(result, null, 2));
    } catch (error) {
        console.error(
            `❌ Error retrieving price data:`,
            error instanceof Error ? error.message : "Unknown error"
        );
        process.exit(1);
    }
}

main().catch((error) => {
    console.error("❌ Unexpected error:", error);
    process.exit(1);
});

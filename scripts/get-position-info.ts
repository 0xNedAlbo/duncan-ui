#!/usr/bin/env tsx

// Load environment variables FIRST, before any other imports
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

/**
 * Position Info Retrieval Script
 *
 * Retrieves basic position information from the database for a specific user position.
 * Outputs flat JSON structure with position basics and token info.
 *
 * Usage:
 *   npx tsx scripts/get-position-info.ts <username> <chain> <nftId>
 *
 * Examples:
 *   npx tsx scripts/get-position-info.ts test@testmann.kk ethereum 12345
 *   npx tsx scripts/get-position-info.ts user@example.com arbitrum 67890
 */

import { SupportedChainsType } from "@/config/chains";
import { DefaultServiceFactory } from "@/services/ServiceFactory";
import { DefaultClientsFactory } from "@/services/ClientsFactory";

// Parse command line arguments
const args = process.argv.slice(2);

// Check for help flag
if (args.includes("--help") || args.includes("-h")) {
    console.error("Position Info Retrieval Script");
    console.error("");
    console.error("Usage:");
    console.error("  npx tsx scripts/get-position-info.ts <username> <chain> <nftId>");
    console.error("");
    console.error("Arguments:");
    console.error("  username  - User email address (e.g., test@testmann.kk)");
    console.error("  chain     - Blockchain name (ethereum, arbitrum, base)");
    console.error("  nftId     - NFT token ID");
    console.error("");
    console.error("Examples:");
    console.error("  npx tsx scripts/get-position-info.ts test@testmann.kk ethereum 12345");
    console.error("  npx tsx scripts/get-position-info.ts user@example.com arbitrum 67890");
    console.error("");
    console.error("Supported chains: ethereum, arbitrum, base");
    process.exit(0);
}

if (args.length !== 3) {
    console.log(JSON.stringify({
        error: "Expected exactly 3 arguments: <username> <chain> <nftId>"
    }));
    process.exit(1);
}

const [username, chain, nftId] = args;

// Validate inputs
if (!username || !chain || !nftId) {
    console.log(JSON.stringify({
        error: "All arguments are required: username, chain, nftId"
    }));
    process.exit(1);
}

// Validate chain
const supportedChains = ["ethereum", "arbitrum", "base"];
if (!supportedChains.includes(chain.toLowerCase())) {
    console.log(JSON.stringify({
        error: `Unsupported chain "${chain}". Supported chains: ${supportedChains.join(", ")}`
    }));
    process.exit(1);
}

// Validate NFT ID
if (!/^\d+$/.test(nftId)) {
    console.log(JSON.stringify({
        error: "NFT ID must be a positive integer"
    }));
    process.exit(1);
}

// Validate email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(username)) {
    console.log(JSON.stringify({
        error: "Username must be a valid email address"
    }));
    process.exit(1);
}

async function main() {
    try {
        // Get clients and services from factories
        const { prisma } = DefaultClientsFactory.getInstance().getClients();
        const { positionService } = DefaultServiceFactory.getInstance().getServices();

        // Step 1: Find user by email
        const user = await prisma.user.findUnique({
            where: { email: username }
        });

        if (!user) {
            console.log(JSON.stringify({
                error: `User with email "${username}" not found in database`
            }));
            process.exit(1);
        }

        // Step 2: Find position using PositionService (include all statuses)
        const allUserPositions = await positionService.listPositions({
            userId: user.id
            // No status filter - now gets all positions
        });

        // Try to find position by nftId and chain
        const position = allUserPositions.find(p =>
            p.nftId === nftId && p.chain.toLowerCase() === chain.toLowerCase()
        );

        if (!position) {
            console.log(JSON.stringify({
                error: `Position not found for username: ${username}, chain: ${chain}, nftId: ${nftId}`
            }));
            process.exit(1);
        }

        // Step 3: Output flat position info as JSON
        const positionInfo = {
            // Position basics
            positionId: position.id,
            nftId: position.nftId,
            chain: position.chain,
            status: position.status,
            tickLower: position.tickLower,
            tickUpper: position.tickUpper,
            token0IsQuote: position.token0IsQuote,
            initialLiquidity: position.initialLiquidity,
            initialValue: position.initialValue,
            createdAt: position.createdAt.toISOString(),
            updatedAt: position.updatedAt.toISOString(),

            // Pool basics
            poolAddress: position.pool.poolAddress,
            poolChain: position.pool.chain,

            // Token0 info
            token0Address: position.pool.token0.address,
            token0Symbol: position.pool.token0.symbol,
            token0Name: position.pool.token0.name,
            token0Decimals: position.pool.token0.decimals,

            // Token1 info
            token1Address: position.pool.token1.address,
            token1Symbol: position.pool.token1.symbol,
            token1Name: position.pool.token1.name,
            token1Decimals: position.pool.token1.decimals,

            // User info
            userEmail: user.email,
            userName: user.name
        };

        console.log(JSON.stringify(positionInfo, null, 2));

    } catch (error) {
        console.log(JSON.stringify({
            error: error instanceof Error ? error.message : "Unknown error"
        }));
        process.exit(1);
    } finally {
        const { prisma } = DefaultClientsFactory.getInstance().getClients();
        await prisma.$disconnect();
    }
}

main().catch((error) => {
    console.log(JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error"
    }));
    process.exit(1);
});
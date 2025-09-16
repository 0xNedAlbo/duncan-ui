#!/usr/bin/env tsx

// Load environment variables FIRST, before any other imports
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

/**
 * Pool Info Retrieval Script
 *
 * Retrieves pool information from the database for a specific user and pool.
 * Outputs JSON structure with pool details and nested token structures.
 *
 * Usage:
 *   npx tsx scripts/get-pool-info.ts <username> <chain> <poolAddress>
 *
 * Examples:
 *   npx tsx scripts/get-pool-info.ts test@testmann.kk ethereum 0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640
 *   npx tsx scripts/get-pool-info.ts user@example.com arbitrum 0xc6962004f452be9203591991d15f6b388e09e8d0
 */

import { SupportedChainsType } from "@/config/chains";
import { DefaultServiceFactory } from "@/services/ServiceFactory";
import { DefaultClientsFactory } from "@/services/ClientsFactory";

// Parse command line arguments
const args = process.argv.slice(2);

// Check for help flag
if (args.includes("--help") || args.includes("-h")) {
    console.error("Pool Info Retrieval Script");
    console.error("");
    console.error("Usage:");
    console.error("  npx tsx scripts/get-pool-info.ts <username> <chain> <poolAddress>");
    console.error("");
    console.error("Arguments:");
    console.error("  username     - User email address (e.g., test@testmann.kk)");
    console.error("  chain        - Blockchain name (ethereum, arbitrum, base)");
    console.error("  poolAddress  - Pool contract address (e.g., 0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640)");
    console.error("");
    console.error("Examples:");
    console.error("  npx tsx scripts/get-pool-info.ts test@testmann.kk ethereum 0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640");
    console.error("  npx tsx scripts/get-pool-info.ts user@example.com arbitrum 0xc6962004f452be9203591991d15f6b388e09e8d0");
    console.error("");
    console.error("Supported chains: ethereum, arbitrum, base");
    process.exit(0);
}

if (args.length !== 3) {
    console.log(JSON.stringify({
        error: "Expected exactly 3 arguments: <username> <chain> <poolAddress>"
    }));
    process.exit(1);
}

const [username, chain, poolAddress] = args;

// Validate inputs
if (!username || !chain || !poolAddress) {
    console.log(JSON.stringify({
        error: "All arguments are required: username, chain, poolAddress"
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

// Validate pool address format
if (!poolAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
    console.log(JSON.stringify({
        error: "Pool address must be a valid Ethereum address (0x followed by 40 hex characters)"
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
        const { poolService } = DefaultServiceFactory.getInstance().getServices();

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

        // Step 2: Find pool using PoolService
        const pools = await poolService.listPools({
            chain: chain as SupportedChainsType,
            poolAddress: poolAddress
        });

        if (pools.length === 0) {
            console.log(JSON.stringify({
                error: `Pool not found for chain: ${chain}, poolAddress: ${poolAddress}`
            }));
            process.exit(1);
        }

        const pool = pools[0]; // Should only be one pool for specific address

        // Step 3: Output pool info with nested token structures as JSON
        const poolInfo = {
            // Pool basics
            poolId: pool.id,
            poolAddress: pool.poolAddress,
            chain: pool.chain,
            fee: pool.fee,
            tickSpacing: pool.tickSpacing,
            currentTick: pool.currentTick,
            currentPrice: pool.currentPrice,
            createdAt: pool.createdAt?.toISOString(),
            updatedAt: pool.updatedAt?.toISOString(),

            // Nested token structures
            token0: {
                address: pool.token0Data.address,
                symbol: pool.token0Data.symbol,
                name: pool.token0Data.name,
                decimals: pool.token0Data.decimals,
                logoUrl: pool.token0Data.logoUrl,
                type: pool.token0Data.type,
                isVerified: pool.token0Data.isVerified,
                userLabel: pool.token0Data.userLabel,
                notes: pool.token0Data.notes
            },
            token1: {
                address: pool.token1Data.address,
                symbol: pool.token1Data.symbol,
                name: pool.token1Data.name,
                decimals: pool.token1Data.decimals,
                logoUrl: pool.token1Data.logoUrl,
                type: pool.token1Data.type,
                isVerified: pool.token1Data.isVerified,
                userLabel: pool.token1Data.userLabel,
                notes: pool.token1Data.notes
            },

            // User context
            userEmail: user.email,
            userName: user.name
        };

        console.log(JSON.stringify(poolInfo, null, 2));

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
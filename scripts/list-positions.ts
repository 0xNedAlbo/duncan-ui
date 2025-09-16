#!/usr/bin/env tsx

// Load environment variables FIRST, before any other imports
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

/**
 * List Positions Script
 *
 * Lists all positions for a user with basic information only.
 * Outputs JSON array with essential position details.
 *
 * Usage:
 *   npx tsx scripts/list-positions.ts <username>
 *
 * Examples:
 *   npx tsx scripts/list-positions.ts test@testmann.kk
 *   npx tsx scripts/list-positions.ts user@example.com
 */

import { DefaultServiceFactory } from "@/services/ServiceFactory";
import { DefaultClientsFactory } from "@/services/ClientsFactory";

// Parse command line arguments
const args = process.argv.slice(2);

// Check for help flag
if (args.includes("--help") || args.includes("-h")) {
    console.error("List Positions Script");
    console.error("");
    console.error("Usage:");
    console.error("  npx tsx scripts/list-positions.ts <username>");
    console.error("");
    console.error("Arguments:");
    console.error("  username  - User email address (e.g., test@testmann.kk)");
    console.error("");
    console.error("Examples:");
    console.error("  npx tsx scripts/list-positions.ts test@testmann.kk");
    console.error("  npx tsx scripts/list-positions.ts user@example.com");
    process.exit(0);
}

if (args.length !== 1) {
    console.log(JSON.stringify({
        error: "Expected exactly 1 argument: <username>"
    }));
    process.exit(1);
}

const [username] = args;

// Validate inputs
if (!username) {
    console.log(JSON.stringify({
        error: "Username is required"
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

        // Step 2: Get all positions for user (no status filter)
        const allUserPositions = await positionService.listPositions({
            userId: user.id
        });

        // Step 3: Map to basic position info
        const basicPositions = allUserPositions.map(position => {
            // Create token pair string
            const tokenPair = `${position.pool.token0.symbol}/${position.pool.token1.symbol}`;

            // Format fee as percentage (e.g., 500 -> "0.05%")
            const feePercentage = `${(position.pool.fee / 10000).toFixed(2)}%`;

            return {
                chain: position.chain,
                nftId: position.nftId,
                tokenPair: tokenPair,
                fee: feePercentage,
                status: position.status
            };
        });

        // Output as JSON array
        console.log(JSON.stringify(basicPositions, null, 2));

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
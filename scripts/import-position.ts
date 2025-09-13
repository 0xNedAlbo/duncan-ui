#!/usr/bin/env tsx

// Load environment variables FIRST, before any other imports
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

/**
 * Position Import Script
 *
 * Imports Uniswap V3 positions from NFT IDs using RPC calls and saves them to the database.
 * Always extracts data from RPC even if position already exists.
 *
 * Usage:
 *   npx tsx scripts/import-position.ts <username> <chain> <nftId> [--replace]
 *
 * Examples:
 *   npx tsx scripts/import-position.ts test@testmann.kk ethereum 12345
 *   npx tsx scripts/import-position.ts test@testmann.kk arbitrum 67890 --replace
 */

import { type SupportedChainsType } from "@/config/chains";
import { DefaultServiceFactory } from "@/services/ServiceFactory";
import { DefaultClientsFactory } from "@/services/ClientsFactory";

// Parse command line arguments
const args = process.argv.slice(2);

// Check for help flag
if (args.includes("--help") || args.includes("-h")) {
    console.error("Position Import Script");
    console.error("");
    console.error("Usage:");
    console.error("  npx tsx scripts/import-position.ts <username> <chain> <nftId> [--replace]");
    console.error("");
    console.error("Arguments:");
    console.error("  username   - User email address (e.g., test@testmann.kk)");
    console.error("  chain      - Blockchain name (ethereum, arbitrum, base)");
    console.error("  nftId      - NFT token ID to import");
    console.error("");
    console.error("Flags:");
    console.error("  --replace  - Replace existing position if it already exists");
    console.error("");
    console.error("Examples:");
    console.error("  npx tsx scripts/import-position.ts test@testmann.kk ethereum 12345");
    console.error("  npx tsx scripts/import-position.ts test@testmann.kk arbitrum 67890 --replace");
    console.error("");
    console.error("Supported chains: ethereum, arbitrum, base");
    process.exit(0);
}

// Extract flags
const replaceFlag = args.includes("--replace");
const positionalArgs = args.filter(arg => !arg.startsWith("--"));

if (positionalArgs.length !== 3) {
    console.error("Error: Expected exactly 3 arguments: <username> <chain> <nftId>");
    console.error("");
    console.error("Usage:");
    console.error("  npx tsx scripts/import-position.ts <username> <chain> <nftId> [--replace]");
    console.error("");
    console.error("Run with --help for more information");
    process.exit(1);
}

const [username, chain, nftIdStr] = positionalArgs;

// Validate inputs
if (!username || !chain || !nftIdStr) {
    console.error("Error: All arguments are required: username, chain, nftId");
    process.exit(1);
}

// Validate chain
const supportedChains = ["ethereum", "arbitrum", "base"];
if (!supportedChains.includes(chain.toLowerCase())) {
    console.error(`Error: Unsupported chain "${chain}". Supported chains: ${supportedChains.join(", ")}`);
    process.exit(1);
}

// Validate NFT ID
const nftId = nftIdStr.trim();
if (!/^\d+$/.test(nftId)) {
    console.error("Error: NFT ID must be a positive integer");
    process.exit(1);
}

// Validate email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(username)) {
    console.error("Error: Username must be a valid email address");
    process.exit(1);
}

async function main() {
    try {
        console.error(`🔍 Importing position NFT ${nftId} for ${username} on ${chain}${replaceFlag ? " (with replace)" : ""}...`);

        // Get clients and services from factories
        const { prisma } = DefaultClientsFactory.getInstance().getClients();
        const { positionImportService } = DefaultServiceFactory.getInstance().getServices();

        // Step 1: Find user by email
        const user = await prisma.user.findUnique({
            where: { email: username }
        });

        if (!user) {
            console.error(`❌ Error: User with email "${username}" not found in database`);
            console.error("Available users:");
            const users = await prisma.user.findMany({
                select: { email: true, name: true }
            });
            users.forEach(u => console.error(`  - ${u.email} (${u.name})`));
            process.exit(1);
        }

        console.error(`✅ Found user: ${user.name} (${user.email})`);

        // Step 2: Check if position already exists
        const existingPosition = await prisma.position.findFirst({
            where: {
                userId: user.id,
                nftId: nftId,
                // Additional check could include chain if stored
            }
        });

        if (existingPosition && !replaceFlag) {
            console.error(`⚠️  Position with NFT ID ${nftId} already exists for user ${username}`);
            console.error(`   Use --replace flag to replace the existing position`);
            console.error(`   Position ID: ${existingPosition.id}`);
            process.exit(1);
        }

        if (existingPosition && replaceFlag) {
            console.error(`🔄 Replacing existing position: ${existingPosition.id}`);
            
            // Delete the existing position (cascade should handle related data)
            await prisma.position.delete({
                where: { id: existingPosition.id }
            });
            
            console.error(`✅ Existing position deleted`);
        }

        // Step 3: Import position using the service
        console.error(`🚀 Fetching position data from blockchain...`);
        
        const result = await positionImportService.importPositionForUserByNftId(
            user.id,
            nftId,
            chain as SupportedChainsType
        );

        if (!result.success) {
            console.error(`❌ Import failed: ${result.message}`);
            process.exit(1);
        }

        // Step 4: Output results
        console.error(`✅ Import successful!`);
        console.error(`   Position ID: ${result.positionId}`);
        console.error(`   Message: ${result.message}`);

        // Output detailed position data as JSON
        if (result.data) {
            console.log(JSON.stringify({
                success: true,
                positionId: result.positionId,
                message: result.message,
                positionData: result.data,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email
                },
                import: {
                    nftId: nftId,
                    chain: chain,
                    replaced: replaceFlag && !!existingPosition,
                    importedAt: new Date().toISOString()
                }
            }, null, 2));
        }

    } catch (error) {
        console.error(`❌ Unexpected error: ${error instanceof Error ? error.message : "Unknown error"}`);
        process.exit(1);
    } finally {
        const { prisma } = DefaultClientsFactory.getInstance().getClients();
        await prisma.$disconnect();
    }
}

main().catch((error) => {
    console.error("❌ Fatal error:", error);
    process.exit(1);
});
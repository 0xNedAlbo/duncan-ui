#!/usr/bin/env tsx

// Load environment variables FIRST, before any other imports
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

/**
 * Create API Key Script
 *
 * Creates a new API key for a specified user with a given name.
 * Outputs the API key details including the plaintext key (only shown once).
 *
 * Usage:
 *   npx tsx scripts/create-api-key.ts <username> <keyName> [scopes...]
 *
 * Examples:
 *   npx tsx scripts/create-api-key.ts test@testmann.kk "Debug Scripts"
 *   npx tsx scripts/create-api-key.ts user@example.com "CI Pipeline" read:positions write:orders
 */

import { DefaultServiceFactory } from "@/services/ServiceFactory";
import { DefaultClientsFactory } from "@/services/ClientsFactory";

// Parse command line arguments
const args = process.argv.slice(2);

// Check for help flag
if (args.includes("--help") || args.includes("-h")) {
    console.error("Create API Key Script");
    console.error("");
    console.error("Usage:");
    console.error("  npx tsx scripts/create-api-key.ts <username> <keyName> [scopes...]");
    console.error("");
    console.error("Arguments:");
    console.error("  username  - User email address (e.g., test@testmann.kk)");
    console.error("  keyName   - Descriptive name for the API key (e.g., 'Debug Scripts')");
    console.error("  scopes    - Optional space-separated list of scopes (future use)");
    console.error("");
    console.error("Examples:");
    console.error("  npx tsx scripts/create-api-key.ts test@testmann.kk \"Debug Scripts\"");
    console.error("  npx tsx scripts/create-api-key.ts user@example.com \"CI Pipeline\" read:positions write:orders");
    console.error("");
    console.error("Note: The API key will only be displayed once. Save it securely.");
    process.exit(0);
}

if (args.length < 2) {
    console.log(JSON.stringify({
        error: "Expected at least 2 arguments: <username> <keyName>"
    }));
    process.exit(1);
}

const [username, keyName, ...scopes] = args;

// Validate inputs
if (!username) {
    console.log(JSON.stringify({
        error: "Username is required"
    }));
    process.exit(1);
}

if (!keyName) {
    console.log(JSON.stringify({
        error: "Key name is required"
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

// Validate key name length
if (keyName.length < 3 || keyName.length > 100) {
    console.log(JSON.stringify({
        error: "Key name must be between 3 and 100 characters"
    }));
    process.exit(1);
}

async function main() {
    try {
        // Get clients and services from factories
        const { prisma } = DefaultClientsFactory.getInstance().getClients();
        const { apiKeyService } = DefaultServiceFactory.getInstance().getServices();

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

        // Step 2: Create API key
        const generatedKey = await apiKeyService.createApiKey(
            user.id,
            keyName,
            scopes
        );

        // Step 3: Output the generated key details
        const result = {
            id: generatedKey.id,
            userId: user.id,
            userName: user.name || user.email,
            keyName: keyName,
            prefix: generatedKey.prefix,
            apiKey: generatedKey.plaintext,
            scopes: scopes,
            createdAt: new Date().toISOString(),
            message: "API key created successfully. Save this key securely - it won't be shown again."
        };

        console.log(JSON.stringify(result, null, 2));

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
#!/usr/bin/env npx tsx

/**
 * Test import NFT endpoint to debug the issue
 */

import { ApiServiceFactory } from "@/lib/api/ApiServiceFactory";

async function testImport() {
    try {
        console.log("Testing import endpoint...");

        // Get service instance
        const apiFactory = ApiServiceFactory.getInstance();
        const positionImportService = apiFactory.positionImportService;

        // Test with a known NFT ID - use a test one that might exist
        const testUserId = "test-user-id";
        const testNftId = "1";
        const testChain = "ethereum";

        console.log(`Testing import with:`, {
            userId: testUserId,
            nftId: testNftId,
            chain: testChain
        });

        const result = await positionImportService.importPositionForUserByNftId(
            testUserId,
            testNftId,
            testChain as any
        );

        console.log("Import result:", JSON.stringify(result, null, 2));

    } catch (error) {
        console.error("Test failed:", {
            error: error instanceof Error ? {
                name: error.name,
                message: error.message,
                stack: error.stack,
            } : error
        });
    }
}

testImport();
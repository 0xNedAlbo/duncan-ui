#!/usr/bin/env npx tsx

/**
 * Test script for PositionLookupService
 * Tests compilation and basic functionality of the new service
 */

import { DefaultServiceFactory } from '../../src/services/ServiceFactory';

async function testPositionLookupService() {
    try {
        console.log("Testing PositionLookupService compilation and initialization...");

        // Get services from factory
        const serviceFactory = DefaultServiceFactory.getInstance();
        const services = serviceFactory.getServices();

        // Verify service exists
        if (!services.positionLookupService) {
            throw new Error("PositionLookupService not found in ServiceFactory");
        }

        console.log("✅ PositionLookupService successfully created and integrated");

        // Test service methods exist
        const lookupService = services.positionLookupService;
        if (typeof lookupService.findPositionsForAddress !== 'function') {
            throw new Error("findPositionsForAddress method not found");
        }

        console.log("✅ PositionLookupService methods are available");

        // Test with invalid address (should throw validation error)
        try {
            await lookupService.findPositionsForAddress(
                "invalid-address",
                "ethereum",
                "test-user-id"
            );
            throw new Error("Should have thrown validation error for invalid address");
        } catch (error) {
            if (error instanceof Error && error.message.includes("Invalid address format")) {
                console.log("✅ Address validation works correctly");
            } else {
                throw error;
            }
        }

        console.log("✅ All PositionLookupService tests passed");

        return {
            success: true,
            message: "PositionLookupService is properly integrated and functional"
        };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error("❌ Test failed:", errorMessage);

        return {
            success: false,
            error: errorMessage
        };
    }
}

// Run the test
testPositionLookupService()
    .then(result => {
        if (result.success) {
            console.log("\n🎉 PositionLookupService test completed successfully");
            process.exit(0);
        } else {
            console.error("\n💥 PositionLookupService test failed");
            process.exit(1);
        }
    })
    .catch(error => {
        console.error("\n💥 Unexpected error:", error);
        process.exit(1);
    });
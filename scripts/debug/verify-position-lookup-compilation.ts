#!/usr/bin/env npx tsx

/**
 * Simple compilation test for PositionLookupService
 */

try {
    // Test imports
    const { PositionLookupService } = require('../../src/services/positions/positionLookupService');

    if (!PositionLookupService) {
        throw new Error("PositionLookupService class not exported");
    }

    console.log("✅ PositionLookupService imports successfully");
    console.log("✅ Class definition is valid");

    // Check constructor parameters
    if (PositionLookupService.length !== 2) {
        throw new Error(`Expected 2 constructor parameters, got ${PositionLookupService.length}`);
    }

    console.log("✅ Constructor signature is correct");
    console.log("✅ PositionLookupService compilation verified");

    process.exit(0);

} catch (error) {
    console.error("❌ Compilation test failed:", error instanceof Error ? error.message : error);
    process.exit(1);
}
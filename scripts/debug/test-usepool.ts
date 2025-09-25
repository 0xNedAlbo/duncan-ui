#!/usr/bin/env node

/**
 * Test usePool API endpoint
 *
 * Tests the new pool loading endpoint to ensure it works correctly
 */

import { readFileSync } from "fs";
import { join } from "path";

// Load environment variables from .env.local
function loadEnvFile() {
    try {
        const envPath = join(process.cwd(), ".env.local");
        const envContent = readFileSync(envPath, "utf8");

        envContent.split("\n").forEach((line) => {
            const [key, ...valueParts] = line.split("=");
            if (key && valueParts.length > 0) {
                const value = valueParts
                    .join("=")
                    .replace(/^["'](.*)["']$/, "$1");
                process.env[key.trim()] = value.trim();
            }
        });
    } catch (error) {
        console.error("Failed to load .env.local file:", error);
        process.exit(1);
    }
}

loadEnvFile();

const BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";
const API_KEY = "ak_dev_duncan_test_f39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

async function makeApiCall(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers: {
            "Authorization": `Bearer ${API_KEY}`,
            "Content-Type": "application/json",
            ...options.headers,
        },
    });

    const data = await response.json();
    return { response, data };
}

async function testPoolEndpoint() {
    console.log("Testing Pool Endpoint...");

    // Test with a known ETH/USDC pool on Ethereum
    const chain = "ethereum";
    const poolAddress = "0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640"; // ETH/USDC 0.05% pool

    try {
        const { response, data } = await makeApiCall(`/api/pools/${chain}/${poolAddress}`);

        if (response.ok && data.success) {
            return {
                "success": true,
                "poolAddress": data.pool.poolAddress,
                "fee": data.pool.fee,
                "protocol": data.pool.protocol,
                "token0": `${data.pool.token0.symbol} (${data.pool.token0.address})`,
                "token1": `${data.pool.token1.symbol} (${data.pool.token1.address})`,
                "currentPrice": data.pool.currentPrice
            };
        } else {
            return {
                "error": data.error || `HTTP ${response.status}`,
                "details": data.details
            };
        }
    } catch (error) {
        return {
            "error": `Network error: ${error instanceof Error ? error.message : String(error)}`
        };
    }
}

async function testInvalidCases() {
    console.log("Testing Invalid Cases...");

    const tests = [
        {
            name: "Invalid chain",
            endpoint: "/api/pools/invalid-chain/0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640"
        },
        {
            name: "Invalid address",
            endpoint: "/api/pools/ethereum/invalid-address"
        },
        {
            name: "Non-existent pool",
            endpoint: "/api/pools/ethereum/0x1234567890123456789012345678901234567890"
        }
    ];

    const results = [];

    for (const test of tests) {
        try {
            const { response, data } = await makeApiCall(test.endpoint);
            results.push({
                test: test.name,
                status: response.status,
                success: data.success,
                error: data.error
            });
        } catch (error) {
            results.push({
                test: test.name,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }

    return results;
}

async function main() {
    try {
        // Test valid pool
        const poolResult = await testPoolEndpoint();

        // Test invalid cases
        const invalidResults = await testInvalidCases();

        // Output JSON results
        console.log(JSON.stringify({
            validPool: poolResult,
            invalidCases: invalidResults
        }, null, 2));

    } catch (error) {
        console.log(JSON.stringify({
            error: error instanceof Error ? error.message : String(error)
        }));
    }
}

main().catch(console.error);
#!/usr/bin/env tsx

// Load environment variables FIRST, before any other imports
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

import { DefaultServiceFactory } from '@/services/ServiceFactory';
import { DefaultClientsFactory } from '@/services/ClientsFactory';
import { normalizeAddress } from '@/lib/utils/evm';

/**
 * Update Pool State Script
 *
 * Updates the pool state from blockchain for a specific pool.
 *
 * Usage:
 *   npx tsx scripts/update-pool-state.ts <email> <chain> <poolAddress>
 *
 * Arguments:
 *   email        - User email to identify the pool context
 *   chain        - Chain name (ethereum, arbitrum, base)
 *   poolAddress  - Pool contract address (0x...)
 *
 * Examples:
 *   npx tsx scripts/update-pool-state.ts test@testmann.kk ethereum 0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640
 *   npx tsx scripts/update-pool-state.ts user@example.com arbitrum 0x17c14d2c404d167802b16c450d3c99f88f2c4f4d
 */

async function updatePoolState() {
    const args = process.argv.slice(2);

    if (args.length !== 3) {
        return { error: "Usage: npx tsx scripts/update-pool-state.ts <email> <chain> <poolAddress>" };
    }

    const [email, chain, poolAddress] = args;

    // Validate arguments
    if (!email || !email.includes('@')) {
        return { error: "Invalid email format" };
    }

    if (!['ethereum', 'arbitrum', 'base'].includes(chain)) {
        return { error: "Invalid chain. Supported: ethereum, arbitrum, base" };
    }

    if (!poolAddress || !poolAddress.startsWith('0x') || poolAddress.length !== 42) {
        return { error: "Invalid pool address format. Expected 0x... with 42 characters" };
    }

    const normalizedPoolAddress = normalizeAddress(poolAddress);

    try {
        const serviceFactory = DefaultServiceFactory.getInstance();
        const services = serviceFactory.getServices();
        const clients = DefaultClientsFactory.getInstance().getClients();

        // Find user by email
        const user = await clients.prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            return { error: `User not found with email: ${email}` };
        }

        // Find pool by chain and address
        const pool = await clients.prisma.pool.findFirst({
            where: {
                chain,
                poolAddress: normalizedPoolAddress
            },
            include: {
                token0Ref: {
                    include: {
                        globalToken: true,
                        userToken: true
                    }
                },
                token1Ref: {
                    include: {
                        globalToken: true,
                        userToken: true
                    }
                }
            }
        });

        if (!pool) {
            return { error: `Pool not found: ${chain}:${normalizedPoolAddress}` };
        }

        // Get pool state before update
        const beforeState = {
            currentTick: pool.currentTick,
            currentPrice: pool.currentPrice,
            sqrtPriceX96: pool.sqrtPriceX96,
            feeGrowthGlobal0X128: pool.feeGrowthGlobal0X128,
            feeGrowthGlobal1X128: pool.feeGrowthGlobal1X128,
            updatedAt: pool.updatedAt
        };

        // Update pool state from blockchain
        await services.poolService.updatePoolState(pool.id);

        // Get pool state after update
        const updatedPool = await clients.prisma.pool.findUnique({
            where: { id: pool.id },
            select: {
                id: true,
                chain: true,
                poolAddress: true,
                currentTick: true,
                currentPrice: true,
                sqrtPriceX96: true,
                feeGrowthGlobal0X128: true,
                feeGrowthGlobal1X128: true,
                updatedAt: true
            }
        });

        if (!updatedPool) {
            return { error: "Failed to retrieve updated pool state" };
        }

        const afterState = {
            currentTick: updatedPool.currentTick,
            currentPrice: updatedPool.currentPrice,
            sqrtPriceX96: updatedPool.sqrtPriceX96,
            feeGrowthGlobal0X128: updatedPool.feeGrowthGlobal0X128,
            feeGrowthGlobal1X128: updatedPool.feeGrowthGlobal1X128,
            updatedAt: updatedPool.updatedAt
        };

        // Determine what changed
        const changes = {
            currentTick: beforeState.currentTick !== afterState.currentTick,
            currentPrice: beforeState.currentPrice !== afterState.currentPrice,
            sqrtPriceX96: beforeState.sqrtPriceX96 !== afterState.sqrtPriceX96,
            feeGrowthGlobal0X128: beforeState.feeGrowthGlobal0X128 !== afterState.feeGrowthGlobal0X128,
            feeGrowthGlobal1X128: beforeState.feeGrowthGlobal1X128 !== afterState.feeGrowthGlobal1X128,
            updatedAt: beforeState.updatedAt !== afterState.updatedAt
        };

        await clients.prisma.$disconnect();

        return {
            success: true,
            poolId: pool.id,
            chain: pool.chain,
            poolAddress: pool.poolAddress,
            token0Symbol: services.tokenReferenceService.getUnifiedTokenData(pool.token0Ref).symbol,
            token1Symbol: services.tokenReferenceService.getUnifiedTokenData(pool.token1Ref).symbol,
            beforeState,
            afterState,
            changes,
            hasChanges: Object.values(changes).some(Boolean)
        };

    } catch (error) {
        return {
            error: `Failed to update pool state: ${error instanceof Error ? error.message : String(error)}`
        };
    }
}

// Execute script and output JSON
updatePoolState()
    .then(result => {
        console.log(JSON.stringify(result, null, 2));
        process.exit(result.error ? 1 : 0);
    })
    .catch(error => {
        console.log(JSON.stringify({ error: `Script execution failed: ${error.message}` }, null, 2));
        process.exit(1);
    });
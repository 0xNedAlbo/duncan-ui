#!/usr/bin/env tsx

// Load environment variables FIRST, before any other imports
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

import { DefaultServiceFactory } from '@/services/ServiceFactory';
import { DefaultClientsFactory } from '@/services/ClientsFactory';

/**
 * Get Unclaimed Fees Script
 *
 * Retrieves unclaimed fees for a Uniswap V3 position by NFT ID.
 *
 * Usage:
 *   npx tsx scripts/get-unclaimed-fees.ts <email> <chain> <nftId>
 *
 * Arguments:
 *   email    - User email to identify the position context
 *   chain    - Chain name (ethereum, arbitrum, base)
 *   nftId    - NFT ID of the Uniswap V3 position
 *
 * Examples:
 *   npx tsx scripts/get-unclaimed-fees.ts test@testmann.kk ethereum 123456
 *   npx tsx scripts/get-unclaimed-fees.ts user@example.com arbitrum 789012
 */

async function getUnclaimedFees() {
    const args = process.argv.slice(2);

    if (args.length !== 3) {
        return { error: "Usage: npx tsx scripts/get-unclaimed-fees.ts <email> <chain> <nftId>" };
    }

    const [email, chain, nftId] = args;

    // Validate arguments
    if (!email || !email.includes('@')) {
        return { error: "Invalid email format" };
    }

    if (!['ethereum', 'arbitrum', 'base'].includes(chain)) {
        return { error: "Invalid chain. Supported: ethereum, arbitrum, base" };
    }

    if (!nftId || !/^\d+$/.test(nftId)) {
        return { error: "Invalid NFT ID. Expected numeric value" };
    }

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

        // Find position by NFT ID and chain
        const positions = await services.positionService.getPositionsByNftId(
            nftId,
            chain as any,
            'active'
        );

        if (positions.length === 0) {
            return { error: `No active position found for NFT ID ${nftId} on ${chain}` };
        }

        if (positions.length > 1) {
            return { error: `Multiple positions found for NFT ID ${nftId} on ${chain}. This should not happen.` };
        }

        const position = positions[0];

        // Calculate unclaimed fees using the PositionPnLService
        const unclaimedFeesData = await services.positionPnLService.getUnclaimedFees(position.id);

        await clients.prisma.$disconnect();

        return {
            baseTokenAmount: unclaimedFeesData.baseTokenAmount.toString(),
            quoteTokenAmount: unclaimedFeesData.quoteTokenAmount.toString(),
            valueInQuoteToken: unclaimedFeesData.valueInQuoteToken
        };

    } catch (error) {
        return {
            error: `Failed to get unclaimed fees: ${error instanceof Error ? error.message : String(error)}`
        };
    }
}

// Execute script and output JSON
getUnclaimedFees()
    .then(result => {
        console.log(JSON.stringify(result, null, 2));
        process.exit(result.error ? 1 : 0);
    })
    .catch(error => {
        console.log(JSON.stringify({ error: `Script execution failed: ${error.message}` }, null, 2));
        process.exit(1);
    });
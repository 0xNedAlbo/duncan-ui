#!/usr/bin/env tsx

/**
 * List all positions in the database
 */

import { prisma } from '../src/lib/prisma';

async function listPositions() {
    try {
        console.log("📋 Listing all positions in database...");
        
        const positions = await prisma.position.findMany({
            select: {
                id: true,
                nftId: true,
                owner: true,
                pool: {
                    select: {
                        chain: true,
                        token0Ref: {
                            select: { symbol: true }
                        },
                        token1Ref: {
                            select: { symbol: true }
                        }
                    }
                },
                createdAt: true
            },
            orderBy: { createdAt: 'desc' }
        });
        
        if (positions.length === 0) {
            console.log("❌ No positions found in database");
        } else {
            console.log(`✅ Found ${positions.length} positions:`);
            console.log("");
            
            positions.forEach((position, index) => {
                const pool = position.pool;
                console.log(`${index + 1}. Position ID: ${position.id}`);
                console.log(`   NFT ID: ${position.nftId || 'N/A'}`);
                console.log(`   Chain: ${pool.chain}`);
                console.log(`   Pair: ${pool.token0Ref.symbol}/${pool.token1Ref.symbol}`);
                console.log(`   Owner: ${position.owner || 'N/A'}`);
                console.log(`   Created: ${position.createdAt.toISOString()}`);
                console.log("");
            });
        }
        
    } catch (error) {
        console.error("❌ Error listing positions:", error);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the script
listPositions().catch(console.error);
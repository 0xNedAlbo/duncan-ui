#!/usr/bin/env tsx

import { prisma } from '../src/lib/prisma';

async function checkPoolPrice() {
    const poolId = "cmfa08laf000806l1nsij302h";
    
    try {
        const pool = await prisma.pool.findUnique({
            where: { id: poolId },
            select: {
                id: true,
                chain: true,
                poolAddress: true,
                currentPrice: true,
                sqrtPriceX96: true,
                currentTick: true
            }
        });
        
        console.log("Pool data from database:");
        console.log(JSON.stringify(pool, null, 2));
        
        if (pool?.currentPrice) {
            console.log("\nCurrentPrice analysis:");
            console.log("- Raw value:", pool.currentPrice);
            console.log("- Type:", typeof pool.currentPrice);
            console.log("- Is '0'?:", pool.currentPrice === "0");
            console.log("- As BigInt:", BigInt(pool.currentPrice).toString());
        }
        
    } catch (error) {
        console.error("Error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

checkPoolPrice();
#!/usr/bin/env tsx

/**
 * Debug script to inspect full position structure
 */

import { getPositionService } from '../src/services/positions/positionService';
import { prisma } from '../src/lib/prisma';

async function inspectPosition() {
    const positionId = "cmfa1arrl000206tt8uqmjtgx";
    
    console.log("🔍 Inspecting position data structure...");
    console.log("=" .repeat(50));
    
    try {
        // Get position service without refreshing to avoid errors
        const positionService = getPositionService();
        
        // Get raw position from database with full structure
        const rawPosition = await prisma.position.findUnique({
            where: { id: positionId },
            include: {
                pool: {
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
                },
                events: {
                    orderBy: { timestamp: 'desc' },
                    take: 5
                }
            }
        });
        
        if (!rawPosition) {
            console.error("❌ Position not found!");
            return;
        }
        
        console.log("📦 Raw position from database:");
        console.log(JSON.stringify(rawPosition, null, 2));
        
    } catch (error) {
        console.error("❌ Error inspecting position:", error);
        if (error instanceof Error) {
            console.error("Error details:", {
                message: error.message,
                stack: error.stack
            });
        }
    } finally {
        await prisma.$disconnect();
    }
}

// Run the debug script
inspectPosition().catch(console.error);
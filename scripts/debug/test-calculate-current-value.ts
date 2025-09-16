#!/usr/bin/env tsx

// Load environment variables FIRST, before any other imports
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

import { DefaultServiceFactory } from '@/services/ServiceFactory';
import { DefaultClientsFactory } from '@/services/ClientsFactory';

/**
 * Test script for PositionPnLService.calculateCurrentValue method
 * Tests the new method with existing position data
 */

async function testCalculateCurrentValue() {
  try {
    const serviceFactory = DefaultServiceFactory.getInstance();
    const services = serviceFactory.getServices();
    const clients = DefaultClientsFactory.getInstance().getClients();

    // Get first position to test with
    const positions = await services.positionService.listPositions({ limit: 1 });

    if (positions.length === 0) {
      return { error: "No positions found in database" };
    }

    const position = positions[0];

    // Test the calculateCurrentValue method
    const currentValue = await services.positionPnLService.calculateCurrentValue(position.id);

    await clients.prisma.$disconnect();

    return {
      success: true,
      positionId: position.id,
      liquidity: position.liquidity,
      tickLower: position.tickLower,
      tickUpper: position.tickUpper,
      token0IsQuote: position.token0IsQuote,
      poolCurrentTick: position.pool.currentTick,
      poolCurrentPrice: position.pool.currentPrice,
      calculatedCurrentValue: currentValue
    };

  } catch (error) {
    return {
      error: `Failed to calculate current value: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

// Execute script and output JSON
testCalculateCurrentValue()
  .then(result => {
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.error ? 1 : 0);
  })
  .catch(error => {
    console.log(JSON.stringify({ error: `Script execution failed: ${error.message}` }, null, 2));
    process.exit(1);
  });
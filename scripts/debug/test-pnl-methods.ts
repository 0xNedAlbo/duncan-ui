#!/usr/bin/env tsx

// Load environment variables FIRST, before any other imports
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

import { DefaultServiceFactory } from '@/services/ServiceFactory';
import { DefaultClientsFactory } from '@/services/ClientsFactory';

/**
 * Test script for all PnL-related methods in PositionPnLService
 * Tests: getCurrentCostBasis, getTotalCollectedFeesValue, getPnlBreakdown
 */

async function testPnlMethods() {
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

    // Test all individual methods
    const [
      currentValue,
      currentCostBasis,
      collectedFeesValue,
      realizedPnL,
      unclaimedFees,
      pnlBreakdown
    ] = await Promise.all([
      services.positionPnLService.calculateCurrentValue(position.id),
      services.positionPnLService.getCurrentCostBasis(position.id),
      services.positionPnLService.getTotalCollectedFeesValue(position.id),
      services.positionPnLService.getCurrentRealizedPnL(position.id),
      services.positionPnLService.getUnclaimedFees(position.id),
      services.positionPnLService.getPnlBreakdown(position.id),
    ]);

    await clients.prisma.$disconnect();

    return {
      success: true,
      positionId: position.id,
      positionLiquidity: position.liquidity,

      // Individual method results
      individualMethods: {
        currentValue,
        currentCostBasis,
        collectedFeesValue,
        realizedPnL,
        unclaimedFeesValue: unclaimedFees.valueInQuoteToken,
      },

      // Comprehensive breakdown
      pnlBreakdown,

      // Validation: check that breakdown uses the same individual values
      validation: {
        currentValueMatches: pnlBreakdown.currentValue === currentValue,
        costBasisMatches: pnlBreakdown.currentCostBasis === currentCostBasis,
        collectedFeesMatches: pnlBreakdown.collectedFees === collectedFeesValue,
        realizedPnLMatches: pnlBreakdown.realizedPnL === realizedPnL,
        unclaimedFeesMatches: pnlBreakdown.unclaimedFees === unclaimedFees.valueInQuoteToken,

        // Calculate expected derived values
        expectedUnrealizedPnL: (BigInt(currentValue) - BigInt(currentCostBasis)).toString(),
        expectedTotalPnL: (BigInt(currentValue) - BigInt(currentCostBasis) + BigInt(collectedFeesValue)).toString(),
        derivedValuesMatch: {
          unrealizedPnL: pnlBreakdown.unrealizedPnL === (BigInt(currentValue) - BigInt(currentCostBasis)).toString(),
          totalPnL: pnlBreakdown.totalPnL === (BigInt(currentValue) - BigInt(currentCostBasis) + BigInt(collectedFeesValue)).toString(),
        }
      }
    };

  } catch (error) {
    return {
      error: `Failed to test PnL methods: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

// Execute script and output JSON
testPnlMethods()
  .then(result => {
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.error ? 1 : 0);
  })
  .catch(error => {
    console.log(JSON.stringify({ error: `Script execution failed: ${error.message}` }, null, 2));
    process.exit(1);
  });
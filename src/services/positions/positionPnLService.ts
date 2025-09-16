/**
 * Positions PnL Service
 *
 * Provides comprehensive PnL analysis for Uniswap V3 positions including
 * unclaimed fees calculation and value tracking.
 */

import { PrismaClient } from "@prisma/client";
import type { PublicClient } from "viem";
import type { SupportedChainsType } from "@/config/chains";
import type { Services } from "../ServiceFactory";
import type { Clients } from "../ClientsFactory";

import { UNISWAP_V3_POOL_ABI, TickData } from "@/lib/contracts/uniswapV3Pool";
import {
  NONFUNGIBLE_POSITION_MANAGER_ABI,
  NONFUNGIBLE_POSITION_MANAGER_ADDRESSES,
  NFTPosition,
  getChainId
} from "@/lib/contracts/nonfungiblePositionManager";
import {
  UnclaimedFees,
  UnclaimedFeesWithMetadata,
  computeFeeGrowthInside,
  calculateIncrementalFees
} from "@/lib/utils/uniswap-v3/fees";
import { getTokenAmountsFromLiquidity } from "@/lib/utils/uniswap-v3/liquidity";
import { PositionService } from "./positionService";
import { PoolService } from "../pools/poolService";

export interface PnlBreakdown {
  // Core position metrics (all in quote token units as strings)
  currentValue: string;           // Current position value
  currentCostBasis: string;       // Latest cost basis from PositionEvent
  collectedFees: string;          // Total fees collected historically
  unclaimedFees: string;          // Current unclaimed fees value
  realizedPnL: string;            // Current realized PnL from PositionEvent

  // Derived metrics
  unrealizedPnL: string;          // currentValue - currentCostBasis
  totalPnL: string;               // unrealizedPnL + collectedFees

  // Metadata
  positionId: string;
  calculatedAt: Date;
}

export class PositionPnLService {
  private prisma: PrismaClient;
  private rpcClients: Map<SupportedChainsType, PublicClient>;
  private positionService: PositionService;
  private poolService: PoolService;

  constructor(
    requiredClients: Pick<Clients, 'prisma' | 'rpcClients'>,
    requiredServices: Pick<Services, 'positionService' | 'poolService'>
  ) {
    this.prisma = requiredClients.prisma;
    this.rpcClients = requiredClients.rpcClients;
    this.positionService = requiredServices.positionService;
    this.poolService = requiredServices.poolService;
  }

  /**
   * Calculate unclaimed fees for a position
   */
  async getUnclaimedFees(positionId: string): Promise<UnclaimedFeesWithMetadata> {
    // 1. Fetch position using PositionService
    const position = await this.positionService.getPosition(positionId);

    if (!position) {
      throw new Error(`Position not found: ${positionId}`);
    }

    if (!position.nftId) {
      throw new Error(`Position ${positionId} has no NFT ID - cannot calculate fees`);
    }

    const { pool } = position;
    const chainName = pool.chain as SupportedChainsType;
    const client = this.rpcClients.get(chainName);

    if (!client) {
      throw new Error(`No RPC client available for chain: ${chainName}`);
    }

    // Get token data from pool
    const token0Data = pool.token0;
    const token1Data = pool.token1;

    // 2. Update pool state to ensure we have latest fee growth globals
    await this.poolService.updatePoolState(pool.id);

    // 3. Get updated pool data with fresh fee growth globals
    const updatedPool = await this.prisma.pool.findUnique({
      where: { id: pool.id },
      select: {
        feeGrowthGlobal0X128: true,
        feeGrowthGlobal1X128: true,
        currentTick: true
      }
    });

    if (!updatedPool || !updatedPool.feeGrowthGlobal0X128 || !updatedPool.feeGrowthGlobal1X128) {
      throw new Error(`Pool data not available after update: ${pool.id}`);
    }

    const currentTick = updatedPool.currentTick!;
    const feeGrowthGlobal0X128 = BigInt(updatedPool.feeGrowthGlobal0X128);
    const feeGrowthGlobal1X128 = BigInt(updatedPool.feeGrowthGlobal1X128);

    // 4. Read NFT position data from blockchain
    const chainId = getChainId(chainName);
    const nfpmAddress = NONFUNGIBLE_POSITION_MANAGER_ADDRESSES[chainId];

    if (!nfpmAddress) {
      throw new Error(`NFPM not deployed on chain: ${chainName}`);
    }

    let nftData: NFTPosition;
    try {
      const nftPosition = await client.readContract({
        address: nfpmAddress,
        abi: NONFUNGIBLE_POSITION_MANAGER_ABI,
        functionName: "positions",
        args: [BigInt(position.nftId)],
      }) as [bigint, string, string, string, number, number, number, bigint, bigint, bigint, bigint, bigint];

      nftData = {
        nonce: nftPosition[0],
        operator: nftPosition[1] as `0x${string}`,
        token0: nftPosition[2] as `0x${string}`,
        token1: nftPosition[3] as `0x${string}`,
        fee: nftPosition[4],
        tickLower: nftPosition[5],
        tickUpper: nftPosition[6],
        liquidity: nftPosition[7],
        feeGrowthInside0LastX128: nftPosition[8],
        feeGrowthInside1LastX128: nftPosition[9],
        tokensOwed0: nftPosition[10],
        tokensOwed1: nftPosition[11],
      };
    } catch {
      // Handle case where NFT is burned/invalid (e.g., "Invalid token ID")
      // Return zero fees for invalid/burned NFTs
      const fees: UnclaimedFees = {
        incremental0: 0n,
        incremental1: 0n,
        checkpointed0: 0n,
        checkpointed1: 0n,
        totalClaimable0: 0n,
        totalClaimable1: 0n,
      };

      return {
        fees,
        baseTokenAmount: 0n,
        quoteTokenAmount: 0n,
        valueInQuoteToken: "0",
      };
    }

    // 5. Read tick data at position bounds
    const [tickLowerResult, tickUpperResult] = await Promise.all([
      client.readContract({
        address: pool.poolAddress as `0x${string}`,
        abi: UNISWAP_V3_POOL_ABI,
        functionName: "ticks",
        args: [nftData.tickLower],
      }),
      client.readContract({
        address: pool.poolAddress as `0x${string}`,
        abi: UNISWAP_V3_POOL_ABI,
        functionName: "ticks",
        args: [nftData.tickUpper],
      }),
    ]);

    // Convert to proper array format to avoid readonly issues
    const tickLowerData = Array.from(tickLowerResult);
    const tickUpperData = Array.from(tickUpperResult);

    const tickLower: TickData = {
      liquidityGross: tickLowerData[0] as bigint,
      liquidityNet: tickLowerData[1] as bigint,
      feeGrowthOutside0X128: tickLowerData[2] as bigint,
      feeGrowthOutside1X128: tickLowerData[3] as bigint,
      tickCumulativeOutside: tickLowerData[4] as bigint,
      secondsPerLiquidityOutsideX128: tickLowerData[5] as bigint,
      secondsOutside: tickLowerData[6] as number,
      initialized: tickLowerData[7] as boolean,
    };

    const tickUpper: TickData = {
      liquidityGross: tickUpperData[0] as bigint,
      liquidityNet: tickUpperData[1] as bigint,
      feeGrowthOutside0X128: tickUpperData[2] as bigint,
      feeGrowthOutside1X128: tickUpperData[3] as bigint,
      tickCumulativeOutside: tickUpperData[4] as bigint,
      secondsPerLiquidityOutsideX128: tickUpperData[5] as bigint,
      secondsOutside: tickUpperData[6] as number,
      initialized: tickUpperData[7] as boolean,
    };

    // 6. Compute fee growth inside the position range
    const feeGrowthInside = computeFeeGrowthInside(
      currentTick,
      nftData.tickLower,
      nftData.tickUpper,
      feeGrowthGlobal0X128,
      feeGrowthGlobal1X128,
      tickLower.feeGrowthOutside0X128,
      tickLower.feeGrowthOutside1X128,
      tickUpper.feeGrowthOutside0X128,
      tickUpper.feeGrowthOutside1X128
    );

    // 7. Calculate incremental fees since last checkpoint
    const incremental0 = calculateIncrementalFees(
      feeGrowthInside.inside0,
      nftData.feeGrowthInside0LastX128,
      nftData.liquidity
    );

    const incremental1 = calculateIncrementalFees(
      feeGrowthInside.inside1,
      nftData.feeGrowthInside1LastX128,
      nftData.liquidity
    );

    // 8. Get uncollected principal to separate from pure fees
    const uncollectedPrincipal = await this.getLatestUncollectedPrincipal(position.id);

    // 9. Calculate pure checkpointed fees (tokensOwed includes both fees and principal)
    const pureCheckpointedFees0 = nftData.tokensOwed0 > uncollectedPrincipal.uncollectedPrincipal0
      ? nftData.tokensOwed0 - uncollectedPrincipal.uncollectedPrincipal0
      : 0n;

    const pureCheckpointedFees1 = nftData.tokensOwed1 > uncollectedPrincipal.uncollectedPrincipal1
      ? nftData.tokensOwed1 - uncollectedPrincipal.uncollectedPrincipal1
      : 0n;

    // 10. Total claimable fees = pure checkpointed fees + incremental fees
    const totalClaimable0 = pureCheckpointedFees0 + incremental0;
    const totalClaimable1 = pureCheckpointedFees1 + incremental1;

    const fees: UnclaimedFees = {
      incremental0,
      incremental1,
      checkpointed0: pureCheckpointedFees0,
      checkpointed1: pureCheckpointedFees1,
      totalClaimable0,
      totalClaimable1,
    };

    // 11. Determine base/quote token amounts and calculate value
    const baseTokenAmount = position.token0IsQuote ? totalClaimable1 : totalClaimable0;
    const quoteTokenAmount = position.token0IsQuote ? totalClaimable0 : totalClaimable1;

    // Calculate value in quote token (base amount * current price)
    let valueInQuoteToken = "0";
    if (pool.currentPrice && baseTokenAmount > 0n) {
      const currentPrice = BigInt(pool.currentPrice);
      const baseTokenDecimals = position.token0IsQuote ? token1Data.decimals : token0Data.decimals;

      // Convert base amount to quote token value using current price
      // currentPrice is already in quote token per base token units
      const baseValue = (baseTokenAmount * currentPrice) / (10n ** BigInt(baseTokenDecimals));
      valueInQuoteToken = (quoteTokenAmount + baseValue).toString();
    } else {
      valueInQuoteToken = quoteTokenAmount.toString();
    }

    return {
      fees,
      baseTokenAmount,
      quoteTokenAmount,
      valueInQuoteToken,
    };
  }

  /**
   * Calculate the current value of a position
   * Current Value = quoteAmount + baseAmount * poolPrice
   */
  async calculateCurrentValue(positionId: string): Promise<string> {
    // 1. Fetch position using PositionService
    const position = await this.positionService.getPosition(positionId);

    if (!position) {
      throw new Error(`Position not found: ${positionId}`);
    }

    // 2. Get current pool data using PoolService
    const pool = await this.poolService.getPoolById(position.pool.id);

    if (!pool) {
      throw new Error(`Pool not found: ${position.pool.id}`);
    }

    // Ensure we have current pool data
    if (!pool.currentTick) {
      throw new Error(`Pool ${pool.id} has no current tick data`);
    }

    if (!pool.currentPrice) {
      throw new Error(`Pool ${pool.id} has no current price data`);
    }

    // 3. Calculate actual token amounts from liquidity and position bounds
    const { token0Amount, token1Amount } = getTokenAmountsFromLiquidity(
      BigInt(position.liquidity),
      pool.currentTick,
      position.tickLower,
      position.tickUpper
    );

    // 4. Determine base and quote token amounts based on position configuration
    const baseTokenAmount = position.token0IsQuote ? token1Amount : token0Amount;
    const quoteTokenAmount = position.token0IsQuote ? token0Amount : token1Amount;

    // 5. Get token decimals for price calculation
    const baseTokenDecimals = position.token0IsQuote ? pool.token1Data.decimals : pool.token0Data.decimals;

    // 6. Calculate current value: quoteAmount + baseAmount * poolPrice
    const currentPrice = BigInt(pool.currentPrice);
    const baseValueInQuote = baseTokenAmount > 0n
      ? (baseTokenAmount * currentPrice) / (10n ** BigInt(baseTokenDecimals))
      : 0n;

    const totalValue = quoteTokenAmount + baseValueInQuote;

    return totalValue.toString();
  }

  /**
   * Get the current cost basis for a position from the latest PositionEvent
   */
  async getCurrentCostBasis(positionId: string): Promise<string> {
    const latestEvent = await this.prisma.positionEvent.findFirst({
      where: { positionId },
      select: {
        costBasisAfter: true,
      },
      orderBy: [
        { blockNumber: 'desc' },
        { transactionIndex: 'desc' },
        { logIndex: 'desc' },
      ],
    });

    if (!latestEvent) {
      // No events found - position has no cost basis yet
      return "0";
    }

    return latestEvent.costBasisAfter;
  }

  /**
   * Get total value of all collected fees for a position in quote token units
   */
  async getTotalCollectedFeesValue(positionId: string): Promise<string> {
    const collectEvents = await this.prisma.positionEvent.findMany({
      where: {
        positionId,
        eventType: 'COLLECT',
      },
      select: {
        feeValueInQuote: true,
      },
    });

    // Sum up all collected fees manually since Prisma aggregate doesn't work well with String fields
    let totalFees = 0n;
    for (const event of collectEvents) {
      totalFees += BigInt(event.feeValueInQuote);
    }

    return totalFees.toString();
  }

  /**
   * Get the current realized PnL for a position from the latest PositionEvent
   */
  async getCurrentRealizedPnL(positionId: string): Promise<string> {
    const latestEvent = await this.prisma.positionEvent.findFirst({
      where: { positionId },
      select: {
        realizedPnLAfter: true,
      },
      orderBy: [
        { blockNumber: 'desc' },
        { transactionIndex: 'desc' },
        { logIndex: 'desc' },
      ],
    });

    if (!latestEvent) {
      // No events found - position has no realized PnL yet
      return "0";
    }

    return latestEvent.realizedPnLAfter;
  }

  /**
   * Get comprehensive PnL breakdown for a position
   */
  async getPnlBreakdown(positionId: string): Promise<PnlBreakdown> {
    // Validate position exists
    const position = await this.positionService.getPosition(positionId);
    if (!position) {
      throw new Error(`Position not found: ${positionId}`);
    }

    // Fetch all PnL components in parallel for efficiency
    const [currentValue, currentCostBasis, collectedFees, realizedPnL, unclaimedFeesData] = await Promise.all([
      this.calculateCurrentValue(positionId),
      this.getCurrentCostBasis(positionId),
      this.getTotalCollectedFeesValue(positionId),
      this.getCurrentRealizedPnL(positionId),
      this.getUnclaimedFees(positionId),
    ]);

    // Calculate derived metrics using BigInt arithmetic
    const currentValueBigInt = BigInt(currentValue);
    const currentCostBasisBigInt = BigInt(currentCostBasis);
    const collectedFeesBigInt = BigInt(collectedFees);

    const unrealizedPnL = (currentValueBigInt - currentCostBasisBigInt).toString();
    const totalPnL = (BigInt(unrealizedPnL) + collectedFeesBigInt).toString();

    return {
      // Core position metrics
      currentValue,
      currentCostBasis,
      collectedFees,
      unclaimedFees: unclaimedFeesData.valueInQuoteToken,
      realizedPnL,

      // Derived metrics
      unrealizedPnL,
      totalPnL,

      // Metadata
      positionId,
      calculatedAt: new Date(),
    };
  }

  /**
   * Get the latest uncollected principal amounts for a position from PositionEvents
   */
  private async getLatestUncollectedPrincipal(positionId: string): Promise<{
    uncollectedPrincipal0: bigint;
    uncollectedPrincipal1: bigint;
  }> {
    const latestEvent = await this.prisma.positionEvent.findFirst({
      where: { positionId },
      select: {
        uncollectedPrincipal0: true,
        uncollectedPrincipal1: true,
      },
      orderBy: [
        { blockNumber: 'desc' },
        { transactionIndex: 'desc' },
        { logIndex: 'desc' },
      ],
    });

    if (!latestEvent) {
      // No events found - position never had decreases, so no uncollected principal
      return {
        uncollectedPrincipal0: 0n,
        uncollectedPrincipal1: 0n,
      };
    }

    return {
      uncollectedPrincipal0: BigInt(latestEvent.uncollectedPrincipal0),
      uncollectedPrincipal1: BigInt(latestEvent.uncollectedPrincipal1),
    };
  }

  /**
   * Close database connections (for cleanup)
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
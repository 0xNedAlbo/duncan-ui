/**
 * Position Ledger Service
 *
 * Provides unified access to position events with integrated PnL calculations.
 * Fetches events from blockchain via Etherscan and processes them through
 * EventStateCalculator to get calculated states and PnL data.
 */

import { createHash } from "crypto";
import { SupportedChainsType } from "@/config/chains";
import type { Clients } from "../ClientsFactory";
import type { Services } from "../ServiceFactory";
import type { RawPositionEvent } from "../etherscan/etherscanEventService";
import { EtherscanEventService } from "../etherscan/etherscanEventService";
import { PoolPriceService } from "../prices/poolPriceService";
import { EvmBlockInfoService } from "../evm/evmBlockInfoService";
import { PrismaClient, type PositionEvent } from "@prisma/client";
import {
    createServiceLogger,
    type ServiceLogger,
} from "@/lib/logging/loggerFactory";
import {
    sqrtRatioX96ToToken1PerToken0,
    sqrtRatioX96ToToken0PerToken1,
} from "@/lib/utils/uniswap-v3/price";
import JSBI from "jsbi";
import type { BasicPosition } from "./positionService";
import type { PositionAprService } from "./positionAprService";
import { getNFPMAddress } from "@/workers/blockscanner/src/config";
import { EtherscanClient } from "../etherscan/etherscanClient";

// Position sync information interface - picks necessary fields from BasicPosition
export type PositionSyncInfo = Pick<
    BasicPosition,
    "chain" | "protocol" | "nftId" | "token0IsQuote"
> & {
    userId: string; // Added userId for composite key support
    pool: Pick<BasicPosition["pool"], "poolAddress" | "chain"> & {
        token0: Pick<BasicPosition["pool"]["token0"], "decimals">;
        token1: Pick<BasicPosition["pool"]["token1"], "decimals">;
    };
};

export class PositionLedgerService {
    private prisma: PrismaClient;
    private evmBlockInfoService: EvmBlockInfoService;
    private poolPriceService: PoolPriceService;
    private etherscanEventService: EtherscanEventService;
    private positionAprService: PositionAprService;
    private logger: ServiceLogger;

    // Cache for NFPM deployment blocks
    private nfpmDeploymentBlocks: Record<string, bigint> = {};

    /**
     * Helper method to create PositionSyncInfo from BasicPosition
     */
    static createSyncInfo(position: BasicPosition): PositionSyncInfo {
        return {
            userId: position.userId,
            chain: position.chain,
            protocol: position.protocol,
            nftId: position.nftId,
            token0IsQuote: position.token0IsQuote,
            pool: {
                poolAddress: position.pool.poolAddress,
                chain: position.pool.chain,
                token0: {
                    decimals: position.pool.token0.decimals,
                },
                token1: {
                    decimals: position.pool.token1.decimals,
                },
            },
        };
    }

    constructor(
        requiredClients: Pick<Clients, "prisma" | "etherscanClient">,
        requiredServices: Pick<
            Services,
            | "tokenService"
            | "poolPriceService"
            | "evmBlockInfoService"
            | "positionAprService"
        >
    ) {
        this.prisma = requiredClients.prisma;
        this.evmBlockInfoService = requiredServices.evmBlockInfoService;
        this.poolPriceService = requiredServices.poolPriceService;
        this.positionAprService = requiredServices.positionAprService;
        this.etherscanEventService = new EtherscanEventService({
            etherscanClient: requiredClients.etherscanClient,
        });
        this.logger = createServiceLogger("PositionLedgerService");
    }

    /**
     * Seed initial INCREASE_LIQUIDITY event from mint transaction
     *
     * Called immediately after position creation to provide instant cost basis.
     * Uses existing processAndCreateEvent() infrastructure for consistency.
     * Idempotent via onchainInputHash - safe to call even if blockscanner runs first.
     *
     * @param positionInfo - Position sync info
     * @param eventData - Parsed event data from mint transaction receipt
     */
    async seedMintEvent(
        positionInfo: PositionSyncInfo,
        eventData: {
            transactionHash: string;
            blockNumber: string;
            transactionIndex: number;
            logIndex: number;
            liquidity: string;
            amount0: string;
            amount1: string;
        }
    ): Promise<void> {
        const chain = positionInfo.pool.chain as SupportedChainsType;

        // Check if event already exists (idempotent via onchainInputHash)
        const inputHash = this.generateOnchainInputHash(
            BigInt(eventData.blockNumber),
            eventData.transactionIndex,
            eventData.logIndex
        );

        const existingEvent = await this.prisma.positionEvent.findFirst({
            where: {
                positionUserId: positionInfo.userId,
                positionChain: positionInfo.chain,
                positionProtocol: positionInfo.protocol,
                positionNftId: positionInfo.nftId,
                inputHash,
            },
        });

        if (existingEvent) {
            this.logger.debug(
                {
                    nftId: positionInfo.nftId,
                    chain,
                    inputHash,
                },
                "Event already exists - skipping seed (blockscanner was faster)"
            );
            return;
        }

        // Get block timestamp for event
        const blockInfo = await this.evmBlockInfoService.getBlockByNumber(
            BigInt(eventData.blockNumber),
            chain
        );

        // Construct RawPositionEvent for processAndCreateEvent
        const rawEvent: RawPositionEvent = {
            eventType: "INCREASE_LIQUIDITY",
            tokenId: positionInfo.nftId,
            transactionHash: eventData.transactionHash,
            blockNumber: BigInt(eventData.blockNumber),
            transactionIndex: eventData.transactionIndex,
            logIndex: eventData.logIndex,
            blockTimestamp: new Date(Number(blockInfo.timestamp) * 1000),
            liquidity: eventData.liquidity,
            amount0: eventData.amount0,
            amount1: eventData.amount1,
            chain,
        };

        // Initial state (first event for position)
        const initialState = {
            liquidityAfter: "0",
            costBasisAfter: "0",
            realizedPnLAfter: "0",
            uncollectedPrincipal0: "0",
            uncollectedPrincipal1: "0",
        };

        // Reuse existing event processing logic
        const { eventId, newState } = await this.processAndCreateEvent(
            rawEvent,
            positionInfo,
            initialState
        );

        // Create initial APR record
        await this.positionAprService.createEventAprRecord(
            eventId,
            new Date(Number(blockInfo.timestamp) * 1000),
            null, // Open-ended period until next event
            newState.costBasisAfter
        );

        this.logger.debug(
            {
                nftId: positionInfo.nftId,
                chain,
                eventId,
                costBasis: newState.costBasisAfter,
            },
            "Successfully seeded initial INCREASE_LIQUIDITY event"
        );
    }

    /**
     * Calculate position status based on liquidity events
     */
    calculatePositionStatus(events: RawPositionEvent[]): {
        status: "open" | "closed";
        currentLiquidity: bigint;
    } {
        let netLiquidity = 0n;

        for (const event of events) {
            if (event.eventType === "INCREASE_LIQUIDITY") {
                netLiquidity += BigInt(event.liquidity!);
            } else if (event.eventType === "DECREASE_LIQUIDITY") {
                netLiquidity -= BigInt(event.liquidity!);
            }
            // COLLECT events don't affect liquidity
        }

        return {
            status: netLiquidity === 0n ? "closed" : "open",
            currentLiquidity: netLiquidity,
        };
    }

    /**
     * Generate inputHash for onchain events
     * Format: MD5(CONCAT(blockNumber, transactionIndex, logIndex))
     */
    private generateOnchainInputHash(
        blockNumber: bigint,
        transactionIndex: number,
        logIndex: number
    ): string {
        const input = `${blockNumber.toString()}${transactionIndex.toString()}${logIndex.toString()}`;
        return createHash("md5").update(input).digest("hex");
    }


    /**
     * One-time initial import of position events from blockchain
     * - Only runs if position has no existing events (idempotent)
     * - Fetches complete history from NFPM deployment to latest block
     * - Processes events sequentially without finality/reorg handling
     * - Blockscanner worker handles ongoing updates after initial import
     */
    async syncPositionEvents(
        positionInfo: PositionSyncInfo,
        nftId: string
    ): Promise<PositionEvent[]> {
        const chain = positionInfo.pool.chain as SupportedChainsType;

        // Check if position already has events (idempotent - skip if already imported)
        const existingEventCount = await this.prisma.positionEvent.count({
            where: {
                positionUserId: positionInfo.userId,
                positionChain: positionInfo.chain,
                positionProtocol: positionInfo.protocol,
                positionNftId: positionInfo.nftId,
            },
        });

        if (existingEventCount > 0) {
            this.logger.debug(
                {
                    nftId,
                    chain,
                    existingEventCount,
                },
                "Position already has events - skipping initial import (blockscanner handles updates)"
            );

            return await this.prisma.positionEvent.findMany({
                where: {
                    positionUserId: positionInfo.userId,
                    positionChain: positionInfo.chain,
                    positionProtocol: positionInfo.protocol,
                    positionNftId: positionInfo.nftId,
                },
                orderBy: [
                    { blockNumber: "asc" },
                    { transactionIndex: "asc" },
                    { logIndex: "asc" },
                ],
            });
        }

        // Get NFPM deployment block for optimization (no need to scan before contract existed)
        const deploymentBlock = await this.getNFPMDeploymentBlock(chain);

        // Fetch all historical events from NFPM deployment to latest
        const rawEvents = await this.etherscanEventService.fetchPositionEvents(
            chain,
            nftId,
            { fromBlock: deploymentBlock.toString() }
        );

        this.logger.debug(
            {
                nftId,
                chain,
                deploymentBlock: deploymentBlock.toString(),
                eventCount: rawEvents.length,
            },
            "Fetched complete event history for initial import"
        );

        if (rawEvents.length === 0) {
            this.logger.debug(
                { nftId, chain },
                "No events found - returning empty array"
            );
            return [];
        }

        // Process events sequentially from earliest to latest
        let currentState = {
            liquidityAfter: "0",
            costBasisAfter: "0",
            realizedPnLAfter: "0",
            uncollectedPrincipal0: "0",
            uncollectedPrincipal1: "0",
        };

        for (let i = 0; i < rawEvents.length; i++) {
            const rawEvent = rawEvents[i];

            // Process event and create in database (shared helper)
            const { eventId, newState, feeValue } =
                await this.processAndCreateEvent(
                    rawEvent,
                    positionInfo,
                    currentState
                );

            // Create APR record for this event
            const nextEvent = rawEvents[i + 1];
            const periodEndDate = nextEvent?.blockTimestamp || null;

            await this.positionAprService.createEventAprRecord(
                eventId,
                rawEvent.blockTimestamp,
                periodEndDate,
                newState.costBasisAfter
            );

            // If there was a previous event, close its period
            if (i > 0) {
                await this.positionAprService.updatePreviousEventPeriodEnd(
                    positionInfo.chain,
                    positionInfo.protocol,
                    positionInfo.nftId,
                    rawEvent.blockTimestamp
                );
            }

            // If this is a COLLECT event, distribute fees across existing periods
            if (rawEvent.eventType === "COLLECT" && feeValue !== "0") {
                await this.positionAprService.distributeSingleCollectEventFees(
                    positionInfo.chain,
                    positionInfo.protocol,
                    positionInfo.nftId,
                    rawEvent.blockTimestamp,
                    feeValue
                );
            }

            // Update current state for next iteration
            currentState = newState;
        }

        this.logger.debug(
            {
                nftId,
                chain,
                processedEventCount: rawEvents.length,
            },
            "Initial import completed - blockscanner worker will handle ongoing updates"
        );

        // Return the processed events
        return await this.prisma.positionEvent.findMany({
            where: {
                positionUserId: positionInfo.userId,
                positionChain: positionInfo.chain,
                positionProtocol: positionInfo.protocol,
                positionNftId: positionInfo.nftId,
            },
            orderBy: [
                { blockNumber: "asc" },
                { transactionIndex: "asc" },
                { logIndex: "asc" },
            ],
        });
    }

    /**
     * Shared helper: Process raw event and create position event in database
     * Used by both syncPositionEvents() and processBlockchainEvent()
     *
     * @param rawEvent - Raw blockchain event
     * @param positionInfo - Position information
     * @param currentState - Current position state before this event
     * @returns Event ID, new state, and fee value
     */
    private async processAndCreateEvent(
        rawEvent: RawPositionEvent,
        positionInfo: PositionSyncInfo,
        currentState: {
            liquidityAfter: string;
            costBasisAfter: string;
            realizedPnLAfter: string;
            uncollectedPrincipal0: string;
            uncollectedPrincipal1: string;
        }
    ): Promise<{
        eventId: string;
        newState: {
            liquidityAfter: string;
            costBasisAfter: string;
            realizedPnLAfter: string;
            uncollectedPrincipal0: string;
            uncollectedPrincipal1: string;
        };
        deltaCostBasis: string;
        deltaPnL: string;
        feeValue: string;
    }> {
        const chain = positionInfo.pool.chain as SupportedChainsType;

        // Get pool price at event block
        const priceData = await this.poolPriceService.getExactPoolPriceAtBlock(
            positionInfo.pool.poolAddress,
            chain,
            rawEvent.blockNumber,
            rawEvent.blockTimestamp
        );

        const poolPrice = this.calculatePoolPriceInQuoteToken(
            priceData.sqrtPriceX96,
            positionInfo.token0IsQuote,
            positionInfo.pool.token0.decimals,
            positionInfo.pool.token1.decimals
        );

        // Calculate token value in quote
        const tokenValueInQuote = this.calculateTokenValueInQuote(
            rawEvent.amount0 || "0",
            rawEvent.amount1 || "0",
            poolPrice,
            positionInfo.token0IsQuote,
            positionInfo.pool.token0.decimals,
            positionInfo.pool.token1.decimals
        ).toString();

        // Calculate new state
        const stateResult = this.calculateNewState(
            currentState,
            rawEvent,
            tokenValueInQuote,
            poolPrice,
            positionInfo
        );

        const newState = stateResult.state;
        const deltaCostBasis = stateResult.deltaCostBasis || "0";
        const deltaPnL = stateResult.deltaPnL || "0";
        const feeValue = stateResult.feeValue || "0";

        // Create position event in database
        const inputHash = this.generateOnchainInputHash(
            rawEvent.blockNumber,
            rawEvent.transactionIndex,
            rawEvent.logIndex
        );

        const createdEvent = await this.prisma.positionEvent.create({
            data: {
                positionUserId: positionInfo.userId,
                positionChain: positionInfo.chain,
                positionProtocol: positionInfo.protocol,
                positionNftId: positionInfo.nftId,

                // Blockchain ordering
                blockNumber: rawEvent.blockNumber,
                transactionIndex: rawEvent.transactionIndex,
                logIndex: rawEvent.logIndex,
                blockTimestamp: rawEvent.blockTimestamp,
                transactionHash: rawEvent.transactionHash,

                // Event classification
                eventType: rawEvent.eventType,

                // Liquidity changes
                deltaL: rawEvent.liquidity || "0",
                liquidityAfter: newState.liquidityAfter,

                // Price information
                poolPrice: poolPrice.toString(),

                // Token amounts
                token0Amount: rawEvent.amount0 || "0",
                token1Amount: rawEvent.amount1 || "0",
                tokenValueInQuote,

                // Fees (for COLLECT events) - pure fees only, excluding principal
                feesCollected0:
                    rawEvent.eventType === "COLLECT"
                        ? this.calculatePureFees(rawEvent, currentState)
                              .feeToken0.toString()
                        : "0",
                feesCollected1:
                    rawEvent.eventType === "COLLECT"
                        ? this.calculatePureFees(rawEvent, currentState)
                              .feeToken1.toString()
                        : "0",
                feeValueInQuote:
                    rawEvent.eventType === "COLLECT" ? feeValue : "0",

                // Uncollected principal tracking
                uncollectedPrincipal0: newState.uncollectedPrincipal0,
                uncollectedPrincipal1: newState.uncollectedPrincipal1,

                // Cost basis and PnL
                deltaCostBasis,
                costBasisAfter: newState.costBasisAfter,
                deltaPnL,
                realizedPnLAfter: newState.realizedPnLAfter,

                // Metadata
                createdAt: new Date(),
                inputHash,
                calcVersion: 1,
            },
        });

        return {
            eventId: createdEvent.id,
            newState,
            deltaCostBasis,
            deltaPnL,
            feeValue,
        };
    }

    /**
     * Update state for INCREASE_LIQUIDITY events
     * Increases liquidity and cost basis, no PnL realization
     */
    private updateStateForIncreaseLiquidity(
        currentState: {
            liquidityAfter: string;
            costBasisAfter: string;
            realizedPnLAfter: string;
            uncollectedPrincipal0: string;
            uncollectedPrincipal1: string;
        },
        event: RawPositionEvent,
        tokenValueInQuote: string
    ): {
        liquidityAfter: string;
        costBasisAfter: string;
        realizedPnLAfter: string;
        uncollectedPrincipal0: string;
        uncollectedPrincipal1: string;
    } {
        const deltaL = event.liquidity || "0";
        const newLiquidityAfter = (
            BigInt(currentState.liquidityAfter) + BigInt(deltaL)
        ).toString();

        // Calculate cost basis from token amounts invested
        // For INCREASE_LIQUIDITY, the cost basis is the value of tokens invested
        const deltaCostBasis = tokenValueInQuote;
        const newCostBasisAfter = (
            BigInt(currentState.costBasisAfter) + BigInt(deltaCostBasis)
        ).toString();

        // INCREASE events don't realize PnL, they add to the position
        const realizedPnLAfter = currentState.realizedPnLAfter;

        // INCREASE events don't affect uncollected principal (no tokens made available for collection)
        const uncollectedPrincipal0 = currentState.uncollectedPrincipal0;
        const uncollectedPrincipal1 = currentState.uncollectedPrincipal1;

        return {
            liquidityAfter: newLiquidityAfter,
            costBasisAfter: newCostBasisAfter,
            realizedPnLAfter,
            uncollectedPrincipal0,
            uncollectedPrincipal1,
        };
    }

    /**
     * Update state for DECREASE_LIQUIDITY events
     * Decreases liquidity and potentially realizes PnL
     */
    private updateStateForDecreaseLiquidity(
        currentState: {
            liquidityAfter: string;
            costBasisAfter: string;
            realizedPnLAfter: string;
            uncollectedPrincipal0: string;
            uncollectedPrincipal1: string;
        },
        event: RawPositionEvent,
        tokenValueInQuote: string
    ): {
        liquidityAfter: string;
        costBasisAfter: string;
        realizedPnLAfter: string;
        uncollectedPrincipal0: string;
        uncollectedPrincipal1: string;
    } {
        const deltaL = event.liquidity || "0";
        const currentLiquidity = BigInt(currentState.liquidityAfter);
        const newLiquidityAfter = (
            currentLiquidity - BigInt(deltaL)
        ).toString();

        // Calculate proportional cost basis being removed
        const currentCostBasis = BigInt(currentState.costBasisAfter);
        let deltaCostBasis = "0";
        let deltaPnL = "0";

        if (currentLiquidity > 0n) {
            // Calculate proportion of liquidity being removed
            const proportionalCostBasis =
                (currentCostBasis * BigInt(deltaL)) / currentLiquidity;
            deltaCostBasis = proportionalCostBasis.toString();

            // Calculate current value of tokens received
            const currentValue = BigInt(tokenValueInQuote);

            // PnL = Current Value - Proportional Cost Basis
            const realizedPnL = currentValue - proportionalCostBasis;
            deltaPnL = realizedPnL.toString();
        }

        const newCostBasisAfter = (
            currentCostBasis - BigInt(deltaCostBasis)
        ).toString();
        const newRealizedPnLAfter = (
            BigInt(currentState.realizedPnLAfter) + BigInt(deltaPnL)
        ).toString();

        // DECREASE events add tokens to uncollected principal
        const token0Amount = event.amount0 || "0";
        const token1Amount = event.amount1 || "0";
        const newUncollectedToken0Amount = (
            BigInt(currentState.uncollectedPrincipal0) + BigInt(token0Amount)
        ).toString();
        const newUncollectedToken1Amount = (
            BigInt(currentState.uncollectedPrincipal1) + BigInt(token1Amount)
        ).toString();

        return {
            liquidityAfter: newLiquidityAfter,
            costBasisAfter: newCostBasisAfter,
            realizedPnLAfter: newRealizedPnLAfter,
            uncollectedPrincipal0: newUncollectedToken0Amount,
            uncollectedPrincipal1: newUncollectedToken1Amount,
        };
    }

    /**
     * Update state for COLLECT events
     * Separates fee collection from principal collection
     */
    private updateStateForCollect(
        currentState: {
            liquidityAfter: string;
            costBasisAfter: string;
            realizedPnLAfter: string;
            uncollectedPrincipal0: string;
            uncollectedPrincipal1: string;
        },
        event: RawPositionEvent
    ): {
        liquidityAfter: string;
        costBasisAfter: string;
        realizedPnLAfter: string;
        uncollectedPrincipal0: string;
        uncollectedPrincipal1: string;
    } {
        // Get token amounts from the COLLECT event
        const collectedToken0 = BigInt(event.amount0 || "0");
        const collectedToken1 = BigInt(event.amount1 || "0");

        // Get current uncollected principal amounts
        const currentUncollectedToken0 = BigInt(
            currentState.uncollectedPrincipal0
        );
        const currentUncollectedToken1 = BigInt(
            currentState.uncollectedPrincipal1
        );

        // Separate principal collection from fee collection
        const principalToken0 =
            collectedToken0 <= currentUncollectedToken0
                ? collectedToken0
                : currentUncollectedToken0;
        const principalToken1 =
            collectedToken1 <= currentUncollectedToken1
                ? collectedToken1
                : currentUncollectedToken1;

        // Calculate new uncollected amounts (reduce by principal collected)
        const newUncollectedToken0Amount = (
            currentUncollectedToken0 - principalToken0
        ).toString();
        const newUncollectedToken1Amount = (
            currentUncollectedToken1 - principalToken1
        ).toString();

        // COLLECT events don't change liquidity, cost basis, or realized PnL
        return {
            liquidityAfter: currentState.liquidityAfter,
            costBasisAfter: currentState.costBasisAfter,
            realizedPnLAfter: currentState.realizedPnLAfter,
            uncollectedPrincipal0: newUncollectedToken0Amount,
            uncollectedPrincipal1: newUncollectedToken1Amount,
        };
    }

    /**
     * Convert sqrtPriceX96 to pool price in quote token units
     * @param sqrtPriceX96 - The sqrt price in X96 format
     * @param token0IsQuote - Whether token0 is the quote token
     * @param token0Decimals - Decimals of token0
     * @param token1Decimals - Decimals of token1
     * @returns Price of base token in quote token units
     */
    private calculatePoolPriceInQuoteToken(
        sqrtPriceX96: bigint,
        token0IsQuote: boolean,
        token0Decimals: number,
        token1Decimals: number
    ): bigint {
        const jsbiSqrtPrice = JSBI.BigInt(sqrtPriceX96.toString());

        if (token0IsQuote) {
            // Quote = token0, Base = token1
            // We want price of token1 in token0 units
            return sqrtRatioX96ToToken0PerToken1(jsbiSqrtPrice, token1Decimals);
        } else {
            // Quote = token1, Base = token0
            // We want price of token0 in token1 units
            return sqrtRatioX96ToToken1PerToken0(jsbiSqrtPrice, token0Decimals);
        }
    }

    /**
     * Calculate the total value of token amounts in quote token units
     * @param token0Amount - Token0 amount in smallest units
     * @param token1Amount - Token1 amount in smallest units
     * @param poolPrice - Pool price in quote token units (from calculatePoolPriceInQuoteToken)
     * @param token0IsQuote - Whether token0 is the quote token
     * @param token0Decimals - Decimals of token0
     * @param token1Decimals - Decimals of token1
     * @returns Total value in quote token smallest units
     */
    private calculateTokenValueInQuote(
        token0Amount: string,
        token1Amount: string,
        poolPrice: bigint,
        token0IsQuote: boolean,
        token0Decimals: number,
        token1Decimals: number
    ): bigint {
        const token0Amt = BigInt(token0Amount);
        const token1Amt = BigInt(token1Amount);

        if (token0IsQuote) {
            // Quote = token0, Base = token1
            // token0Amount is already in quote units
            // Convert token1Amount to quote using price
            const token1ValueInQuote =
                (token1Amt * poolPrice) / 10n ** BigInt(token1Decimals);
            return token0Amt + token1ValueInQuote;
        } else {
            // Quote = token1, Base = token0
            // token1Amount is already in quote units
            // Convert token0Amount to quote using price
            const token0ValueInQuote =
                (token0Amt * poolPrice) / 10n ** BigInt(token0Decimals);
            return token1Amt + token0ValueInQuote;
        }
    }

    /**
     * Calculate pure fee amounts for COLLECT events (excluding principal collection)
     */
    private calculatePureFees(
        rawEvent: RawPositionEvent,
        currentState: {
            uncollectedPrincipal0: string;
            uncollectedPrincipal1: string;
        }
    ): { feeToken0: bigint; feeToken1: bigint } {
        // Get token amounts from the COLLECT event
        const collectedToken0 = BigInt(rawEvent.amount0 || "0");
        const collectedToken1 = BigInt(rawEvent.amount1 || "0");

        // Get uncollected principal amounts BEFORE this collect event
        const uncollectedToken0 = BigInt(currentState.uncollectedPrincipal0);
        const uncollectedToken1 = BigInt(currentState.uncollectedPrincipal1);

        // Separate principal from fees
        // Principal collected = min(tokens collected, available uncollected principal)
        const principalCollectedToken0 =
            collectedToken0 <= uncollectedToken0
                ? collectedToken0
                : uncollectedToken0;
        const principalCollectedToken1 =
            collectedToken1 <= uncollectedToken1
                ? collectedToken1
                : uncollectedToken1;

        const feeToken0 = collectedToken0 - principalCollectedToken0;
        const feeToken1 = collectedToken1 - principalCollectedToken1;

        return { feeToken0, feeToken1 };
    }

    /**
     * Calculate the pure fee value for COLLECT events (excluding principal collection)
     */
    private calculatePureFeeValue(
        rawEvent: RawPositionEvent,
        currentState: {
            liquidityAfter: string;
            costBasisAfter: string;
            realizedPnLAfter: string;
            uncollectedPrincipal0: string;
            uncollectedPrincipal1: string;
        },
        poolPrice: bigint,
        positionInfo: PositionSyncInfo
    ): string {
        // Calculate pure fee amounts using the helper method
        const { feeToken0, feeToken1 } = this.calculatePureFees(
            rawEvent,
            currentState
        );

        // Calculate fee value in quote token using current price
        return this.calculateTokenValueInQuote(
            feeToken0.toString(),
            feeToken1.toString(),
            poolPrice,
            positionInfo.token0IsQuote,
            positionInfo.pool.token0.decimals,
            positionInfo.pool.token1.decimals
        ).toString();
    }

    /**
     * Calculate new state based on event type
     * COLLECT events don't change state (fees are not part of realized PnL)
     */
    private calculateNewState(
        currentState: {
            liquidityAfter: string;
            costBasisAfter: string;
            realizedPnLAfter: string;
            uncollectedPrincipal0: string;
            uncollectedPrincipal1: string;
        },
        event: RawPositionEvent,
        tokenValueInQuote: string,
        poolPrice: bigint,
        positionInfo: PositionSyncInfo
    ): {
        state: {
            liquidityAfter: string;
            costBasisAfter: string;
            realizedPnLAfter: string;
            uncollectedPrincipal0: string;
            uncollectedPrincipal1: string;
        };
        deltaCostBasis?: string;
        deltaPnL?: string;
        feeValue?: string;
    } {
        switch (event.eventType) {
            case "INCREASE_LIQUIDITY":
                return {
                    state: this.updateStateForIncreaseLiquidity(
                        currentState,
                        event,
                        tokenValueInQuote
                    ),
                    deltaCostBasis: tokenValueInQuote, // Positive for INCREASE
                };

            case "DECREASE_LIQUIDITY":
                const decreaseResult = this.updateStateForDecreaseLiquidity(
                    currentState,
                    event,
                    tokenValueInQuote
                );
                // Calculate the deltaCostBasis as the difference
                const originalCostBasis = BigInt(currentState.costBasisAfter);
                const newCostBasis = BigInt(decreaseResult.costBasisAfter);
                const deltaCostBasis = newCostBasis - originalCostBasis; // Will be negative

                // Calculate the deltaPnL as the difference in realized PnL
                const originalRealizedPnL = BigInt(
                    currentState.realizedPnLAfter
                );
                const newRealizedPnL = BigInt(decreaseResult.realizedPnLAfter);
                const deltaPnL = newRealizedPnL - originalRealizedPnL;

                return {
                    state: decreaseResult,
                    deltaCostBasis: deltaCostBasis.toString(),
                    deltaPnL: deltaPnL.toString(),
                };

            case "COLLECT":
                // COLLECT events need special handling to separate fees from principal collection
                const collectState = this.updateStateForCollect(
                    currentState,
                    event
                );
                const feeValue = this.calculatePureFeeValue(
                    event,
                    currentState,
                    poolPrice,
                    positionInfo
                );
                return {
                    state: collectState,
                    deltaCostBasis: "0", // COLLECT events don't affect cost basis
                    feeValue,
                };

            default:
                return {
                    state: {
                        ...currentState,
                        uncollectedPrincipal0:
                            currentState.uncollectedPrincipal0,
                        uncollectedPrincipal1:
                            currentState.uncollectedPrincipal1,
                    },
                    deltaCostBasis: "0",
                };
        }
    }

    /**
     * Get position events with pagination and filtering
     * Returns events in chronological order (oldest first)
     *
     * @param positionInfo - Position information with composite key
     * @param options - Query options for filtering, sorting, and pagination
     * @returns Paginated list of position events
     */
    async getPositionEvents(
        positionInfo: PositionSyncInfo,
        options: {
            eventType?:
                | "CREATE"
                | "INCREASE"
                | "DECREASE"
                | "COLLECT"
                | "CLOSE";
            sortOrder?: "asc" | "desc";
            limit?: number;
            offset?: number;
        } = {}
    ): Promise<{
        events: PositionEvent[];
        pagination: {
            total: number;
            limit: number;
            offset: number;
            hasMore: boolean;
            nextOffset: number | null;
        };
    }> {
        const {
            eventType,
            sortOrder = "desc", // Default to newest first
            limit = 20,
            offset = 0,
        } = options;

        // Build where clause
        const whereClause: any = {
            positionUserId: positionInfo.userId,
            positionChain: positionInfo.chain,
            positionProtocol: positionInfo.protocol,
            positionNftId: positionInfo.nftId,
        };

        if (eventType) {
            whereClause.eventType = eventType;
        }

        // Get total count for pagination
        const total = await this.prisma.positionEvent.count({
            where: whereClause,
        });

        // Get events with pagination
        const events = await this.prisma.positionEvent.findMany({
            where: whereClause,
            orderBy: [
                { blockNumber: sortOrder },
                { transactionIndex: sortOrder },
                { logIndex: sortOrder },
            ],
            take: limit,
            skip: offset,
        });

        const hasMore = offset + limit < total;
        const nextOffset = hasMore ? offset + limit : null;

        this.logger.debug(
            {
                positionChain: positionInfo.chain,
                positionProtocol: positionInfo.protocol,
                positionNftId: positionInfo.nftId,
                eventType,
                sortOrder,
                limit,
                offset,
                total,
                returnedCount: events.length,
                hasMore,
            },
            "Retrieved position events"
        );

        return {
            events,
            pagination: {
                total,
                limit,
                offset,
                hasMore,
                nextOffset,
            },
        };
    }

    /**
     * Process a blockchain event for all users who own the position
     * Called by blockscanner worker (user-agnostic)
     *
     * This method is idempotent - duplicate events are skipped
     * Fetches blockTimestamp only if positions exist (optimization)
     *
     * @param rawEvent - Raw event data from blockchain (without timestamp)
     * @returns Array of results (one per affected user)
     */
    async processBlockchainEvent(rawEvent: {
        chain: SupportedChainsType;
        protocol: string;
        nftId: string;
        eventType: "INCREASE_LIQUIDITY" | "DECREASE_LIQUIDITY" | "COLLECT";
        blockNumber: bigint;
        transactionIndex: number;
        logIndex: number;
        blockHash: string;
        transactionHash: string;
        liquidity?: string;
        amount0: string;
        amount1: string;
        recipient?: string;
    }): Promise<Array<{ userId: string; success: boolean; error?: string }>> {
        const results: Array<{
            userId: string;
            success: boolean;
            error?: string;
        }> = [];

        // Find all users who own this position
        const positions = await this.prisma.position.findMany({
            where: {
                chain: rawEvent.chain,
                nftId: rawEvent.nftId,
                protocol: rawEvent.protocol,
            },
            include: {
                pool: {
                    include: {
                        token0: true,
                        token1: true,
                    },
                },
            },
        });

        if (positions.length === 0) {
            this.logger.debug(
                { chain: rawEvent.chain, nftId: rawEvent.nftId },
                "No users own this position (not imported yet)"
            );
            return results;
        }

        // Fetch block timestamp (only needed when positions exist)
        const blockInfo = await this.evmBlockInfoService.getBlockByNumber(
            rawEvent.blockNumber,
            rawEvent.chain
        );
        const blockTimestamp = new Date(Number(blockInfo.timestamp) * 1000);

        // Process event for each user
        for (const position of positions) {
            try {
                // Check if event already exists (idempotent)
                const existingEvent = await this.prisma.positionEvent.findFirst(
                    {
                        where: {
                            positionUserId: position.userId,
                            positionChain: position.chain,
                            positionProtocol: position.protocol,
                            positionNftId: position.nftId,
                            transactionHash: rawEvent.transactionHash,
                            logIndex: rawEvent.logIndex,
                        },
                    }
                );

                if (existingEvent) {
                    this.logger.debug(
                        {
                            userId: position.userId,
                            chain: rawEvent.chain,
                            nftId: rawEvent.nftId,
                            txHash: rawEvent.transactionHash,
                            logIndex: rawEvent.logIndex,
                        },
                        "Event already exists, skipping"
                    );
                    results.push({ userId: position.userId, success: true });
                    continue;
                }

                // Get position info for state calculations
                const positionInfo: PositionSyncInfo = {
                    userId: position.userId,
                    chain: position.chain,
                    protocol: position.protocol,
                    nftId: position.nftId,
                    token0IsQuote: position.token0IsQuote,
                    pool: {
                        poolAddress: position.pool.poolAddress,
                        chain: position.pool.chain,
                        token0: {
                            decimals: position.pool.token0.decimals,
                        },
                        token1: {
                            decimals: position.pool.token1.decimals,
                        },
                    },
                };

                // Get current state (last event or zero state)
                const lastEvent = await this.prisma.positionEvent.findFirst({
                    where: {
                        positionUserId: position.userId,
                        positionChain: position.chain,
                        positionProtocol: position.protocol,
                        positionNftId: position.nftId,
                    },
                    orderBy: [
                        { blockNumber: "desc" },
                        { transactionIndex: "desc" },
                        { logIndex: "desc" },
                    ],
                });

                const currentState = lastEvent
                    ? {
                          liquidityAfter: lastEvent.liquidityAfter,
                          costBasisAfter: lastEvent.costBasisAfter,
                          realizedPnLAfter: lastEvent.realizedPnLAfter,
                          uncollectedPrincipal0:
                              lastEvent.uncollectedPrincipal0,
                          uncollectedPrincipal1:
                              lastEvent.uncollectedPrincipal1,
                      }
                    : {
                          liquidityAfter: "0",
                          costBasisAfter: "0",
                          realizedPnLAfter: "0",
                          uncollectedPrincipal0: "0",
                          uncollectedPrincipal1: "0",
                      };

                // Build RawPositionEvent for helper method
                const rawPositionEvent: RawPositionEvent = {
                    eventType: rawEvent.eventType,
                    tokenId: rawEvent.nftId,
                    transactionHash: rawEvent.transactionHash,
                    blockNumber: rawEvent.blockNumber,
                    transactionIndex: rawEvent.transactionIndex,
                    logIndex: rawEvent.logIndex,
                    blockTimestamp: blockTimestamp,
                    liquidity: rawEvent.liquidity,
                    amount0: rawEvent.amount0,
                    amount1: rawEvent.amount1,
                    recipient: rawEvent.recipient,
                    chain: rawEvent.chain,
                };

                // Process event and create in database (shared helper)
                const { eventId, newState, feeValue } =
                    await this.processAndCreateEvent(
                        rawPositionEvent,
                        positionInfo,
                        currentState
                    );

                // Create APR record (FIXED: was missing in original implementation!)
                // Note: For single events, we don't know the next event yet, so periodEndDate is null
                await this.positionAprService.createEventAprRecord(
                    eventId,
                    blockTimestamp,
                    null, // Period end will be updated when next event arrives
                    newState.costBasisAfter
                );

                // Update the previous event's period end to this event's timestamp
                await this.positionAprService.updatePreviousEventPeriodEnd(
                    positionInfo.chain,
                    positionInfo.protocol,
                    positionInfo.nftId,
                    blockTimestamp
                );

                // If this is a COLLECT event, distribute fees across existing periods
                if (rawEvent.eventType === "COLLECT" && feeValue !== "0") {
                    await this.positionAprService.distributeSingleCollectEventFees(
                        positionInfo.chain,
                        positionInfo.protocol,
                        positionInfo.nftId,
                        blockTimestamp,
                        feeValue
                    );
                }

                results.push({ userId: position.userId, success: true });
            } catch (error) {
                this.logger.error(
                    {
                        userId: position.userId,
                        chain: rawEvent.chain,
                        nftId: rawEvent.nftId,
                        error:
                            error instanceof Error
                                ? error.message
                                : String(error),
                    },
                    "Failed to process blockchain event for user"
                );
                results.push({
                    userId: position.userId,
                    success: false,
                    error:
                        error instanceof Error ? error.message : String(error),
                });
            }
        }

        return results;
    }

    /**
     * Rollback events above a specific block for ALL positions on a chain
     * Called by blockscanner worker when reorg detected
     *
     * @param chain - Chain name
     * @param minAffectedBlock - Delete events >= this block
     * @returns Statistics about deleted events
     */
    async rollbackEventsAboveBlock(
        chain: SupportedChainsType,
        minAffectedBlock: bigint
    ): Promise<{
        deletedEvents: number;
        affectedUsers: number;
        affectedPositions: number;
    }> {
        // Find all positions on this chain
        const positions = await this.prisma.position.findMany({
            where: { chain },
            select: {
                userId: true,
                chain: true,
                protocol: true,
                nftId: true,
            },
        });

        let deletedEvents = 0;
        const affectedUserIds = new Set<string>();

        // Delete events for each position
        for (const position of positions) {
            const result = await this.prisma.positionEvent.deleteMany({
                where: {
                    positionUserId: position.userId,
                    positionChain: position.chain,
                    positionProtocol: position.protocol,
                    positionNftId: position.nftId,
                    blockNumber: { gte: minAffectedBlock },
                },
            });

            if (result.count > 0) {
                deletedEvents += result.count;
                affectedUserIds.add(position.userId);

                // Invalidate APR cache for this position
                await this.positionAprService.invalidatePositionApr(
                    position.chain,
                    position.protocol,
                    position.nftId
                );
            }
        }

        this.logger.info(
            {
                chain,
                minAffectedBlock: minAffectedBlock.toString(),
                deletedEvents,
                affectedUsers: affectedUserIds.size,
                affectedPositions: positions.length,
            },
            "Rolled back position events for reorg"
        );

        return {
            deletedEvents,
            affectedUsers: affectedUserIds.size,
            affectedPositions: positions.length,
        };
    }

    /**
     * Get NFPM contract deployment block for a chain (cached)
     * @private
     */
    private async getNFPMDeploymentBlock(
        chain: SupportedChainsType
    ): Promise<bigint> {
        // Check cache first
        if (this.nfpmDeploymentBlocks[chain]) {
            return this.nfpmDeploymentBlocks[chain];
        }

        // Fetch from Etherscan API
        try {
            const nfpmAddress = getNFPMAddress(chain);
            const etherscanClient = new EtherscanClient();
            const creation = await etherscanClient.fetchContractCreation(
                chain,
                nfpmAddress
            );

            const block = BigInt(creation.blockNumber);
            this.nfpmDeploymentBlocks[chain] = block;

            this.logger.info(
                { chain, deploymentBlock: block.toString() },
                "NFPM deployment block cached"
            );

            return block;
        } catch (error) {
            this.logger.error(
                {
                    chain,
                    error:
                        error instanceof Error ? error.message : String(error),
                },
                "Failed to fetch NFPM deployment block, using 0"
            );
            return 0n;
        }
    }
}

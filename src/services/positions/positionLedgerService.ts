/**
 * Position Ledger Service
 *
 * Provides unified access to position events with integrated PnL calculations.
 * Fetches events from blockchain via Etherscan and processes them through
 * EventStateCalculator to get calculated states and PnL data.
 */

import { createHash, randomUUID } from "crypto";
import { SupportedChainsType } from "@/config/chains";
import type { Clients } from "../ClientsFactory";
import type { Services } from "../ServiceFactory";
import { EtherscanEventService } from "../etherscan/etherscanEventService";
import type { RawPositionEvent } from "../etherscan/etherscanEventService";
import { EtherscanBlockInfoService } from "../etherscan/etherscanBlockInfoService";
import { TokenService } from "../tokens/tokenService";
import { PoolPriceService } from "../prices/poolPriceService";
import { PrismaClient, type PositionEvent } from "@prisma/client";
import { sqrtRatioX96ToToken1PerToken0, sqrtRatioX96ToToken0PerToken1 } from "@/lib/utils/uniswap-v3/price";
import JSBI from "jsbi";
import type { BasicPosition } from "./positionService";

// Unified event interface for processing mixed manual/onchain events
interface ProcessableEvent {
    // Common blockchain ordering fields
    blockNumber: bigint;
    transactionIndex: number;
    logIndex: number;
    blockTimestamp: Date;

    // Event classification
    source: "manual" | "onchain";
    eventType: string;
    ledgerIgnore: boolean;

    // Event data (will be populated based on source)
    rawEvent?: RawPositionEvent; // For new onchain events
    dbEvent?: PositionEvent; // For existing manual events
}

// Position sync information interface - picks necessary fields from BasicPosition
export type PositionSyncInfo = Pick<BasicPosition, 'id' | 'token0IsQuote'> & {
    pool: Pick<BasicPosition['pool'], 'poolAddress' | 'chain'> & {
        token0: Pick<BasicPosition['pool']['token0'], 'decimals'>;
        token1: Pick<BasicPosition['pool']['token1'], 'decimals'>;
    };
};

export class PositionLedgerService {
    private prisma: PrismaClient;
    private etherscanEventService: EtherscanEventService;
    private etherscanBlockInfoService: EtherscanBlockInfoService;
    private tokenService: TokenService;
    private poolPriceService: PoolPriceService;

    /**
     * Helper method to create PositionSyncInfo from BasicPosition
     */
    static createSyncInfo(position: BasicPosition): PositionSyncInfo {
        return {
            id: position.id,
            token0IsQuote: position.token0IsQuote,
            pool: {
                poolAddress: position.pool.poolAddress,
                chain: position.pool.chain,
                token0: {
                    decimals: position.pool.token0.decimals
                },
                token1: {
                    decimals: position.pool.token1.decimals
                }
            }
        };
    }

    constructor(
        requiredClients: Pick<Clients, "prisma" | "etherscanClient">,
        requiredServices: Pick<Services, "tokenService" | "poolPriceService">
    ) {
        this.prisma = requiredClients.prisma;
        this.etherscanEventService = new EtherscanEventService({
            etherscanClient: requiredClients.etherscanClient,
        });
        this.etherscanBlockInfoService = new EtherscanBlockInfoService({
            etherscanClient: requiredClients.etherscanClient,
        });
        this.tokenService = requiredServices.tokenService;
        this.poolPriceService = requiredServices.poolPriceService;
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
     * Generate inputHash for manual events
     * Format: MD5("manual-" + randomUUID())
     */
    public generateManualInputHash(): string {
        const input = `manual-${randomUUID()}`;
        return createHash("md5").update(input).digest("hex");
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
     * Sync position events from raw blockchain events to database
     * Validates chronological ordering with failsafe checks during iteration
     */
    async syncPositionEvents(
        positionInfo: PositionSyncInfo,
        rawEvents: RawPositionEvent[]
    ): Promise<PositionEvent[]> {
        if (rawEvents.length === 0) {
            return [];
        }

        // Clean slate approach: Delete all existing onchain events (preserve manual and ledgerIgnore)
        const deletedCount = await this.deletePositionEvents(positionInfo.id);
        console.log(
            `Deleted ${deletedCount} existing onchain events for clean slate sync`
        );

        // Start from zero state - no complex initial state calculation needed
        let currentState = {
            liquidityAfter: "0",
            costBasisAfter: "0",
            realizedPnLAfter: "0",
            uncollectedPrincipal0: "0",
            uncollectedPrincipal1: "0",
        };

        // Get all events (manual + new onchain) in natural blockchain order
        const allEvents = await this.getAllPositionEventsWithRaw(
            positionInfo.id,
            rawEvents
        );
        console.log(
            `Processing ${allEvents.length} total events (${
                rawEvents.length
            } new onchain + ${allEvents.length - rawEvents.length} existing)`
        );

        // Process each event in chronological order
        for (let i = 0; i < allEvents.length; i++) {
            const event = allEvents[i];

            console.log(
                `Processing event ${i + 1}/${allEvents.length}: ${
                    event.source
                } ${event.eventType} at ${event.blockNumber}:${
                    event.transactionIndex
                }:${event.logIndex}`
            );

            if (event.ledgerIgnore) {
                // Update DB but don't change ledger state
                console.log(`  → Ignored event (ledgerIgnore=true)`);

                // For existing DB events, just keep current state values
                if (event.dbEvent) {
                    await this.prisma.positionEvent.update({
                        where: { id: event.dbEvent.id },
                        data: {
                            // Keep existing calculated values unchanged
                            liquidityAfter: currentState.liquidityAfter,
                            costBasisAfter: currentState.costBasisAfter,
                            realizedPnLAfter: currentState.realizedPnLAfter,
                        },
                    });
                }

                // For new onchain events, this should never happen - throw error
                if (event.rawEvent) {
                    throw new Error(
                        `Invalid state: New onchain event cannot have ledgerIgnore=true. ` +
                            `Event: ${event.eventType} at ${event.blockNumber}:${event.transactionIndex}:${event.logIndex}`
                    );
                }
            } else {
                // Calculate token value for this event
                let tokenValueInQuote = "0";
                let poolPrice = 0n;
                let calculatedDeltaCostBasis = "0";
                let calculatedFeeValue = "0";

                if (event.rawEvent) {
                    // For new onchain events, calculate values
                    const priceData = await this.poolPriceService.getExactPoolPriceAtBlock(
                        positionInfo.pool.poolAddress,
                        positionInfo.pool.chain as any,
                        event.rawEvent.blockNumber,
                        event.rawEvent.blockTimestamp
                    );
                    poolPrice = this.calculatePoolPriceInQuoteToken(
                        priceData.sqrtPriceX96,
                        positionInfo.token0IsQuote,
                        positionInfo.pool.token0.decimals,
                        positionInfo.pool.token1.decimals
                    );
                    tokenValueInQuote = this.calculateTokenValueInQuote(
                        event.rawEvent.amount0 || "0",
                        event.rawEvent.amount1 || "0",
                        poolPrice,
                        positionInfo.token0IsQuote,
                        positionInfo.pool.token0.decimals,
                        positionInfo.pool.token1.decimals
                    ).toString();
                } else if (event.dbEvent) {
                    // For existing DB events, use stored values
                    tokenValueInQuote = event.dbEvent.tokenValueInQuote;
                }

                // Update ledger state and get deltaCostBasis from the calculation
                const stateResult = this.calculateNewState(currentState, event, tokenValueInQuote, poolPrice, positionInfo);
                const newState = stateResult.state;
                calculatedDeltaCostBasis = stateResult.deltaCostBasis || "0";
                const calculatedDeltaPnL = stateResult.deltaPnL || "0";
                calculatedFeeValue = stateResult.feeValue || "0";
                console.log(
                    `  → Processing for ledger state: L ${currentState.liquidityAfter} → ${newState.liquidityAfter}`
                );

                // Save event with calculated state
                if (event.rawEvent) {
                    // Create new onchain event in DB with pre-calculated values
                    await this.createPositionEventFromRaw(
                        event.rawEvent,
                        positionInfo,
                        newState,
                        tokenValueInQuote,
                        poolPrice,
                        calculatedDeltaCostBasis,
                        calculatedFeeValue,
                        calculatedDeltaPnL
                    );
                } else if (event.dbEvent) {
                    // Update existing manual event with new state
                    await this.prisma.positionEvent.update({
                        where: { id: event.dbEvent.id },
                        data: {
                            liquidityAfter: newState.liquidityAfter,
                            costBasisAfter: newState.costBasisAfter,
                            realizedPnLAfter: newState.realizedPnLAfter,
                            uncollectedPrincipal0: newState.uncollectedPrincipal0,
                            uncollectedPrincipal1: newState.uncollectedPrincipal1,
                        },
                    });
                }

                // Update current state for next iteration
                currentState = newState;
            }
        }

        // Currently returns empty array as stub
        return [];
    }

    /**
     * Delete position events with business logic preservation rules
     *
     * DELETES:
     * - Events with source "onchain" AND ledgerIgnore false
     *
     * PRESERVES:
     * - Events with source "manual" (user-created entries)
     * - Events with ledgerIgnore true (marked to ignore in calculations)
     *
     * Use this method for normal cleanup operations that respect user data.
     * For complete deletion, use hardResetPositionEvents() instead.
     *
     * @param positionId - ID of the position to clean up
     * @returns Number of deleted records
     */
    async deletePositionEvents(positionId: string): Promise<number> {
        const result = await this.prisma.positionEvent.deleteMany({
            where: {
                positionId,
                AND: [
                    { source: { not: "manual" } }, // Exclude manual events
                    { ledgerIgnore: false }, // Exclude ledgerIgnore events
                ],
            },
        });

        return result.count;
    }

    /**
     * Hard reset: Delete ALL position events for a position from database
     * This is a destructive operation that removes all event history.
     * Use this for complete position resyncs or cleanup operations.
     * For business-logic deletion, use deletePositionEvents() instead.
     *
     * @param positionId - ID of the position to reset
     * @returns Number of deleted records
     */
    async hardResetPositionEvents(positionId: string): Promise<number> {
        const result = await this.prisma.positionEvent.deleteMany({
            where: { positionId },
        });

        return result.count;
    }

    /**
     * Get all position events (manual + new onchain) in natural blockchain order
     * Merges existing manual events from DB with new RawPositionEvents
     */
    private async getAllPositionEventsWithRaw(
        positionId: string,
        rawEvents: RawPositionEvent[]
    ): Promise<ProcessableEvent[]> {
        // Get existing manual and ledgerIgnore events from DB
        const existingEvents = await this.prisma.positionEvent.findMany({
            where: {
                positionId,
                OR: [
                    { source: "manual" }, // Keep manual events
                    { ledgerIgnore: true }, // Keep ledgerIgnore events
                ],
            },
        });

        const processableEvents: ProcessableEvent[] = [];

        // Add existing DB events
        for (const dbEvent of existingEvents) {
            processableEvents.push({
                blockNumber: dbEvent.blockNumber,
                transactionIndex: dbEvent.transactionIndex,
                logIndex: dbEvent.logIndex,
                blockTimestamp: dbEvent.blockTimestamp,
                source: dbEvent.source as "manual" | "onchain",
                eventType: dbEvent.eventType,
                ledgerIgnore: dbEvent.ledgerIgnore,
                dbEvent,
            });
        }

        // Add new onchain events
        for (const rawEvent of rawEvents) {
            processableEvents.push({
                blockNumber: rawEvent.blockNumber,
                transactionIndex: rawEvent.transactionIndex,
                logIndex: rawEvent.logIndex,
                blockTimestamp: rawEvent.blockTimestamp,
                source: "onchain",
                eventType: rawEvent.eventType,
                ledgerIgnore: false, // New onchain events are never ignored by default
                rawEvent,
            });
        }

        // Sort by natural blockchain order
        processableEvents.sort((a, b) => {
            if (a.blockNumber !== b.blockNumber) {
                return Number(a.blockNumber - b.blockNumber);
            }
            if (a.transactionIndex !== b.transactionIndex) {
                return a.transactionIndex - b.transactionIndex;
            }
            return a.logIndex - b.logIndex;
        });

        return processableEvents;
    }

    /**
     * Create PositionEvent in database from RawPositionEvent with given state
     */
    private async createPositionEventFromRaw(
        rawEvent: RawPositionEvent,
        positionInfo: PositionSyncInfo,
        state: {
            liquidityAfter: string;
            costBasisAfter: string;
            realizedPnLAfter: string;
            uncollectedPrincipal0: string;
            uncollectedPrincipal1: string;
        },
        tokenValueInQuote: string,
        poolPrice: bigint,
        deltaCostBasis: string,
        calculatedFeeValue?: string,
        calculatedDeltaPnL?: string
    ): Promise<void> {
        const inputHash = this.generateOnchainInputHash(
            rawEvent.blockNumber,
            rawEvent.transactionIndex,
            rawEvent.logIndex
        );

        // Use calculated deltaPnL
        const deltaPnL = calculatedDeltaPnL || "0";

        await this.prisma.positionEvent.create({
            data: {
                positionId: positionInfo.id,
                ledgerIgnore: false, // New events are never ignored by default

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
                liquidityAfter: state.liquidityAfter,

                // Price information
                poolPrice: poolPrice.toString(),

                // Token amounts
                token0Amount: rawEvent.amount0 || "0",
                token1Amount: rawEvent.amount1 || "0",
                tokenValueInQuote,

                // Fees (for COLLECT events)
                feesCollected0:
                    rawEvent.eventType === "COLLECT"
                        ? rawEvent.amount0 || "0"
                        : "0",
                feesCollected1:
                    rawEvent.eventType === "COLLECT"
                        ? rawEvent.amount1 || "0"
                        : "0",
                feeValueInQuote: rawEvent.eventType === "COLLECT"
                    ? calculatedFeeValue || "0"
                    : "0",

                // Uncollected principal tracking
                uncollectedPrincipal0: state.uncollectedPrincipal0,
                uncollectedPrincipal1: state.uncollectedPrincipal1,

                // Cost basis and PnL
                deltaCostBasis,
                costBasisAfter: state.costBasisAfter,
                deltaPnL,
                realizedPnLAfter: state.realizedPnLAfter,

                // Metadata
                source: "onchain",
                createdAt: new Date(),
                inputHash,
                calcVersion: 1, // TODO: Use proper version
            },
        });
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
        event: ProcessableEvent,
        tokenValueInQuote: string
    ): {
        liquidityAfter: string;
        costBasisAfter: string;
        realizedPnLAfter: string;
        uncollectedPrincipal0: string;
        uncollectedPrincipal1: string;
    } {
        const deltaL =
            event.rawEvent?.liquidity || event.dbEvent?.deltaL || "0";
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
        event: ProcessableEvent,
        tokenValueInQuote: string
    ): {
        liquidityAfter: string;
        costBasisAfter: string;
        realizedPnLAfter: string;
        uncollectedPrincipal0: string;
        uncollectedPrincipal1: string;
    } {
        const deltaL =
            event.rawEvent?.liquidity || event.dbEvent?.deltaL || "0";
        const currentLiquidity = BigInt(currentState.liquidityAfter);
        const newLiquidityAfter = (currentLiquidity - BigInt(deltaL)).toString();

        // Calculate proportional cost basis being removed
        const currentCostBasis = BigInt(currentState.costBasisAfter);
        let deltaCostBasis = "0";
        let deltaPnL = "0";

        if (currentLiquidity > 0n) {
            // Calculate proportion of liquidity being removed
            const proportionalCostBasis = (currentCostBasis * BigInt(deltaL)) / currentLiquidity;
            deltaCostBasis = proportionalCostBasis.toString();

            // Calculate current value of tokens received
            const currentValue = BigInt(tokenValueInQuote);

            // PnL = Current Value - Proportional Cost Basis
            const realizedPnL = currentValue - proportionalCostBasis;
            deltaPnL = realizedPnL.toString();
        }

        const newCostBasisAfter = (currentCostBasis - BigInt(deltaCostBasis)).toString();
        const newRealizedPnLAfter = (
            BigInt(currentState.realizedPnLAfter) + BigInt(deltaPnL)
        ).toString();

        // DECREASE events add tokens to uncollected principal
        const token0Amount = event.rawEvent?.amount0 || event.dbEvent?.token0Amount || "0";
        const token1Amount = event.rawEvent?.amount1 || event.dbEvent?.token1Amount || "0";
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
        event: ProcessableEvent
    ): {
        liquidityAfter: string;
        costBasisAfter: string;
        realizedPnLAfter: string;
        uncollectedPrincipal0: string;
        uncollectedPrincipal1: string;
    } {
        // Get token amounts from the COLLECT event
        const collectedToken0 = BigInt(event.rawEvent?.amount0 || event.dbEvent?.token0Amount || "0");
        const collectedToken1 = BigInt(event.rawEvent?.amount1 || event.dbEvent?.token1Amount || "0");

        // Get current uncollected principal amounts
        const currentUncollectedToken0 = BigInt(currentState.uncollectedPrincipal0);
        const currentUncollectedToken1 = BigInt(currentState.uncollectedPrincipal1);

        // Separate principal collection from fee collection
        const principalToken0 = collectedToken0 <= currentUncollectedToken0 ? collectedToken0 : currentUncollectedToken0;
        const principalToken1 = collectedToken1 <= currentUncollectedToken1 ? collectedToken1 : currentUncollectedToken1;

        // Calculate new uncollected amounts (reduce by principal collected)
        const newUncollectedToken0Amount = (currentUncollectedToken0 - principalToken0).toString();
        const newUncollectedToken1Amount = (currentUncollectedToken1 - principalToken1).toString();

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
            const token1ValueInQuote = (token1Amt * poolPrice) / (10n ** BigInt(token1Decimals));
            return token0Amt + token1ValueInQuote;
        } else {
            // Quote = token1, Base = token0
            // token1Amount is already in quote units
            // Convert token0Amount to quote using price
            const token0ValueInQuote = (token0Amt * poolPrice) / (10n ** BigInt(token0Decimals));
            return token1Amt + token0ValueInQuote;
        }
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
        // Get token amounts from the COLLECT event
        const collectedToken0 = BigInt(rawEvent.amount0 || "0");
        const collectedToken1 = BigInt(rawEvent.amount1 || "0");

        // Get uncollected principal amounts BEFORE this collect event
        const uncollectedToken0 = BigInt(currentState.uncollectedPrincipal0);
        const uncollectedToken1 = BigInt(currentState.uncollectedPrincipal1);

        // Separate principal from fees
        // Principal collected = min(tokens collected, available uncollected principal)
        const principalCollectedToken0 = collectedToken0 <= uncollectedToken0 ? collectedToken0 : uncollectedToken0;
        const principalCollectedToken1 = collectedToken1 <= uncollectedToken1 ? collectedToken1 : uncollectedToken1;

        const feeToken0 = collectedToken0 - principalCollectedToken0;
        const feeToken1 = collectedToken1 - principalCollectedToken1;

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
        event: ProcessableEvent,
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
                    deltaCostBasis: tokenValueInQuote // Positive for INCREASE
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
                const originalRealizedPnL = BigInt(currentState.realizedPnLAfter);
                const newRealizedPnL = BigInt(decreaseResult.realizedPnLAfter);
                const deltaPnL = newRealizedPnL - originalRealizedPnL;

                return {
                    state: decreaseResult,
                    deltaCostBasis: deltaCostBasis.toString(),
                    deltaPnL: deltaPnL.toString()
                };

            case "COLLECT":
                // COLLECT events need special handling to separate fees from principal collection
                const collectState = this.updateStateForCollect(
                    currentState,
                    event
                );
                const feeValue = this.calculatePureFeeValue(
                    event.rawEvent!,
                    currentState,
                    poolPrice,
                    positionInfo
                );
                return {
                    state: collectState,
                    deltaCostBasis: "0", // COLLECT events don't affect cost basis
                    feeValue
                };

            default:
                console.warn(
                    `Unknown event type: ${event.eventType}, keeping state unchanged`
                );
                return {
                    state: {
                        ...currentState,
                        uncollectedPrincipal0: currentState.uncollectedPrincipal0,
                        uncollectedPrincipal1: currentState.uncollectedPrincipal1
                    },
                    deltaCostBasis: "0"
                };
        }
    }

    /**
     * Generate blockchain-like identifiers for manual PositionEvents
     * Creates blockNumber from timestamp, uses -1 for transactionIndex,
     * and sequential negative logIndex values to avoid conflicts with onchain events
     *
     * @param timestamp - Timestamp for the manual event
     * @param positionId - ID of the position
     * @param chain - Chain to get block information from
     * @returns Blockchain identifiers for chronological ordering
     * @throws Error if timestamp is too old or too new for block data
     */
    async generateManualEventBlockData(
        timestamp: Date,
        positionId: string,
        chain: SupportedChainsType
    ): Promise<{
        blockNumber: bigint;
        transactionIndex: number;
        logIndex: number;
    }> {
        // Get block number for timestamp using Etherscan API
        const blockNumber =
            await this.etherscanBlockInfoService.getBlockNumberForTimestamp(
                timestamp,
                chain,
                "before" // Get block before or at the timestamp
            );

        // Count existing manual events at the same blockNumber for this position
        const existingManualEvents = await this.prisma.positionEvent.count({
            where: {
                positionId,
                blockNumber: blockNumber,
                source: "manual",
            },
        });

        // Calculate sequential negative logIndex: -1, -2, -3, etc.
        const logIndex = -1 - existingManualEvents;

        return {
            blockNumber,
            transactionIndex: -1, // Always -1 for manual events
            logIndex,
        };
    }
}

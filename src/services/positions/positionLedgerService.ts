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
                // Update ledger state and save to DB
                const newState = this.calculateNewState(currentState, event);
                console.log(
                    `  → Processing for ledger state: L ${currentState.liquidityAfter} → ${newState.liquidityAfter}`
                );

                // Save event with calculated state
                if (event.rawEvent) {
                    // Create new onchain event in DB
                    await this.createPositionEventFromRaw(
                        event.rawEvent,
                        positionInfo,
                        newState
                    );
                } else if (event.dbEvent) {
                    // Update existing manual event with new state
                    await this.prisma.positionEvent.update({
                        where: { id: event.dbEvent.id },
                        data: {
                            liquidityAfter: newState.liquidityAfter,
                            costBasisAfter: newState.costBasisAfter,
                            realizedPnLAfter: newState.realizedPnLAfter,
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
        }
    ): Promise<void> {
        // Retrieve pool price at the event block using position info
        const priceData = await this.poolPriceService.getExactPoolPriceAtBlock(
            positionInfo.pool.poolAddress,
            positionInfo.pool.chain as any, // Cast to SupportedChainsType
            rawEvent.blockNumber,
            rawEvent.blockTimestamp
        );

        const inputHash = this.generateOnchainInputHash(
            rawEvent.blockNumber,
            rawEvent.transactionIndex,
            rawEvent.logIndex
        );

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

                // Liquidity changes (will be calculated properly later)
                deltaL: rawEvent.liquidity || "0",
                liquidityAfter: state.liquidityAfter,

                // Price information - convert sqrtPriceX96 to quote token price
                poolPrice: this.calculatePoolPriceInQuoteToken(
                    priceData.sqrtPriceX96,
                    positionInfo.token0IsQuote,
                    positionInfo.pool.token0.decimals,
                    positionInfo.pool.token1.decimals
                ).toString(),

                // Token amounts
                token0Amount: rawEvent.amount0 || "0",
                token1Amount: rawEvent.amount1 || "0",
                tokenValueInQuote: "0", // TODO: Calculate using proper token values

                // Fees (for COLLECT events)
                feesCollected0:
                    rawEvent.eventType === "COLLECT"
                        ? rawEvent.amount0 || "0"
                        : "0",
                feesCollected1:
                    rawEvent.eventType === "COLLECT"
                        ? rawEvent.amount1 || "0"
                        : "0",
                feeValueInQuote: "0", // TODO: Calculate

                // Cost basis and PnL
                deltaCostBasis: "0", // TODO: Calculate
                costBasisAfter: state.costBasisAfter,
                deltaPnL: "0", // TODO: Calculate
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
        },
        event: ProcessableEvent
    ): {
        liquidityAfter: string;
        costBasisAfter: string;
        realizedPnLAfter: string;
    } {
        const deltaL =
            event.rawEvent?.liquidity || event.dbEvent?.deltaL || "0";
        const newLiquidityAfter = (
            BigInt(currentState.liquidityAfter) + BigInt(deltaL)
        ).toString();

        // TODO: Calculate proper cost basis based on token amounts and price
        // For now, approximate as tokenValueInQuote
        const deltaCostBasis = "0"; // TODO: Implement proper calculation
        const newCostBasisAfter = (
            BigInt(currentState.costBasisAfter) + BigInt(deltaCostBasis)
        ).toString();

        // INCREASE events don't realize PnL, they add to the position
        const realizedPnLAfter = currentState.realizedPnLAfter;

        return {
            liquidityAfter: newLiquidityAfter,
            costBasisAfter: newCostBasisAfter,
            realizedPnLAfter,
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
        },
        event: ProcessableEvent
    ): {
        liquidityAfter: string;
        costBasisAfter: string;
        realizedPnLAfter: string;
    } {
        const deltaL =
            event.rawEvent?.liquidity || event.dbEvent?.deltaL || "0";
        const newLiquidityAfter = (
            BigInt(currentState.liquidityAfter) - BigInt(deltaL)
        ).toString();

        // TODO: Calculate proper PnL realization based on proportional cost basis and current value
        const deltaPnL = "0"; // TODO: Implement proper calculation
        const newRealizedPnLAfter = (
            BigInt(currentState.realizedPnLAfter) + BigInt(deltaPnL)
        ).toString();

        // TODO: Reduce cost basis proportionally to liquidity removed
        const deltaCostBasis = "0"; // TODO: Implement proper calculation
        const newCostBasisAfter = (
            BigInt(currentState.costBasisAfter) - BigInt(deltaCostBasis)
        ).toString();

        return {
            liquidityAfter: newLiquidityAfter,
            costBasisAfter: newCostBasisAfter,
            realizedPnLAfter: newRealizedPnLAfter,
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
     * Calculate new state based on event type
     * COLLECT events don't change state (fees are not part of realized PnL)
     */
    private calculateNewState(
        currentState: {
            liquidityAfter: string;
            costBasisAfter: string;
            realizedPnLAfter: string;
        },
        event: ProcessableEvent
    ): {
        liquidityAfter: string;
        costBasisAfter: string;
        realizedPnLAfter: string;
    } {
        switch (event.eventType) {
            case "INCREASE_LIQUIDITY":
                return this.updateStateForIncreaseLiquidity(
                    currentState,
                    event
                );

            case "DECREASE_LIQUIDITY":
                return this.updateStateForDecreaseLiquidity(
                    currentState,
                    event
                );

            case "COLLECT":
                // COLLECT events don't change the ledger state (fees are separate from realized PnL)
                return currentState;

            default:
                console.warn(
                    `Unknown event type: ${event.eventType}, keeping state unchanged`
                );
                return currentState;
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

/**
 * Event State Calculator Service
 *
 * Processes Uniswap V3 position events in blockchain order to calculate
 * before/after states for the stateful event ledger system.
 */

import { SupportedChainsType } from "@/config/chains";
import {
    getHistoricalPriceService,
    type ExactPriceData,
} from "./historicalPriceService";
import {
    sqrtRatioX96ToToken1PerToken0,
    sqrtRatioX96ToToken0PerToken1,
} from "@/lib/utils/uniswap-v3/price";
import JSBI from "jsbi";

// Raw event data from Etherscan/blockchain
export interface RawPositionEvent {
    eventType: "INCREASE_LIQUIDITY" | "DECREASE_LIQUIDITY" | "COLLECT";
    tokenId: string;
    transactionHash: string;
    blockNumber: bigint;
    transactionIndex: number;
    logIndex: number;
    blockTimestamp: Date;

    // Event-specific data
    liquidity?: string; // BigInt string for INCREASE/DECREASE events
    amount0?: string; // BigInt string
    amount1?: string; // BigInt string

    // COLLECT event specific
    recipient?: string;

    // Pool and token context (must be provided)
    chain: SupportedChainsType;
}

// Processed event with calculated states
export interface ProcessedPositionEvent extends RawPositionEvent {
    // Price data
    poolPrice: string; // sqrtPriceX96 as string
    poolPriceFormatted: string; // Human readable price (token1 per token0)

    // Token deltas (directional flow: positive = inflow, negative = outflow)
    token0Delta: string; // BigInt string: positive = inflow, negative = outflow
    token1Delta: string; // BigInt string: positive = inflow, negative = outflow

    // State before this event
    liquidityBefore: string; // BigInt string
    costBasisBefore: string; // BigInt string in quote token units
    realizedPnLBefore: string; // BigInt string in quote token units
    feesCollected0Before: string; // BigInt string: token0 fees before this event
    feesCollected1Before: string; // BigInt string: token1 fees before this event

    // State after this event
    liquidityAfter: string; // BigInt string
    costBasisAfter: string; // BigInt string in quote token units
    realizedPnLAfter: string; // BigInt string in quote token units
    feesCollected0After: string; // BigInt string: token0 fees after this event
    feesCollected1After: string; // BigInt string: token1 fees after this event

    // Event value calculations
    valueInQuote: string; // BigInt string: value change in quote token units
    feeValueInQuote?: string; // BigInt string: fee value for COLLECT events
}

// Position state at any point in time
export interface PositionState {
    liquidity: bigint; // Total position liquidity
    costBasis: bigint; // Total cost basis in quote token units
    realizedPnL: bigint; // Realized PnL from position changes only (INCREASE/DECREASE)
    feesCollected0: bigint; // Accumulated token0 fees collected via COLLECT events
    feesCollected1: bigint; // Accumulated token1 fees collected via COLLECT events
}

export interface PositionContext {
    chain: SupportedChainsType;
    nftId: string;
    token0IsQuote: boolean;
    pool: {
        address: string;
        token0Decimals: number;
        token1Decimals: number;
    };
}

export class EventStateCalculator {
    private historicalPriceService = getHistoricalPriceService();

    /**
     * Process a batch of raw events in blockchain order
     */
    async processEventsForPosition(
        position: PositionContext,
        events: RawPositionEvent[],
        initialState: PositionState = {
            liquidity: 0n,
            costBasis: 0n,
            realizedPnL: 0n,
            feesCollected0: 0n,
            feesCollected1: 0n,
        }
    ): Promise<ProcessedPositionEvent[]> {
        if (events.length === 0) return [];

        console.log(
            `📊 Processing ${events.length} events in blockchain order...`
        );

        const filteredEvents = [...events].filter(
            (e) => e.chain === position.chain && e.tokenId === position.nftId
        );

        // Sort events by blockchain order (critical for state accuracy)
        const sortedEvents = [...filteredEvents].sort((a, b) => {
            if (a.blockNumber !== b.blockNumber) {
                return Number(a.blockNumber - b.blockNumber);
            }
            if (a.transactionIndex !== b.transactionIndex) {
                return a.transactionIndex - b.transactionIndex;
            }
            return a.logIndex - b.logIndex;
        });

        const processedEvents: ProcessedPositionEvent[] = [];
        let currentState = { ...initialState };

        for (const event of sortedEvents) {
            console.log(
                `\n🔄 Processing ${event.eventType} at block ${event.blockNumber}...`
            );

            try {
                const processedEvent = await this.processEvent(
                    position,
                    event,
                    currentState
                );
                processedEvents.push(processedEvent);

                // Update current state for next event
                currentState = {
                    liquidity: BigInt(processedEvent.liquidityAfter),
                    costBasis: BigInt(processedEvent.costBasisAfter),
                    realizedPnL: BigInt(processedEvent.realizedPnLAfter),
                    feesCollected0: BigInt(processedEvent.feesCollected0After),
                    feesCollected1: BigInt(processedEvent.feesCollected1After),
                };

                console.log(
                    `✅ Event processed. New state: L=${currentState.liquidity}, CB=${currentState.costBasis}, PnL=${currentState.realizedPnL}`
                );
            } catch (error) {
                console.error(
                    `❌ Failed to process event ${event.eventType} at block ${event.blockNumber}:`,
                    error
                );
                throw new Error(
                    `Event processing failed: ${
                        error instanceof Error ? error.message : "Unknown error"
                    }`
                );
            }
        }

        console.log(
            `✅ All ${processedEvents.length} events processed successfully`
        );
        return processedEvents;
    }

    /**
     * Process a single event and calculate before/after states
     */
    private async processEvent(
        position: PositionContext,
        event: RawPositionEvent,
        stateBefore: PositionState
    ): Promise<ProcessedPositionEvent> {
        // Get exact pool price at the event block
        const priceData =
            await this.historicalPriceService.getExactPoolPriceAtBlock(
                position.pool.address,
                event.blockNumber,
                position.chain,
                event.blockTimestamp
            );

        // Calculate human-readable price (quote per base)
        const sqrtRatioJSBI = JSBI.BigInt(priceData.sqrtPriceX96.toString());
        const poolPriceFormatted = position.token0IsQuote
            ? sqrtRatioX96ToToken0PerToken1(
                  sqrtRatioJSBI,
                  position.pool.token1Decimals
              ).toString() // token0 per token1 (quote per base)
            : sqrtRatioX96ToToken1PerToken0(
                  sqrtRatioJSBI,
                  position.pool.token0Decimals
              ).toString(); // token1 per token0 (quote per base)

        // Calculate token deltas and state changes
        const {
            token0Delta,
            token1Delta,
            valueInQuote,
            feeValueInQuote,
            stateAfter,
        } = this.calculateEventImpact(position, event, stateBefore, priceData);

        return {
            ...event,

            // Price data
            poolPrice: priceData.sqrtPriceX96.toString(),
            poolPriceFormatted,

            // Token deltas
            token0Delta: token0Delta.toString(),
            token1Delta: token1Delta.toString(),

            // State before
            liquidityBefore: stateBefore.liquidity.toString(),
            costBasisBefore: stateBefore.costBasis.toString(),
            realizedPnLBefore: stateBefore.realizedPnL.toString(),
            feesCollected0Before: stateBefore.feesCollected0.toString(),
            feesCollected1Before: stateBefore.feesCollected1.toString(),

            // State after
            liquidityAfter: stateAfter.liquidity.toString(),
            costBasisAfter: stateAfter.costBasis.toString(),
            realizedPnLAfter: stateAfter.realizedPnL.toString(),
            feesCollected0After: stateAfter.feesCollected0.toString(),
            feesCollected1After: stateAfter.feesCollected1.toString(),

            // Event values
            valueInQuote: valueInQuote.toString(),
            ...(feeValueInQuote !== undefined && {
                feeValueInQuote: feeValueInQuote.toString(),
            }),
        };
    }

    /**
     * Calculate the impact of an event on position state
     */
    private calculateEventImpact(
        position: PositionContext,
        event: RawPositionEvent,
        stateBefore: PositionState,
        priceData: ExactPriceData
    ): {
        token0Delta: bigint;
        token1Delta: bigint;
        valueInQuote: bigint;
        feeValueInQuote?: bigint;
        stateAfter: PositionState;
    } {
        const price = priceData.sqrtPriceX96;

        switch (event.eventType) {
            case "INCREASE_LIQUIDITY": {
                const amount0 = BigInt(event.amount0 || "0");
                const amount1 = BigInt(event.amount1 || "0");
                const liquidityDelta = BigInt(event.liquidity || "0");

                // Token deltas (positive = inflow)
                const token0Delta = amount0;
                const token1Delta = amount1;

                // Calculate value in quote token
                const valueInQuote = this.calculateValueInQuote(
                    token0Delta,
                    token1Delta,
                    price,
                    position.token0IsQuote,
                    position.pool.token0Decimals,
                    position.pool.token1Decimals
                );

                // Update state (cost basis increases with investment)
                const stateAfter: PositionState = {
                    liquidity: stateBefore.liquidity + liquidityDelta,
                    costBasis: stateBefore.costBasis + valueInQuote,
                    realizedPnL: stateBefore.realizedPnL, // No realized PnL change on increase
                    feesCollected0: stateBefore.feesCollected0, // Fees unchanged
                    feesCollected1: stateBefore.feesCollected1, // Fees unchanged
                };

                return { token0Delta, token1Delta, valueInQuote, stateAfter };
            }

            case "DECREASE_LIQUIDITY": {
                const amount0 = BigInt(event.amount0 || "0");
                const amount1 = BigInt(event.amount1 || "0");
                const liquidityDelta = BigInt(event.liquidity || "0");

                // Token deltas (negative = outflow)
                const token0Delta = -amount0;
                const token1Delta = -amount1;

                // Calculate current value of withdrawn tokens
                const currentValue = this.calculateValueInQuote(
                    amount0,
                    amount1,
                    price,
                    position.token0IsQuote,
                    position.pool.token0Decimals,
                    position.pool.token1Decimals
                );

                // Calculate proportional cost basis being removed
                const liquidityRatio =
                    Number(liquidityDelta) / Number(stateBefore.liquidity);
                const costBasisRemoved = BigInt(
                    Math.floor(Number(stateBefore.costBasis) * liquidityRatio)
                );

                // Realized PnL = current value - original cost basis
                const realizedPnL = currentValue - costBasisRemoved;

                // Update state
                const stateAfter: PositionState = {
                    liquidity: stateBefore.liquidity - liquidityDelta,
                    costBasis: stateBefore.costBasis - costBasisRemoved,
                    realizedPnL: stateBefore.realizedPnL + realizedPnL,
                    feesCollected0: stateBefore.feesCollected0, // Fees unchanged
                    feesCollected1: stateBefore.feesCollected1, // Fees unchanged
                };

                // Value change is negative (outflow)
                const valueInQuote = -currentValue;

                return { token0Delta, token1Delta, valueInQuote, stateAfter };
            }

            case "COLLECT": {
                const amount0 = BigInt(event.amount0 || "0");
                const amount1 = BigInt(event.amount1 || "0");

                // Token deltas (POSITIVE = fee collection, not outflow from position)
                const token0Delta = amount0;
                const token1Delta = amount1;

                // Calculate fee value in quote token
                const feeValueInQuote = this.calculateValueInQuote(
                    amount0,
                    amount1,
                    price,
                    position.token0IsQuote,
                    position.pool.token0Decimals,
                    position.pool.token1Decimals
                );

                // COLLECT events don't change position liquidity, cost basis, or realized PnL
                // They only increase the accumulated fees
                const stateAfter: PositionState = {
                    liquidity: stateBefore.liquidity,                          // Unchanged
                    costBasis: stateBefore.costBasis,                         // Unchanged
                    realizedPnL: stateBefore.realizedPnL,                     // Unchanged (fees separate from PnL)
                    feesCollected0: stateBefore.feesCollected0 + amount0,     // Add token0 fees
                    feesCollected1: stateBefore.feesCollected1 + amount1,     // Add token1 fees
                };

                // Position value unchanged (fees are separate profit stream)
                const valueInQuote = 0n;

                return {
                    token0Delta,
                    token1Delta,
                    valueInQuote,
                    feeValueInQuote,
                    stateAfter,
                };
            }

            default:
                throw new Error(
                    `Unsupported event type: ${(event as any).eventType}`
                );
        }
    }

    /**
     * Calculate value in quote token units using exact pool price
     */
    private calculateValueInQuote(
        token0Amount: bigint,
        token1Amount: bigint,
        sqrtPriceX96: bigint,
        token0IsQuote: boolean,
        token0Decimals: number,
        token1Decimals: number
    ): bigint {
        if (token0IsQuote) {
            // Quote token is token0: value = token0Amount + (token1Amount * price) / token1Decimals
            // Convert token1 to token0 using price
            const token1ValueInToken0 =
                (token1Amount * sqrtPriceX96 * sqrtPriceX96) /
                2n ** 192n /
                10n ** BigInt(token1Decimals - token0Decimals);
            return token0Amount + token1ValueInToken0;
        } else {
            // Quote token is token1: value = (token0Amount * price) / token0Decimals + token1Amount
            // Convert token0 to token1 using price
            const token0ValueInToken1 =
                (token0Amount * sqrtPriceX96 * sqrtPriceX96) /
                2n ** 192n /
                10n ** BigInt(token0Decimals - token1Decimals);
            return token0ValueInToken1 + token1Amount;
        }
    }

    /**
     * Get initial state for a position (all zeros for new positions)
     */
    getInitialState(): PositionState {
        return {
            liquidity: 0n,
            costBasis: 0n,
            realizedPnL: 0n,
            feesCollected0: 0n,
            feesCollected1: 0n,
        };
    }

    /**
     * Validate event ordering (useful for debugging)
     */
    validateEventOrdering(events: RawPositionEvent[]): boolean {
        for (let i = 1; i < events.length; i++) {
            const prev = events[i - 1];
            const curr = events[i];

            // Check if current event comes after previous
            if (
                curr.blockNumber < prev.blockNumber ||
                (curr.blockNumber === prev.blockNumber &&
                    curr.transactionIndex < prev.transactionIndex) ||
                (curr.blockNumber === prev.blockNumber &&
                    curr.transactionIndex === prev.transactionIndex &&
                    curr.logIndex <= prev.logIndex)
            ) {
                console.warn(`❌ Event ordering violation at index ${i}:`, {
                    prev: {
                        block: prev.blockNumber,
                        tx: prev.transactionIndex,
                        log: prev.logIndex,
                    },
                    curr: {
                        block: curr.blockNumber,
                        tx: curr.transactionIndex,
                        log: curr.logIndex,
                    },
                });
                return false;
            }
        }

        console.log(
            `✅ Event ordering validated: ${events.length} events in correct blockchain order`
        );
        return true;
    }
}

// Singleton instance
let eventStateCalculatorInstance: EventStateCalculator | null = null;

export function getEventStateCalculator(): EventStateCalculator {
    if (!eventStateCalculatorInstance) {
        eventStateCalculatorInstance = new EventStateCalculator();
    }
    return eventStateCalculatorInstance;
}

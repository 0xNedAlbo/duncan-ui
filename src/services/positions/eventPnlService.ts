import { prisma } from '@/lib/prisma';
import { calculatePositionValue } from '@/lib/utils/uniswap-v3/liquidity';
import { tickToPrice } from '@/lib/utils/uniswap-v3/price';

export interface EventBasedPnL {
    // Investment flows (BigInt strings in quote token smallest unit)
    totalInvested: string;        // Sum of CREATE/INCREASE valueInQuote
    totalWithdrawn: string;       // Sum of DECREASE/CLOSE valueInQuote
    netInvestment: string;        // invested - withdrawn

    // Fee components (BigInt strings in quote token smallest unit)
    totalFeesCollected: string;   // Sum of COLLECT feeValueInQuote
    unclaimedFees: string;        // Current unclaimed fees from contract
    totalFeeIncome: string;       // collected + unclaimed

    // PnL breakdown (BigInt strings in quote token smallest unit)
    realizedPnL: string;          // withdrawn + fees - proportional cost
    unrealizedPnL: string;        // current value - remaining cost basis
    totalPnL: string;             // realized + unrealized

    // Performance metrics (percentages)
    roi: number;                  // Total return percentage
    realizedRoi: number;          // Realized return percentage

    // Position state
    currentValue: string;         // Current position value
    costBasis: string;           // Remaining cost basis

    // Event metadata
    eventCount: number;
    firstEventDate?: Date;
    lastEventDate?: Date;
    confidence: 'exact' | 'estimated';
    method: 'event-based';
}

export interface PositionCostBasis {
    totalInvested: string;
    totalWithdrawn: string;
    remainingCostBasis: string;
    averageEntryPrice: string;
    confidence: 'exact' | 'estimated';
}

export class EventPnlService {

    /**
     * Calculate comprehensive PnL from position event ledger
     */
    async calculateEventBasedPnL(positionId: string): Promise<EventBasedPnL> {
        // Fetch all events for the position
        const events = await this.getEventHistory(positionId);
        
        if (events.length === 0) {
            throw new Error(`No events found for position ${positionId}`);
        }

        // Calculate investment flows
        const investmentFlows = this.calculateInvestmentFlows(events);
        
        // Calculate fee income
        const feeIncome = await this.calculateFeeIncome(positionId, events);
        
        // Get current position value
        const currentValue = await this.getCurrentPositionValue(positionId);
        
        // Calculate cost basis
        const costBasis = this.calculateCostBasis(investmentFlows, currentValue);
        
        // Calculate PnL components
        const pnl = this.calculatePnLComponents(
            investmentFlows,
            feeIncome,
            currentValue,
            costBasis
        );

        // Calculate performance metrics
        const performance = this.calculatePerformanceMetrics(
            investmentFlows,
            feeIncome,
            pnl
        );

        // Determine confidence level
        const confidence = this.determineConfidence(events);

        // Event metadata
        const eventDates = events.map(e => e.timestamp).sort((a, b) => a.getTime() - b.getTime());

        return {
            // Investment flows
            totalInvested: investmentFlows.invested.toString(),
            totalWithdrawn: investmentFlows.withdrawn.toString(),
            netInvestment: (investmentFlows.invested - investmentFlows.withdrawn).toString(),

            // Fee components
            totalFeesCollected: feeIncome.collected.toString(),
            unclaimedFees: feeIncome.unclaimed.toString(),
            totalFeeIncome: (feeIncome.collected + feeIncome.unclaimed).toString(),

            // PnL breakdown
            realizedPnL: pnl.realized.toString(),
            unrealizedPnL: pnl.unrealized.toString(),
            totalPnL: (pnl.realized + pnl.unrealized).toString(),

            // Performance
            roi: performance.roi,
            realizedRoi: performance.realizedRoi,

            // Position state
            currentValue: currentValue.toString(),
            costBasis: costBasis.toString(),

            // Metadata
            eventCount: events.length,
            firstEventDate: eventDates[0],
            lastEventDate: eventDates[eventDates.length - 1],
            confidence,
            method: 'event-based'
        };
    }

    /**
     * Get cost basis for position based on events
     */
    async getPositionCostBasis(positionId: string): Promise<PositionCostBasis> {
        const events = await this.getEventHistory(positionId);
        const investmentFlows = this.calculateInvestmentFlows(events);
        const currentValue = await this.getCurrentPositionValue(positionId);
        const costBasis = this.calculateCostBasis(investmentFlows, currentValue);
        const confidence = this.determineConfidence(events);

        // Calculate average entry price (weighted by investment amounts)
        const totalTokens = investmentFlows.invested - investmentFlows.withdrawn + currentValue;
        const averageEntryPrice = totalTokens > 0n 
            ? (investmentFlows.invested * (10n ** 18n)) / totalTokens 
            : 0n;

        return {
            totalInvested: investmentFlows.invested.toString(),
            totalWithdrawn: investmentFlows.withdrawn.toString(),
            remainingCostBasis: costBasis.toString(),
            averageEntryPrice: averageEntryPrice.toString(),
            confidence
        };
    }

    /**
     * Get all events for a position, ordered by timestamp
     */
    async getEventHistory(positionId: string): Promise<any[]> {
        const events = await prisma.positionEvent.findMany({
            where: { positionId },
            orderBy: { timestamp: 'asc' }
        });

        return events;
    }

    /**
     * Calculate investment flows from events
     */
    private calculateInvestmentFlows(events: any[]): {
        invested: bigint;
        withdrawn: bigint;
    } {
        let invested = 0n;
        let withdrawn = 0n;

        for (const event of events) {
            const valueInQuote = BigInt(event.valueInQuote);

            if (['CREATE', 'INCREASE'].includes(event.eventType)) {
                invested += valueInQuote;
            } else if (['DECREASE', 'CLOSE'].includes(event.eventType)) {
                withdrawn += valueInQuote; // Note: valueInQuote for withdrawals is positive
            }
            // COLLECT events don't affect investment flows, only fee income
        }

        return { invested, withdrawn };
    }

    /**
     * Calculate total fee income (collected + unclaimed)
     */
    private async calculateFeeIncome(positionId: string, events: any[]): Promise<{
        collected: bigint;
        unclaimed: bigint;
    }> {
        // Sum collected fees from COLLECT events
        let collected = 0n;
        for (const event of events) {
            if (event.eventType === 'COLLECT' && event.feeValueInQuote) {
                collected += BigInt(event.feeValueInQuote);
            }
        }

        // Get unclaimed fees from current position state
        const unclaimed = await this.getUnclaimedFees(positionId);

        return { collected, unclaimed };
    }

    /**
     * Get current unclaimed fees for position
     */
    private async getUnclaimedFees(positionId: string): Promise<bigint> {
        try {
            // This would typically fetch from the NFT position contract
            // For now, return 0 as placeholder - would integrate with NFT position service
            // TODO: Integrate with existing NFT position fetching logic
            const position = await prisma.position.findUnique({
                where: { id: positionId },
                select: { nftId: true, pool: true }
            });

            if (!position?.nftId) {
                return 0n;
            }

            // Placeholder for actual unclaimed fee calculation
            // This would use the NFT position manager contract to get tokensOwed0 and tokensOwed1
            // Then convert to quote token value using current price
            
            return 0n;
        } catch (error) {
            console.warn(`Failed to get unclaimed fees for position ${positionId}:`, error.message);
            return 0n;
        }
    }

    /**
     * Get current position value
     */
    private async getCurrentPositionValue(positionId: string): Promise<bigint> {
        try {
            const position = await prisma.position.findUnique({
                where: { id: positionId },
                include: {
                    pool: {
                        include: {
                            token0Ref: {
                                include: {
                                    globalToken: true,
                                    userToken: true,
                                }
                            },
                            token1Ref: {
                                include: {
                                    globalToken: true,
                                    userToken: true,
                                }
                            }
                        }
                    }
                }
            });

            if (!position) {
                throw new Error(`Position ${positionId} not found`);
            }

            // Use existing position value calculation logic
            // This is similar to what's in positionService.ts
            const liquidity = BigInt(position.liquidity);
            const { tickLower, tickUpper } = position;
            const pool = position.pool;

            if (!pool.currentTick && !pool.currentPrice) {
                throw new Error(`Pool ${pool.poolAddress} has no current price data`);
            }

            const token0Data = position.pool.token0Ref.globalToken || position.pool.token0Ref.userToken;
            const token1Data = position.pool.token1Ref.globalToken || position.pool.token1Ref.userToken;

            const token0Address = token0Data.address;
            const token1Address = token1Data.address;
            const baseTokenDecimals = position.token0IsQuote ? token1Data.decimals : token0Data.decimals;

            // Current tick and price
            let currentTick: number;
            let currentPrice: bigint;

            if (pool.currentTick !== null) {
                currentTick = pool.currentTick;
                const baseTokenAddress = position.token0IsQuote ? token1Address : token0Address;
                const quoteTokenAddress = position.token0IsQuote ? token0Address : token1Address;
                
                currentPrice = tickToPrice(
                    currentTick,
                    baseTokenAddress,
                    quoteTokenAddress,
                    baseTokenDecimals
                );
            } else if (pool.currentPrice) {
                // pool.currentPrice is already a BigInt string in the correct format
                currentPrice = BigInt(pool.currentPrice);
                // Would need to calculate tick from price - for now use 0
                currentTick = 0;
            } else {
                throw new Error("No price data available");
            }

            const baseIsToken0 = position.token0IsQuote ? false : true;

            // Calculate position value
            const positionValue = calculatePositionValue(
                liquidity,
                currentTick,
                tickLower,
                tickUpper,
                currentPrice,
                baseIsToken0,
                baseTokenDecimals
            );

            return positionValue;
        } catch (error) {
            console.error(`Error calculating current position value:`, error);
            return 0n;
        }
    }

    /**
     * Calculate remaining cost basis after partial withdrawals
     */
    private calculateCostBasis(
        investmentFlows: { invested: bigint; withdrawn: bigint },
        currentValue: bigint
    ): bigint {
        const { invested, withdrawn } = investmentFlows;
        
        if (invested === 0n) {
            return 0n;
        }

        if (withdrawn === 0n) {
            // No withdrawals, cost basis is full investment
            return invested;
        }

        // Proportional cost basis calculation
        // If position was worth X when Y was withdrawn, 
        // then cost basis of withdrawn amount was: (invested * Y) / X
        // Remaining cost basis = invested - withdrawn_cost_basis

        const totalValue = withdrawn + currentValue;
        if (totalValue === 0n) {
            return 0n;
        }

        // Cost basis of withdrawn amount (proportional to value at withdrawal)
        const withdrawnCostBasis = (invested * withdrawn) / totalValue;
        
        // Remaining cost basis
        const remainingCostBasis = invested - withdrawnCostBasis;
        
        return remainingCostBasis;
    }

    /**
     * Calculate PnL components
     */
    private calculatePnLComponents(
        investmentFlows: { invested: bigint; withdrawn: bigint },
        feeIncome: { collected: bigint; unclaimed: bigint },
        currentValue: bigint,
        costBasis: bigint
    ): {
        realized: bigint;
        unrealized: bigint;
    } {
        const { invested, withdrawn } = investmentFlows;
        const { collected, unclaimed } = feeIncome;

        // Realized PnL = what we got out - what we put in (proportional)
        let realizedPnL = 0n;
        if (withdrawn > 0n && invested > 0n) {
            const totalValue = withdrawn + currentValue;
            const withdrawnCostBasis = totalValue > 0n ? (invested * withdrawn) / totalValue : invested;
            realizedPnL = withdrawn - withdrawnCostBasis;
        }

        // Add collected fees to realized PnL
        realizedPnL += collected;

        // Unrealized PnL = current value - remaining cost basis + unclaimed fees
        const unrealizedPnL = currentValue - costBasis + unclaimed;

        return {
            realized: realizedPnL,
            unrealized: unrealizedPnL
        };
    }

    /**
     * Calculate performance metrics
     */
    private calculatePerformanceMetrics(
        investmentFlows: { invested: bigint; withdrawn: bigint },
        feeIncome: { collected: bigint; unclaimed: bigint },
        pnl: { realized: bigint; unrealized: bigint }
    ): {
        roi: number;
        realizedRoi: number;
    } {
        const { invested } = investmentFlows;
        const { realized, unrealized } = pnl;

        if (invested === 0n) {
            return { roi: 0, realizedRoi: 0 };
        }

        // Total ROI = (total PnL / invested) * 100
        const totalPnL = realized + unrealized;
        const roi = Number((totalPnL * 10000n) / invested) / 100; // 2 decimal precision

        // Realized ROI = (realized PnL / invested) * 100
        const realizedRoi = Number((realized * 10000n) / invested) / 100;

        return { roi, realizedRoi };
    }

    /**
     * Determine confidence level based on event data quality
     */
    private determineConfidence(events: any[]): 'exact' | 'estimated' {
        // If any event has estimated confidence, overall confidence is estimated
        const hasEstimated = events.some(event => event.confidence === 'estimated');
        return hasEstimated ? 'estimated' : 'exact';
    }

    /**
     * Get summary statistics for position events
     */
    async getEventSummary(positionId: string): Promise<{
        totalEvents: number;
        eventBreakdown: Record<string, number>;
        oldestEvent?: Date;
        newestEvent?: Date;
        totalValueFlow: string;
        totalFeesCollected: string;
    }> {
        const events = await this.getEventHistory(positionId);
        
        const eventBreakdown: Record<string, number> = {};
        let totalValueFlow = 0n;
        let totalFeesCollected = 0n;
        
        events.forEach(event => {
            eventBreakdown[event.eventType] = (eventBreakdown[event.eventType] || 0) + 1;
            totalValueFlow += BigInt(event.valueInQuote);
            
            if (event.feeValueInQuote) {
                totalFeesCollected += BigInt(event.feeValueInQuote);
            }
        });

        const timestamps = events.map(e => e.timestamp).sort((a, b) => a.getTime() - b.getTime());

        return {
            totalEvents: events.length,
            eventBreakdown,
            oldestEvent: timestamps[0],
            newestEvent: timestamps[timestamps.length - 1],
            totalValueFlow: totalValueFlow.toString(),
            totalFeesCollected: totalFeesCollected.toString()
        };
    }

    /**
     * Validate event-based PnL calculation
     */
    async validateEventPnL(positionId: string): Promise<{
        isValid: boolean;
        issues: string[];
        eventCount: number;
    }> {
        const issues: string[] = [];
        let isValid = true;

        try {
            const events = await this.getEventHistory(positionId);
            
            if (events.length === 0) {
                issues.push('No events found for position');
                isValid = false;
            }

            // Check for missing CREATE event
            const hasCreateEvent = events.some(e => e.eventType === 'CREATE');
            if (!hasCreateEvent) {
                issues.push('Missing CREATE event - first INCREASE event should be marked as CREATE');
            }

            // Check for negative liquidity (shouldn't happen)
            let runningLiquidity = 0n;
            for (const event of events) {
                runningLiquidity += BigInt(event.liquidityDelta);
                if (runningLiquidity < 0n) {
                    issues.push(`Negative liquidity detected at event ${event.id}`);
                    isValid = false;
                }
            }

            // Check for events with zero value (suspicious)
            const zeroValueEvents = events.filter(e => e.valueInQuote === '0' && e.eventType !== 'COLLECT');
            if (zeroValueEvents.length > 0) {
                issues.push(`${zeroValueEvents.length} events have zero value`);
            }

            // Check for missing price data
            const missingPriceEvents = events.filter(e => e.poolPrice === '0');
            if (missingPriceEvents.length > 0) {
                issues.push(`${missingPriceEvents.length} events have missing price data`);
            }

            return {
                isValid,
                issues,
                eventCount: events.length
            };
        } catch (error) {
            return {
                isValid: false,
                issues: [`Validation error: ${error.message}`],
                eventCount: 0
            };
        }
    }
}

// Singleton instance
let eventPnlServiceInstance: EventPnlService | null = null;

export function getEventPnlService(): EventPnlService {
    if (!eventPnlServiceInstance) {
        eventPnlServiceInstance = new EventPnlService();
    }
    return eventPnlServiceInstance;
}
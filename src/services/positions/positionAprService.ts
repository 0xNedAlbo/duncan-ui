/**
 * Position APR Service
 *
 * Calculates "actual" or "realized" APR for Uniswap V3 positions based on
 * time-weighted cost basis and proportional fee distribution across capital periods.
 *
 * Algorithm:
 * 1. Create periods from INCREASE/DECREASE events using costBasisAfter
 * 2. Distribute fees from COLLECT events proportionally across periods
 * 3. Calculate APR for each period: (allocated_fees / cost_basis) / (days / 365) * 100
 * 4. Return time-weighted total APR
 */

import { PrismaClient, type PositionEvent, type PositionEventApr } from "@prisma/client";
import { createServiceLogger, type ServiceLogger } from "@/lib/logging/loggerFactory";
import type { PositionId } from "./positionService";

export interface AprCalculationResult {
    positionChain: string;
    positionProtocol: string;
    positionNftId: string;
    totalApr: number;
    timeWeightedCostBasis: string;
    totalFeesCollected: string;
    totalActiveDays: number;
    calculatedAt: Date;
    periods: PositionEventApr[];
}

export interface AprBreakdown {
    positionChain: string;
    positionProtocol: string;
    positionNftId: string;

    // Realized metrics
    realizedApr: number;              // APR from collected fees only
    realizedFeesCollected: string;    // Collected fees (BigInt as string)
    realizedTWCostBasis: string;      // Time-weighted cost basis for realized periods (BigInt as string)
    realizedActiveDays: number;       // Days covered by realized periods

    // Unrealized metrics
    unrealizedApr: number;            // APR from unclaimed fees only
    unrealizedFeesUnclaimed: string;  // Current unclaimed fees (BigInt as string)
    unrealizedCostBasis: string;      // Current period cost basis (BigInt as string)
    unrealizedActiveDays: number;     // Days since last collect/start

    // Total metrics (calculated from realized + unrealized components)
    totalApr: number;                 // Time-weighted average: (realizedApr * realizedActiveDays + unrealizedApr * unrealizedActiveDays) / totalActiveDays
    totalActiveDays: number;          // realizedActiveDays + unrealizedActiveDays (0 for closed positions)
    totalTWCostBasis: string;         // Time-weighted average of realized + unrealized cost basis

    calculatedAt: Date;
}

export interface CapitalPeriod {
    eventId: string;
    startDate: Date;
    endDate: Date | null;
    durationDays: number | null;
    costBasis: string;
    weight: number; // durationDays * costBasis (for fee distribution)
}

export class PositionAprService {
    private prisma: PrismaClient;
    private logger: ServiceLogger;

    constructor(requiredClients: Pick<PrismaClient, 'positionEvent' | 'positionEventApr'>) {
        this.prisma = requiredClients as PrismaClient;
        this.logger = createServiceLogger('PositionAprService');
    }

    /**
     * Calculate APR for a position
     * Creates/updates PositionEventApr records and returns aggregated results
     */
    async calculatePositionApr(
        positionId: PositionId
    ): Promise<AprCalculationResult> {
        this.logger.debug({
            positionChain: positionId.chain,
            positionProtocol: positionId.protocol,
            positionNftId: positionId.nftId,
            positionUserId: positionId.userId
        }, 'Starting APR calculation');

        // Get all position events in chronological order
        const events = await this.prisma.positionEvent.findMany({
            where: {
                positionUserId: positionId.userId,
                positionChain: positionId.chain,
                positionProtocol: positionId.protocol,
                positionNftId: positionId.nftId,
            },
            orderBy: [
                { blockNumber: 'asc' },
                { transactionIndex: 'asc' },
                { logIndex: 'asc' },
            ],
        });

        if (events.length === 0) {
            throw new Error(`No events found for position ${positionId.userId}-${positionId.chain}-${positionId.protocol}-${positionId.nftId}`);
        }

        // Create or update APR periods for all events
        await this.createEventPeriods(events);

        // Distribute fees from COLLECT events
        await this.distributeFees(positionId);

        // Calculate period APRs
        await this.calculatePeriodAprs(positionId);

        // Get final results and calculate totals
        const aprPeriods = await this.prisma.positionEventApr.findMany({
            where: {
                event: {
                    positionUserId: positionId.userId,
                    positionChain: positionId.chain,
                    positionProtocol: positionId.protocol,
                    positionNftId: positionId.nftId,
                },
                isValid: true
            },
            include: { event: true },
            orderBy: { periodStartDate: 'asc' },
        });

        const result = this.aggregateAprResults(positionId, aprPeriods);

        this.logger.debug({
            positionChain: positionId.chain,
            positionProtocol: positionId.protocol,
            positionNftId: positionId.nftId,
            totalApr: result.totalApr,
            periodsCount: result.periods.length
        }, 'APR calculation completed');

        return result;
    }

    /**
     * Create PositionEventApr records for all events
     * Each event defines a period from its timestamp to the next event
     */
    private async createEventPeriods(events: PositionEvent[]): Promise<void> {
        for (let i = 0; i < events.length; i++) {
            const currentEvent = events[i];
            const nextEvent = events[i + 1] || null;

            const periodEndDate = nextEvent?.blockTimestamp || null;
            const periodDays = periodEndDate
                ? (periodEndDate.getTime() - currentEvent.blockTimestamp.getTime()) / (1000 * 60 * 60 * 24)
                : null;

            // Create or update APR record
            await this.prisma.positionEventApr.upsert({
                where: { eventId: currentEvent.id },
                update: {
                    periodStartDate: currentEvent.blockTimestamp,
                    periodEndDate,
                    periodDays,
                    periodCostBasis: currentEvent.costBasisAfter,
                    // Reset calculation fields - will be recalculated
                    allocatedFees: "0",
                    periodApr: 0,
                    isValid: true,
                    updatedAt: new Date(),
                },
                create: {
                    eventId: currentEvent.id,
                    periodStartDate: currentEvent.blockTimestamp,
                    periodEndDate,
                    periodDays,
                    periodCostBasis: currentEvent.costBasisAfter,
                    allocatedFees: "0",
                    periodApr: 0,
                    isValid: true,
                },
            });
        }
    }

    /**
     * Distribute fees from COLLECT events across preceding capital periods
     */
    private async distributeFees(
        positionId: PositionId
    ): Promise<void> {
        // Get all COLLECT events with fees
        const collectEvents = await this.prisma.positionEvent.findMany({
            where: {
                positionUserId: positionId.userId,
                positionChain: positionId.chain,
                positionProtocol: positionId.protocol,
                positionNftId: positionId.nftId,
                eventType: 'COLLECT',
                feeValueInQuote: { not: '0' }
            },
            orderBy: [
                { blockNumber: 'asc' },
                { transactionIndex: 'asc' },
                { logIndex: 'asc' },
            ],
        });

        for (const collectEvent of collectEvents) {
            await this.distributeSingleCollectEvent(collectEvent);
        }
    }

    /**
     * Distribute fees from a single COLLECT event
     */
    private async distributeSingleCollectEvent(collectEvent: PositionEvent): Promise<void> {
        const totalFees = BigInt(collectEvent.feeValueInQuote);

        if (totalFees === BigInt(0)) {
            return; // No fees to distribute
        }

        // Get all periods that existed before this collect event
        const eligiblePeriods = await this.prisma.positionEventApr.findMany({
            where: {
                event: {
                    positionChain: collectEvent.positionChain,
                    positionProtocol: collectEvent.positionProtocol,
                    positionNftId: collectEvent.positionNftId,
                },
                periodStartDate: { lt: collectEvent.blockTimestamp },
                periodDays: { not: null }, // Exclude open periods
                periodCostBasis: { not: '0' }, // Exclude zero cost basis periods
                isValid: true,
            },
            include: { event: true },
        });

        if (eligiblePeriods.length === 0) {
            this.logger.debug({
                collectEventId: collectEvent.id,
                collectDate: collectEvent.blockTimestamp
            }, 'No eligible periods for fee distribution');
            return;
        }

        // Calculate total weight for proportional distribution
        let totalWeight = 0;
        const periodWeights: { period: typeof eligiblePeriods[0]; weight: number }[] = [];

        for (const period of eligiblePeriods) {
            const costBasis = BigInt(period.periodCostBasis);
            const days = period.periodDays!; // We filtered out null values
            const weight = Number(costBasis) * days; // Convert BigInt to number for weight calculation

            periodWeights.push({ period, weight });
            totalWeight += weight;
        }

        if (totalWeight === 0) {
            return; // No weight to distribute against
        }

        // Distribute fees proportionally
        for (const { period, weight } of periodWeights) {
            const proportion = weight / totalWeight;
            const allocatedFees = BigInt(Math.floor(Number(totalFees) * proportion));

            // Add to existing allocated fees
            const currentAllocated = BigInt(period.allocatedFees);
            const newAllocated = currentAllocated + allocatedFees;

            await this.prisma.positionEventApr.update({
                where: { id: period.id },
                data: {
                    allocatedFees: newAllocated.toString(),
                    updatedAt: new Date(),
                },
            });
        }
    }

    /**
     * Calculate APR for each period based on allocated fees
     */
    private async calculatePeriodAprs(
        positionId: PositionId
    ): Promise<void> {
        const periods = await this.prisma.positionEventApr.findMany({
            where: {
                event: {
                    positionUserId: positionId.userId,
                    positionChain: positionId.chain,
                    positionProtocol: positionId.protocol,
                    positionNftId: positionId.nftId,
                },
                periodDays: { not: null },
                periodCostBasis: { not: '0' },
                isValid: true,
            },
        });

        for (const period of periods) {
            const allocatedFees = BigInt(period.allocatedFees);
            const costBasis = BigInt(period.periodCostBasis);
            const days = period.periodDays!;

            let periodApr = 0;

            // Only calculate APR if we have valid cost basis and days
            if (costBasis > BigInt(0) && days > 0) {
                if (allocatedFees > BigInt(0)) {
                    // Calculate APR: (allocated_fees / cost_basis) / (days / 365) * 100
                    const feeRatio = Number(allocatedFees) / Number(costBasis);
                    const annualizedRatio = feeRatio / (days / 365);
                    periodApr = annualizedRatio * 100;
                }
                // If allocatedFees is 0, periodApr stays 0 (not null)
            }

            await this.prisma.positionEventApr.update({
                where: { id: period.id },
                data: {
                    periodApr: periodApr,
                    updatedAt: new Date(),
                },
            });
        }
    }

    /**
     * Aggregate APR results from all periods
     */
    private aggregateAprResults(
        positionId: PositionId,
        aprPeriods: (PositionEventApr & { event: PositionEvent })[]
    ): AprCalculationResult {
        // Filter only closed periods with valid APR calculations
        const activePeriods = aprPeriods.filter(p =>
            p.periodDays !== null &&
            p.periodDays > 0 &&
            BigInt(p.periodCostBasis) > BigInt(0)
        );

        if (activePeriods.length === 0) {
            return {
                positionChain: positionId.chain,
                positionProtocol: positionId.protocol,
                positionNftId: positionId.nftId,
                totalApr: 0,
                timeWeightedCostBasis: '0',
                totalFeesCollected: '0',
                totalActiveDays: 0,
                calculatedAt: new Date(),
                periods: aprPeriods,
            };
        }

        // Calculate time-weighted average cost basis and total metrics
        let totalWeightedCostBasis = 0;
        let totalDays = 0;
        let totalFeesCollected = BigInt(0);

        for (const period of activePeriods) {
            const costBasis = Number(BigInt(period.periodCostBasis));
            const days = period.periodDays!;
            const fees = BigInt(period.allocatedFees);

            totalWeightedCostBasis += costBasis * days;
            totalDays += days;
            totalFeesCollected += fees;
        }

        const timeWeightedCostBasis = totalDays > 0
            ? BigInt(Math.floor(totalWeightedCostBasis / totalDays))
            : BigInt(0);

        // Calculate total APR using time-weighted average
        const totalApr = timeWeightedCostBasis > BigInt(0) && totalDays > 0
            ? (Number(totalFeesCollected) / Number(timeWeightedCostBasis)) / (totalDays / 365) * 100
            : 0;

        return {
            positionChain: positionId.chain,
            positionProtocol: positionId.protocol,
            positionNftId: positionId.nftId,
            totalApr,
            timeWeightedCostBasis: timeWeightedCostBasis.toString(),
            totalFeesCollected: totalFeesCollected.toString(),
            totalActiveDays: Math.round(totalDays),
            calculatedAt: new Date(),
            periods: aprPeriods,
        };
    }

    /**
     * Invalidate APR cache for a position
     * Call this when position events change
     */
    async invalidatePositionApr(
        chain: string,
        protocol: string,
        nftId: string
    ): Promise<void> {
        await this.prisma.positionEventApr.updateMany({
            where: {
                event: {
                    positionChain: chain,
                    positionProtocol: protocol,
                    positionNftId: nftId,
                },
            },
            data: {
                isValid: false,
                updatedAt: new Date(),
            },
        });

        this.logger.debug({
            positionChain: chain,
            positionProtocol: protocol,
            positionNftId: nftId
        }, 'APR cache invalidated');
    }

    /**
     * Create APR record for a single position event (for incremental processing)
     * Called during position event sync to build APR data incrementally
     */
    async createEventAprRecord(
        eventId: string,
        periodStartDate: Date,
        periodEndDate: Date | null,
        costBasisAfter: string
    ): Promise<void> {
        const periodDays = periodEndDate
            ? (periodEndDate.getTime() - periodStartDate.getTime()) / (1000 * 60 * 60 * 24)
            : null;

        await this.prisma.positionEventApr.upsert({
            where: { eventId },
            update: {
                periodStartDate,
                periodEndDate,
                periodDays,
                periodCostBasis: costBasisAfter,
                // Reset fees - will be distributed by collect events
                allocatedFees: "0",
                periodApr: 0,
                isValid: true,
                updatedAt: new Date(),
            },
            create: {
                eventId,
                periodStartDate,
                periodEndDate,
                periodDays,
                periodCostBasis: costBasisAfter,
                allocatedFees: "0",
                periodApr: 0,
                isValid: true,
            },
        });

        this.logger.debug({ eventId, periodDays }, 'APR record created for event');
    }

    /**
     * Update period end dates when a new event creates a new period
     * Called when processing events to close previous periods
     */
    async updatePreviousEventPeriodEnd(
        chain: string,
        protocol: string,
        nftId: string,
        newEventDate: Date
    ): Promise<void> {
        // Find the most recent event that doesn't have an end date (open period)
        const openPeriods = await this.prisma.positionEventApr.findMany({
            where: {
                event: {
                    positionChain: chain,
                    positionProtocol: protocol,
                    positionNftId: nftId,
                },
                periodEndDate: null,
                isValid: true,
            },
            include: { event: true },
            orderBy: { periodStartDate: 'desc' },
        });

        for (const period of openPeriods) {
            const periodDays = (newEventDate.getTime() - period.periodStartDate.getTime()) / (1000 * 60 * 60 * 24);

            await this.prisma.positionEventApr.update({
                where: { id: period.id },
                data: {
                    periodEndDate: newEventDate,
                    periodDays,
                    updatedAt: new Date(),
                },
            });

            this.logger.debug({
                eventId: period.eventId,
                periodDays,
                closedAt: newEventDate
            }, 'Closed period for previous event');
        }
    }

    /**
     * Distribute fees from a single COLLECT event across existing periods
     * Called during sync when processing COLLECT events
     */
    async distributeSingleCollectEventFees(
        chain: string,
        protocol: string,
        nftId: string,
        collectEventDate: Date,
        feeValueInQuote: string
    ): Promise<void> {
        const totalFees = BigInt(feeValueInQuote);

        if (totalFees === BigInt(0)) {
            return; // No fees to distribute
        }

        // Get all periods that existed before this collect event and are closed
        const eligiblePeriods = await this.prisma.positionEventApr.findMany({
            where: {
                event: {
                    positionChain: chain,
                    positionProtocol: protocol,
                    positionNftId: nftId,
                },
                periodStartDate: { lt: collectEventDate },
                periodDays: { not: null }, // Only closed periods
                periodCostBasis: { not: '0' }, // Only periods with capital
                isValid: true,
            },
            include: { event: true },
        });

        if (eligiblePeriods.length === 0) {
            this.logger.debug({
                positionChain: chain,
                positionProtocol: protocol,
                positionNftId: nftId,
                collectDate: collectEventDate,
                feeValue: feeValueInQuote
            }, 'No eligible periods for fee distribution');
            return;
        }

        // Calculate total weight for proportional distribution
        let totalWeight = 0;
        const periodWeights: { period: typeof eligiblePeriods[0]; weight: number }[] = [];

        for (const period of eligiblePeriods) {
            const costBasis = BigInt(period.periodCostBasis);
            const days = period.periodDays!;
            const weight = Number(costBasis) * days;

            periodWeights.push({ period, weight });
            totalWeight += weight;
        }

        if (totalWeight === 0) {
            return; // No weight to distribute against
        }

        // Distribute fees proportionally and calculate APR
        for (const { period, weight } of periodWeights) {
            const proportion = weight / totalWeight;
            const allocatedFees = BigInt(Math.floor(Number(totalFees) * proportion));

            // Add to existing allocated fees
            const currentAllocated = BigInt(period.allocatedFees);
            const newAllocated = currentAllocated + allocatedFees;

            // Calculate period APR
            const costBasis = BigInt(period.periodCostBasis);
            const days = period.periodDays!;
            const periodApr = days > 0 && costBasis > BigInt(0)
                ? (Number(newAllocated) / Number(costBasis)) / (days / 365) * 100
                : 0;

            await this.prisma.positionEventApr.update({
                where: { id: period.id },
                data: {
                    allocatedFees: newAllocated.toString(),
                    periodApr,
                    updatedAt: new Date(),
                },
            });

            this.logger.debug({
                eventId: period.eventId,
                allocatedFees: allocatedFees.toString(),
                totalAllocated: newAllocated.toString(),
                periodApr
            }, 'Distributed fees to period');
        }
    }

    /**
     * Delete APR data for a position (when position events are deleted)
     */
    async deletePositionAprData(
        chain: string,
        protocol: string,
        nftId: string
    ): Promise<number> {
        const result = await this.prisma.positionEventApr.deleteMany({
            where: {
                event: {
                    positionChain: chain,
                    positionProtocol: protocol,
                    positionNftId: nftId,
                },
            },
        });

        this.logger.debug({
            positionChain: chain,
            positionProtocol: protocol,
            positionNftId: nftId,
            deletedCount: result.count
        }, 'APR data deleted');
        return result.count;
    }

    /**
     * Get cached APR data if valid, otherwise calculate fresh
     */
    async getPositionApr(
        positionId: PositionId,
        forceRecalculate: boolean = false
    ): Promise<AprCalculationResult> {
        if (!forceRecalculate) {
            // Check if we have valid cached data
            const cachedPeriods = await this.prisma.positionEventApr.findMany({
                where: {
                    event: {
                        positionUserId: positionId.userId,
                        positionChain: positionId.chain,
                        positionProtocol: positionId.protocol,
                        positionNftId: positionId.nftId,
                    },
                    isValid: true
                },
                include: { event: true },
                orderBy: { periodStartDate: 'asc' },
            });

            // If we have cached data and all events have APR records, return cached results
            const eventCount = await this.prisma.positionEvent.count({
                where: {
                    positionUserId: positionId.userId,
                    positionChain: positionId.chain,
                    positionProtocol: positionId.protocol,
                    positionNftId: positionId.nftId,
                }
            });

            if (cachedPeriods.length === eventCount && cachedPeriods.length > 0) {
                this.logger.debug({
                    positionChain: positionId.chain,
                    positionProtocol: positionId.protocol,
                    positionNftId: positionId.nftId
                }, 'Returning cached APR data');
                return this.aggregateAprResults(positionId, cachedPeriods);
            }
        }

        // Calculate fresh APR data
        return this.calculatePositionApr(positionId);
    }

    /**
     * Calculate APR breakdown separating realized vs unrealized returns
     *
     * Realized APR: Based on fees that have been collected (COLLECT events)
     * Unrealized APR: Based on unclaimed fees from the most recent position state
     *
     * The unrealized portion covers the period after the last collect event
     * (or from the beginning if no collects have occurred yet).
     *
     * @param chain - Chain name
     * @param protocol - Protocol name
     * @param nftId - NFT ID
     * @param unclaimedFeesValue - Current unclaimed fees value in quote token (from PnL breakdown) - optional
     */
    async getAprBreakdown(
        positionId: PositionId,
        unclaimedFeesValue?: string
    ): Promise<AprBreakdown> {
        // Get all APR periods (realized portion)
        const aprData = await this.getPositionApr(positionId, false);
        const realizedApr = aprData.totalApr;

        // Get position events to find the last collect and current unclaimed fees
        const events = await this.prisma.positionEvent.findMany({
            where: {
                positionUserId: positionId.userId,
                positionChain: positionId.chain,
                positionProtocol: positionId.protocol,
                positionNftId: positionId.nftId,
            },
            orderBy: [
                { blockNumber: 'asc' },
                { transactionIndex: 'asc' },
                { logIndex: 'asc' }
            ]
        });

        if (events.length === 0) {
            return {
                positionChain: positionId.chain,
                positionProtocol: positionId.protocol,
                positionNftId: positionId.nftId,
                realizedApr: 0,
                realizedFeesCollected: '0',
                realizedTWCostBasis: '0',
                realizedActiveDays: 0,
                unrealizedApr: 0,
                unrealizedFeesUnclaimed: '0',
                unrealizedCostBasis: '0',
                unrealizedActiveDays: 0,
                totalApr: 0,
                totalActiveDays: 0,
                totalTWCostBasis: '0',
                calculatedAt: new Date()
            };
        }

        // Use provided unclaimed fees or default to "0" if not available
        const unclaimedFees = unclaimedFeesValue || "0";

        // Find the last COLLECT event and the most recent event
        const lastCollectEvent = events.reverse().find(e => e.eventType === 'COLLECT');
        const mostRecentEvent = events[0]; // events are already reversed

        // If no collect events, all current position value is unrealized
        if (!lastCollectEvent) {
            const firstEvent = events[events.length - 1]; // First event (when reversed)
            const unrealizedApr = this.calculateUnrealizedApr(
                firstEvent,
                mostRecentEvent,
                unclaimedFees
            );

            // Calculate unrealized metrics - days from first event to now
            const now = new Date();
            const unrealizedDays = Math.floor((now.getTime() - firstEvent.blockTimestamp.getTime()) / (1000 * 60 * 60 * 24));
            const unrealizedCostBasis = mostRecentEvent.costBasisAfter;
            const unrealizedActiveDays = Math.max(1, unrealizedDays);

            // For closed positions, unrealized days should be 0
            const finalUnrealizedActiveDays = BigInt(unrealizedCostBasis) === BigInt(0) ? 0 : unrealizedActiveDays;
            const finalUnrealizedApr = BigInt(unrealizedCostBasis) === BigInt(0) ? 0 : unrealizedApr;

            // Calculate totals using simplified approach
            const totalActiveDays = 0 + finalUnrealizedActiveDays;
            const totalApr = totalActiveDays > 0 ? finalUnrealizedApr : 0;

            return {
                positionChain: positionId.chain,
                positionProtocol: positionId.protocol,
                positionNftId: positionId.nftId,
                realizedApr: 0,
                realizedFeesCollected: '0',
                realizedTWCostBasis: '0',
                realizedActiveDays: 0,
                unrealizedApr: finalUnrealizedApr,
                unrealizedFeesUnclaimed: unclaimedFees,
                unrealizedCostBasis,
                unrealizedActiveDays: finalUnrealizedActiveDays,
                totalApr,
                totalActiveDays,
                totalTWCostBasis: unrealizedCostBasis,
                calculatedAt: new Date()
            };
        }

        // Calculate unrealized metrics (period since last collect to now)
        const now = new Date();
        const unrealizedDays = Math.floor((now.getTime() - lastCollectEvent.blockTimestamp.getTime()) / (1000 * 60 * 60 * 24));
        const unrealizedCostBasis = mostRecentEvent.costBasisAfter;

        // Calculate unrealized APR for period after last collect
        const unrealizedApr = this.calculateUnrealizedApr(
            lastCollectEvent,
            mostRecentEvent,
            unclaimedFees
        );

        // For closed positions, unrealized days should be 0
        const finalUnrealizedActiveDays = BigInt(unrealizedCostBasis) === BigInt(0) ? 0 : Math.max(1, unrealizedDays);
        const finalUnrealizedApr = BigInt(unrealizedCostBasis) === BigInt(0) ? 0 : unrealizedApr;

        // Calculate totals using simplified approach
        const totalActiveDays = aprData.totalActiveDays + finalUnrealizedActiveDays;
        const totalApr = totalActiveDays > 0
            ? (realizedApr * aprData.totalActiveDays + finalUnrealizedApr * finalUnrealizedActiveDays) / totalActiveDays
            : 0;

        // Calculate total time-weighted cost basis
        const realizedWeight = aprData.totalActiveDays;
        const unrealizedWeight = finalUnrealizedActiveDays;
        const totalWeight = realizedWeight + unrealizedWeight;

        const totalTWCostBasis = totalWeight > 0
            ? BigInt(Math.floor(
                (Number(BigInt(aprData.timeWeightedCostBasis)) * realizedWeight +
                 Number(BigInt(unrealizedCostBasis)) * unrealizedWeight) / totalWeight
              )).toString()
            : aprData.timeWeightedCostBasis;

        return {
            positionChain: positionId.chain,
            positionProtocol: positionId.protocol,
            positionNftId: positionId.nftId,
            realizedApr,
            realizedFeesCollected: aprData.totalFeesCollected,
            realizedTWCostBasis: aprData.timeWeightedCostBasis,
            realizedActiveDays: aprData.totalActiveDays,
            unrealizedApr: finalUnrealizedApr,
            unrealizedFeesUnclaimed: unclaimedFees,
            unrealizedCostBasis,
            unrealizedActiveDays: finalUnrealizedActiveDays,
            totalApr,
            totalActiveDays,
            totalTWCostBasis,
            calculatedAt: new Date()
        };
    }

    /**
     * Calculate unrealized APR for a specific period using unclaimed fees
     */
    private calculateUnrealizedApr(
        periodStartEvent: PositionEvent,
        currentEvent: PositionEvent,
        unclaimedFeesValue: string
    ): number {
        // Calculate days from period start to NOW (not just to the current event)
        // This is important for active positions where we want to measure APR up to the current moment
        const now = new Date();
        const periodDays = (now.getTime() - periodStartEvent.blockTimestamp.getTime())
            / (1000 * 60 * 60 * 24);

        this.logger.debug({
            periodStartTimestamp: periodStartEvent.blockTimestamp.toISOString(),
            currentEventTimestamp: currentEvent.blockTimestamp.toISOString(),
            currentTime: now.toISOString(),
            periodDays,
            unclaimedFeesValue,
            currentCostBasis: currentEvent.costBasisAfter
        }, 'Calculating unrealized APR');

        if (periodDays <= 0) {
            this.logger.debug({ periodDays }, 'Period days <= 0, returning 0 APR');
            return 0;
        }

        const unclaimedFeesBigInt = BigInt(unclaimedFeesValue);
        const currentCostBasis = BigInt(currentEvent.costBasisAfter);

        if (currentCostBasis === BigInt(0) || unclaimedFeesBigInt === BigInt(0)) {
            this.logger.debug({
                currentCostBasis: currentCostBasis.toString(),
                unclaimedFees: unclaimedFeesBigInt.toString()
            }, 'Cost basis or unclaimed fees is 0, returning 0 APR');
            return 0;
        }

        // Calculate annualized APR: (unclaimed_fees / cost_basis) / (days / 365) * 100
        const feeRatio = Number(unclaimedFeesBigInt) / Number(currentCostBasis);
        const annualizedRatio = feeRatio / (periodDays / 365);
        const unrealizedApr = annualizedRatio * 100;

        this.logger.debug({
            unclaimedFees: unclaimedFeesBigInt.toString(),
            costBasis: currentCostBasis.toString(),
            feeRatio,
            annualizedRatio,
            unrealizedApr,
            expectedCalculation: `(${unclaimedFeesBigInt.toString()} / ${currentCostBasis.toString()}) / (${periodDays} / 365) * 100 = ${unrealizedApr}`
        }, 'Unrealized APR calculation details');

        return unrealizedApr;
    }
}
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getInitialValueService } from "./initialValueService";
import { determineQuoteToken, formatTokenPair } from "./quoteTokenService";
import {
    TokenReferenceService,
    UnifiedTokenData,
} from "../tokens/tokenReferenceService";
import { calculatePositionValue } from "@/lib/utils/uniswap-v3/liquidity";
import { priceToTick, tickToPrice } from "@/lib/utils/uniswap-v3/price";

export interface PositionWithPnL {
    // Basic Position Data
    id: string;
    nftId?: string;
    liquidity: string;
    tickLower: number;
    tickUpper: number;
    owner?: string;
    importType: string;
    status: string;
    createdAt: Date;

    // Pool & Token Data
    pool: {
        id: string;
        chain: string;
        poolAddress: string;
        fee: number;
        currentPrice?: string;
        token0: {
            id: string;
            symbol: string;
            name: string;
            decimals: number;
            logoUrl?: string;
        };
        token1: {
            id: string;
            symbol: string;
            name: string;
            decimals: number;
            logoUrl?: string;
        };
    };

    // Quote Token Configuration
    token0IsQuote: boolean;
    tokenPair: string; // "WETH/USDC"
    baseSymbol: string;
    quoteSymbol: string;

    // PnL Data
    initialValue: string;
    currentValue: string;
    pnl: string;
    pnlPercent: number;
    initialSource: "subgraph" | "snapshot";
    confidence: "exact" | "estimated";

    // Enhanced PnL breakdown (when events available)
    pnlBreakdown?: {
        assetValueChange: string; // Change in position value (excluding fees)
        collectedFees: string; // Historical fees collected
        unclaimedFees: string; // Current unclaimed fees
        realizedPnL: string; // PnL from withdrawn amounts + fees
        unrealizedPnL: string; // PnL from current holdings
    };

    // Event metadata
    eventCount?: number;
    lastEventSync?: Date;
    pnlMethod?: "event-based" | "snapshot";

    // Range Status
    rangeStatus: "in-range" | "out-of-range" | "unknown";

    // Meta
    lastUpdated: Date;
    dataUpdated?: boolean; // True wenn Initial Value upgraded wurde
}

export interface PositionListOptions {
    userId: string;
    status?: string;
    chain?: string;
    limit?: number;
    offset?: number;
    sortBy?: "createdAt" | "currentValue" | "pnl" | "pnlPercent";
    sortOrder?: "asc" | "desc";
}

export class PositionService {
    private readonly initialValueService = getInitialValueService();
    private readonly tokenRefService = new TokenReferenceService();

    /**
     * Extract unified token data from pool references
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private getUnifiedTokenData(pool: any): {
        token0Data: UnifiedTokenData;
        token1Data: UnifiedTokenData;
    } {
        return {
            token0Data: this.tokenRefService.getUnifiedTokenData(
                pool.token0Ref
            ),
            token1Data: this.tokenRefService.getUnifiedTokenData(
                pool.token1Ref
            ),
        };
    }

    /**
     * Holt alle Positionen eines Users mit PnL-Berechnungen
     */
    async getPositionsWithPnL(options: PositionListOptions): Promise<{
        positions: PositionWithPnL[];
        total: number;
        hasMore: boolean;
    }> {
        const {
            userId,
            status = "active",
            chain,
            limit = 20,
            offset = 0,
            sortBy = "createdAt",
            sortOrder = "desc",
        } = options;

        // Build WHERE clause
        const where: any = {
            userId,
            status,
        };

        if (chain) {
            where.pool = { chain };
        }

        // Fetch positions from DB
        const [positions, total] = await Promise.all([
            prisma.position.findMany({
                where,
                include: {
                    pool: {
                        include: {
                            token0Ref: {
                                include: {
                                    globalToken: true,
                                    userToken: true,
                                },
                            },
                            token1Ref: {
                                include: {
                                    globalToken: true,
                                    userToken: true,
                                },
                            },
                        },
                    },
                },
                orderBy: this.buildOrderBy(sortBy, sortOrder),
                take: limit,
                skip: offset,
            }),
            prisma.position.count({ where }),
        ]);

        // Calculate PnL for each position
        const positionsWithPnL: PositionWithPnL[] = [];

        for (const position of positions) {
            try {
                const pnlData = await this.calculatePositionPnL(position.id);
                positionsWithPnL.push(pnlData);
            } catch (error) {
                console.error(
                    `❌ Error calculating PnL for position ${position.id}:`,
                    error.message
                );
                console.error("Stack:", error.stack);

                // Create fallback position data instead of skipping
                const { token0Data, token1Data } = this.getUnifiedTokenData(
                    position.pool
                );
                const fallbackPosition: PositionWithPnL = {
                    // Basic Position Data
                    id: position.id,
                    nftId: position.nftId || undefined,
                    liquidity: position.liquidity,
                    tickLower: position.tickLower,
                    tickUpper: position.tickUpper,
                    owner: position.owner || undefined,
                    importType: position.importType,
                    status: position.status,
                    createdAt: position.createdAt,

                    // Pool & Token Data
                    pool: {
                        id: position.pool.id,
                        chain: position.pool.chain,
                        poolAddress: position.pool.poolAddress,
                        fee: position.pool.fee,
                        currentPrice: position.pool.currentPrice || undefined,
                        token0: {
                            id: token0Data.id,
                            symbol: token0Data.symbol,
                            name: token0Data.name,
                            decimals: token0Data.decimals,
                            logoUrl: token0Data.logoUrl,
                        },
                        token1: {
                            id: token1Data.id,
                            symbol: token1Data.symbol,
                            name: token1Data.name,
                            decimals: token1Data.decimals,
                            logoUrl: token1Data.logoUrl,
                        },
                    },

                    // Quote Token Configuration
                    token0IsQuote: position.token0IsQuote,
                    tokenPair: `${
                        position.token0IsQuote
                            ? token1Data.symbol
                            : token0Data.symbol
                    }/${
                        position.token0IsQuote
                            ? token0Data.symbol
                            : token1Data.symbol
                    }`,
                    baseSymbol: position.token0IsQuote
                        ? token1Data.symbol
                        : token0Data.symbol,
                    quoteSymbol: position.token0IsQuote
                        ? token0Data.symbol
                        : token1Data.symbol,

                    // PnL Data - Error fallbacks
                    initialValue: "0",
                    currentValue: "0",
                    pnl: "0",
                    pnlPercent: 0,
                    initialSource: "snapshot" as const,
                    confidence: "estimated" as const,

                    // Range Status
                    rangeStatus: "unknown" as const,

                    // Meta
                    lastUpdated: new Date(),
                    dataUpdated: false,
                };

                positionsWithPnL.push(fallbackPosition);
            }
        }

        // Client-side sorting wenn nach PnL sortiert (da berechnet)
        if (sortBy === "pnl" || sortBy === "pnlPercent") {
            positionsWithPnL.sort((a, b) => {
                const aVal =
                    sortBy === "pnl" ? parseFloat(a.pnl) : a.pnlPercent;
                const bVal =
                    sortBy === "pnl" ? parseFloat(b.pnl) : b.pnlPercent;
                return sortOrder === "desc" ? bVal - aVal : aVal - bVal;
            });
        }

        return {
            positions: positionsWithPnL,
            total,
            hasMore: offset + positions.length < total,
        };
    }

    /**
     * Berechnet PnL für eine einzelne Position (mit Event-basierter Berechnung falls verfügbar)
     */
    async calculatePositionPnL(positionId: string): Promise<PositionWithPnL> {
        // Check if we have events for this position
        const eventCount = await prisma.positionEvent.count({
            where: { positionId },
        });

        // If we have events, use event-based calculation
        if (eventCount > 0) {
            try {
                console.log(
                    `📊 Using event-based PnL calculation (${eventCount} events)`
                );
                return await this.calculateEventBasedPnL(positionId);
            } catch (eventError) {
                console.warn(
                    `⚠️ Event-based PnL failed, falling back to legacy calculation:`,
                    eventError.message
                );
                // Fall through to legacy calculation
            }
        }

        return await this.calculateLegacyPnL(positionId);
    }

    /**
     * Event-based PnL calculation with comprehensive breakdown
     */
    private async calculateEventBasedPnL(
        positionId: string
    ): Promise<PositionWithPnL> {
        // Get event-based PnL calculation
        const { getEventPnlService } = await import("./eventPnlService");
        const eventPnlService = getEventPnlService();
        const eventPnL = await eventPnlService.calculateEventBasedPnL(
            positionId
        );

        // Get position data for UI
        const position = await prisma.position.findUnique({
            where: { id: positionId },
            include: {
                pool: {
                    include: {
                        token0Ref: {
                            include: {
                                globalToken: true,
                                userToken: true,
                            },
                        },
                        token1Ref: {
                            include: {
                                globalToken: true,
                                userToken: true,
                            },
                        },
                    },
                },
            },
        });

        if (!position) {
            throw new Error(`Position ${positionId} not found`);
        }

        const { token0Data, token1Data } = this.getUnifiedTokenData(
            position.pool
        );
        const quoteConfig = determineQuoteToken(
            token0Data.symbol,
            token0Data.address,
            token1Data.symbol,
            token1Data.address,
            position.pool.chain
        );

        // Determine range status
        const rangeStatus = this.determineRangeStatus(position);

        return {
            // Basic Data
            id: position.id,
            nftId: position.nftId || undefined,
            liquidity: position.liquidity,
            tickLower: position.tickLower,
            tickUpper: position.tickUpper,
            owner: position.owner || undefined,
            importType: position.importType,
            status: position.status,
            createdAt: position.createdAt,

            // Pool & Token Data
            pool: {
                id: position.pool.id,
                chain: position.pool.chain,
                poolAddress: position.pool.poolAddress,
                fee: position.pool.fee,
                currentPrice: position.pool.currentPrice || undefined,
                token0: {
                    id: token0Data.id,
                    symbol: token0Data.symbol,
                    name: token0Data.name,
                    decimals: token0Data.decimals,
                    logoUrl: token0Data.logoUrl || undefined,
                },
                token1: {
                    id: token1Data.id,
                    symbol: token1Data.symbol,
                    name: token1Data.name,
                    decimals: token1Data.decimals,
                    logoUrl: token1Data.logoUrl || undefined,
                },
            },

            // Quote Token Configuration
            token0IsQuote: quoteConfig.token0IsQuote,
            tokenPair: formatTokenPair(
                token0Data.symbol,
                token1Data.symbol,
                quoteConfig.token0IsQuote
            ),
            baseSymbol: quoteConfig.baseSymbol,
            quoteSymbol: quoteConfig.quoteSymbol,

            // Event-based PnL Data
            initialValue: eventPnL.totalInvested,
            currentValue: eventPnL.currentValue,
            pnl: eventPnL.totalPnL,
            pnlPercent: eventPnL.roi,
            initialSource: "subgraph", // Events come from subgraph
            confidence: eventPnL.confidence,

            // Enhanced PnL breakdown (event-specific)
            pnlBreakdown: {
                assetValueChange: (
                    BigInt(eventPnL.currentValue) - BigInt(eventPnL.costBasis)
                ).toString(),
                collectedFees: eventPnL.totalFeesCollected,
                unclaimedFees: eventPnL.unclaimedFees,
                realizedPnL: eventPnL.realizedPnL,
                unrealizedPnL: eventPnL.unrealizedPnL,
            },

            // Event metadata
            eventCount: eventPnL.eventCount,
            lastEventSync: eventPnL.lastEventDate,
            pnlMethod: "event-based",

            // Range Status
            rangeStatus,

            // Meta
            lastUpdated: new Date(),
            dataUpdated: true, // Events were synced
        };
    }

    /**
     * Legacy PnL calculation (original method)
     */
    private async calculateLegacyPnL(
        positionId: string
    ): Promise<PositionWithPnL> {
        // 1. Position und Initial Value laden
        const [position, initialValue] = await Promise.all([
            prisma.position.findUnique({
                where: { id: positionId },
                include: {
                    pool: {
                        include: {
                            token0Ref: {
                                include: {
                                    globalToken: true,
                                    userToken: true,
                                },
                            },
                            token1Ref: {
                                include: {
                                    globalToken: true,
                                    userToken: true,
                                },
                            },
                        },
                    },
                },
            }),
            this.initialValueService.getOrUpdateInitialValue(positionId),
        ]);

        if (!position) {
            throw new Error(`Position ${positionId} not found`);
        }

        // Extract unified token data
        const { token0Data, token1Data } = this.getUnifiedTokenData(
            position.pool
        );

        // 2. Quote Token bestimmen
        const quoteConfig = determineQuoteToken(
            token0Data.symbol,
            token0Data.address,
            token1Data.symbol,
            token1Data.address,
            position.pool.chain
        );

        // 3. Update token0IsQuote falls noch nicht gesetzt
        if (
            position.token0IsQuote === null ||
            position.token0IsQuote === undefined
        ) {
            await prisma.position.update({
                where: { id: positionId },
                data: { token0IsQuote: quoteConfig.token0IsQuote },
            });
        }

        // 4. Aktuellen Wert berechnen
        let currentValue: string;

        try {
            currentValue = await this.calculateCurrentValue(position);
        } catch (error: any) {
            console.warn(
                `Using initialValue as currentValue for position ${positionId}:`,
                error.message
            );
            // Fallback: verwende initialValue als currentValue wenn Berechnung fehlschlägt
            currentValue = initialValue.value;
        }

        // 5. PnL berechnen (both values are now BigInt-compatible strings)
        const currentValueBigInt = BigInt(currentValue);
        const initialValueBigInt = BigInt(initialValue.value);
        const pnlBigInt = currentValueBigInt - initialValueBigInt;

        // Calculate percentage with proper precision
        const pnlPercent =
            initialValueBigInt > 0n
                ? Number((pnlBigInt * 10000n) / initialValueBigInt) / 100 // 2 decimal precision
                : 0;

        // 6. Range Status bestimmen
        const rangeStatus = this.determineRangeStatus(position);

        return {
            // Basic Data
            id: position.id,
            nftId: position.nftId || undefined,
            liquidity: position.liquidity,
            tickLower: position.tickLower,
            tickUpper: position.tickUpper,
            owner: position.owner || undefined,
            importType: position.importType,
            status: position.status,
            createdAt: position.createdAt,

            // Pool & Token Data
            pool: {
                id: position.pool.id,
                chain: position.pool.chain,
                poolAddress: position.pool.poolAddress,
                fee: position.pool.fee,
                currentPrice: position.pool.currentPrice || undefined,
                token0: {
                    id: token0Data.id,
                    symbol: token0Data.symbol,
                    name: token0Data.name,
                    decimals: token0Data.decimals,
                    logoUrl: token0Data.logoUrl || undefined,
                },
                token1: {
                    id: token1Data.id,
                    symbol: token1Data.symbol,
                    name: token1Data.name,
                    decimals: token1Data.decimals,
                    logoUrl: token1Data.logoUrl || undefined,
                },
            },

            // Quote Token Configuration
            token0IsQuote: quoteConfig.token0IsQuote,
            tokenPair: formatTokenPair(
                token0Data.symbol,
                token1Data.symbol,
                quoteConfig.token0IsQuote
            ),
            baseSymbol: quoteConfig.baseSymbol,
            quoteSymbol: quoteConfig.quoteSymbol,

            // PnL Data - BigInt-compatible strings (smallest unit)
            initialValue: initialValue.value,
            currentValue,
            pnl: pnlBigInt.toString(),
            pnlPercent: parseFloat(pnlPercent.toFixed(2)),
            initialSource: initialValue.source,
            confidence: initialValue.confidence,

            // Legacy method indicator
            pnlMethod: "snapshot",

            // Range Status
            rangeStatus,

            // Meta
            lastUpdated: new Date(),
            dataUpdated: initialValue.updated,
        };
    }

    /**
     * Berechnet aktuellen Wert der Position mit korrekter Uniswap V3 Formel
     */
    private async calculateCurrentValue(position: any): Promise<string> {
        const liquidity = BigInt(position.liquidity);
        const { tickLower, tickUpper } = position;
        const pool = position.pool;

        // Benötigte Pool-Daten überprüfen
        if (!pool.currentTick && !pool.currentPrice) {
            throw new Error(
                `Pool ${pool.poolAddress} has no current price data`
            );
        }

        // Extract unified token data
        const { token0Data, token1Data } = this.getUnifiedTokenData(pool);

        // Token-Adressen aus TokenReferences extrahieren
        const token0Address = token0Data.address;
        const token1Address = token1Data.address;

        // Quote Token bestimmen
        const quoteConfig = determineQuoteToken(
            token0Data.symbol,
            token0Address,
            token1Data.symbol,
            token1Address,
            pool.chain
        );

        // Determine base and quote token addresses and decimals
        const baseTokenAddress = quoteConfig.token0IsQuote
            ? token1Address
            : token0Address;
        const quoteTokenAddress = quoteConfig.token0IsQuote
            ? token0Address
            : token1Address;
        const baseTokenDecimals = quoteConfig.token0IsQuote
            ? token1Data.decimals
            : token0Data.decimals;

        // Current Tick bestimmen
        let currentTick: number;
        let currentPrice: bigint;

        if (pool.currentTick !== null) {
            currentTick = pool.currentTick;
            // Preis aus Tick berechnen
            currentPrice = tickToPrice(
                currentTick,
                baseTokenAddress,
                quoteTokenAddress,
                baseTokenDecimals
            );
        } else if (pool.currentPrice) {
            // pool.currentPrice is already a BigInt string in the correct format
            currentPrice = BigInt(pool.currentPrice);
            currentTick = priceToTick(
                currentPrice,
                pool.tickSpacing,
                baseTokenAddress,
                quoteTokenAddress,
                baseTokenDecimals
            );
        } else {
            throw new Error("No price data available");
        }

        // Base Token ist token0 oder token1?
        const baseIsToken0 =
            baseTokenAddress.toLowerCase() === token0Address.toLowerCase();

        // Position Value berechnen
        const positionValue = calculatePositionValue(
            liquidity,
            currentTick,
            tickLower,
            tickUpper,
            currentPrice,
            baseIsToken0,
            baseTokenDecimals
        );

        // Return as BigInt-compatible string in smallest unit (no decimals)
        return positionValue.toString();
    }

    /**
     * Bestimmt ob Position in Range ist
     * TODO: Implementierung mit Pool Current Tick
     */
    private determineRangeStatus(
        position: any
    ): "in-range" | "out-of-range" | "unknown" {
        if (!position.pool.currentTick) {
            return "unknown";
        }

        const currentTick = position.pool.currentTick;
        const { tickLower, tickUpper } = position;

        if (currentTick >= tickLower && currentTick <= tickUpper) {
            return "in-range";
        } else {
            return "out-of-range";
        }
    }

    /**
     * Helper für Order By Clause
     */
    private buildOrderBy(sortBy: string, sortOrder: "asc" | "desc") {
        const order =
            sortOrder === "desc" ? Prisma.SortOrder.desc : Prisma.SortOrder.asc;

        switch (sortBy) {
            case "createdAt":
                return { createdAt: order };
            case "currentValue":
                // Note: Actual sorting by calculated values happens client-side
                return { createdAt: order }; // Fallback
            default:
                return { createdAt: order };
        }
    }

    /**
     * Refresht Position-Daten (Pool + Initial Value + Events)
     */
    async refreshPosition(positionId: string): Promise<PositionWithPnL> {
        console.log(`🔄 Refreshing position ${positionId}...`);

        // 1. Get position to find associated pool
        const position = await prisma.position.findUnique({
            where: { id: positionId },
            select: { poolId: true, lastEventSync: true },
        });

        if (!position) {
            throw new Error(`Position ${positionId} not found`);
        }

        try {
            // 2. Update pool state from blockchain
            console.log(`📊 Updating pool state...`);
            const { PoolService } = await import("../uniswap/poolService");
            const poolService = new PoolService();
            try {
                await poolService.updatePoolState(position.poolId);
            } finally {
                await poolService.disconnect();
            }

            // 3. Sync position events from Subgraph (NEW)
            console.log(`🎯 Syncing position events...`);
            const { getEventSyncService } = await import("./eventSyncService");
            const eventSyncService = getEventSyncService();

            try {
                const syncResult = await eventSyncService.syncPositionEvents(
                    positionId
                );
                console.log(`✅ Event sync completed:`, {
                    eventsAdded: syncResult.eventsAdded,
                    eventsUpdated: syncResult.eventsUpdated,
                    duration: `${syncResult.syncDuration}ms`,
                    errors: syncResult.errors.length,
                });

                // Log errors if any
                if (syncResult.errors.length > 0) {
                    console.warn(`⚠️ Event sync errors:`, syncResult.errors);
                }
            } catch (eventSyncError) {
                // Don't fail the refresh if event sync fails - log and continue
                console.warn(
                    `⚠️ Event sync failed for position ${positionId}:`,
                    eventSyncError.message
                );
                console.warn(`Continuing with legacy PnL calculation...`);
            }

            // 4. Initial Value updaten (fallback for positions without events)
            console.log(`📈 Updating initial value...`);
            await this.initialValueService.getOrUpdateInitialValue(positionId);

            // 5. Calculate PnL (now with event-based calculation if available)
            console.log(`💰 Calculating PnL...`);
            const result = await this.calculatePositionPnL(positionId);

            console.log(`✅ Position refresh completed for ${positionId}`);
            return result;
        } catch (error) {
            console.error(
                `❌ Position refresh failed for ${positionId}:`,
                error.message
            );
            throw error;
        }
    }

    /**
     * Close database connections (for cleanup in tests)
     */
    async disconnect(): Promise<void> {
        await this.tokenRefService.disconnect();
    }
}

// Singleton Instance
let positionServiceInstance: PositionService | null = null;

export function getPositionService(): PositionService {
    if (!positionServiceInstance) {
        positionServiceInstance = new PositionService();
    }
    return positionServiceInstance;
}

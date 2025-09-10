import { prisma } from '@/lib/prisma';
import { getSubgraphService } from '../subgraph';
import { getHistoricalPriceService, PriceDataPoint } from './historicalPriceService';
import { determineQuoteToken } from './quoteTokenService';

export interface EventSyncResult {
    eventsAdded: number;
    eventsUpdated: number;
    oldestEvent?: Date;
    newestEvent?: Date;
    syncDuration: number;
    errors: string[];
}

export interface SubgraphPositionEvent {
    id: string;
    timestamp: string;
    blockNumber: string;
    transaction: {
        id: string;
    };
    // For IncreaseLiquidity events
    liquidity?: string;
    amount0?: string;
    amount1?: string;
    // For DecreaseLiquidity events
    liquidityAmount?: string;
    amount0Removed?: string;
    amount1Removed?: string;
    // For Collect events
    amount0Collected?: string;
    amount1Collected?: string;
}

export interface ParsedPositionEvent {
    eventType: 'CREATE' | 'INCREASE' | 'DECREASE' | 'COLLECT' | 'CLOSE';
    timestamp: Date;
    blockNumber: number;
    transactionHash: string;
    liquidityDelta: string;
    token0Delta: string;
    token1Delta: string;
    collectedFee0?: string;
    collectedFee1?: string;
}

export class EventSyncService {
    private readonly subgraphService = getSubgraphService();
    private readonly historicalPriceService = getHistoricalPriceService();

    /**
     * Sync all events for a position from Subgraph
     */
    async syncPositionEvents(positionId: string): Promise<EventSyncResult> {
        const startTime = Date.now();
        const errors: string[] = [];
        let eventsAdded = 0;
        let eventsUpdated = 0;
        let oldestEvent: Date | undefined;
        let newestEvent: Date | undefined;

        try {
            // Get position details for Subgraph queries
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

            // Get last sync timestamp for incremental sync
            const lastSync = position.lastEventSync;
            
            // Sync events from Subgraph
            const events = await this.fetchPositionEventsFromSubgraph(position, lastSync);
            
            // Process events chronologically
            events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

            for (const event of events) {
                try {
                    const processed = await this.processAndStoreEvent(positionId, event, position);
                    if (processed.isNew) {
                        eventsAdded++;
                    } else {
                        eventsUpdated++;
                    }

                    const eventDate = new Date(event.timestamp);
                    if (!oldestEvent || eventDate < oldestEvent) {
                        oldestEvent = eventDate;
                    }
                    if (!newestEvent || eventDate > newestEvent) {
                        newestEvent = eventDate;
                    }
                } catch (eventError) {
                    errors.push(`Error processing event ${event.id}: ${eventError.message}`);
                    console.error('Event processing error:', eventError);
                }
            }

            // Update position sync metadata
            await prisma.position.update({
                where: { id: positionId },
                data: {
                    lastEventSync: new Date(),
                    totalEventsCount: { increment: eventsAdded }
                }
            });

        } catch (error) {
            errors.push(`Sync error: ${error.message}`);
            console.error('Position event sync error:', error);
        }

        return {
            eventsAdded,
            eventsUpdated,
            oldestEvent,
            newestEvent,
            syncDuration: Date.now() - startTime,
            errors
        };
    }

    /**
     * Sync events since last sync timestamp
     */
    async syncEventsSince(positionId: string, since: Date): Promise<EventSyncResult> {
        // For now, this just calls the main sync method
        // Could be optimized to only fetch events after 'since'
        return this.syncPositionEvents(positionId);
    }

    /**
     * Fetch position events from Uniswap V3 Subgraph
     */
    private async fetchPositionEventsFromSubgraph(
        position: any, 
        lastSync?: Date
    ): Promise<SubgraphPositionEvent[]> {
        const poolAddress = position.pool.poolAddress.toLowerCase();
        const tickLower = position.tickLower;
        const tickUpper = position.tickUpper;
        const owner = position.owner?.toLowerCase();
        const nftId = position.nftId;

        // Construct where clause for event filtering
        let positionFilter = '';
        
        if (nftId) {
            // Filter by position ID (NFT ID) - most reliable for subgraph events
            positionFilter = `position: "${nftId}"`;
        } else {
            // Fallback: filter by position attributes (may not work on all subgraphs)
            positionFilter = `
                position_: {
                    pool: "${poolAddress}",
                    tickLower: ${tickLower},
                    tickUpper: ${tickUpper}
                }
            `;
            
            // Add owner filter if available
            if (owner) {
                positionFilter += `, position_: { owner: "${owner}" }`;
            }
        }

        // Add timestamp filter for incremental sync
        let timeFilter = '';
        if (lastSync) {
            const timestamp = Math.floor(lastSync.getTime() / 1000);
            timeFilter = `, timestamp_gt: "${timestamp}"`;
        }

        // Query for Mint events (CREATE/INCREASE liquidity)
        const mintEventsQuery = `
            query GetMintEvents($first: Int!, $skip: Int!) {
                mints(
                    first: $first,
                    skip: $skip,
                    orderBy: timestamp,
                    orderDirection: asc,
                    where: {
                        ${positionFilter}${timeFilter}
                    }
                ) {
                    id
                    timestamp
                    blockNumber
                    transaction {
                        id
                    }
                    liquidity
                    amount0
                    amount1
                    logIndex
                }
            }
        `;

        // Query for Burn events (DECREASE/CLOSE liquidity)
        const burnEventsQuery = `
            query GetBurnEvents($first: Int!, $skip: Int!) {
                burns(
                    first: $first,
                    skip: $skip,
                    orderBy: timestamp,
                    orderDirection: asc,
                    where: {
                        ${positionFilter}${timeFilter}
                    }
                ) {
                    id
                    timestamp
                    blockNumber
                    transaction {
                        id
                    }
                    amount
                    amount0
                    amount1
                    logIndex
                }
            }
        `;

        // Query for Collect events (fee collection)
        const collectEventsQuery = `
            query GetCollectEvents($first: Int!, $skip: Int!) {
                collects(
                    first: $first,
                    skip: $skip,
                    orderBy: timestamp,
                    orderDirection: asc,
                    where: {
                        ${positionFilter}${timeFilter}
                    }
                ) {
                    id
                    timestamp
                    blockNumber
                    transaction {
                        id
                    }
                    amount0
                    amount1
                    logIndex
                }
            }
        `;

        const allEvents: SubgraphPositionEvent[] = [];

        // Fetch all event types
        try {
            const [mintEvents, burnEvents, collectEvents] = await Promise.all([
                this.fetchAllPaginatedEvents(position.pool.chain, mintEventsQuery),
                this.fetchAllPaginatedEvents(position.pool.chain, burnEventsQuery),
                this.fetchAllPaginatedEvents(position.pool.chain, collectEventsQuery)
            ]);

            allEvents.push(...mintEvents, ...burnEvents, ...collectEvents);
        } catch (error) {
            console.error('Error fetching events from subgraph:', error);
            throw new Error(`Failed to fetch position events: ${error.message}`);
        }

        return allEvents;
    }

    /**
     * Fetch all events with pagination
     */
    private async fetchAllPaginatedEvents(
        chain: string, 
        query: string
    ): Promise<SubgraphPositionEvent[]> {
        const allEvents: SubgraphPositionEvent[] = [];
        let skip = 0;
        const first = 1000; // Subgraph limit

        while (true) {
            try {
                const response = await this.subgraphService.query(chain, query, { first, skip });
                
                // Extract events from response (adapt based on query type)
                const events = response.data?.mints || 
                              response.data?.burns || 
                              response.data?.collects || [];

                if (events.length === 0) {
                    break; // No more events
                }

                allEvents.push(...events);
                skip += first;

                // Safety check to prevent infinite loops
                if (skip > 50000) {
                    console.warn('Event pagination limit reached');
                    break;
                }
            } catch (error) {
                console.error('Pagination error:', error);
                break;
            }
        }

        return allEvents;
    }

    /**
     * Process and store a single event
     */
    private async processAndStoreEvent(
        positionId: string, 
        event: SubgraphPositionEvent,
        position: any
    ): Promise<{ isNew: boolean }> {
        const eventDate = new Date(parseInt(event.timestamp) * 1000);
        const transactionHash = event.transaction.id;

        // Parse event based on type
        const parsedEvent = this.parseSubgraphEvent(event);

        // Get historical price for this event
        let priceData: PriceDataPoint;
        try {
            priceData = await this.historicalPriceService.getPrice(
                position.pool.id,
                eventDate
            );
        } catch (error) {
            console.warn(`Failed to get historical price for event ${event.id}:`, error.message);
            // Use fallback pricing strategy
            priceData = {
                timestamp: eventDate,
                price: "0", // Will be handled by valuation logic
                tick: 0,
                source: 'current',
                confidence: 'estimated'
            };
        }

        // Calculate value in quote token
        const { valueInQuote, feeValueInQuote } = await this.calculateEventValue(
            parsedEvent,
            priceData,
            position
        );

        // Check if event already exists (deduplication)
        const existingEvent = await prisma.positionEvent.findFirst({
            where: {
                positionId,
                transactionHash,
                eventType: parsedEvent.eventType
            }
        });

        const eventData = {
            positionId,
            eventType: parsedEvent.eventType,
            timestamp: eventDate,
            blockNumber: parseInt(event.blockNumber),
            transactionHash,
            liquidityDelta: parsedEvent.liquidityDelta,
            token0Delta: parsedEvent.token0Delta,
            token1Delta: parsedEvent.token1Delta,
            collectedFee0: parsedEvent.collectedFee0 || null,
            collectedFee1: parsedEvent.collectedFee1 || null,
            poolPrice: priceData.price,
            tick: priceData.tick,
            valueInQuote,
            feeValueInQuote: feeValueInQuote || null,
            source: 'subgraph',
            confidence: priceData.confidence
        };

        if (existingEvent) {
            // Update existing event
            await prisma.positionEvent.update({
                where: { id: existingEvent.id },
                data: eventData
            });
            return { isNew: false };
        } else {
            // Create new event
            await prisma.positionEvent.create({
                data: eventData
            });
            return { isNew: true };
        }
    }

    /**
     * Parse Subgraph event into standardized format
     */
    private parseSubgraphEvent(event: SubgraphPositionEvent): ParsedPositionEvent {
        // Determine event type based on available fields
        if (event.amount0Collected !== undefined || event.amount1Collected !== undefined) {
            return {
                eventType: 'COLLECT',
                timestamp: new Date(parseInt(event.timestamp) * 1000),
                blockNumber: parseInt(event.blockNumber),
                transactionHash: event.transaction.id,
                liquidityDelta: '0',
                token0Delta: '0',
                token1Delta: '0',
                collectedFee0: event.amount0Collected || '0',
                collectedFee1: event.amount1Collected || '0'
            };
        }

        if (event.liquidity !== undefined) {
            // IncreaseLiquidity event
            return {
                eventType: 'INCREASE', // Will be marked as CREATE for first event
                timestamp: new Date(parseInt(event.timestamp) * 1000),
                blockNumber: parseInt(event.blockNumber),
                transactionHash: event.transaction.id,
                liquidityDelta: event.liquidity,
                token0Delta: event.amount0 || '0',
                token1Delta: event.amount1 || '0'
            };
        }

        if (event.liquidityAmount !== undefined) {
            // DecreaseLiquidity event
            return {
                eventType: 'DECREASE', // Will be marked as CLOSE if liquidity goes to 0
                timestamp: new Date(parseInt(event.timestamp) * 1000),
                blockNumber: parseInt(event.blockNumber),
                transactionHash: event.transaction.id,
                liquidityDelta: `-${event.liquidityAmount}`,
                token0Delta: `-${event.amount0Removed || '0'}`,
                token1Delta: `-${event.amount1Removed || '0'}`
            };
        }

        throw new Error(`Unknown event type for event ${event.id}`);
    }

    /**
     * Calculate event value in quote token
     */
    private async calculateEventValue(
        event: ParsedPositionEvent,
        priceData: PriceDataPoint,
        position: any
    ): Promise<{ valueInQuote: string; feeValueInQuote?: string }> {
        // Get quote token configuration
        const token0Data = position.pool.token0Ref.globalToken || position.pool.token0Ref.userToken;
        const token1Data = position.pool.token1Ref.globalToken || position.pool.token1Ref.userToken;
        
        const quoteConfig = determineQuoteToken(
            token0Data.symbol,
            token0Data.address,
            token1Data.symbol,
            token1Data.address,
            position.pool.chain
        );

        const token0IsQuote = quoteConfig.token0IsQuote;
        const price = BigInt(priceData.price);

        // For COLLECT events, calculate fee value
        if (event.eventType === 'COLLECT' && (event.collectedFee0 || event.collectedFee1)) {
            const fee0 = BigInt(event.collectedFee0 || '0');
            const fee1 = BigInt(event.collectedFee1 || '0');

            let feeValueInQuote: bigint;
            if (token0IsQuote) {
                // Quote token is token0: value = fee0 + (fee1 * price)
                feeValueInQuote = fee0 + (fee1 * price) / (10n ** 18n);
            } else {
                // Quote token is token1: value = (fee0 * price) + fee1
                feeValueInQuote = (fee0 * price) / (10n ** 18n) + fee1;
            }

            return {
                valueInQuote: '0', // COLLECT events don't change position value
                feeValueInQuote: feeValueInQuote.toString()
            };
        }

        // For liquidity events, calculate position value change
        const token0Delta = BigInt(event.token0Delta);
        const token1Delta = BigInt(event.token1Delta);

        let valueInQuote: bigint;
        if (token0IsQuote) {
            // Quote token is token0: value = token0Delta + (token1Delta * price)
            valueInQuote = token0Delta + (token1Delta * price) / (10n ** 18n);
        } else {
            // Quote token is token1: value = (token0Delta * price) + token1Delta
            valueInQuote = (token0Delta * price) / (10n ** 18n) + token1Delta;
        }

        return {
            valueInQuote: valueInQuote.toString()
        };
    }

    /**
     * Determine if first IncreaseLiquidity should be marked as CREATE
     */
    private async determineEventType(
        positionId: string, 
        parsedEvent: ParsedPositionEvent
    ): Promise<'CREATE' | 'INCREASE' | 'DECREASE' | 'COLLECT' | 'CLOSE'> {
        if (parsedEvent.eventType === 'COLLECT') {
            return 'COLLECT';
        }

        if (parsedEvent.eventType === 'INCREASE') {
            // Check if this is the first liquidity event
            const existingEvents = await prisma.positionEvent.count({
                where: {
                    positionId,
                    eventType: { in: ['CREATE', 'INCREASE'] }
                }
            });
            
            return existingEvents === 0 ? 'CREATE' : 'INCREASE';
        }

        if (parsedEvent.eventType === 'DECREASE') {
            // Check if this completely closes the position
            // This would require knowing the total liquidity after this event
            // For now, we'll mark as DECREASE and potentially correct later
            return 'DECREASE';
        }

        return parsedEvent.eventType;
    }

    /**
     * Get sync status for a position
     */
    async getSyncStatus(positionId: string): Promise<{
        lastSync?: Date;
        eventCount: number;
        oldestEvent?: Date;
        newestEvent?: Date;
    }> {
        const position = await prisma.position.findUnique({
            where: { id: positionId },
            select: {
                lastEventSync: true,
                totalEventsCount: true
            }
        });

        if (!position) {
            throw new Error(`Position ${positionId} not found`);
        }

        const eventStats = await prisma.positionEvent.aggregate({
            where: { positionId },
            _count: true,
            _min: { timestamp: true },
            _max: { timestamp: true }
        });

        return {
            lastSync: position.lastEventSync || undefined,
            eventCount: eventStats._count || 0,
            oldestEvent: eventStats._min.timestamp || undefined,
            newestEvent: eventStats._max.timestamp || undefined
        };
    }
}

// Singleton instance
let eventSyncServiceInstance: EventSyncService | null = null;

export function getEventSyncService(): EventSyncService {
    if (!eventSyncServiceInstance) {
        eventSyncServiceInstance = new EventSyncService();
    }
    return eventSyncServiceInstance;
}
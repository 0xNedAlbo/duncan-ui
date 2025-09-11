import { prisma } from '@/lib/prisma';
import { getSubgraphService } from '../subgraph';
import { getHistoricalPriceService, PriceDataPoint } from './historicalPriceService';
import { determineQuoteToken } from './quoteTokenService';
import { getEtherscanEventService } from '../events/etherscanEventService';
import type { ParsedNftEvent } from '../events/types';
import type { ChainSlug } from '../events/constants';

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
    transaction: {
        id: string;
        blockNumber: string;
    };
    // Common fields for all event types
    amount?: string;      // Liquidity amount for mint/burn events
    amount0?: string;     // Token0 amount
    amount1?: string;     // Token1 amount
    // Event type (added during processing)
    eventSource?: 'mint' | 'burn' | 'collect';
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
    private readonly etherscanEventService = getEtherscanEventService();

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
            
            // Sync events from Etherscan (fallback to Subgraph on failure)
            const events = await this.fetchPositionEventsFromEtherscan(position, lastSync);
            
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
     * Fetch position events from Etherscan API (primary method)
     */
    private async fetchPositionEventsFromEtherscan(
        position: any,
        lastSync?: Date
    ): Promise<SubgraphPositionEvent[]> {
        try {
            const chain = position.pool.chain as ChainSlug;
            const tokenId = position.nftId;
            
            console.log('🔍 EventSync Debug - Fetching events via Etherscan API:', {
                chain,
                tokenId,
                poolAddress: position.pool.poolAddress,
                lastSync: lastSync?.toISOString()
            });

            // Determine from block based on last sync
            let fromBlock: number | 'earliest' = 'earliest';
            if (lastSync) {
                // Convert timestamp to approximate block number
                // This is a rough approximation - Etherscan API is efficient enough to handle full range
                const timeDiff = (Date.now() - lastSync.getTime()) / 1000; // seconds
                const avgBlockTime = chain === 'ethereum' ? 12 : 2; // rough block times
                const blocksBack = Math.floor(timeDiff / avgBlockTime);
                
                // Get current block and subtract estimated blocks
                // For now, use 'earliest' for reliability - API is fast enough
                fromBlock = 'earliest';
            }

            // Fetch events from Etherscan
            const result = await this.etherscanEventService.fetchPositionEvents(
                chain,
                tokenId,
                {
                    fromBlock,
                    toBlock: 'latest',
                    eventTypes: ['INCREASE_LIQUIDITY', 'DECREASE_LIQUIDITY', 'COLLECT']
                }
            );

            console.log('🔍 EventSync Debug - Etherscan API results:', {
                eventsFound: result.events.length,
                queryDuration: result.queryDuration,
                errors: result.errors
            });

            // Convert Etherscan events to SubgraphPositionEvent format
            const subgraphEvents: SubgraphPositionEvent[] = result.events.map(event => 
                this.convertEtherscanToSubgraphEvent(event)
            );

            return subgraphEvents;

        } catch (error) {
            console.error('❌ Etherscan event fetching failed:', error);
            
            // Re-throw the error instead of falling back to broken subgraph method
            throw new Error(`Failed to fetch events from Etherscan: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Convert Etherscan event to SubgraphPositionEvent format
     */
    private convertEtherscanToSubgraphEvent(event: ParsedNftEvent): SubgraphPositionEvent {
        const baseEvent = {
            id: `${event.transactionHash}-${event.logIndex}`,
            timestamp: Math.floor(event.timestamp.getTime() / 1000).toString(),
            transaction: {
                id: event.transactionHash,
                blockNumber: event.blockNumber.toString()
            }
        };

        switch (event.eventType) {
            case 'INCREASE_LIQUIDITY':
                return {
                    ...baseEvent,
                    amount: event.liquidity,
                    amount0: event.amount0,
                    amount1: event.amount1,
                    eventSource: 'mint'
                };

            case 'DECREASE_LIQUIDITY':
                return {
                    ...baseEvent,
                    amount: event.liquidity,
                    amount0: event.amount0,
                    amount1: event.amount1,
                    eventSource: 'burn'
                };

            case 'COLLECT':
                return {
                    ...baseEvent,
                    amount0: event.amount0,
                    amount1: event.amount1,
                    eventSource: 'collect'
                };

            default:
                throw new Error(`Unsupported event type: ${event.eventType}`);
        }
    }

    /**
     * Fetch position events from Uniswap V3 Subgraph (fallback method)
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

        // Construct where clause for event filtering using correct V3 subgraph schema
        const positionFilter = `
            pool: "${poolAddress}",
            tickLower: ${tickLower},
            tickUpper: ${tickUpper}${owner ? `,
            owner: "${owner}"` : ''}
        `.trim();

        // Add timestamp filter for incremental sync
        let timeFilter = '';
        if (lastSync) {
            const timestamp = Math.floor(lastSync.getTime() / 1000);
            const now = Math.floor(Date.now() / 1000);
            
            // Safety check: if lastSync is in the future, ignore it and do full sync
            if (timestamp > now) {
                console.log('🔍 EventSync Debug - lastSync is in the future, ignoring:', new Date(lastSync).toISOString());
                console.log('🔍 EventSync Debug - Doing full sync instead');
                timeFilter = '';
            } else {
                timeFilter = `, timestamp_gt: "${timestamp}"`;
                console.log('🔍 EventSync Debug - Using incremental sync from:', new Date(lastSync).toISOString());
            }
        } else {
            console.log('🔍 EventSync Debug - Full sync (no timestamp filter)');
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
                    transaction {
                        id
                        blockNumber
                    }
                    amount
                    amount0
                    amount1
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
                    transaction {
                        id
                        blockNumber
                    }
                    amount
                    amount0
                    amount1
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
                    transaction {
                        id
                        blockNumber
                    }
                    amount0
                    amount1
                }
            }
        `;

        const allEvents: SubgraphPositionEvent[] = [];

        // Debug logging
        console.log('🔍 EventSync Debug - Position data:', {
            chain: position.pool.chain,
            poolAddress,
            tickLower,
            tickUpper,
            owner,
            nftId
        });
        
        console.log('🔍 EventSync Debug - Address comparison:', {
            ownerFromDB: position.owner,
            ownerLowercase: owner,
            ownerLength: owner?.length,
            hasOwner: !!owner
        });
        console.log('🔍 EventSync Debug - Mint query:', mintEventsQuery);

        // Fetch all event types
        try {
            const [mintEvents, burnEvents, collectEvents] = await Promise.all([
                this.fetchAllPaginatedEvents(position.pool.chain, mintEventsQuery, 'mint'),
                this.fetchAllPaginatedEvents(position.pool.chain, burnEventsQuery, 'burn'),
                this.fetchAllPaginatedEvents(position.pool.chain, collectEventsQuery, 'collect')
            ]);

            console.log('🔍 EventSync Debug - Results:', {
                mintEvents: mintEvents.length,
                burnEvents: burnEvents.length,
                collectEvents: collectEvents.length
            });

            allEvents.push(...mintEvents, ...burnEvents, ...collectEvents);
        } catch (error) {
            console.error('❌ Error fetching events from subgraph:', error);
            throw new Error(`Failed to fetch position events: ${error.message}`);
        }

        return allEvents;
    }

    /**
     * Fetch all events with pagination
     */
    private async fetchAllPaginatedEvents(
        chain: string, 
        query: string,
        eventSource: 'mint' | 'burn' | 'collect'
    ): Promise<SubgraphPositionEvent[]> {
        const allEvents: SubgraphPositionEvent[] = [];
        let skip = 0;
        const first = 1000; // Subgraph limit

        while (true) {
            try {
                const response = await this.subgraphService.query(chain, query, { first, skip });
                
                console.log(`🔍 EventSync Debug - Subgraph response for ${eventSource}:`, {
                    hasData: !!response.data,
                    hasError: !!response.errors,
                    dataKeys: response.data ? Object.keys(response.data) : [],
                    errors: response.errors
                });
                
                // Extract events from response based on event type
                const events = response.data?.mints || 
                              response.data?.burns || 
                              response.data?.collects || [];

                console.log(`🔍 EventSync Debug - Found ${events.length} ${eventSource} events in this batch`);

                if (events.length === 0) {
                    break; // No more events
                }

                // Tag events with their source type
                const taggedEvents = events.map((event: any) => ({
                    ...event,
                    eventSource
                }));

                allEvents.push(...taggedEvents);
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
                position.pool.poolAddress,
                eventDate,
                position.pool.chain
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
            blockNumber: parseInt(event.transaction.blockNumber),
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
        const timestamp = new Date(parseInt(event.timestamp) * 1000);
        const blockNumber = parseInt(event.transaction.blockNumber);
        const transactionHash = event.transaction.id;
        
        if (!event.eventSource) {
            throw new Error(`Event source not specified for event ${event.id}`);
        }
        
        switch (event.eventSource) {
            case 'mint':
                return {
                    eventType: 'INCREASE', // Will be marked as CREATE for first event
                    timestamp,
                    blockNumber,
                    transactionHash,
                    liquidityDelta: event.amount || '0',
                    token0Delta: event.amount0 || '0',
                    token1Delta: event.amount1 || '0'
                };
                
            case 'burn':
                return {
                    eventType: 'DECREASE', // Will be marked as CLOSE if liquidity goes to 0
                    timestamp,
                    blockNumber,
                    transactionHash,
                    liquidityDelta: `-${event.amount || '0'}`,
                    token0Delta: `-${event.amount0 || '0'}`,
                    token1Delta: `-${event.amount1 || '0'}`
                };
                
            case 'collect':
                return {
                    eventType: 'COLLECT',
                    timestamp,
                    blockNumber,
                    transactionHash,
                    liquidityDelta: '0',
                    token0Delta: '0',
                    token1Delta: '0',
                    collectedFee0: event.amount0 || '0',
                    collectedFee1: event.amount1 || '0'
                };
                
            default:
                throw new Error(`Unknown event source: ${event.eventSource} for event ${event.id}`);
        }
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
        
        // Get correct token decimals
        const token0Decimals = token0Data.decimals;
        const token1Decimals = token1Data.decimals;
        const baseTokenDecimals = token0IsQuote ? token1Decimals : token0Decimals;

        // For COLLECT events, calculate fee value
        if (event.eventType === 'COLLECT' && (event.collectedFee0 || event.collectedFee1)) {
            const fee0 = BigInt(event.collectedFee0 || '0');
            const fee1 = BigInt(event.collectedFee1 || '0');

            let feeValueInQuote: bigint;
            if (token0IsQuote) {
                // Quote token is token0: value = fee0 + (fee1 * price) / baseTokenDecimals
                feeValueInQuote = fee0 + (fee1 * price) / (10n ** BigInt(baseTokenDecimals));
            } else {
                // Quote token is token1: value = (fee0 * price) / baseTokenDecimals + fee1
                feeValueInQuote = (fee0 * price) / (10n ** BigInt(baseTokenDecimals)) + fee1;
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
            // Quote token is token0: value = token0Delta + (token1Delta * price) / baseTokenDecimals
            valueInQuote = token0Delta + (token1Delta * price) / (10n ** BigInt(baseTokenDecimals));
        } else {
            // Quote token is token1: value = (token0Delta * price) / baseTokenDecimals + token1Delta
            valueInQuote = (token0Delta * price) / (10n ** BigInt(baseTokenDecimals)) + token1Delta;
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
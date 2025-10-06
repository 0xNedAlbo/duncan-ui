import { NextRequest, NextResponse } from "next/server";
import { withAuthAndLogging } from "@/app-shared/lib/api/withAuth";
import { logError } from "@/app-shared/lib/api/withLogging";
import { ApiServiceFactory } from "@/app-shared/lib/api/ApiServiceFactory";
import { SupportedChainsType, SUPPORTED_CHAINS } from "@/config/chains";
import type { PositionEventsResponse, PositionEvent as ApiPositionEvent } from "@/types/api";
import type { PositionEvent as DbPositionEvent } from "@prisma/client";

/**
 * GET /api/positions/uniswapv3/[chain]/[nft]/events - Get position events
 *
 * Returns paginated position events for a specific Uniswap V3 position including:
 * - Event history (CREATE, INCREASE, DECREASE, COLLECT, CLOSE)
 * - Token amounts and values in BigInt string format
 * - Transaction details and blockchain references
 * - Pagination and filtering support
 *
 * Query parameters:
 * - eventType: Filter by event type (optional)
 * - sortOrder: asc or desc (default: desc)
 * - limit: Number of events per page (default: 20, max: 100)
 * - offset: Pagination offset (default: 0)
 *
 * Path parameters:
 * - chain: Blockchain network (ethereum, arbitrum, base)
 * - nft: NFT token ID of the position
 */
export const GET = withAuthAndLogging<PositionEventsResponse>(
    async (
        request: NextRequest,
        { user, log },
        params?: { chain: string; nft: string }
    ) => {
        try {
            // Extract parameters from URL
            const chain = params?.chain as SupportedChainsType;
            const nftId = params?.nft;

            if (!chain || !nftId) {
                return NextResponse.json(
                    {
                        success: false,
                        error: "Chain and NFT ID are required",
                        meta: {
                            requestedAt: new Date().toISOString(),
                            protocol: 'uniswapv3' as const,
                            chain: chain || 'unknown',
                            nftId: nftId || 'unknown',
                            filters: { eventType: null, sortOrder: 'desc' }
                        }
                    },
                    { status: 400 }
                );
            }

            // Validate chain parameter
            if (!SUPPORTED_CHAINS.includes(chain)) {
                return NextResponse.json(
                    {
                        success: false,
                        error: `Invalid chain parameter. Supported chains: ${SUPPORTED_CHAINS.join(
                            ", "
                        )}`,
                        meta: {
                            requestedAt: new Date().toISOString(),
                            protocol: 'uniswapv3' as const,
                            chain,
                            nftId,
                            filters: { eventType: null, sortOrder: 'desc' }
                        }
                    },
                    { status: 400 }
                );
            }

            // Validate NFT ID format (should be numeric)
            if (!/^\d+$/.test(nftId)) {
                return NextResponse.json(
                    {
                        success: false,
                        error: "Invalid NFT ID format. Must be a positive integer.",
                        meta: {
                            requestedAt: new Date().toISOString(),
                            protocol: 'uniswapv3' as const,
                            chain,
                            nftId,
                            filters: { eventType: null, sortOrder: 'desc' }
                        }
                    },
                    { status: 400 }
                );
            }

            // Parse query parameters
            const url = new URL(request.url);
            const eventType = url.searchParams.get('eventType') as ApiPositionEvent['eventType'] | null;
            const sortOrder = (url.searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
            const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
            const offset = parseInt(url.searchParams.get('offset') || '0');

            log.debug(
                { chain, nftId, userId: user.userId, eventType, sortOrder, limit, offset },
                "Fetching position events"
            );

            // Get service instances
            const apiFactory = ApiServiceFactory.getInstance();
            const positionService = apiFactory.positionService;
            const positionLedgerService = apiFactory.positionLedgerService;

            // Find the position by user ID, chain, and NFT ID
            const position = await positionService.getPositionByUserChainAndNft(
                user.userId,
                chain,
                nftId
            );

            if (!position) {
                log.debug(
                    { chain, nftId, userId: user.userId },
                    "Position not found or not owned by user"
                );
                return NextResponse.json(
                    {
                        success: false,
                        error: "Position not found",
                        meta: {
                            requestedAt: new Date().toISOString(),
                            protocol: 'uniswapv3' as const,
                            chain,
                            nftId,
                            filters: { eventType: eventType || null, sortOrder }
                        }
                    },
                    { status: 404 }
                );
            }

            // Get events from position ledger service
            const eventsResult = await positionLedgerService.getPositionEvents(
                {
                    userId: user.userId,
                    chain: position.chain,
                    protocol: position.protocol,
                    nftId: position.nftId,
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
                },
                {
                    eventType: eventType || undefined,
                    sortOrder,
                    limit,
                    offset
                }
            );

            // Map database event types to API event types
            const mapEventType = (dbEventType: string): ApiPositionEvent['eventType'] => {
                switch (dbEventType) {
                    case 'INCREASE_LIQUIDITY':
                        return 'INCREASE';
                    case 'DECREASE_LIQUIDITY':
                        return 'DECREASE';
                    case 'COLLECT':
                        return 'COLLECT';
                    case 'CREATE':
                        return 'CREATE';
                    case 'CLOSE':
                        return 'CLOSE';
                    default:
                        log.warn({ dbEventType }, 'Unknown database event type, defaulting to CREATE');
                        return 'CREATE';
                }
            };

            // Transform database events to API format
            const apiEvents: ApiPositionEvent[] = eventsResult.events.map((dbEvent: DbPositionEvent) => {
                const mappedEventType = mapEventType(dbEvent.eventType);
                return {
                    id: dbEvent.id,
                    eventType: mappedEventType,
                    timestamp: dbEvent.blockTimestamp.toISOString(),
                    blockNumber: Number(dbEvent.blockNumber),
                    transactionHash: dbEvent.transactionHash,
                    liquidityDelta: dbEvent.deltaL,
                    token0Delta: dbEvent.token0Amount,
                    token1Delta: dbEvent.token1Amount,
                    collectedFee0: mappedEventType === 'COLLECT' ? dbEvent.feesCollected0 : undefined,
                    collectedFee1: mappedEventType === 'COLLECT' ? dbEvent.feesCollected1 : undefined,
                    poolPrice: dbEvent.poolPrice,
                    valueInQuote: dbEvent.tokenValueInQuote,
                    feeValueInQuote: mappedEventType === 'COLLECT' ? dbEvent.feeValueInQuote : undefined,
                    source: dbEvent.source as 'subgraph' | 'onchain' | 'manual',
                    confidence: 'exact' as const, // Default to exact for all database events
                    createdAt: dbEvent.createdAt.toISOString(),
                };
            });

            log.debug(
                {
                    chain: position.chain,
                    protocol: position.protocol,
                    nftId: position.nftId,
                    eventCount: apiEvents.length,
                    totalEvents: eventsResult.pagination.total,
                },
                "Successfully retrieved position events"
            );

            return NextResponse.json({
                success: true,
                data: {
                    events: apiEvents,
                    pagination: eventsResult.pagination,
                },
                meta: {
                    requestedAt: new Date().toISOString(),
                    protocol: 'uniswapv3' as const,
                    chain,
                    nftId,
                    filters: {
                        eventType: eventType || null,
                        sortOrder,
                    },
                },
            });
        } catch (error) {
            logError(log, error, {
                endpoint: "positions/uniswapv3/[chain]/[nft]/events",
                chain: params?.chain,
                nftId: params?.nft,
            });

            return NextResponse.json(
                {
                    success: false,
                    error: "Internal server error",
                    meta: {
                        requestedAt: new Date().toISOString(),
                        protocol: 'uniswapv3' as const,
                        chain: params?.chain || 'unknown',
                        nftId: params?.nft || 'unknown',
                        filters: { eventType: null, sortOrder: 'desc' }
                    }
                },
                { status: 500 }
            );
        }
    }
);
import { NextRequest, NextResponse } from "next/server";
import { withAuthAndLogging } from "@/app-shared/lib/api/withAuth";
import { logError } from "@/app-shared/lib/api/withLogging";
import { ApiServiceFactory } from "@/app-shared/lib/api/ApiServiceFactory";
import { SupportedChainsType, SUPPORTED_CHAINS } from "@/config/chains";
import { normalizeAddress, isValidAddress } from "@/lib/utils/evm";
import type { BasicPosition } from "@/services/positions/positionService";
import type { ApiResponse, PositionRefreshResponse } from "@/types/api";
import type { AprBreakdown } from "@/types/apr";
import type { CurveData } from "@/app-shared/components/charts/mini-pnl-curve";

/**
 * GET /api/positions/uniswapv3/[chain]/[nft] - Get position details
 *
 * Returns basic position information for a specific Uniswap V3 position including:
 * - Position metadata (ID, chain, NFT ID, liquidity, ticks)
 * - Pool information (address, fee, tokens)
 * - Token details (symbols, decimals, addresses)
 * - Position status and ownership
 *
 * Path parameters:
 * - chain: Blockchain network (ethereum, arbitrum, base)
 * - nft: NFT token ID of the position
 */
export const GET = withAuthAndLogging<ApiResponse<BasicPosition>>(
    async (
        _request: NextRequest,
        { user, log },
        params?: { chain: string; nft: string }
    ) => {
        try {
            // Extract parameters from URL
            const chain = params?.chain as SupportedChainsType;
            const nftId = params?.nft;

            if (!chain || !nftId) {
                return NextResponse.json(
                    { success: false, error: "Chain and NFT ID are required" },
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
                    },
                    { status: 400 }
                );
            }

            log.debug(
                { chain, nftId, userId: user.userId },
                "Fetching position details"
            );

            // Get service instance
            const apiFactory = ApiServiceFactory.getInstance();
            const positionService = apiFactory.positionService;

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
                    { success: false, error: "Position not found" },
                    { status: 404 }
                );
            }

            log.debug(
                {
                    chain: position.chain,
                    protocol: position.protocol,
                    nftId: position.nftId,
                    poolAddress: position.pool.poolAddress,
                    liquidity: position.liquidity,
                },
                "Successfully retrieved position details"
            );

            return NextResponse.json({
                success: true,
                data: position,
                meta: {
                    requestedAt: new Date().toISOString(),
                    chain: position.chain,
                    protocol: position.protocol,
                    nftId: position.nftId,
                },
            });
        } catch (error) {
            logError(log, error, {
                endpoint: "positions/uniswapv3/[chain]/[nft]",
                chain: params?.chain,
                nftId: params?.nft,
            });

            return NextResponse.json(
                { success: false, error: "Internal server error" },
                { status: 500 }
            );
        }
    }
);

/**
 * PUT /api/positions/uniswapv3/[chain]/[nft] - Create position optimistically
 *
 * Creates a Uniswap V3 position record in the database with minimal validation.
 * Useful for optimistic UI updates when opening a position on-chain.
 *
 * Path parameters:
 * - chain: Blockchain network (ethereum, arbitrum, base)
 * - nft: NFT token ID of the position
 *
 * Request body:
 * - poolAddress: Pool contract address (EIP-55 checksum format)
 * - tickLower: Lower tick boundary (integer)
 * - tickUpper: Upper tick boundary (integer)
 * - liquidity: Position liquidity as string (BigInt compatible)
 * - token0IsQuote: Whether token0 is the quote asset (boolean)
 * - owner: (optional) Wallet address of position owner
 */

interface CreatePositionRequestBody {
    // For position creation (wizard)
    poolAddress?: string;
    tickLower?: number;
    tickUpper?: number;
    liquidity?: string;
    token0IsQuote?: boolean;
    owner?: string;

    // For event seeding (action modals + wizard)
    events?: Array<{
        eventType: "INCREASE_LIQUIDITY" | "DECREASE_LIQUIDITY" | "COLLECT";
        transactionHash: string;
        blockNumber: string;
        transactionIndex: number;
        logIndex: number;
        liquidity?: string;
        amount0?: string;
        amount1?: string;
        recipient?: string;
    }>;
}

export const PUT = withAuthAndLogging<PositionRefreshResponse>(
    async (
        request: NextRequest,
        { user, log },
        params?: { chain: string; nft: string }
    ) => {
        try {
            // Extract path parameters
            const chain = params?.chain as SupportedChainsType;
            const nftId = params?.nft;

            if (!chain || !nftId) {
                return NextResponse.json(
                    {
                        success: false,
                        error: "Chain and NFT ID are required in path",
                        meta: {
                            requestedAt: new Date().toISOString(),
                            chain: '',
                            protocol: '',
                            nftId: '',
                            refreshedAt: new Date().toISOString()
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
                        error: `Invalid chain parameter. Supported chains: ${SUPPORTED_CHAINS.join(", ")}`,
                        meta: {
                            requestedAt: new Date().toISOString(),
                            chain: '',
                            protocol: '',
                            nftId: '',
                            refreshedAt: new Date().toISOString()
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
                            chain: '',
                            protocol: '',
                            nftId: '',
                            refreshedAt: new Date().toISOString()
                        }
                    },
                    { status: 400 }
                );
            }

            // Parse request body
            let body: CreatePositionRequestBody;
            try {
                body = await request.json() as CreatePositionRequestBody;
            } catch {
                return NextResponse.json(
                    {
                        success: false,
                        error: "Invalid JSON in request body",
                        meta: {
                            requestedAt: new Date().toISOString(),
                            chain: '',
                            protocol: '',
                            nftId: '',
                            refreshedAt: new Date().toISOString()
                        }
                    },
                    { status: 400 }
                );
            }

            // Validate required fields
            const { poolAddress, tickLower, tickUpper, liquidity, token0IsQuote, owner } = body;

            const errorMeta = {
                requestedAt: new Date().toISOString(),
                chain: '',
                protocol: '',
                nftId: '',
                refreshedAt: new Date().toISOString()
            };

            if (!poolAddress || tickLower === undefined || tickUpper === undefined || !liquidity || token0IsQuote === undefined) {
                return NextResponse.json(
                    {
                        success: false,
                        error: "Missing required fields: poolAddress, tickLower, tickUpper, liquidity, token0IsQuote",
                        meta: errorMeta
                    },
                    { status: 400 }
                );
            }

            // Validate pool address
            if (!isValidAddress(poolAddress)) {
                return NextResponse.json(
                    {
                        success: false,
                        error: "Invalid pool address format",
                        meta: errorMeta
                    },
                    { status: 400 }
                );
            }

            // Validate owner address if provided
            if (owner && !isValidAddress(owner)) {
                return NextResponse.json(
                    {
                        success: false,
                        error: "Invalid owner address format",
                        meta: errorMeta
                    },
                    { status: 400 }
                );
            }

            // Validate tick values
            if (!Number.isInteger(tickLower) || !Number.isInteger(tickUpper)) {
                return NextResponse.json(
                    {
                        success: false,
                        error: "Tick values must be integers",
                        meta: errorMeta
                    },
                    { status: 400 }
                );
            }

            if (tickLower >= tickUpper) {
                return NextResponse.json(
                    {
                        success: false,
                        error: "tickLower must be less than tickUpper",
                        meta: errorMeta
                    },
                    { status: 400 }
                );
            }

            // Validate liquidity format (should be numeric string for BigInt)
            if (!/^\d+$/.test(liquidity)) {
                return NextResponse.json(
                    {
                        success: false,
                        error: "Invalid liquidity format. Must be a positive integer string.",
                        meta: errorMeta
                    },
                    { status: 400 }
                );
            }

            // Normalize addresses
            const normalizedPoolAddress = normalizeAddress(poolAddress);
            const normalizedOwner = owner ? normalizeAddress(owner) : undefined;

            log.debug(
                { chain, nftId, poolAddress: normalizedPoolAddress, userId: user.userId },
                "Creating position optimistically"
            );

            // Get service instance
            const apiFactory = ApiServiceFactory.getInstance();
            const positionService = apiFactory.positionService;

            // Check for duplicate position
            const positionId = {
                userId: user.userId,
                chain,
                protocol: "uniswapv3" as const,
                nftId
            };

            const existingPosition = await positionService.getPosition(positionId);

            if (existingPosition) {
                // UPDATE PATH - Position exists, seed events and return full data
                log.debug(
                    { chain, nftId, userId: user.userId, eventsCount: body.events?.length || 0 },
                    "Position exists - updating with events"
                );

                // Seed events if provided
                if (body.events && body.events.length > 0) {
                    const ledgerService = apiFactory.positionLedgerService;

                    // Position info for seeding
                    const positionInfo = {
                        userId: user.userId,
                        chain,
                        protocol: "uniswapv3" as const,
                        nftId,
                        token0IsQuote: existingPosition.token0IsQuote,
                        pool: {
                            poolAddress: existingPosition.pool.poolAddress,
                            chain,
                            token0: { decimals: existingPosition.pool.token0.decimals },
                            token1: { decimals: existingPosition.pool.token1.decimals }
                        }
                    };

                    for (const event of body.events) {
                        try {
                            await ledgerService.seedEvent(positionInfo, event);
                            log.debug(
                                { chain, nftId, eventType: event.eventType },
                                "Seeded event successfully"
                            );
                        } catch (error) {
                            log.warn(
                                { chain, nftId, eventType: event.eventType, error },
                                "Failed to seed event - continuing"
                            );
                        }
                    }
                }

                // Update position with new liquidity if provided
                if (liquidity) {
                    const status = BigInt(liquidity) === 0n ? 'closed' : 'active';
                    await positionService.updatePosition(positionId, {
                        liquidity,
                        status
                    });

                    log.debug(
                        { chain, nftId, newLiquidity: liquidity, status },
                        "Updated position liquidity"
                    );
                }

                // Invalidate PnL cache to force recalculation with new events
                await apiFactory.positionPnLService.invalidateCache(positionId);

                // Calculate fresh data
                let pnlBreakdown = null;
                let aprBreakdown: AprBreakdown | undefined = undefined;
                let curveData: CurveData | undefined = undefined;

                // Calculate PnL breakdown
                try {
                    pnlBreakdown = await apiFactory.positionPnLService.getPnlBreakdown(positionId);
                } catch (error) {
                    log.debug({ chain, nftId, error }, "PnL calculation failed");
                }

                // Calculate APR breakdown if PnL succeeded
                if (pnlBreakdown) {
                    try {
                        aprBreakdown = await apiFactory.positionAprService.getAprBreakdown(
                            positionId,
                            pnlBreakdown.unclaimedFees
                        );
                    } catch (error) {
                        log.debug({ chain, nftId, error }, "APR calculation failed");
                    }
                }

                // Calculate curve data
                try {
                    if (apiFactory.curveDataService.validatePosition(existingPosition)) {
                        curveData = await apiFactory.curveDataService.getCurveData(existingPosition);
                    }
                } catch (error) {
                    log.debug({ chain, nftId, error }, "Curve calculation failed");
                }

                // Return full position data with updated metrics
                return NextResponse.json({
                    success: true,
                    data: {
                        position: existingPosition,
                        pnlBreakdown,
                        aprBreakdown,
                        curveData
                    },
                    meta: {
                        requestedAt: new Date().toISOString(),
                        chain,
                        protocol: "uniswapv3",
                        nftId,
                        existed: true,
                        refreshedAt: pnlBreakdown?.calculatedAt?.toISOString() || new Date().toISOString()
                    }
                });
            }

            // Ensure pool exists (creates if not found, updates if exists)
            const poolService = apiFactory.poolService;
            try {
                await poolService.createPool(chain, normalizedPoolAddress);
            } catch (error) {
                log.error({
                    chain,
                    poolAddress: normalizedPoolAddress,
                    error: error instanceof Error ? error.message : "Unknown error"
                }, "Failed to create or update pool");

                return NextResponse.json(
                    {
                        success: false,
                        error: "Failed to load pool data from blockchain",
                        meta: {
                            requestedAt: new Date().toISOString(),
                            chain,
                            protocol: "uniswapv3",
                            nftId,
                            refreshedAt: new Date().toISOString()
                        }
                    },
                    { status: 500 }
                );
            }

            // Create the position optimistically
            const createdPosition = await positionService.createPosition({
                chain,
                protocol: "uniswapv3",
                nftId,
                userId: user.userId,
                poolChain: chain,
                poolAddress: normalizedPoolAddress,
                tickLower,
                tickUpper,
                liquidity,
                token0IsQuote,
                owner: normalizedOwner,
                importType: "nft",
                status: "active"
            });

            log.debug(
                {
                    chain: createdPosition.chain,
                    protocol: createdPosition.protocol,
                    nftId: createdPosition.nftId,
                    poolAddress: createdPosition.pool.poolAddress,
                    liquidity: createdPosition.liquidity,
                    userId: user.userId
                },
                "Position created successfully"
            );

            // Seed events if provided
            if (body.events && body.events.length > 0) {
                const ledgerService = apiFactory.positionLedgerService;

                // Position info for seeding
                const positionInfo = {
                    userId: user.userId,
                    chain,
                    protocol: "uniswapv3" as const,
                    nftId,
                    token0IsQuote: createdPosition.token0IsQuote,
                    pool: {
                        poolAddress: createdPosition.pool.poolAddress,
                        chain: createdPosition.pool.chain,
                        token0: { decimals: createdPosition.pool.token0.decimals },
                        token1: { decimals: createdPosition.pool.token1.decimals }
                    }
                };

                for (const event of body.events) {
                    try {
                        await ledgerService.seedEvent(positionInfo, event);
                        log.debug(
                            { chain, nftId, eventType: event.eventType },
                            'Seeded event successfully'
                        );
                    } catch (error) {
                        // Non-fatal - scheduled refresh will sync eventually
                        log.warn(
                            { chain, nftId, eventType: event.eventType, error },
                            'Failed to seed event - scheduled refresh will handle'
                        );
                    }
                }
            }

            // Calculate full position data (matching refresh endpoint)
            // Note: positionId already declared at line 345
            let pnlBreakdown = null;
            let aprBreakdown: AprBreakdown | undefined = undefined;
            let curveData: CurveData | undefined = undefined;

            // Calculate PnL breakdown
            try {
                pnlBreakdown = await apiFactory.positionPnLService.getPnlBreakdown(positionId);
                log.debug(
                    { chain, nftId, costBasis: pnlBreakdown?.currentCostBasis },
                    'Calculated PnL breakdown'
                );
            } catch (error) {
                log.debug(
                    { chain, nftId, error: error instanceof Error ? error.message : 'Unknown' },
                    'PnL calculation failed'
                );
            }

            // Calculate APR breakdown if PnL succeeded
            if (pnlBreakdown) {
                try {
                    const unclaimedFees = pnlBreakdown.unclaimedFees;
                    aprBreakdown = await apiFactory.positionAprService.getAprBreakdown(
                        positionId,
                        unclaimedFees
                    );
                    log.debug({ chain, nftId }, 'Calculated APR breakdown');
                } catch (error) {
                    log.debug(
                        { chain, nftId, error: error instanceof Error ? error.message : 'Unknown' },
                        'APR calculation failed'
                    );
                }
            }

            // Calculate curve data
            try {
                if (apiFactory.curveDataService.validatePosition(createdPosition)) {
                    curveData = await apiFactory.curveDataService.getCurveData(createdPosition);
                    log.debug({ chain, nftId }, 'Calculated curve data');
                }
            } catch (error) {
                log.debug(
                    { chain, nftId, error: error instanceof Error ? error.message : 'Unknown' },
                    'Curve calculation failed'
                );
            }

            // Return full position data (matching refresh endpoint structure)
            return NextResponse.json({
                success: true,
                data: {
                    position: createdPosition,
                    pnlBreakdown,
                    aprBreakdown,
                    curveData
                },
                meta: {
                    requestedAt: new Date().toISOString(),
                    chain,
                    protocol: "uniswapv3",
                    nftId,
                    existed: false,
                    refreshedAt: pnlBreakdown?.calculatedAt?.toISOString() || new Date().toISOString()
                }
            });

        } catch (error) {
            logError(log, error, {
                endpoint: "positions/uniswapv3/[chain]/[nft]",
                method: "PUT",
                chain: params?.chain,
                nftId: params?.nft
            });

            return NextResponse.json(
                {
                    success: false,
                    error: "Internal server error",
                    meta: {
                        requestedAt: new Date().toISOString(),
                        chain: params?.chain || '',
                        protocol: "uniswapv3",
                        nftId: params?.nft || '',
                        refreshedAt: new Date().toISOString()
                    }
                },
                { status: 500 }
            );
        }
    }
);

/**
 * DELETE /api/positions/uniswapv3/[chain]/[nft] - Delete a position
 *
 * Deletes a specific Uniswap V3 position owned by the authenticated user.
 * The database will handle cascading deletes for related data.
 *
 * Path parameters:
 * - chain: Blockchain network (ethereum, arbitrum, base)
 * - nft: NFT token ID of the position
 */
export const DELETE = withAuthAndLogging<{ success: boolean; message?: string; error?: string }>(
    async (
        _request: NextRequest,
        { user, log },
        params?: { chain: string; nft: string }
    ) => {
        try {
            // Extract and validate parameters
            const chain = params?.chain as SupportedChainsType;
            const nftId = params?.nft;

            if (!chain || !nftId) {
                return NextResponse.json(
                    {
                        success: false,
                        error: 'Missing required parameters: chain and nft ID'
                    },
                    { status: 400 }
                );
            }

            // Validate chain parameter
            if (!SUPPORTED_CHAINS.includes(chain)) {
                return NextResponse.json(
                    {
                        success: false,
                        error: `Invalid chain parameter. Supported chains: ${SUPPORTED_CHAINS.join(', ')}`
                    },
                    { status: 400 }
                );
            }

            // Validate NFT ID format (should be numeric string)
            if (!/^\d+$/.test(nftId)) {
                return NextResponse.json(
                    {
                        success: false,
                        error: 'Invalid NFT ID format. Must be a numeric string.'
                    },
                    { status: 400 }
                );
            }

            log.debug({
                userId: user.userId,
                chain,
                nftId
            }, 'Starting position deletion');

            // Get service factory and position service
            const apiFactory = ApiServiceFactory.getInstance();
            const positionService = apiFactory.positionService;

            // Create position identifier for deletion
            const positionId = {
                userId: user.userId,
                chain,
                protocol: "uniswapv3" as const,
                nftId
            };

            // Check if position exists and is owned by the user
            try {
                const existingPosition = await positionService.getPosition(positionId);

                if (!existingPosition) {
                    return NextResponse.json(
                        {
                            success: false,
                            error: 'Position not found or not owned by user'
                        },
                        { status: 404 }
                    );
                }

                // Verify ownership (additional safety check)
                if (existingPosition.userId !== user.userId) {
                    log.warn({
                        userId: user.userId,
                        positionUserId: existingPosition.userId,
                        chain,
                        nftId
                    }, 'User attempted to delete position owned by another user');

                    return NextResponse.json(
                        {
                            success: false,
                            error: 'Position not found or not owned by user'
                        },
                        { status: 404 }
                    );
                }

            } catch (error) {
                log.error({
                    userId: user.userId,
                    chain,
                    nftId,
                    error: error instanceof Error ? error.message : 'Unknown error'
                }, 'Failed to verify position ownership');

                return NextResponse.json(
                    {
                        success: false,
                        error: 'Position not found or not owned by user'
                    },
                    { status: 404 }
                );
            }

            // Delete the position
            try {
                await positionService.deletePosition(positionId);

                log.info({
                    userId: user.userId,
                    chain,
                    nftId
                }, 'Position successfully deleted');

                return NextResponse.json(
                    {
                        success: true,
                        message: 'Position deleted successfully'
                    },
                    { status: 200 }
                );

            } catch (error) {
                log.error({
                    userId: user.userId,
                    chain,
                    nftId,
                    error: error instanceof Error ? error.message : 'Unknown error'
                }, 'Failed to delete position');

                return NextResponse.json(
                    {
                        success: false,
                        error: 'Failed to delete position'
                    },
                    { status: 500 }
                );
            }

        } catch (error) {
            logError(log, error, {
                endpoint: 'positions/uniswapv3/[chain]/[nft]',
                method: 'DELETE',
                chain: params?.chain,
                nftId: params?.nft,
            });

            return NextResponse.json(
                {
                    success: false,
                    error: 'Internal server error'
                },
                { status: 500 }
            );
        }
    }
);
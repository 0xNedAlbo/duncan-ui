import { NextRequest, NextResponse } from "next/server";
import { withAuthAndLogging } from "@/app-shared/lib/api/withAuth";
import { logError } from "@/app-shared/lib/api/withLogging";
import { ApiServiceFactory } from "@/app-shared/lib/api/ApiServiceFactory";
import { SupportedChainsType, SUPPORTED_CHAINS } from "@/config/chains";
import { normalizeAddress, isValidAddress } from "@/lib/utils/evm";
import type { BasicPosition } from "@/services/positions/positionService";
import type { ApiResponse } from "@/types/api";

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
    poolAddress: string;
    tickLower: number;
    tickUpper: number;
    liquidity: string;
    token0IsQuote: boolean;
    owner?: string;
}

export const PUT = withAuthAndLogging<ApiResponse<BasicPosition>>(
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
                        error: "Chain and NFT ID are required in path"
                    },
                    { status: 400 }
                );
            }

            // Validate chain parameter
            if (!SUPPORTED_CHAINS.includes(chain)) {
                return NextResponse.json(
                    {
                        success: false,
                        error: `Invalid chain parameter. Supported chains: ${SUPPORTED_CHAINS.join(", ")}`
                    },
                    { status: 400 }
                );
            }

            // Validate NFT ID format (should be numeric)
            if (!/^\d+$/.test(nftId)) {
                return NextResponse.json(
                    {
                        success: false,
                        error: "Invalid NFT ID format. Must be a positive integer."
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
                        error: "Invalid JSON in request body"
                    },
                    { status: 400 }
                );
            }

            // Validate required fields
            const { poolAddress, tickLower, tickUpper, liquidity, token0IsQuote, owner } = body;

            if (!poolAddress || tickLower === undefined || tickUpper === undefined || !liquidity || token0IsQuote === undefined) {
                return NextResponse.json(
                    {
                        success: false,
                        error: "Missing required fields: poolAddress, tickLower, tickUpper, liquidity, token0IsQuote"
                    },
                    { status: 400 }
                );
            }

            // Validate pool address
            if (!isValidAddress(poolAddress)) {
                return NextResponse.json(
                    {
                        success: false,
                        error: "Invalid pool address format"
                    },
                    { status: 400 }
                );
            }

            // Validate owner address if provided
            if (owner && !isValidAddress(owner)) {
                return NextResponse.json(
                    {
                        success: false,
                        error: "Invalid owner address format"
                    },
                    { status: 400 }
                );
            }

            // Validate tick values
            if (!Number.isInteger(tickLower) || !Number.isInteger(tickUpper)) {
                return NextResponse.json(
                    {
                        success: false,
                        error: "Tick values must be integers"
                    },
                    { status: 400 }
                );
            }

            if (tickLower >= tickUpper) {
                return NextResponse.json(
                    {
                        success: false,
                        error: "tickLower must be less than tickUpper"
                    },
                    { status: 400 }
                );
            }

            // Validate liquidity format (should be numeric string for BigInt)
            if (!/^\d+$/.test(liquidity)) {
                return NextResponse.json(
                    {
                        success: false,
                        error: "Invalid liquidity format. Must be a positive integer string."
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
                log.debug(
                    { chain, nftId, userId: user.userId },
                    "Position already exists - returning existing position"
                );

                return NextResponse.json({
                    success: true,
                    data: existingPosition,
                    meta: {
                        requestedAt: new Date().toISOString(),
                        chain,
                        nftId,
                        existed: true
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
                        error: "Failed to load pool data from blockchain"
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

            return NextResponse.json({
                success: true,
                data: createdPosition,
                meta: {
                    requestedAt: new Date().toISOString(),
                    chain,
                    nftId,
                    existed: false
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
                    error: "Internal server error"
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
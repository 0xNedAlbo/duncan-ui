import { NextRequest, NextResponse } from "next/server";
import { withAuthAndLogging } from "@/lib/api/withAuth";
import { logError } from "@/lib/api/withLogging";
import { ApiServiceFactory } from "@/lib/api/ApiServiceFactory";
import { SupportedChainsType, SUPPORTED_CHAINS } from "@/config/chains";
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
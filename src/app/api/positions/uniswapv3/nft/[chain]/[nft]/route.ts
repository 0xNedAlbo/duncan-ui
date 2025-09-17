import { NextRequest, NextResponse } from "next/server";
import { withAuthAndLogging } from "@/lib/api/withAuth";
import { logError } from "@/lib/api/withLogging";
import { ApiServiceFactory } from "@/lib/api/ApiServiceFactory";
import { SupportedChainsType, SUPPORTED_CHAINS } from "@/config/chains";
import type { BasicPosition } from "@/services/positions/positionService";
import type { ApiResponse } from "@/types/api";

/**
 * GET /api/positions/uniswapv3/nft/[chain]/[nft] - Get position details
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
                    positionId: position.id,
                    chain,
                    nftId,
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
                    positionId: position.id,
                },
            });
        } catch (error) {
            logError(log, error, {
                endpoint: "positions/uniswapv3/nft/[chain]/[nft]",
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
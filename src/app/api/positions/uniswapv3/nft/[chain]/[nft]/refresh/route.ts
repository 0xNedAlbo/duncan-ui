import { NextRequest, NextResponse } from "next/server";
import { withAuthAndLogging } from "@/lib/api/withAuth";
import { logError } from "@/lib/api/withLogging";
import { ApiServiceFactory } from "@/lib/api/ApiServiceFactory";
import { SupportedChainsType, SUPPORTED_CHAINS } from "@/config/chains";
import type { PositionRefreshResponse } from "@/types/api";

/**
 * POST /api/positions/uniswapv3/nft/[chain]/[nft]/refresh - Refresh position data
 *
 * Refreshes position data by:
 * - Updating pool state with latest blockchain data
 * - Syncing position events from blockchain
 * - Invalidating cached PnL and curve data
 * - Recalculating PnL breakdown with fresh data
 * - Pre-calculating fresh curve data for visualization
 * - Updating cached position, PnL, and curve data
 *
 * Path parameters:
 * - chain: Blockchain network (ethereum, arbitrum, base)
 * - nft: NFT token ID of the position
 */
export const POST = withAuthAndLogging<PositionRefreshResponse>(
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
                            positionId: ""
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
                            positionId: ""
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
                            positionId: ""
                        }
                    },
                    { status: 400 }
                );
            }

            log.debug(
                { chain, nftId, userId: user.userId },
                "Starting position refresh"
            );

            // Get service instances
            const apiFactory = ApiServiceFactory.getInstance();
            const positionService = apiFactory.positionService;
            const positionPnLService = apiFactory.positionPnLService;
            const curveDataService = apiFactory.curveDataService;

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
                            positionId: ""
                        }
                    },
                    { status: 404 }
                );
            }

            // Invalidate existing caches to force fresh calculation
            await positionPnLService.invalidateCache(position.id);
            await curveDataService.invalidateCache(position.id);

            log.debug(
                { positionId: position.id },
                "Invalidated PnL and curve caches, starting fresh calculation"
            );

            // Trigger fresh PnL calculation - this handles:
            // - Pool state update via poolService.updatePoolState()
            // - Position events sync via positionLedgerService.syncPositionEvents()
            // - Fresh PnL calculation with current prices and unclaimed fees
            // - Cache update with new data
            const pnlBreakdown = await positionPnLService.getPnlBreakdown(
                position.id
            );

            // Fetch the updated position data
            const refreshedPosition = await positionService.getPosition(position.id);

            // Calculate fresh curve data and include in response
            // This eliminates the need for a separate curve data fetch
            let curveData = undefined;
            try {
                if (refreshedPosition && curveDataService.validatePosition(refreshedPosition)) {
                    curveData = await curveDataService.getCurveData(refreshedPosition);
                    log.debug(
                        { positionId: position.id },
                        "Successfully calculated fresh curve data for response"
                    );
                } else {
                    log.debug(
                        { positionId: position.id },
                        "Skipped curve data calculation due to invalid position data"
                    );
                }
            } catch (curveError) {
                // Log curve calculation error but don't fail the refresh
                log.debug(
                    { positionId: position.id, error: curveError },
                    "Failed to calculate curve data, but refresh completed successfully"
                );
            }

            log.debug(
                {
                    positionId: position.id,
                    chain,
                    nftId,
                    currentValue: pnlBreakdown.currentValue,
                    totalPnL: pnlBreakdown.totalPnL,
                    calculatedAt: pnlBreakdown.calculatedAt,
                    includedCurveData: !!curveData,
                },
                "Successfully refreshed position data"
            );

            return NextResponse.json({
                success: true,
                data: {
                    position: refreshedPosition,
                    pnlBreakdown: pnlBreakdown,
                    ...(curveData && { curveData }),
                },
                meta: {
                    requestedAt: new Date().toISOString(),
                    positionId: position.id,
                    refreshedAt: pnlBreakdown.calculatedAt.toISOString(),
                },
            });
        } catch (error) {
            logError(log, error, {
                endpoint: "positions/uniswapv3/nft/[chain]/[nft]/refresh",
                chain: params?.chain,
                nftId: params?.nft,
            });

            // Determine appropriate error response based on error type
            if (error instanceof Error) {
                if (error.message.includes("Position not found")) {
                    return NextResponse.json(
                        {
                            success: false,
                            error: "Position not found",
                            meta: {
                                requestedAt: new Date().toISOString(),
                                positionId: ""
                            }
                        },
                        { status: 404 }
                    );
                }

                if (error.message.includes("has no NFT ID")) {
                    return NextResponse.json(
                        {
                            success: false,
                            error: "Position refresh not available for this position type",
                            meta: {
                                requestedAt: new Date().toISOString(),
                                positionId: ""
                            }
                        },
                        { status: 422 }
                    );
                }

                if (error.message.includes("No RPC client available")) {
                    return NextResponse.json(
                        {
                            success: false,
                            error: "Blockchain data temporarily unavailable",
                            meta: {
                                requestedAt: new Date().toISOString(),
                                positionId: ""
                            }
                        },
                        { status: 503 }
                    );
                }

                if (error.message.includes("Pool data not available")) {
                    return NextResponse.json(
                        {
                            success: false,
                            error: "Pool data temporarily unavailable",
                            meta: {
                                requestedAt: new Date().toISOString(),
                                positionId: ""
                            }
                        },
                        { status: 503 }
                    );
                }
            }

            return NextResponse.json(
                {
                    success: false,
                    error: "Internal server error",
                    meta: {
                        requestedAt: new Date().toISOString(),
                        positionId: ""
                    }
                },
                { status: 500 }
            );
        }
    }
);

// Keep the cache clearing function for potential future use
export function clearRefreshCache() {
  // Cache clearing logic would go here in the future implementation
}
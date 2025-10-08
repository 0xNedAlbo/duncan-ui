import { NextRequest, NextResponse } from "next/server";
import { withAuthAndLogging } from "@/app-shared/lib/api/withAuth";
import { logError } from "@/app-shared/lib/api/withLogging";
import { ApiServiceFactory } from "@/app-shared/lib/api/ApiServiceFactory";
import { SupportedChainsType, SUPPORTED_CHAINS } from "@/config/chains";
import type { PositionRefreshResponse } from "@/types/api";

/**
 * POST /api/positions/uniswapv3/[chain]/[nft]/refresh - Refresh position data
 *
 * Refreshes position data by:
 * - Updating pool state with latest blockchain data
 * - Syncing position events from blockchain
 * - Invalidating cached PnL and curve data
 * - Recalculating PnL breakdown with fresh data
 * - Calculating fresh APR breakdown (realized vs unrealized)
 * - Pre-calculating fresh curve data for visualization
 * - Updating cached position, PnL, APR, and curve data
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
                            chain: "",
                            protocol: "",
                            nftId: "",
                            refreshedAt: new Date().toISOString(),
                        },
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
                            chain: "",
                            protocol: "",
                            nftId: "",
                            refreshedAt: new Date().toISOString(),
                        },
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
                            chain: "",
                            protocol: "",
                            nftId: "",
                            refreshedAt: new Date().toISOString(),
                        },
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
            const positionAprService = apiFactory.positionAprService;
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
                            chain: "",
                            protocol: "",
                            nftId: "",
                            refreshedAt: new Date().toISOString(),
                        },
                    },
                    { status: 404 }
                );
            }

            // Invalidate existing caches to force fresh calculation
            const positionId = {
                userId: user.userId,
                chain: position.chain,
                protocol: position.protocol,
                nftId: position.nftId,
            };
            await positionPnLService.invalidateCache(positionId);
            await curveDataService.invalidateCache(positionId);

            log.debug(
                {
                    chain: position.chain,
                    protocol: position.protocol,
                    nftId: position.nftId,
                },
                "Invalidated PnL and curve caches, starting fresh calculation"
            );

            try {
                await positionService.updatePositionOnChainData(positionId);
                log.debug(
                    {
                        chain: position.chain,
                        protocol: position.protocol,
                        nftId: position.nftId,
                    },
                    "Updated position on-chain data (liquidity, owner)"
                );
            } catch (error) {
                log.debug(
                    {
                        chain: position.chain,
                        protocol: position.protocol,
                        nftId: position.nftId,
                        error:
                            error instanceof Error
                                ? error.message
                                : String(error),
                    },
                    "Position on-chain data update failed, continuing with PnL calculation"
                );
            }

            // Trigger fresh PnL calculation - this handles:
            // - Pool state update via poolService.updatePoolState()
            // - Fresh PnL calculation with current prices and unclaimed fees
            // - Cache update with new data
            // Note: Event syncing is handled automatically by blockscanner worker
            let pnlBreakdown = null;
            try {
                pnlBreakdown = await positionPnLService.getPnlBreakdown(
                    positionId
                );
                log.debug(
                    {
                        chain: position.chain,
                        protocol: position.protocol,
                        nftId: position.nftId,
                    },
                    "Fresh PnL calculation completed"
                );
            } catch (error) {
                log.debug(
                    {
                        chain: position.chain,
                        protocol: position.protocol,
                        nftId: position.nftId,
                        error:
                            error instanceof Error
                                ? error.message
                                : String(error),
                    },
                    "PnL calculation failed during refresh"
                );
            }

            // Calculate fresh APR breakdown with or without PnL data
            let aprBreakdown = undefined;
            try {
                const unclaimedFees = pnlBreakdown?.unclaimedFees;
                aprBreakdown = await positionAprService.getAprBreakdown(
                    positionId,
                    unclaimedFees
                );
                log.debug(
                    {
                        chain: position.chain,
                        protocol: position.protocol,
                        nftId: position.nftId,
                        realizedApr: aprBreakdown.realizedApr,
                        unrealizedApr: aprBreakdown.unrealizedApr,
                    },
                    "Successfully calculated fresh APR breakdown"
                );
            } catch (aprError) {
                // Log APR calculation error but don't fail the refresh
                log.debug(
                    {
                        chain: position.chain,
                        protocol: position.protocol,
                        nftId: position.nftId,
                        error: aprError,
                    },
                    "Failed to calculate APR breakdown, but refresh completed successfully"
                );
            }

            // Fetch the updated position data
            const refreshedPosition = await positionService.getPosition(
                positionId
            );

            // Calculate fresh curve data and include in response
            // This eliminates the need for a separate curve data fetch
            let curveData = undefined;
            try {
                if (
                    refreshedPosition &&
                    curveDataService.validatePosition(refreshedPosition)
                ) {
                    curveData = await curveDataService.getCurveData(
                        refreshedPosition
                    );
                    log.debug(
                        {
                            chain: position.chain,
                            protocol: position.protocol,
                            nftId: position.nftId,
                        },
                        "Successfully calculated fresh curve data for response"
                    );
                } else {
                    log.debug(
                        {
                            chain: position.chain,
                            protocol: position.protocol,
                            nftId: position.nftId,
                        },
                        "Skipped curve data calculation due to invalid position data"
                    );
                }
            } catch (curveError) {
                // Log curve calculation error but don't fail the refresh
                log.debug(
                    {
                        chain: position.chain,
                        protocol: position.protocol,
                        nftId: position.nftId,
                        error: curveError,
                    },
                    "Failed to calculate curve data, but refresh completed successfully"
                );
            }

            log.debug(
                {
                    chain: position.chain,
                    protocol: position.protocol,
                    nftId: position.nftId,
                    currentValue: pnlBreakdown?.currentValue || "not available",
                    totalPnL: pnlBreakdown?.totalPnL || "not available",
                    calculatedAt:
                        pnlBreakdown?.calculatedAt?.toISOString() ||
                        "not available",
                    includedAprBreakdown: !!aprBreakdown,
                    aprRealizedApr: aprBreakdown?.realizedApr || 0,
                    aprUnrealizedApr: aprBreakdown?.unrealizedApr || 0,
                    includedCurveData: !!curveData,
                },
                "Successfully refreshed position data"
            );

            return NextResponse.json({
                success: true,
                data: {
                    position: refreshedPosition,
                    pnlBreakdown: pnlBreakdown,
                    ...(aprBreakdown && { aprBreakdown }),
                    ...(curveData && { curveData }),
                },
                meta: {
                    requestedAt: new Date().toISOString(),
                    chain: position.chain,
                    protocol: position.protocol,
                    nftId: position.nftId,
                    refreshedAt:
                        pnlBreakdown?.calculatedAt?.toISOString() ||
                        new Date().toISOString(),
                },
            });
        } catch (error) {
            logError(log, error, {
                endpoint: "positions/uniswapv3/[chain]/[nft]/refresh",
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
                                chain: "",
                                protocol: "",
                                nftId: "",
                                refreshedAt: new Date().toISOString(),
                            },
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
                                chain: "",
                                protocol: "",
                                nftId: "",
                                refreshedAt: new Date().toISOString(),
                            },
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
                                chain: "",
                                protocol: "",
                                nftId: "",
                                refreshedAt: new Date().toISOString(),
                            },
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
                                chain: "",
                                protocol: "",
                                nftId: "",
                                refreshedAt: new Date().toISOString(),
                            },
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
                        chain: "",
                        protocol: "",
                        nftId: "",
                        refreshedAt: new Date().toISOString(),
                    },
                },
                { status: 500 }
            );
        }
    }
);

import { NextRequest, NextResponse } from "next/server";
import { withAuthAndLogging } from "@/lib/api/withAuth";
import { logError } from "@/lib/api/withLogging";
import { ApiServiceFactory } from "@/lib/api/ApiServiceFactory";
import { SupportedChainsType, SUPPORTED_CHAINS } from "@/config/chains";
import type { BasicPosition } from "@/services/positions/positionService";
import type { PnlBreakdown } from "@/services/positions/positionPnLService";
import type { CurveData } from "@/components/charts/mini-pnl-curve";
import type { AprBreakdown } from "@/services/positions/positionAprService";
import type { ApiResponse } from "@/types/api";

export interface PositionDetailsData {
    basicData: BasicPosition;
    pnlBreakdown: PnlBreakdown | null;
    aprBreakdown: AprBreakdown | null;
    curveData: CurveData | null;
}

export interface PositionDetailsResponse extends ApiResponse<PositionDetailsData> {
    meta: {
        requestedAt: string;
        chain: string;
        protocol: string;
        nftId: string;
        cached: boolean;
    };
}

/**
 * GET /api/positions/uniswapv3/[chain]/[nft]/details - Get complete position details
 *
 * Returns complete position data including:
 * - Basic position information
 * - PnL breakdown data
 * - APR breakdown (realized vs unrealized)
 * - Curve visualization data
 *
 * This is a unified endpoint that provides all position data in a single response,
 * eliminating the need for separate API calls for PnL, APR, and curve data.
 *
 * Path parameters:
 * - chain: Blockchain network (ethereum, arbitrum, base)
 * - nft: NFT token ID of the position
 */
export const GET = withAuthAndLogging<PositionDetailsResponse>(
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
                            cached: false
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
                            chain: "",
                            protocol: "",
                            nftId: "",
                            cached: false
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
                            chain: "",
                            protocol: "",
                            nftId: "",
                            cached: false
                        }
                    },
                    { status: 400 }
                );
            }

            log.debug(
                { chain, nftId, userId: user.userId },
                "Fetching complete position details"
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
                            cached: false
                        }
                    },
                    { status: 404 }
                );
            }

            log.debug(
                { chain: position.chain, protocol: position.protocol, nftId: position.nftId },
                "Loading complete position data (PnL + APR + curve)"
            );

            // First, load PnL data since APR breakdown depends on unclaimed fees
            let pnlBreakdown = null;
            try {
                pnlBreakdown = await positionPnLService.getPnlBreakdown(position.chain, position.protocol, position.nftId);
                log.debug(
                    { chain: position.chain, protocol: position.protocol, nftId: position.nftId, pnlBreakdown },
                    "PnL breakdown loaded for APR calculation"
                );
            } catch (error) {
                log.debug(
                    { chain: position.chain, protocol: position.protocol, nftId: position.nftId, error: error instanceof Error ? error.message : String(error) },
                    "PnL calculation failed"
                );
            }

            // Load APR breakdown and curve data in parallel
            const [aprResult, curveResult] = await Promise.allSettled([
                (async () => {
                    try {
                        // Calculate APR breakdown with or without PnL data
                        const unclaimedFees = pnlBreakdown?.unclaimedFees;
                        const aprBreakdownResult = await positionAprService.getAprBreakdown(position.chain, position.protocol, position.nftId, unclaimedFees);
                        log.debug(
                            { chain: position.chain, protocol: position.protocol, nftId: position.nftId, aprBreakdownResult, unclaimedFees: unclaimedFees || "not available" },
                            "APR breakdown calculation completed"
                        );
                        return aprBreakdownResult;
                    } catch (error) {
                        log.debug(
                            { chain: position.chain, protocol: position.protocol, nftId: position.nftId, error: error instanceof Error ? error.message : String(error) },
                            "APR breakdown calculation failed"
                        );
                        return null;
                    }
                })(),
                (async () => {
                    try {
                        if (!curveDataService.validatePosition(position)) {
                            log.debug(
                                { chain: position.chain, protocol: position.protocol, nftId: position.nftId, status: position.status, liquidity: position.liquidity },
                                "Position not eligible for curve generation"
                            );
                            return null;
                        }
                        return await curveDataService.getCurveData(position);
                    } catch (error) {
                        log.debug(
                            { chain: position.chain, protocol: position.protocol, nftId: position.nftId, error: error instanceof Error ? error.message : String(error) },
                            "Curve data generation failed"
                        );
                        return null;
                    }
                })()
            ]);

            // Extract results
            const aprBreakdown = aprResult.status === 'fulfilled' ? aprResult.value : null;
            const curveData = curveResult.status === 'fulfilled' ? curveResult.value : null;

            log.debug(
                {
                    chain: position.chain,
                    protocol: position.protocol,
                    nftId: position.nftId,
                    hasPnl: !!pnlBreakdown,
                    hasApr: !!aprBreakdown,
                    hasCurve: !!curveData,
                    curvePoints: curveData?.points?.length || 0,
                    aprRealizedApr: aprBreakdown?.realizedApr || 0,
                    aprUnrealizedApr: aprBreakdown?.unrealizedApr || 0
                },
                "Successfully loaded complete position details"
            );

            const responseData: PositionDetailsData = {
                basicData: position,
                pnlBreakdown,
                aprBreakdown,
                curveData
            };

            return NextResponse.json({
                success: true,
                data: responseData,
                meta: {
                    requestedAt: new Date().toISOString(),
                    chain: position.chain,
                    protocol: position.protocol,
                    nftId: position.nftId,
                    cached: false // For now, we don't distinguish cache status
                },
            });

        } catch (error) {
            logError(log, error, {
                endpoint: "positions/uniswapv3/[chain]/[nft]/details",
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
                                cached: false
                            }
                        },
                        { status: 404 }
                    );
                }

                if (error.message.includes("has no NFT ID")) {
                    return NextResponse.json(
                        {
                            success: false,
                            error: "Position details not available for this position type",
                            meta: {
                                requestedAt: new Date().toISOString(),
                                chain: "",
                                protocol: "",
                                nftId: "",
                                cached: false
                            }
                        },
                        { status: 422 }
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
                                cached: false
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
                        chain: "",
                        protocol: "",
                        nftId: "",
                        cached: false
                    }
                },
                { status: 500 }
            );
        }
    }
);
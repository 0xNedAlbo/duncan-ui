import { NextRequest, NextResponse } from "next/server";
import { withAuthAndLogging } from "@/lib/api/withAuth";
import { logError } from "@/lib/api/withLogging";
import { ApiServiceFactory } from "@/lib/api/ApiServiceFactory";
import { SupportedChainsType, SUPPORTED_CHAINS } from "@/config/chains";
import type { AprApiResponse, PositionAprSummary } from "@/types/apr";

/**
 * GET /api/positions/uniswapv3/nft/[chain]/[nft]/apr - Get position APR calculation
 *
 * Returns calculated APR data for a specific Uniswap V3 position including:
 * - Total realized APR based on time-weighted cost basis
 * - Time-weighted average cost basis
 * - Total fees collected and distributed
 * - Detailed breakdown by period
 *
 * Query parameters: None
 *
 * Path parameters:
 * - chain: Blockchain network (ethereum, arbitrum, base)
 * - nft: NFT token ID of the position
 */
export const GET = withAuthAndLogging<AprApiResponse>(
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
                        chain: chain || 'unknown',
                        nftId: nftId || 'unknown',
                        success: false,
                        error: "Chain and NFT ID are required"
                    },
                    { status: 400 }
                );
            }

            // Validate chain parameter
            if (!SUPPORTED_CHAINS.includes(chain)) {
                return NextResponse.json(
                    {
                        chain,
                        nftId,
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
                        chain,
                        nftId,
                        success: false,
                        error: "Invalid NFT ID format. Must be a positive integer."
                    },
                    { status: 400 }
                );
            }

            log.debug(
                { chain, nftId, userId: user.userId },
                "Fetching position APR data"
            );

            // Get service instances
            const apiFactory = ApiServiceFactory.getInstance();
            const positionService = apiFactory.positionService;
            const positionAprService = apiFactory.positionAprService;
            const positionPnLService = apiFactory.positionPnLService;

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
                        chain,
                        nftId,
                        success: false,
                        error: "Position not found"
                    },
                    { status: 404 }
                );
            }

            // Get PnL data first for APR breakdown calculation
            let unclaimedFees = undefined;
            try {
                const pnlBreakdown = await positionPnLService.getPnlBreakdown(position.id);
                unclaimedFees = pnlBreakdown?.unclaimedFees;
            } catch (error) {
                log.debug(
                    { positionId: position.id, error: error instanceof Error ? error.message : String(error) },
                    "PnL calculation failed for APR breakdown, proceeding without unclaimed fees"
                );
            }

            // Get APR breakdown for corrected time-weighted calculation
            const aprBreakdown = await positionAprService.getAprBreakdown(position.id, unclaimedFees);

            // Get detailed periods data for API response
            const aprDetailResult = await positionAprService.getPositionApr(position.id, false);

            // Transform periods data for API response
            const periodsData = aprDetailResult.periods.map(period => ({
                eventId: period.eventId,
                periodStartDate: period.periodStartDate.toISOString(),
                periodEndDate: period.periodEndDate?.toISOString() || null,
                periodDays: period.periodDays,
                periodCostBasis: period.periodCostBasis,
                allocatedFees: period.allocatedFees,
                periodApr: period.periodApr
            }));

            const responseData: PositionAprSummary = {
                positionId: aprBreakdown.positionId,
                totalApr: aprBreakdown.totalApr,  // Use corrected time-weighted APR
                timeWeightedCostBasis: aprBreakdown.timeWeightedCostBasis,
                totalFeesCollected: aprBreakdown.totalFeesCollected,
                totalActiveDays: aprBreakdown.totalActiveDays,
                calculatedAt: aprBreakdown.calculatedAt.toISOString(),
                periods: periodsData
            };

            log.debug(
                {
                    chain,
                    nftId,
                    userId: user.userId,
                    positionId: position.id,
                    totalApr: aprBreakdown.totalApr,
                    realizedApr: aprBreakdown.realizedApr,
                    unrealizedApr: aprBreakdown.unrealizedApr,
                    periodsCount: periodsData.length
                },
                "APR calculation completed successfully"
            );

            return NextResponse.json({
                chain,
                nftId,
                success: true,
                data: responseData
            });

        } catch (error) {
            logError(log, error, {
                chain: params?.chain || 'unknown',
                nftId: params?.nft || 'unknown',
                userId: user.userId
            });

            return NextResponse.json(
                {
                    chain: params?.chain || 'unknown',
                    nftId: params?.nft || 'unknown',
                    success: false,
                    error: error instanceof Error ? error.message : "Failed to calculate APR"
                },
                { status: 500 }
            );
        }
    }
);


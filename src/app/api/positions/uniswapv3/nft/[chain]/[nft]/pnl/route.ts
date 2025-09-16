import { NextRequest, NextResponse } from 'next/server';
import { withAuthAndLogging } from '@/lib/api/withAuth';
import { logError } from '@/lib/api/withLogging';
import { ApiServiceFactory } from '@/lib/api/ApiServiceFactory';
import { SupportedChainsType, SUPPORTED_CHAINS } from '@/config/chains';
import type { PositionPnlResponse } from '@/types/api';

/**
 * GET /api/positions/uniswapv3/nft/[chain]/[nft]/pnl - Get position PnL breakdown
 *
 * Returns comprehensive PnL analysis for a specific Uniswap V3 position including:
 * - Current position value
 * - Cost basis
 * - Collected fees (historical)
 * - Unclaimed fees (current)
 * - Realized and unrealized PnL
 * - Total PnL
 *
 * Path parameters:
 * - chain: Blockchain network (ethereum, arbitrum, base)
 * - nft: NFT token ID of the position
 */
export const GET = withAuthAndLogging<PositionPnlResponse>(
  async (request: NextRequest, { user, log }, params?: { chain: string; nft: string }) => {
    try {
      // Extract parameters from URL
      const chain = params?.chain as SupportedChainsType;
      const nftId = params?.nft;

      if (!chain || !nftId) {
        return NextResponse.json(
          { success: false, error: 'Chain and NFT ID are required' },
          { status: 400 }
        );
      }

      // Validate chain parameter
      if (!SUPPORTED_CHAINS.includes(chain)) {
        return NextResponse.json(
          { success: false, error: `Invalid chain parameter. Supported chains: ${SUPPORTED_CHAINS.join(', ')}` },
          { status: 400 }
        );
      }

      // Validate NFT ID format (should be numeric)
      if (!/^\d+$/.test(nftId)) {
        return NextResponse.json(
          { success: false, error: 'Invalid NFT ID format. Must be a positive integer.' },
          { status: 400 }
        );
      }

      log.debug({ chain, nftId, userId: user.userId }, 'Fetching PnL breakdown for position');

      // Get service instances
      const apiFactory = ApiServiceFactory.getInstance();
      const positionService = apiFactory.positionService;
      const positionPnLService = apiFactory.positionPnLService;

      // Find the position by chain and NFT ID, ensuring it belongs to the user
      const positions = await positionService.listPositions({
        userId: user.userId,
        chain: chain,
        limit: 100 // Get enough positions to find the one we need
      });

      // Filter by NFT ID (since we can't filter at database level without modifying the service)
      const position = positions.find(p => p.nftId === nftId);

      if (!position) {
        log.debug({ chain, nftId, userId: user.userId }, 'Position not found or not owned by user');
        return NextResponse.json(
          { success: false, error: 'Position not found' },
          { status: 404 }
        );
      }

      // Calculate PnL breakdown using the service
      const pnlBreakdown = await positionPnLService.getPnlBreakdown(position.id);

      log.debug({
        positionId: position.id,
        chain,
        nftId,
        currentValue: pnlBreakdown.currentValue,
        totalPnL: pnlBreakdown.totalPnL,
        calculatedAt: pnlBreakdown.calculatedAt
      }, 'Successfully calculated PnL breakdown');

      return NextResponse.json({
        success: true,
        data: pnlBreakdown,
        meta: {
          requestedAt: new Date().toISOString(),
          positionId: position.id
        }
      });

    } catch (error) {
      logError(log, error, {
        endpoint: 'positions/uniswapv3/nft/[chain]/[nft]/pnl',
        chain: params?.chain,
        nftId: params?.nft
      });

      // Determine appropriate error response based on error type
      if (error instanceof Error) {
        if (error.message.includes('Position not found')) {
          return NextResponse.json(
            { success: false, error: 'Position not found' },
            { status: 404 }
          );
        }

        if (error.message.includes('has no NFT ID')) {
          return NextResponse.json(
            { success: false, error: 'PnL calculation not available for this position type' },
            { status: 422 }
          );
        }

        if (error.message.includes('No RPC client available')) {
          return NextResponse.json(
            { success: false, error: 'Blockchain data temporarily unavailable' },
            { status: 503 }
          );
        }

        if (error.message.includes('Pool data not available')) {
          return NextResponse.json(
            { success: false, error: 'Pool data temporarily unavailable' },
            { status: 503 }
          );
        }
      }

      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      );
    }
  }
);
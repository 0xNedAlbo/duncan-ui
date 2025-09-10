import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getPositionService } from '@/services/positions';
import { isValidChainSlug } from '@/config/chains';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/positions/uniswapv3/nft/[chain]/[nft] - Get position details by protocol/chain/NFT ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { chain: string; nft: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }

    const { chain: chainSlug, nft: nftId } = params;

    // Validate chain
    if (!isValidChainSlug(chainSlug)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid chain', 
          details: `Supported chains: ethereum, arbitrum, base` 
        },
        { status: 400 }
      );
    }

    // Validate NFT ID format (should be numeric)
    const nftIdNum = parseInt(nftId, 10);
    if (isNaN(nftIdNum) || nftIdNum <= 0) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid NFT ID format',
          details: 'NFT ID must be a positive integer'
        },
        { status: 400 }
      );
    }

    // Query position by chain and nftId
    const position = await prisma.position.findFirst({
      where: {
        userId: session.user.id,
        nftId: nftId,
        pool: {
          chain: chainSlug
        }
      },
      include: {
        pool: {
          include: {
            token0Ref: {
              include: {
                globalToken: true,
                userToken: true
              }
            },
            token1Ref: {
              include: {
                globalToken: true,
                userToken: true
              }
            }
          }
        },
        events: {
          orderBy: {
            timestamp: 'desc'
          },
          take: 5 // Include recent events for overview
        }
      }
    });

    if (!position) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Position not found',
          details: `No position found for NFT ID ${nftId} on ${chainSlug}`
        },
        { status: 404 }
      );
    }

    // Get position service to calculate PnL
    const positionService = getPositionService();
    
    // Calculate PnL for this position
    const positionWithPnL = await positionService.calculatePositionPnL(position.id);

    return NextResponse.json({
      success: true,
      data: {
        position: positionWithPnL,
        meta: {
          protocol: 'uniswapv3',
          chain: chainSlug,
          nftId: nftId,
          requestedAt: new Date().toISOString(),
          dataQuality: {
            source: positionWithPnL.initialSource || 'unknown',
            confidence: positionWithPnL.confidence || 'estimated',
            eventCount: position.events.length,
            lastEventSync: position.lastEventSync?.toISOString() || null
          }
        }
      }
    });

  } catch (error) {
    console.error('Error fetching position details:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
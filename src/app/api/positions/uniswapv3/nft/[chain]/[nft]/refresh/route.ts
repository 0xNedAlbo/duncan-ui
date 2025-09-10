import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getPositionService } from '@/services/positions';
import { isValidChainSlug } from '@/config/chains';
import { prisma } from '@/lib/prisma';

// Simple in-memory cache for rate limiting
const refreshCache = new Map<string, number>();

// Export for testing purposes only
export const clearRefreshCache = () => refreshCache.clear();

/**
 * POST /api/positions/uniswapv3/nft/[chain]/[nft]/refresh - Refresh position by protocol/chain/NFT ID
 * 
 * This endpoint:
 * 1. Verifies the user owns the position
 * 2. Rate limits to prevent abuse (1 refresh per minute per position)
 * 3. Updates pool state and refreshes Initial Value from Subgraph if available
 * 4. Returns updated position with current PnL calculations
 */
export async function POST(
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

    try {
      // 1. Verify position ownership and get position ID
      const position = await prisma.position.findFirst({
        where: {
          userId: session.user.id,
          nftId: nftId,
          pool: {
            chain: chainSlug
          }
        },
        select: { 
          id: true,
          userId: true, 
          updatedAt: true 
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

      // 2. Rate limiting check
      const cacheKey = `position-refresh:${session.user.id}:${chainSlug}:${nftId}`;
      const lastRefresh = refreshCache.get(cacheKey);
      const now = Date.now();
      const cooldownMs = 60000; // 1 minute

      if (lastRefresh && now - lastRefresh < cooldownMs) {
        const remainingCooldown = Math.ceil((cooldownMs - (now - lastRefresh)) / 1000);
        
        return NextResponse.json(
          { 
            success: false,
            error: 'Please wait before refreshing again',
            cooldownSeconds: remainingCooldown,
            lastRefresh: new Date(lastRefresh),
            meta: {
              protocol: 'uniswapv3',
              chain: chainSlug,
              nftId: nftId
            }
          },
          { status: 429 }
        );
      }

      // 3. Refresh position with Position Service (includes Pool + Initial Value updates)
      const positionService = getPositionService();
      const refreshedPosition = await positionService.refreshPosition(position.id);

      // 4. Set rate limit cache
      refreshCache.set(cacheKey, now);

      // Clean up old cache entries (older than 1 hour)
      const oneHourAgo = now - 3600000;
      for (const [key, timestamp] of refreshCache.entries()) {
        if (timestamp < oneHourAgo) {
          refreshCache.delete(key);
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          position: refreshedPosition,
          refreshedAt: new Date().toISOString()
        },
        meta: {
          protocol: 'uniswapv3',
          chain: chainSlug,
          nftId: nftId,
          upgraded: refreshedPosition.dataUpdated || false,
          dataSource: refreshedPosition.initialSource,
          confidence: refreshedPosition.confidence,
          pnlData: {
            currentValue: refreshedPosition.currentValue,
            initialValue: refreshedPosition.initialValue,
            pnl: refreshedPosition.pnl,
            pnlPercent: refreshedPosition.pnlPercent
          }
        }
      });

    } finally {
      await prisma.$disconnect();
    }

  } catch (error) {
    console.error('Position refresh error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { 
          success: false,
          error: error.message 
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
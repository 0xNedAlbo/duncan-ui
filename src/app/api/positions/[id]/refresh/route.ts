import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PoolService } from '@/services/uniswap/poolService';
import { PrismaClient } from '@prisma/client';

interface RouteParams {
  params: {
    id: string;
  };
}

// Simple in-memory cache for rate limiting
const refreshCache = new Map<string, number>();

/**
 * POST /api/positions/[id]/refresh - Refresh position data
 * 
 * This endpoint:
 * 1. Verifies the user owns the position
 * 2. Rate limits to prevent abuse (1 refresh per minute per position)
 * 3. Updates the pool state from blockchain
 * 4. Returns updated position with current pool data
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }

    const { id: positionId } = params;
    
    if (!positionId || typeof positionId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid position ID' },
        { status: 400 }
      );
    }

    const prisma = new PrismaClient();
    const poolService = new PoolService();

    try {
      // 1. Verify position ownership and get position data
      const position = await prisma.position.findFirst({
        where: {
          id: positionId,
          userId: session.user.id,
          status: 'active'
        },
        include: {
          pool: {
            include: {
              token0: true,
              token1: true
            }
          }
        }
      });

      if (!position) {
        return NextResponse.json(
          { error: 'Position not found or not owned by user' },
          { status: 404 }
        );
      }

      // 2. Rate limiting check
      const cacheKey = `position-refresh:${session.user.id}:${positionId}`;
      const lastRefresh = refreshCache.get(cacheKey);
      const now = Date.now();
      const cooldownMs = 60000; // 1 minute

      if (lastRefresh && now - lastRefresh < cooldownMs) {
        const remainingCooldown = Math.ceil((cooldownMs - (now - lastRefresh)) / 1000);
        
        return NextResponse.json(
          { 
            error: 'Please wait before refreshing again',
            cooldownSeconds: remainingCooldown,
            lastRefresh: new Date(lastRefresh)
          },
          { status: 429 }
        );
      }

      // 3. Update pool state from blockchain
      await poolService.updatePoolState(position.poolId);

      // 4. Fetch updated position with fresh pool data
      const updatedPosition = await prisma.position.findFirst({
        where: { id: positionId },
        include: {
          pool: {
            include: {
              token0: true,
              token1: true
            }
          }
        }
      });

      // 5. Set rate limit cache
      refreshCache.set(cacheKey, now);

      // Clean up old cache entries (older than 1 hour)
      const oneHourAgo = now - 3600000;
      for (const [key, timestamp] of refreshCache.entries()) {
        if (timestamp < oneHourAgo) {
          refreshCache.delete(key);
        }
      }

      // 6. Get token information if pool uses custom tokens
      let enrichedPosition = updatedPosition;
      if (position.pool.ownerId) {
        // Pool has custom tokens, get full token info
        const poolWithTokens = await poolService.getPoolById(position.poolId, session.user.id);
        if (poolWithTokens) {
          enrichedPosition = {
            ...updatedPosition!,
            pool: {
              ...updatedPosition!.pool,
              token0Info: poolWithTokens.token0Info,
              token1Info: poolWithTokens.token1Info
            }
          };
        }
      }

      return NextResponse.json({
        position: enrichedPosition,
        refreshed: true,
        lastUpdated: new Date(),
        poolState: {
          currentPrice: updatedPosition?.pool.currentPrice,
          currentTick: updatedPosition?.pool.currentTick,
          sqrtPriceX96: updatedPosition?.pool.sqrtPriceX96
        }
      });

    } finally {
      await poolService.disconnect();
      await prisma.$disconnect();
    }

  } catch (error) {
    console.error('Position refresh error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
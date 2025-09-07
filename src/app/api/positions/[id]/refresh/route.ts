import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getPositionService } from '@/services/positions';
import { prisma } from '@/lib/prisma';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

// Simple in-memory cache for rate limiting
const refreshCache = new Map<string, number>();

/**
 * POST /api/positions/[id]/refresh - Refresh position with PnL data
 * 
 * This endpoint:
 * 1. Verifies the user owns the position
 * 2. Rate limits to prevent abuse (1 refresh per minute per position)
 * 3. Updates pool state and refreshes Initial Value from Subgraph if available
 * 4. Returns updated position with current PnL calculations
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }

    const params = await context.params;
    const { id: positionId } = params;
    
    if (!positionId || typeof positionId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid position ID' },
        { status: 400 }
      );
    }

    try {
      // 1. Verify position ownership
      const position = await prisma.position.findFirst({
        where: {
          id: positionId,
          userId: session.user.id
        },
        select: { userId: true, updatedAt: true }
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

      // 3. Refresh position with Position Service (includes Pool + Initial Value updates)
      const positionService = getPositionService();
      const refreshedPosition = await positionService.refreshPosition(positionId);

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
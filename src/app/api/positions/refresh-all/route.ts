import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PoolService } from '@/services/uniswap/poolService';
import { PrismaClient } from '@prisma/client';

// Simple in-memory cache for rate limiting
const batchRefreshCache = new Map<string, number>();

interface RefreshResult {
  poolId: string;
  poolAddress: string;
  status: 'updated' | 'failed';
  error?: string;
  positionCount?: number;
}

/**
 * POST /api/positions/refresh-all - Refresh all user's positions
 * 
 * This endpoint:
 * 1. Gets all active positions for the user
 * 2. Rate limits to once per 5 minutes per user
 * 3. Updates each unique pool once (efficient batching)
 * 4. Returns summary of refresh results
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    
    // 1. Rate limiting check (5 minutes cooldown)
    const cacheKey = `refresh-all:${userId}`;
    const lastRefresh = batchRefreshCache.get(cacheKey);
    const now = Date.now();
    const cooldownMs = 300000; // 5 minutes

    if (lastRefresh && now - lastRefresh < cooldownMs) {
      const remainingCooldown = Math.ceil((cooldownMs - (now - lastRefresh)) / 1000);
      
      return NextResponse.json(
        { 
          error: 'Batch refresh limited to once per 5 minutes',
          cooldownSeconds: remainingCooldown,
          lastRefresh: new Date(lastRefresh)
        },
        { status: 429 }
      );
    }

    const prisma = new PrismaClient();
    const poolService = new PoolService();

    try {
      // 2. Get all active positions for the user
      const positions = await prisma.position.findMany({
        where: {
          userId: userId,
          status: 'active'
        },
        include: {
          pool: {
            include: {
              token0: true,
              token1: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      if (positions.length === 0) {
        return NextResponse.json({
          message: 'No active positions found',
          refreshed: 0,
          failed: 0,
          results: []
        });
      }

      // 3. Group positions by pool to avoid duplicate refreshes
      const poolGroups = new Map<string, typeof positions>();
      
      for (const position of positions) {
        const poolId = position.poolId;
        if (!poolGroups.has(poolId)) {
          poolGroups.set(poolId, []);
        }
        poolGroups.get(poolId)!.push(position);
      }

      // 4. Refresh each unique pool
      const results: RefreshResult[] = [];
      let refreshedCount = 0;
      let failedCount = 0;

      for (const [poolId, poolPositions] of poolGroups.entries()) {
        const pool = poolPositions[0].pool;
        
        try {
          // Update pool state from blockchain
          await poolService.updatePoolState(poolId);
          
          results.push({
            poolId,
            poolAddress: pool.poolAddress,
            status: 'updated',
            positionCount: poolPositions.length
          });
          
          refreshedCount++;
          
          // Small delay to avoid overwhelming the RPC
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          results.push({
            poolId,
            poolAddress: pool.poolAddress,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
            positionCount: poolPositions.length
          });
          
          failedCount++;
          
          console.error(`Failed to refresh pool ${poolId}:`, error);
        }
      }

      // 5. Set rate limit cache
      batchRefreshCache.set(cacheKey, now);

      // Clean up old cache entries (older than 1 hour)
      const oneHourAgo = now - 3600000;
      for (const [key, timestamp] of batchRefreshCache.entries()) {
        if (timestamp < oneHourAgo) {
          batchRefreshCache.delete(key);
        }
      }

      // 6. Get summary statistics
      const totalPositions = positions.length;
      const totalPools = poolGroups.size;
      const positionsInRefreshedPools = results
        .filter(r => r.status === 'updated')
        .reduce((sum, r) => sum + (r.positionCount || 0), 0);

      return NextResponse.json({
        message: `Refreshed ${refreshedCount} pools affecting ${positionsInRefreshedPools} positions`,
        summary: {
          totalPositions,
          totalPools,
          refreshedPools: refreshedCount,
          failedPools: failedCount,
          positionsAffected: positionsInRefreshedPools
        },
        results,
        lastUpdated: new Date()
      });

    } finally {
      await poolService.disconnect();
      await prisma.$disconnect();
    }

  } catch (error) {
    console.error('Batch position refresh error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
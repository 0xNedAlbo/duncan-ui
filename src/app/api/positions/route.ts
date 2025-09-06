import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PoolService } from '@/services/uniswap/poolService';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

// Query parameters validation
const GetPositionsSchema = z.object({
  status: z.enum(['active', 'closed', 'archived']).optional(),
  chain: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

/**
 * GET /api/positions - Get user's positions
 * Query parameters:
 * - status?: 'active' | 'closed' | 'archived' - Filter by status
 * - chain?: string - Filter by blockchain
 * - limit?: number - Limit results (1-100, default 20)
 * - offset?: number - Offset for pagination (default 0)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const queryParams = {
      status: searchParams.get('status'),
      chain: searchParams.get('chain'),
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
    };

    // Validate query parameters
    const validatedParams = GetPositionsSchema.parse(queryParams);

    const prisma = new PrismaClient();
    const poolService = new PoolService();

    try {
      // Build where clause
      const where: any = {
        userId: session.user.id,
      };

      if (validatedParams.status) {
        where.status = validatedParams.status;
      }

      if (validatedParams.chain) {
        where.pool = {
          chain: validatedParams.chain
        };
      }

      // Get positions with pool and token data
      const positions = await prisma.position.findMany({
        where,
        include: {
          pool: {
            include: {
              token0: true,
              token1: true
            }
          }
        },
        orderBy: [
          { status: 'asc' }, // Active first
          { createdAt: 'desc' } // Newest first
        ],
        take: validatedParams.limit,
        skip: validatedParams.offset
      });

      // Get total count for pagination
      const totalCount = await prisma.position.count({ where });

      // Enrich positions with token information for custom tokens
      const enrichedPositions = await Promise.all(
        positions.map(async (position) => {
          let enrichedPosition = position;

          // If pool has custom tokens (ownerId set), get full token info
          if (position.pool.ownerId) {
            const poolWithTokens = await poolService.getPoolById(
              position.poolId,
              session.user.id
            );

            if (poolWithTokens) {
              enrichedPosition = {
                ...position,
                pool: {
                  ...position.pool,
                  token0Info: poolWithTokens.token0Info,
                  token1Info: poolWithTokens.token1Info,
                  feePercentage: (position.pool.fee / 10000).toFixed(2) + '%'
                }
              };
            }
          } else {
            // Add fee percentage for global pools too
            enrichedPosition = {
              ...position,
              pool: {
                ...position.pool,
                feePercentage: (position.pool.fee / 10000).toFixed(2) + '%'
              }
            };
          }

          return enrichedPosition;
        })
      );

      // Calculate pagination info
      const hasMore = validatedParams.offset + validatedParams.limit < totalCount;
      const nextOffset = hasMore ? validatedParams.offset + validatedParams.limit : null;

      return NextResponse.json({
        positions: enrichedPositions,
        pagination: {
          total: totalCount,
          limit: validatedParams.limit,
          offset: validatedParams.offset,
          hasMore,
          nextOffset
        },
        summary: {
          active: await prisma.position.count({
            where: { userId: session.user.id, status: 'active' }
          }),
          closed: await prisma.position.count({
            where: { userId: session.user.id, status: 'closed' }
          }),
          archived: await prisma.position.count({
            where: { userId: session.user.id, status: 'archived' }
          })
        }
      });

    } finally {
      await poolService.disconnect();
      await prisma.$disconnect();
    }

  } catch (error) {
    console.error('Error fetching positions:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
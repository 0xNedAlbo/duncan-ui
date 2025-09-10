import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getPositionService } from '@/services/positions';
import { z } from 'zod';

// Query parameters validation
const GetPositionsSchema = z.object({
  status: z.enum(['active', 'closed', 'archived']).optional(),
  chain: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  sortBy: z.enum(['createdAt', 'currentValue', 'pnl', 'pnlPercent']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

/**
 * GET /api/positions/uniswapv3/list - Get user's Uniswap V3 positions with PnL calculations
 * Query parameters:
 * - status?: 'active' | 'closed' | 'archived' - Filter by status (default: active)
 * - chain?: string - Filter by blockchain (ethereum, arbitrum, base)
 * - limit?: number - Limit results (1-100, default 20)
 * - offset?: number - Offset for pagination (default 0)
 * - sortBy?: 'createdAt' | 'currentValue' | 'pnl' | 'pnlPercent' - Sort field
 * - sortOrder?: 'asc' | 'desc' - Sort order (default: desc)
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
      status: searchParams.get('status') || 'active', // Default to active
      chain: searchParams.get('chain') || undefined,
      limit: searchParams.get('limit') || undefined,
      offset: searchParams.get('offset') || undefined,
      sortBy: searchParams.get('sortBy') || undefined,
      sortOrder: searchParams.get('sortOrder') || undefined,
    };

    // Validate query parameters
    const validatedParams = GetPositionsSchema.parse(queryParams);

    // Get Position Service instance
    const positionService = getPositionService();

    // Fetch positions with PnL calculations
    const result = await positionService.getPositionsWithPnL({
      userId: session.user.id,
      status: validatedParams.status,
      chain: validatedParams.chain || undefined,
      limit: validatedParams.limit,
      offset: validatedParams.offset,
      sortBy: validatedParams.sortBy,
      sortOrder: validatedParams.sortOrder,
    });

    // Calculate additional pagination info
    const nextOffset = result.hasMore ? validatedParams.offset + validatedParams.limit : null;

    return NextResponse.json({
      success: true,
      data: {
        positions: result.positions,
        pagination: {
          total: result.total,
          limit: validatedParams.limit,
          offset: validatedParams.offset,
          hasMore: result.hasMore,
          nextOffset
        }
      },
      meta: {
        requestedAt: new Date().toISOString(),
        filters: {
          status: validatedParams.status,
          chain: validatedParams.chain || null,
          sortBy: validatedParams.sortBy,
          sortOrder: validatedParams.sortOrder
        },
        dataQuality: {
          subgraphPositions: result.positions.filter(p => p.initialSource === 'subgraph').length,
          snapshotPositions: result.positions.filter(p => p.initialSource === 'snapshot').length,
          upgradedPositions: result.positions.filter(p => p.dataUpdated).length
        }
      }
    });

  } catch (error) {
    console.error('Error fetching Uniswap V3 positions with PnL:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid query parameters', 
          details: error.errors 
        },
        { status: 400 }
      );
    }

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
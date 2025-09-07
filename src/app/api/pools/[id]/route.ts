import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PoolService } from '@/services/uniswap/poolService';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/pools/[id] - Get pool by ID
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }

    const params = await context.params;
    const { id } = params;
    
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Invalid pool ID' },
        { status: 400 }
      );
    }

    const poolService = new PoolService();
    const pool = await poolService.getPoolById(id);

    if (!pool) {
      return NextResponse.json(
        { error: 'Pool not found' },
        { status: 404 }
      );
    }

    // Add formatted fee percentage
    const poolWithFormattedFee = {
      ...pool,
      feePercentage: (pool.fee / 10000).toFixed(2) + '%'
    };

    return NextResponse.json({ pool: poolWithFormattedFee });

  } catch (error) {
    console.error('Error fetching pool:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
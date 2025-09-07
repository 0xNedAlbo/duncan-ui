import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PoolService } from '@/services/uniswap/poolService';
import { z } from 'zod';

const TokenPairSearchSchema = z.object({
  chain: z.string().min(1),
  token0Address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  token1Address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
});

/**
 * GET /api/pools/search - Find all pools for a token pair
 * Query parameters:
 * - chain: string - Blockchain to search on
 * - token0Address: string - First token address
 * - token1Address: string - Second token address
 * 
 * Returns all fee tiers available for the token pair
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
    const searchData = {
      chain: searchParams.get('chain'),
      token0Address: searchParams.get('token0Address'),
      token1Address: searchParams.get('token1Address'),
    };

    // Validate input
    const validatedData = TokenPairSearchSchema.parse(searchData);

    const poolService = new PoolService();
    const pools = await poolService.getPoolsForTokenPair(
      validatedData.chain,
      validatedData.token0Address,
      validatedData.token1Address
    );

    // Transform response to include formatted fee percentages
    const poolsWithFormattedFees = pools.map(pool => ({
      ...pool,
      feePercentage: (pool.fee / 10000).toFixed(2) + '%'
    }));

    return NextResponse.json({ 
      pools: poolsWithFormattedFees,
      count: pools.length 
    });

  } catch (error) {
    console.error('Error searching pools for token pair:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
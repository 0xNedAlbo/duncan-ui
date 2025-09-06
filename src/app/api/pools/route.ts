import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PoolService } from '@/services/uniswap/poolService';
import { z } from 'zod';

// Input validation schemas
const SearchPoolsSchema = z.object({
  chain: z.string().optional(),
  token0: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  token1: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  includeUserPools: z.boolean().optional(),
});

/**
 * GET /api/pools - Search pools with filters
 * Query parameters:
 * - chain?: string - Filter by blockchain
 * - token0?: string - Filter by token0 address
 * - token1?: string - Filter by token1 address  
 * - includeUserPools?: boolean - Include user's custom pools
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
    const searchOptions = {
      chain: searchParams.get('chain') || undefined,
      token0: searchParams.get('token0') || undefined,
      token1: searchParams.get('token1') || undefined,
      includeUserPools: searchParams.get('includeUserPools') === 'true',
    };

    // Validate input
    const validatedOptions = SearchPoolsSchema.parse(searchOptions);

    const poolService = new PoolService();
    const pools = await poolService.searchPools({
      ...validatedOptions,
      userId: session.user.id,
    });

    return NextResponse.json({ pools });

  } catch (error) {
    console.error('Error searching pools:', error);
    
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

// POST method removed - pools are now created internally through position operations
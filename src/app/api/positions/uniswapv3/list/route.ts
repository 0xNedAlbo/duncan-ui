import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

/**
 * GET /api/positions/uniswapv3/list - Get user's Uniswap V3 positions
 * 
 * Status: Not implemented - requires rewrite with new PositionService
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }

    // Return not implemented error
    return NextResponse.json(
      { 
        success: false, 
        error: 'Not implemented - Position list API requires rewrite with new architecture' 
      },
      { status: 501 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
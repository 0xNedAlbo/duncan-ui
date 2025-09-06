import { NextRequest, NextResponse } from 'next/server';
import { TokenService } from '@/services/tokens/tokenService';
import { PrismaClient } from '@prisma/client';
import { getSession } from '@/lib/auth';

// Allow test injection of prisma client
const prisma = globalThis.__testPrisma || new PrismaClient();
const tokenService = new TokenService(prisma);

export async function GET(request: NextRequest) {
  // Check authentication
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized - Please sign in' },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const chain = searchParams.get('chain');
    const query = searchParams.get('query') || '';
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');
    const verifiedOnlyParam = searchParams.get('verifiedOnly');

    // Parse and validate parameters
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 100) : 20; // Max 100 results
    const offset = offsetParam ? Math.max(parseInt(offsetParam, 10), 0) : 0;
    const verifiedOnly = verifiedOnlyParam === 'true';

    // Validate limit and offset
    if (isNaN(limit) || isNaN(offset)) {
      return NextResponse.json(
        { error: 'Invalid limit or offset parameter' },
        { status: 400 }
      );
    }

    // Search tokens
    const tokens = await tokenService.searchTokens({
      chain: chain || undefined,
      query: query || undefined,
      limit,
      offset,
      verifiedOnly,
    });

    return NextResponse.json({
      tokens,
      pagination: {
        limit,
        offset,
        total: tokens.length, // Note: This is just the current page size, not total count
      },
    });
  } catch (error) {
    console.error('Error searching tokens:', error);
    
    if (error instanceof Error) {
      // Handle validation errors
      if (error.message.includes('Invalid') || error.message.includes('Unsupported')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
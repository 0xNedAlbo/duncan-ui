import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { ApiServiceFactory } from '@/lib/api/ApiServiceFactory';

export async function GET(request: NextRequest) {
  // Handle authentication separately to ensure proper error handling
  let session;
  try {
    session = await getSession();
  } catch (sessionError) {
    return NextResponse.json(
      { error: 'Session service error' },
      { status: 500 }
    );
  }

  if (!session?.user?.id) {
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

    // Search tokens - combine global and user tokens
    const results = [];
    
    if (!verifiedOnly) {
      // Get user's custom tokens first
      const apiServices = ApiServiceFactory.getInstance();
      const userTokens = await apiServices.tokenResolutionService.getUserTokens(session.user.id, chain || undefined);
      
      // Filter user tokens by query
      const filteredUserTokens = userTokens.filter(token => {
        if (!query) return true;
        const searchTerm = query.toLowerCase();
        return (
          token.symbol.toLowerCase().includes(searchTerm) ||
          token.name.toLowerCase().includes(searchTerm) ||
          token.address.toLowerCase().includes(searchTerm)
        );
      });

      // Convert to TokenInfo format
      results.push(...filteredUserTokens.map(token => ({
        id: token.id,
        chain: token.chain,
        address: token.address,
        symbol: token.symbol,
        name: token.name,
        decimals: token.decimals,
        logoUrl: token.logoUrl,
        isGlobal: false,
        verified: false,
        userLabel: token.userLabel,
        notes: token.notes,
      })));
    }

    // Get global verified tokens
    const apiServices = ApiServiceFactory.getInstance();
    const globalTokens = await apiServices.tokenService.searchTokens({
      chain: chain || undefined,
      query: query || undefined,
      limit,
      offset,
      verifiedOnly: true, // Only global verified tokens
    });

    // Convert to TokenInfo format
    results.push(...globalTokens.map(token => ({
      id: token.id,
      chain: token.chain,
      address: token.address,
      symbol: token.symbol,
      name: token.name,
      decimals: token.decimals,
      logoUrl: token.logoUrl,
      isGlobal: true,
      verified: true,
    })));

    // Apply pagination to combined results
    const paginatedResults = results.slice(offset, offset + limit);

    return NextResponse.json({
      tokens: paginatedResults,
      pagination: {
        limit,
        offset,
        total: results.length,
      },
    });
  } catch (error) {
    
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
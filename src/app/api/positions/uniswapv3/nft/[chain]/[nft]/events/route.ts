import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { isValidChainSlug } from '@/config/chains';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Query parameters validation
const GetEventsSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  eventType: z.enum(['CREATE', 'INCREASE', 'DECREASE', 'COLLECT', 'CLOSE']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

/**
 * GET /api/positions/uniswapv3/nft/[chain]/[nft]/events - Get position events by protocol/chain/NFT ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chain: string; nft: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }

    const { chain: chainSlug, nft: nftId } = await params;

    // Validate chain
    if (!isValidChainSlug(chainSlug)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid chain', 
          details: `Supported chains: ethereum, arbitrum, base` 
        },
        { status: 400 }
      );
    }

    // Validate NFT ID format (should be numeric)
    const nftIdNum = parseInt(nftId, 10);
    if (isNaN(nftIdNum) || nftIdNum <= 0) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid NFT ID format',
          details: 'NFT ID must be a positive integer'
        },
        { status: 400 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      limit: searchParams.get('limit') || undefined,
      offset: searchParams.get('offset') || undefined,
      eventType: searchParams.get('eventType') || undefined,
      sortOrder: searchParams.get('sortOrder') || undefined,
    };

    // Validate query parameters
    const validatedParams = GetEventsSchema.parse(queryParams);

    // First, verify the position exists and belongs to the user
    const position = await prisma.position.findFirst({
      where: {
        userId: session.user.id,
        nftId: nftId,
        pool: {
          chain: chainSlug
        }
      },
      select: {
        id: true
      }
    });

    if (!position) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Position not found',
          details: `No position found for NFT ID ${nftId} on ${chainSlug}`
        },
        { status: 404 }
      );
    }

    // Build where clause for events
    const whereClause: any = {
      positionId: position.id
    };

    if (validatedParams.eventType) {
      whereClause.eventType = validatedParams.eventType;
    }

    // Query events with pagination
    const [events, totalCount] = await Promise.all([
      prisma.positionEvent.findMany({
        where: whereClause,
        orderBy: {
          timestamp: validatedParams.sortOrder
        },
        skip: validatedParams.offset,
        take: validatedParams.limit,
        select: {
          id: true,
          eventType: true,
          timestamp: true,
          blockNumber: true,
          transactionHash: true,
          liquidityDelta: true,
          token0Delta: true,
          token1Delta: true,
          collectedFee0: true,
          collectedFee1: true,
          poolPrice: true,
          tick: true,
          valueInQuote: true,
          feeValueInQuote: true,
          source: true,
          confidence: true,
          createdAt: true
        }
      }),
      prisma.positionEvent.count({
        where: whereClause
      })
    ]);

    const hasMore = (validatedParams.offset + validatedParams.limit) < totalCount;
    const nextOffset = hasMore ? validatedParams.offset + validatedParams.limit : null;

    return NextResponse.json({
      success: true,
      data: {
        events,
        pagination: {
          total: totalCount,
          limit: validatedParams.limit,
          offset: validatedParams.offset,
          hasMore,
          nextOffset
        }
      },
      meta: {
        protocol: 'uniswapv3',
        chain: chainSlug,
        nftId: nftId,
        requestedAt: new Date().toISOString(),
        filters: {
          eventType: validatedParams.eventType || null,
          sortOrder: validatedParams.sortOrder
        }
      }
    });

  } catch (error) {
    console.error('Error fetching position events:', error);
    
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
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { fetchNFTPositionWithOwner } from '@/services/uniswap/nftPosition';
import { PoolService } from '@/services/uniswap/poolService';
import { determineQuoteToken } from '@/services/positions/quoteTokenService';
import { PrismaClient } from '@prisma/client';

export interface NFTImportRequest {
  chain: string;
  nftId: string;
}

export interface NFTImportResponse {
  success: boolean;
  position?: {
    id: string;
    nftId: string;
    tickLower: number;
    tickUpper: number;
    liquidity: string;
    pool: {
      id: string;
      chain: string;
      poolAddress: string;
      fee: number;
      token0Data?: any;
      token1Data?: any;
    };
  };
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<NFTImportResponse>> {
  // Handle authentication separately to ensure proper status codes
  let session;
  try {
    session = await getSession();
  } catch (sessionError) {
    console.error('Session service error:', sessionError);
    return NextResponse.json({
      success: false,
      error: 'Session service error',
    }, { status: 500 });
  }

  if (!session?.user?.id || typeof session.user.id !== 'string') {
    console.error('Invalid session:', session);
    return NextResponse.json({
      success: false,
      error: 'Unauthorized - Please sign in',
    }, { status: 401 });
  }

  try {
    
    console.log('Session user ID:', session.user.id);

    let body: NFTImportRequest;
    try {
      body = await request.json() as NFTImportRequest;
    } catch (parseError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request format',
      }, { status: 400 });
    }
    
    const { chain, nftId } = body;

    // Validate input
    if (!chain || !nftId) {
      return NextResponse.json({
        success: false,
        error: 'Chain and NFT ID are required',
      }, { status: 400 });
    }

    // Validate NFT ID format (should be numeric)
    const nftIdNum = parseInt(nftId, 10);
    if (isNaN(nftIdNum) || nftIdNum <= 0) {
      return NextResponse.json({
        success: false,
        error: 'NFT ID must be a valid positive number',
      }, { status: 400 });
    }

    // Validate chain
    const supportedChains = ['ethereum', 'arbitrum', 'base'];
    if (!supportedChains.includes(chain.toLowerCase())) {
      return NextResponse.json({
        success: false,
        error: `Unsupported chain: ${chain}. Supported chains: ${supportedChains.join(', ')}`,
      }, { status: 400 });
    }

    // 1. Fetch NFT position data with owner from blockchain
    const nftPositionData = await fetchNFTPositionWithOwner(chain.toLowerCase(), nftId);
    
    if (!nftPositionData.isActive) {
      return NextResponse.json({
        success: false,
        error: 'NFT position is not active (liquidity = 0)',
      }, { status: 400 });
    }

    // 2. Initialize services
    const prisma = (globalThis as any).__testPrisma || new PrismaClient();
    const poolService = new PoolService(prisma);

    try {
      // 3. Find or create pool internally
      const pool = await poolService.findOrCreatePool(
        nftPositionData.chainName,
        nftPositionData.token0Address,
        nftPositionData.token1Address,
        nftPositionData.fee,
        session.user.id
      );

      // 4. Check if position already exists
      const existingPosition = await prisma.position.findFirst({
        where: {
          userId: session.user.id,
          nftId: nftPositionData.nftId,
          importType: 'nft'
        }
      });

      if (existingPosition) {
        return NextResponse.json({
          success: false,
          error: 'This NFT position has already been imported',
        }, { status: 409 });
      }

      // 5. Determine quote token for PnL calculations
      const quoteTokenResult = determineQuoteToken(
        pool.token0Data.symbol,
        pool.token0Address,
        pool.token1Data.symbol,
        pool.token1Address,
        pool.chain
      );

      // 6. Create position in database
      const position = await prisma.position.create({
        data: {
          userId: session.user.id,
          poolId: pool.id,
          tickLower: nftPositionData.tickLower,
          tickUpper: nftPositionData.tickUpper,
          liquidity: nftPositionData.liquidity,
          token0IsQuote: quoteTokenResult.token0IsQuote,
          importType: 'nft',
          nftId: nftPositionData.nftId,
          owner: nftPositionData.owner, // Store NFT owner address
          status: 'active'
        },
        include: {
          pool: {
            include: {
              token0Ref: {
                include: {
                  globalToken: true,
                  userToken: true
                }
              },
              token1Ref: {
                include: {
                  globalToken: true,
                  userToken: true
                }
              }
            }
          }
        }
      });

      return NextResponse.json({
        success: true,
        data: nftPositionData,
        position: {
          id: position.id,
          nftId: position.nftId!,
          tickLower: position.tickLower,
          tickUpper: position.tickUpper,
          liquidity: position.liquidity,
          pool: {
            id: pool.id,
            chain: pool.chain,
            poolAddress: pool.poolAddress,
            fee: pool.fee,
            token0Data: pool.token0Data,
            token1Data: pool.token1Data
          }
        }
      });

    } catch (poolError) {
      console.error('Pool/Position creation error:', poolError);
      
      return NextResponse.json({
        success: false,
        error: poolError instanceof Error ? poolError.message : 'Failed to create pool or position',
      }, { status: 400 });
      
    } finally {
      await poolService.disconnect();
      await prisma.$disconnect();
    }

  } catch (error) {
    console.error('NFT import error:', error);
    
    if (error instanceof Error) {
      // Return 404 for network errors, position not found, etc.
      if (error.message.includes('does not exist') || 
          error.message.includes('Network error') ||
          error.message.includes('network request failed') ||
          error.message.includes('Failed to fetch')) {
        return NextResponse.json({
          success: false,
          error: error.message,
        }, { status: 404 });
      }
    }
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : typeof error === 'string' ? error : 'Internal server error',
    }, { status: 500 }); // Return 500 for general internal server errors
  }
}

// Handle unsupported methods
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    success: false,
    error: 'Method not allowed',
  }, { status: 405 });
}
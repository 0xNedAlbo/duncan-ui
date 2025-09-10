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
        error: 'Invalid NFT ID format - must be a positive integer',
      }, { status: 400 });
    }

    // Validate chain format (should be lowercase)
    const chainLower = chain.toLowerCase();
    const supportedChains = ['ethereum', 'arbitrum', 'base'];
    if (!supportedChains.includes(chainLower)) {
      return NextResponse.json({
        success: false,
        error: `Unsupported chain. Supported chains: ${supportedChains.join(', ')}`,
      }, { status: 400 });
    }

    console.log(`Importing NFT ${nftId} from chain ${chainLower}`);

    // Fetch NFT position data from blockchain
    const nftPositionData = await fetchNFTPositionWithOwner(chainLower, nftId);

    console.log('NFT position data fetched:', {
      tickLower: nftPositionData.tickLower,
      tickUpper: nftPositionData.tickUpper,
      liquidity: nftPositionData.liquidity,
      fee: nftPositionData.fee,
      token0: nftPositionData.token0,
      token1: nftPositionData.token1
    });

    // Create pool service and ensure pool exists
    const poolService = new PoolService();
    
    const poolResult = await poolService.getOrCreatePoolWithTokens(
      session.user.id,
      chainLower,
      nftPositionData.token0,
      nftPositionData.token1,
      nftPositionData.fee
    );

    console.log(`Pool ensured: ${poolResult.pool.id}`);

    // Determine quote token configuration
    const { token0IsQuote } = determineQuoteToken(
      nftPositionData.token0,
      nftPositionData.token1
    );

    console.log(`Quote token determination: token0IsQuote = ${token0IsQuote}`);

    // Use the global Prisma instance, or create a new one for this request
    const prisma = (global as any).__testPrisma || new PrismaClient();

    try {
      // Check if position already exists
      const existingPosition = await prisma.position.findFirst({
        where: {
          userId: session.user.id,
          nftId: nftId,
          pool: {
            chain: chainLower
          }
        }
      });

      if (existingPosition) {
        return NextResponse.json({
          success: false,
          error: `Position with NFT ID ${nftId} on ${chainLower} already exists`,
        }, { status: 409 });
      }

      // Create the position
      const position = await prisma.position.create({
        data: {
          userId: session.user.id,
          poolId: poolResult.pool.id,
          tickLower: nftPositionData.tickLower,
          tickUpper: nftPositionData.tickUpper,
          liquidity: nftPositionData.liquidity,
          token0IsQuote,
          owner: nftPositionData.owner,
          importType: 'nft',
          nftId,
          status: 'active',
          // Initial values will be set by the upgrade mechanism
          initialValue: null,
          initialToken0Amount: null,
          initialToken1Amount: null,
          initialTimestamp: null,
          initialSource: null
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

      console.log(`Position created: ${position.id}`);

      return NextResponse.json({
        success: true,
        position: {
          id: position.id,
          nftId: position.nftId!,
          tickLower: position.tickLower,
          tickUpper: position.tickUpper,
          liquidity: position.liquidity,
          pool: {
            id: position.pool.id,
            chain: position.pool.chain,
            poolAddress: position.pool.poolAddress,
            fee: position.pool.fee,
            token0Data: poolResult.token0Data,
            token1Data: poolResult.token1Data
          }
        }
      });

    } catch (dbError) {
      console.error('Database error during position creation:', dbError);
      throw dbError;
    } finally {
      // Only disconnect if we created our own client
      if (!(global as any).__testPrisma) {
        await prisma.$disconnect();
      }
    }

  } catch (error) {
    console.error('NFT import error:', error);
    
    if (error instanceof Error) {
      // Check for specific error types
      if (error.message.includes('does not exist')) {
        return NextResponse.json({
          success: false,
          error: `NFT with ID ${nftId} does not exist on ${chain}`,
        }, { status: 404 });
      }
      
      if (error.message.includes('Invalid chain')) {
        return NextResponse.json({
          success: false,
          error: error.message,
        }, { status: 400 });
      }

      return NextResponse.json({
        success: false,
        error: error.message,
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}
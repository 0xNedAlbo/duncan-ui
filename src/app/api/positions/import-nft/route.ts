import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { fetchNFTPositionWithOwner } from '@/services/uniswap/nftPosition';
import { PoolService } from '@/services/uniswap/poolService';
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
      token0Info?: any;
      token1Info?: any;
    };
  };
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<NFTImportResponse>> {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized - Please sign in',
      }, { status: 401 });
    }

    const body = await request.json() as NFTImportRequest;
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
    const poolService = new PoolService();
    const prisma = new PrismaClient();

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

      // 5. Create position in database
      const position = await prisma.position.create({
        data: {
          userId: session.user.id,
          poolId: pool.id,
          tickLower: nftPositionData.tickLower,
          tickUpper: nftPositionData.tickUpper,
          liquidity: nftPositionData.liquidity,
          importType: 'nft',
          nftId: nftPositionData.nftId,
          owner: nftPositionData.owner, // Store NFT owner address
          status: 'active'
        },
        include: {
          pool: {
            include: {
              token0: true,
              token1: true
            }
          }
        }
      });

      return NextResponse.json({
        success: true,
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
            token0Info: pool.token0Info,
            token1Info: pool.token1Info
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
    
    if (error instanceof Error && error.message.includes('does not exist')) {
      return NextResponse.json({
        success: false,
        error: error.message,
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 });
  }
}

// Handle unsupported methods
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    success: false,
    error: 'Method not allowed',
  }, { status: 405 });
}
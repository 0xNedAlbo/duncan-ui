import { NextRequest, NextResponse } from 'next/server';
import { fetchNFTPosition } from '@/services/uniswap/nftPosition';

export interface NFTImportRequest {
  chain: string;
  nftId: string;
}

export interface NFTImportResponse {
  success: boolean;
  data?: {
    nftId: string;
    chainId: number;
    chainName: string;
    token0Address: string;
    token1Address: string;
    fee: number;
    tickLower: number;
    tickUpper: number;
    liquidity: string;
    tokensOwed0: string;
    tokensOwed1: string;
    isActive: boolean;
  };
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<NFTImportResponse>> {
  try {
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

    // Fetch the NFT position
    try {
      const positionData = await fetchNFTPosition(chain.toLowerCase(), nftId);

      return NextResponse.json({
        success: true,
        data: positionData,
      });
    } catch (error) {
      console.error('NFT position fetch error:', error);
      
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }, { status: 404 });
    }
  } catch (error) {
    console.error('API error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Invalid request format',
    }, { status: 400 });
  }
}

// Handle unsupported methods
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    success: false,
    error: 'Method not allowed',
  }, { status: 405 });
}
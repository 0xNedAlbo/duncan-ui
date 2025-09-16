import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

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
    owner?: string;
  };
  error?: string;
}

/**
 * POST /api/positions/uniswapv3/import-nft - Import Uniswap V3 NFT position
 * 
 * Status: Not implemented - requires rewrite with new PositionService and event architecture
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }

    // Validate request body
    const body = await request.json() as NFTImportRequest;
    if (!body.chain || !body.nftId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: chain, nftId' },
        { status: 400 }
      );
    }

    // Return not implemented error
    return NextResponse.json(
      { 
        success: false, 
        error: 'Not implemented - NFT import API requires rewrite with new event architecture' 
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
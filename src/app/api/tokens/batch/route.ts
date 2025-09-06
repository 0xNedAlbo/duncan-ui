import { NextRequest, NextResponse } from 'next/server';
import { TokenService } from '@/services/tokens/tokenService';
import { PrismaClient } from '@prisma/client';
import { getSession } from '@/lib/auth';

// Allow test injection of prisma client
const prisma = globalThis.__testPrisma || new PrismaClient();
const tokenService = new TokenService(prisma);

export async function POST(request: NextRequest) {
  // Check authentication
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized - Please sign in' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { chain, addresses } = body;

    // Input validation
    if (!chain || !addresses || !Array.isArray(addresses)) {
      return NextResponse.json(
        { error: 'Missing required parameters: chain and addresses (array)' },
        { status: 400 }
      );
    }

    if (addresses.length === 0) {
      return NextResponse.json({ tokens: [] });
    }

    if (addresses.length > 100) {
      return NextResponse.json(
        { error: 'Maximum 100 addresses allowed per batch request' },
        { status: 400 }
      );
    }

    // Validate all addresses are strings
    if (!addresses.every(addr => typeof addr === 'string')) {
      return NextResponse.json(
        { error: 'All addresses must be strings' },
        { status: 400 }
      );
    }

    // Create tokens from addresses (will fetch from Alchemy if needed)
    const tokens = await tokenService.createTokensFromAddresses(chain, addresses);

    return NextResponse.json({
      tokens,
      count: tokens.length,
    });
  } catch (error) {
    console.error('Error creating tokens from addresses:', error);
    
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
    const addressesParam = searchParams.get('addresses');

    // Input validation
    if (!chain || !addressesParam) {
      return NextResponse.json(
        { error: 'Missing required parameters: chain and addresses' },
        { status: 400 }
      );
    }

    // Parse addresses from comma-separated string
    const addresses = addressesParam.split(',').map(addr => addr.trim()).filter(Boolean);

    if (addresses.length === 0) {
      return NextResponse.json({ tokens: [] });
    }

    if (addresses.length > 100) {
      return NextResponse.json(
        { error: 'Maximum 100 addresses allowed per batch request' },
        { status: 400 }
      );
    }

    // Get existing tokens (won't create new ones)
    const tokens = await tokenService.getTokensByAddresses(chain, addresses);

    return NextResponse.json({
      tokens,
      count: tokens.length,
    });
  } catch (error) {
    console.error('Error fetching tokens by addresses:', error);
    
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
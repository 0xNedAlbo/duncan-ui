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
    const address = searchParams.get('address');

    // Input validation
    if (!chain || !address) {
      return NextResponse.json(
        { error: 'Missing required parameters: chain and address' },
        { status: 400 }
      );
    }

    // Get token
    const token = await tokenService.getToken(chain, address);

    if (!token) {
      return NextResponse.json(
        { error: 'Token not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ token });
  } catch (error) {
    console.error('Error fetching token:', error);
    
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
    const { chain, address, symbol, name, decimals, logoUrl, verified } = body;

    // Input validation
    if (!chain || !address) {
      return NextResponse.json(
        { error: 'Missing required parameters: chain and address' },
        { status: 400 }
      );
    }

    // Create or update token
    const token = await tokenService.upsertToken({
      chain,
      address,
      symbol,
      name,
      decimals,
      logoUrl,
      verified,
    });

    return NextResponse.json({ token }, { status: 201 });
  } catch (error) {
    console.error('Error creating/updating token:', error);
    
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
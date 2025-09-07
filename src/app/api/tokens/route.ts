import { NextRequest, NextResponse } from 'next/server';
import { TokenResolutionService } from '@/services/tokens/tokenResolutionService';
import { PrismaClient } from '@prisma/client';
import { getSession } from '@/lib/auth';

// Allow test injection of prisma client
const prisma = globalThis.__testPrisma || new PrismaClient();
const tokenResolutionService = new TokenResolutionService(prisma);

export async function GET(request: NextRequest) {
  // Check authentication
  const session = await getSession();
  if (!session?.user?.id) {
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

    // Resolve token for user
    const token = await tokenResolutionService.resolveToken(chain, address, session.user.id);

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
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Unauthorized - Please sign in' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { chain, address, symbol, name, decimals, logoUrl, userLabel, notes } = body;

    // Input validation
    if (!chain || !address || !symbol || !name || decimals === undefined) {
      return NextResponse.json(
        { error: 'Missing required parameters: chain, address, symbol, name, and decimals' },
        { status: 400 }
      );
    }

    // Add custom token for user
    const token = await tokenResolutionService.addCustomToken(session.user.id, {
      chain,
      address,
      symbol,
      name,
      decimals,
      logoUrl,
      userLabel,
      notes,
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
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { ApiServiceFactory } from '@/lib/api/ApiServiceFactory';

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
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON format' },
        { status: 400 }
      );
    }
    
    const { chain, addresses } = body;

    // Input validation
    if (!chain || !addresses || !Array.isArray(addresses)) {
      return NextResponse.json(
        { error: 'Missing required parameters: chain and addresses (array)' },
        { status: 400 }
      );
    }

    if (addresses.length === 0) {
      return NextResponse.json({ tokens: [], count: 0 });
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

    // Resolve tokens for user (will create if needed)
    const apiServices = ApiServiceFactory.getInstance();
    const tokenRequests = addresses.map(address => ({ chain, address }));
    const tokens = await apiServices.tokenResolutionService.resolveTokens(tokenRequests, session.user.id);

    return NextResponse.json({
      tokens,
      count: tokens.length,
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
    const addressesParam = searchParams.get('addresses');

    // Input validation
    if (!chain || addressesParam === null) {
      return NextResponse.json(
        { error: 'Missing required parameters: chain and addresses' },
        { status: 400 }
      );
    }

    // Parse addresses from comma-separated string
    const addresses = addressesParam.split(',').map(addr => addr.trim()).filter(Boolean);

    if (addresses.length === 0) {
      return NextResponse.json({ tokens: [], count: 0 });
    }

    if (addresses.length > 100) {
      return NextResponse.json(
        { error: 'Maximum 100 addresses allowed per batch request' },
        { status: 400 }
      );
    }

    // Resolve tokens for user (similar to POST, but via GET)
    const apiServices = ApiServiceFactory.getInstance();
    const tokenRequests = addresses.map(address => ({ chain, address }));
    const tokens = await apiServices.tokenResolutionService.resolveTokens(tokenRequests, session.user.id);

    return NextResponse.json({
      tokens,
      count: tokens.length,
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
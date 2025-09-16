import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { ApiServiceFactory } from '@/lib/api/ApiServiceFactory';
import { withLogging, logError } from '@/lib/api/withLogging';

export const GET = withLogging<{ token: any } | { error: string }>(async (request: NextRequest, { log }) => {
  // Check authentication
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Unauthorized - Please sign in' },
      { status: 401 }
    );
  }

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

  try {
    // Resolve token for user
    const apiServices = ApiServiceFactory.getInstance();
    const token = await apiServices.tokenResolutionService.resolveToken(chain, address, session.user.id);

    return NextResponse.json({ token });
  } catch (error) {
    // Handle validation errors
    if (error instanceof Error && (error.message.includes('Invalid') || error.message.includes('Unsupported'))) {
      logError(log, error, { chain, address, userId: session.user.id });
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    // Let withLogging handle the 500 error with full stack trace
    throw error;
  }
});

export const POST = withLogging<{ token: any } | { error: string }>(async (request: NextRequest, { log }) => {
  // Check authentication
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Unauthorized - Please sign in' },
      { status: 401 }
    );
  }

  const body = await request.json();
  const { chain, address, symbol, name, decimals, logoUrl, userLabel, notes } = body;

  // Input validation
  if (!chain || !address || !symbol || !name || decimals === undefined) {
    return NextResponse.json(
      { error: 'Missing required parameters: chain, address, symbol, name, and decimals' },
      { status: 400 }
    );
  }

  try {
    // Add custom token for user
    const apiServices = ApiServiceFactory.getInstance();
    const token = await apiServices.tokenResolutionService.addCustomToken(session.user.id, {
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
    // Handle validation errors
    if (error instanceof Error && (error.message.includes('Invalid') || error.message.includes('Unsupported'))) {
      logError(log, error, { chain, address, symbol, userId: session.user.id });
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    // Let withLogging handle the 500 error with full stack trace
    throw error;
  }
});
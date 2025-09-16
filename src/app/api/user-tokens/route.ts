import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { ApiServiceFactory } from '@/lib/api/ApiServiceFactory';
import { z } from 'zod';

const CreateUserTokenSchema = z.object({
  chain: z.string().min(1),
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  symbol: z.string().min(1).max(20),
  name: z.string().min(1).max(100),
  decimals: z.number().int().min(0).max(36),
  logoUrl: z.string().url().optional(),
  userLabel: z.string().max(50).optional(),
  notes: z.string().max(500).optional(),
});

const GetUserTokensSchema = z.object({
  chain: z.string().optional(),
});

/**
 * GET /api/user-tokens - Get user's custom tokens
 * Query parameters:
 * - chain?: string - Filter by blockchain
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const options = {
      chain: searchParams.get('chain') || undefined,
    };

    const validatedOptions = GetUserTokensSchema.parse(options);

    const apiServices = ApiServiceFactory.getInstance();
    const userTokens = await apiServices.tokenResolutionService.getUserTokens(
      session.user.id,
      validatedOptions.chain
    );

    return NextResponse.json({ userTokens });

  } catch (error) {
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user-tokens - Add a custom token manually
 * Body: { chain, address, symbol, name, decimals, logoUrl?, userLabel?, notes? }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = CreateUserTokenSchema.parse(body);

    const apiServices = ApiServiceFactory.getInstance();
    const userToken = await apiServices.tokenResolutionService.addCustomToken(
      session.user.id,
      validatedData
    );

    return NextResponse.json({ userToken });

  } catch (error) {
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
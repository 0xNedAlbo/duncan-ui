import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PoolService } from '@/services/uniswap/poolService';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { isValidFeeTier } from '@/lib/contracts/uniswapV3Factory';

// Input validation schema
const CreatePositionSchema = z.object({
  chain: z.string().min(1),
  token0Address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  token1Address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  fee: z.number().int().positive(),
  tickLower: z.number().int(),
  tickUpper: z.number().int(),
  // For now, we'll calculate liquidity from amount
  // Later this can be more sophisticated with exact liquidity input
  amountToken0: z.string().optional(), // As string to avoid precision loss
  amountToken1: z.string().optional(),
  // Or direct liquidity input
  liquidity: z.string().optional(),
});

export interface CreatePositionRequest {
  chain: string;
  token0Address: string;
  token1Address: string;
  fee: number;
  tickLower: number;
  tickUpper: number;
  amountToken0?: string;
  amountToken1?: string;
  liquidity?: string;
}

export interface CreatePositionResponse {
  success: boolean;
  position?: {
    id: string;
    tickLower: number;
    tickUpper: number;
    liquidity: string;
    pool: {
      id: string;
      chain: string;
      poolAddress: string;
      fee: number;
      feePercentage: string;
      token0Info: any;
      token1Info: any;
    };
  };
  error?: string;
}

/**
 * POST /api/positions/create - Create a manual position
 * 
 * This endpoint:
 * 1. Validates position parameters
 * 2. Creates/finds the pool internally 
 * 3. Validates tick range
 * 4. Creates position in database
 * 5. Returns position with pool information
 */
export async function POST(request: NextRequest): Promise<NextResponse<CreatePositionResponse>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized - Please sign in',
      }, { status: 401 });
    }

    const body = await request.json() as CreatePositionRequest;
    const validatedData = CreatePositionSchema.parse(body);

    const {
      chain,
      token0Address,
      token1Address,
      fee,
      tickLower,
      tickUpper,
      amountToken0,
      amountToken1,
      liquidity
    } = validatedData;

    // 1. Validate fee tier
    if (!isValidFeeTier(fee)) {
      return NextResponse.json({
        success: false,
        error: `Invalid fee tier: ${fee}. Supported: 100 (0.01%), 500 (0.05%), 3000 (0.3%), 10000 (1%)`
      }, { status: 400 });
    }

    // 2. Validate tick range
    if (tickLower >= tickUpper) {
      return NextResponse.json({
        success: false,
        error: 'tickLower must be less than tickUpper'
      }, { status: 400 });
    }

    // 3. Validate liquidity input
    if (!liquidity && !amountToken0 && !amountToken1) {
      return NextResponse.json({
        success: false,
        error: 'Either liquidity or token amounts must be provided'
      }, { status: 400 });
    }

    // 4. Validate token addresses are different
    if (token0Address.toLowerCase() === token1Address.toLowerCase()) {
      return NextResponse.json({
        success: false,
        error: 'Token addresses must be different'
      }, { status: 400 });
    }

    const poolService = new PoolService();
    const prisma = new PrismaClient();

    try {
      // 5. Find or create pool internally
      const pool = await poolService.findOrCreatePoolWithReferences(
        chain,
        token0Address,
        token1Address,
        fee,
        session.user.id
      );

      // 6. Calculate liquidity if not provided directly
      let finalLiquidity: string;
      
      if (liquidity) {
        // Direct liquidity input
        finalLiquidity = liquidity;
      } else {
        // Calculate liquidity from amounts
        // For now, use a simple approach - in production this would use
        // Uniswap V3 SDK for precise calculations
        if (amountToken0) {
          // Simplified calculation - in reality this needs current price and tick math
          finalLiquidity = amountToken0;
        } else if (amountToken1) {
          finalLiquidity = amountToken1;
        } else {
          throw new Error('No liquidity calculation method available');
        }
      }

      // 7. Validate tick range against pool's tick spacing
      const tickSpacing = pool.tickSpacing;
      if (tickLower % tickSpacing !== 0 || tickUpper % tickSpacing !== 0) {
        return NextResponse.json({
          success: false,
          error: `Tick values must be multiples of tick spacing (${tickSpacing}) for this fee tier`
        }, { status: 400 });
      }

      // 8. Create position in database
      const position = await prisma.position.create({
        data: {
          userId: session.user.id,
          poolId: pool.id,
          tickLower,
          tickUpper,
          liquidity: finalLiquidity,
          importType: 'manual',
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

      // 9. Return position with enriched pool information
      return NextResponse.json({
        success: true,
        position: {
          id: position.id,
          tickLower: position.tickLower,
          tickUpper: position.tickUpper,
          liquidity: position.liquidity,
          pool: {
            id: pool.id,
            chain: pool.chain,
            poolAddress: pool.poolAddress,
            fee: pool.fee,
            feePercentage: (pool.fee / 10000).toFixed(2) + '%',
            token0Info: pool.token0Data,
            token1Info: pool.token1Data
          }
        }
      });

    } finally {
      await poolService.disconnect();
      await prisma.$disconnect();
    }

  } catch (error) {
    console.error('Position creation error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request data',
        details: error.errors
      }, { status: 400 });
    }

    if (error instanceof Error) {
      if (error.message.includes('does not exist on-chain')) {
        return NextResponse.json({
          success: false,
          error: error.message
        }, { status: 400 });
      }

      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// Handle unsupported methods
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    success: false,
    error: 'Method not allowed'
  }, { status: 405 });
}
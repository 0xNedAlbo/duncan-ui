import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createPublicClient, http } from 'viem';
import { mainnet, arbitrum, base } from 'viem/chains';
import { z } from 'zod';
import {
  UNISWAP_V3_FACTORY_ADDRESSES,
  UNISWAP_V3_FACTORY_ABI,
  isValidFeeTier
} from '@/lib/contracts/uniswapV3Factory';
import { sortTokens } from '@/lib/utils/uniswap-v3';
import { normalizeAddress } from '@/lib/contracts/erc20';

// Chain configuration for viem clients
const CHAIN_CONFIG = {
  ethereum: { chain: mainnet },
  arbitrum: { chain: arbitrum },
  base: { chain: base },
};

const ComputeAddressSchema = z.object({
  chain: z.string().min(1),
  token0Address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  token1Address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  fee: z.number().int().positive(),
});

/**
 * POST /api/pools/compute-address - Compute pool address from factory
 * Body: { chain, token0Address, token1Address, fee }
 * 
 * Returns the computed pool address and whether it exists on-chain
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
    const validatedData = ComputeAddressSchema.parse(body);

    const { chain, token0Address, token1Address, fee } = validatedData;

    // Validate fee tier
    if (!isValidFeeTier(fee)) {
      return NextResponse.json(
        { error: `Invalid fee tier: ${fee}. Supported: 100, 500, 3000, 10000` },
        { status: 400 }
      );
    }

    // Get factory address
    const factoryAddress = UNISWAP_V3_FACTORY_ADDRESSES[chain];
    if (!factoryAddress) {
      return NextResponse.json(
        { error: `Factory not deployed on chain: ${chain}` },
        { status: 400 }
      );
    }

    // Get chain config
    const chainConfig = CHAIN_CONFIG[chain as keyof typeof CHAIN_CONFIG];
    if (!chainConfig) {
      return NextResponse.json(
        { error: `Unsupported chain: ${chain}` },
        { status: 400 }
      );
    }

    // Sort token addresses
    const sorted = sortTokens(
      { address: normalizeAddress(token0Address) },
      { address: normalizeAddress(token1Address) }
    );
    const sortedToken0 = sorted.token0.address;
    const sortedToken1 = sorted.token1.address;

    // Create public client
    const publicClient = createPublicClient({
      chain: chainConfig.chain,
      transport: http(),
    });

    // Get pool address from factory
    const poolAddress = await publicClient.readContract({
      address: factoryAddress,
      abi: UNISWAP_V3_FACTORY_ABI,
      functionName: 'getPool',
      args: [sortedToken0 as `0x${string}`, sortedToken1 as `0x${string}`, fee],
    }) as string;

    // Check if pool exists (address is not zero)
    const exists = poolAddress !== '0x0000000000000000000000000000000000000000';

    return NextResponse.json({
      poolAddress: normalizeAddress(poolAddress),
      exists,
      token0Address: sortedToken0,
      token1Address: sortedToken1,
      fee,
      feePercentage: (fee / 10000).toFixed(2) + '%'
    });

  } catch (error) {
    console.error('Error computing pool address:', error);
    
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
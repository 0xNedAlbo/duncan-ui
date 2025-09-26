import { NextRequest } from 'next/server';
import { withAuthAndLogging } from '@/lib/api/withAuth';
import { getPoolFeeData } from '@/services/pools/poolFeeService';
import { isValidAddress, normalizeAddress } from '@/lib/utils/evm';
import { isValidChainSlug } from '@/config/chains';

interface PoolFeeApiResponse {
  success: boolean;
  data?: {
    poolAddress: string;
    chain: string;
    feeTier: string;
    poolLiquidity: string;
    token0: {
      address: string;
      symbol: string;
      decimals: number;
      dailyVolume: string;
      price: string;
    };
    token1: {
      address: string;
      symbol: string;
      decimals: number;
      dailyVolume: string;
      price: string;
    };
    calculatedAt: string;
  };
  error?: string;
}

export const GET = withAuthAndLogging<PoolFeeApiResponse>(
  async (request: NextRequest, { user, log }, params?: { chain: string; address: string }) => {
    const chain = params?.chain;
    const address = params?.address;

    // Validate required parameters
    if (!chain || !address) {
      log.warn({ userId: user.userId, chain, address }, 'Missing required parameters');
      return Response.json(
        {
          success: false,
          error: 'Missing required parameters: chain and address',
        },
        { status: 400 }
      );
    }

    log.debug({
      userId: user.userId,
      chain,
      poolAddress: address
    }, 'Pool fee data request');

    // Validate chain parameter
    if (!isValidChainSlug(chain)) {
      log.warn({ chain }, 'Invalid chain parameter');
      return Response.json(
        {
          success: false,
          error: `Invalid chain: ${chain}. Supported chains: ethereum, arbitrum, base`,
        },
        { status: 400 }
      );
    }

    // Validate pool address parameter
    if (!isValidAddress(address)) {
      log.warn({ poolAddress: address }, 'Invalid pool address parameter');
      return Response.json(
        {
          success: false,
          error: `Invalid pool address: ${address}`,
        },
        { status: 400 }
      );
    }

    try {
      // Get pool fee data from subgraph
      const feeData = await getPoolFeeData(chain, address);

      log.debug({
        userId: user.userId,
        chain,
        poolAddress: normalizeAddress(address),
        feeTier: feeData.feeTier,
        token0Symbol: feeData.token0.symbol,
        token1Symbol: feeData.token1.symbol,
      }, 'Pool fee data retrieved successfully');

      return Response.json({
        success: true,
        data: feeData,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      log.error({
        userId: user.userId,
        chain,
        poolAddress: address,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      }, 'Failed to fetch pool fee data');

      // Check for specific error types to provide better responses
      if (errorMessage.includes('Pool not found')) {
        return Response.json(
          {
            success: false,
            error: `Pool not found on ${chain}. Please verify the pool address.`,
          },
          { status: 404 }
        );
      }

      if (errorMessage.includes('No recent pool data')) {
        return Response.json(
          {
            success: false,
            error: 'No recent trading data available for this pool.',
          },
          { status: 404 }
        );
      }

      if (errorMessage.includes('Rate limit')) {
        return Response.json(
          {
            success: false,
            error: 'Rate limit exceeded. Please try again later.',
          },
          { status: 429 }
        );
      }

      // Generic server error
      return Response.json(
        {
          success: false,
          error: 'Failed to fetch pool fee data. Please try again.',
        },
        { status: 500 }
      );
    }
  }
);
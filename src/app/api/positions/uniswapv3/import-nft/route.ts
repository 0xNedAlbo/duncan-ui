import { NextRequest, NextResponse } from 'next/server';
import { withAuthAndLogging } from '@/lib/api/withAuth';
import { logError } from '@/lib/api/withLogging';
import { ApiServiceFactory } from '@/lib/api/ApiServiceFactory';
import { SupportedChainsType, SUPPORTED_CHAINS } from '@/config/chains';
import type { ImportNFTRequest } from '@/types/api';

/**
 * POST /api/positions/uniswapv3/import-nft - Import Uniswap V3 NFT position
 *
 * Imports a Uniswap V3 position by NFT ID using the PositionImportService.
 * Automatically calculates PnL breakdown after successful import.
 *
 * Request body:
 * - chain: Blockchain network (ethereum, arbitrum, base)
 * - nftId: NFT token ID of the position (numeric string)
 */
export const POST = withAuthAndLogging<{ success: boolean; data?: any; error?: string; meta?: any; position?: any }>(
  async (request: NextRequest, { user, log }) => {
    try {
      // Parse and validate request body
      let body: ImportNFTRequest;
      let chain: string;
      let nftId: string;

      try {
        body = await request.json() as ImportNFTRequest;
        chain = body.chain || '';
        nftId = body.nftId || '';
      } catch {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid JSON in request body',
            meta: {
              requestedAt: new Date().toISOString(),
              chain: '',
              nftId: '',
              dataSource: 'onchain'
            }
          },
          { status: 400 }
        );
      }

      if (!chain || !nftId) {
        return NextResponse.json(
          {
            success: false,
            error: 'Missing required fields: chain, nftId',
            meta: {
              requestedAt: new Date().toISOString(),
              chain: chain || '',
              nftId: nftId || '',
              dataSource: 'onchain'
            }
          },
          { status: 400 }
        );
      }

      // Validate chain parameter
      if (!SUPPORTED_CHAINS.includes(chain as SupportedChainsType)) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid chain parameter. Supported chains: ${SUPPORTED_CHAINS.join(', ')}`,
            meta: {
              requestedAt: new Date().toISOString(),
              chain,
              nftId,
              dataSource: 'onchain'
            }
          },
          { status: 400 }
        );
      }

      // Validate NFT ID format (should be numeric)
      if (!/^\d+$/.test(nftId)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid NFT ID format. Must be a positive integer.',
            meta: {
              requestedAt: new Date().toISOString(),
              chain,
              nftId,
              dataSource: 'onchain'
            }
          },
          { status: 400 }
        );
      }

      log.debug(
        { chain, nftId, userId: user.userId },
        'Starting NFT position import'
      );

      // Get service instance
      const apiFactory = ApiServiceFactory.getInstance();
      const positionImportService = apiFactory.positionImportService;

      // Import the position
      const importResult = await positionImportService.importPositionForUserByNftId(
        user.userId,
        nftId,
        chain as SupportedChainsType
      );

      if (!importResult.success) {
        log.debug(
          { chain, nftId, userId: user.userId, error: importResult.message },
          'NFT position import failed'
        );

        // Determine appropriate HTTP status code based on error message
        let statusCode = 500;
        if (importResult.message.includes('not found')) {
          statusCode = 404;
        } else if (importResult.message.includes('Invalid') || importResult.message.includes('Missing')) {
          statusCode = 400;
        }

        return NextResponse.json(
          {
            success: false,
            error: importResult.message,
            meta: {
              requestedAt: new Date().toISOString(),
              chain,
              nftId,
              dataSource: 'onchain'
            }
          },
          { status: statusCode }
        );
      }

      log.debug(
        {
          positionId: importResult.positionId,
          chain,
          nftId,
          userId: user.userId,
          poolAddress: importResult.data?.poolAddress,
          liquidity: importResult.data?.liquidity
        },
        'NFT position import completed successfully'
      );

      // Map the service result to the expected response format
      return NextResponse.json({
        success: true,
        data: {
          position: {
            id: importResult.positionId!,
            nftId: importResult.data!.nftId,
            poolAddress: importResult.data!.poolAddress,
            tickLower: importResult.data!.tickLower,
            tickUpper: importResult.data!.tickUpper,
            liquidity: importResult.data!.liquidity,
            token0Address: importResult.data!.token0Address,
            token1Address: importResult.data!.token1Address,
            fee: importResult.data!.fee,
            chain: importResult.data!.chain,
            owner: importResult.data!.owner
          }
        },
        meta: {
          requestedAt: new Date().toISOString(),
          chain,
          nftId,
          dataSource: 'onchain'
        }
      });
    } catch (error) {
      logError(log, error, {
        endpoint: 'positions/uniswapv3/import-nft',
        userId: user?.userId
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Internal server error',
          meta: {
            requestedAt: new Date().toISOString(),
            chain: '',
            nftId: '',
            dataSource: 'onchain'
          }
        },
        { status: 500 }
      );
    }
  }
);
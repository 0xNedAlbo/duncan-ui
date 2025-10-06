import { NextRequest, NextResponse } from 'next/server';
import { withAuthAndLogging } from '@/app-shared/lib/api/withAuth';
import { logError } from '@/app-shared/lib/api/withLogging';
import { ApiServiceFactory } from '@/app-shared/lib/api/ApiServiceFactory';
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

      // Check for duplicate position before importing
      const positionId = {
        userId: user.userId,
        chain: chain as SupportedChainsType,
        protocol: "uniswapv3",
        nftId
      };

      const existingPosition = await apiFactory.positionService.getPosition(positionId);

      if (existingPosition) {
        log.debug(
          { chain, nftId, userId: user.userId },
          'Position already exists - preventing duplicate import'
        );

        return NextResponse.json(
          {
            success: false,
            error: 'Position already imported. This NFT position already exists in your portfolio.',
            data: {
              existingPosition: {
                chain: existingPosition.chain,
                protocol: existingPosition.protocol,
                nftId: existingPosition.nftId,
                poolAddress: existingPosition.pool.poolAddress,
                token0Symbol: existingPosition.pool.token0.symbol,
                token1Symbol: existingPosition.pool.token1.symbol,
                status: existingPosition.status,
                createdAt: existingPosition.createdAt
              }
            },
            meta: {
              requestedAt: new Date().toISOString(),
              chain,
              nftId,
              dataSource: 'database'
            }
          },
          { status: 409 }
        );
      }

      // Import the position
      let importResult;
      try {
        importResult = await positionImportService.importPositionForUserByNftId(
          user.userId,
          nftId,
          chain as SupportedChainsType
        );
      } catch (error) {
        log.error({
          chain,
          nftId,
          userId: user.userId,
          error: error instanceof Error ? error.message : 'Unknown error'
        }, 'Position import service call failed');

        importResult = { success: false, message: 'Position import failed' };
      }

      if (!importResult.success) {
        log.debug(
          { chain, nftId, userId: user.userId, error: importResult.message },
          'NFT position import failed'
        );

        // Clean up any partially created position data
        try {
          await apiFactory.positionService.deletePosition(positionId);
          log.debug(
            { chain, nftId, userId: user.userId },
            'Cleaned up partially created position after import failure'
          );
        } catch (cleanupError) {
          log.error(
            { chain, nftId, userId: user.userId, cleanupError },
            'Failed to clean up position after import failure'
          );
          // Don't fail the response due to cleanup errors
        }

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
          chain,
          protocol: "uniswapv3",
          nftId,
          userId: user.userId,
          poolAddress: importResult.data?.poolAddress,
          liquidity: importResult.data?.liquidity
        },
        'NFT position import completed successfully'
      );

      // Get the full position data with all relationships (pool, tokens, etc.)
      // This ensures the frontend gets the same format as the position list endpoint
      const fullPosition = await apiFactory.positionService.getPosition(positionId);

      if (!fullPosition) {
        log.error(
          { chain, nftId, protocol: "uniswapv3" },
          'Failed to retrieve full position data after import'
        );
        return NextResponse.json(
          {
            success: false,
            error: 'Import succeeded but failed to retrieve complete position data',
            meta: {
              requestedAt: new Date().toISOString(),
              chain,
              nftId,
              dataSource: 'onchain'
            }
          },
          { status: 500 }
        );
      }

      log.debug(
        {
          chain: fullPosition.chain,
          protocol: fullPosition.protocol,
          nftId: fullPosition.nftId,
          poolAddress: fullPosition.pool.poolAddress,
          token0Symbol: fullPosition.pool.token0.symbol,
          token1Symbol: fullPosition.pool.token1.symbol,
        },
        'Successfully retrieved full position data after import'
      );

      // Return the full BasicPosition data format (same as position list endpoint)
      return NextResponse.json({
        success: true,
        data: {
          position: fullPosition
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
import { NextRequest, NextResponse } from 'next/server';
import { withAuthAndLogging } from '@/app-shared/lib/api/withAuth';
import { ApiServiceFactory } from '@/app-shared/lib/api/ApiServiceFactory';
import { SupportedChainsType, SUPPORTED_CHAINS } from '@/config/chains';
import { normalizeAddress, isValidAddress } from '@/lib/utils/evm';
import type { DiscoverPositionsRequest, DiscoverPositionsResponse } from '@/types/api';

/**
 * POST /api/positions/uniswapv3/discover - Discover Uniswap V3 NFT positions
 *
 * Discovers Uniswap V3 positions for a given wallet address using on-chain enumeration.
 * Returns BasicPosition objects with full pool information ready for UI consumption.
 *
 * Request body:
 * - address: Wallet address to search for positions
 * - chain: Blockchain network (ethereum, arbitrum, base)
 * - limit: Optional limit (1-10, defaults to 10)
 */
export const POST = withAuthAndLogging<DiscoverPositionsResponse>(
  async (request: NextRequest, { user, log }) => {
    try {
      // Parse and validate request body
      let body: DiscoverPositionsRequest;
      let address: string;
      let chain: string;
      let limit: number;

      try {
        body = await request.json() as DiscoverPositionsRequest;
        address = body.address || '';
        chain = body.chain || '';
        limit = body.limit || 10;
      } catch {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid JSON in request body',
            meta: {
              requestedAt: new Date().toISOString(),
              address: '',
              chain: '',
              limit: 10,
              dataSource: 'onchain' as const
            }
          } satisfies DiscoverPositionsResponse,
          { status: 400 }
        );
      }

      // Validate required fields
      if (!address || !chain) {
        return NextResponse.json(
          {
            success: false,
            error: 'Missing required fields: address, chain',
            meta: {
              requestedAt: new Date().toISOString(),
              address: address || '',
              chain: chain || '',
              limit,
              dataSource: 'onchain' as const
            }
          } satisfies DiscoverPositionsResponse,
          { status: 400 }
        );
      }

      // Validate address format
      if (!isValidAddress(address)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid address format',
            meta: {
              requestedAt: new Date().toISOString(),
              address,
              chain,
              limit,
              dataSource: 'onchain' as const
            }
          } satisfies DiscoverPositionsResponse,
          { status: 400 }
        );
      }

      // Normalize the address to EIP-55 checksum format
      const normalizedAddress = normalizeAddress(address);

      // Validate chain parameter
      if (!SUPPORTED_CHAINS.includes(chain as SupportedChainsType)) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid chain parameter. Supported chains: ${SUPPORTED_CHAINS.join(', ')}`,
            meta: {
              requestedAt: new Date().toISOString(),
              address: normalizedAddress,
              chain,
              limit,
              dataSource: 'onchain' as const
            }
          } satisfies DiscoverPositionsResponse,
          { status: 400 }
        );
      }

      // Validate limit parameter (must be 1-10)
      if (!Number.isInteger(limit) || limit < 1 || limit > 10) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid limit parameter. Must be an integer between 1 and 10',
            meta: {
              requestedAt: new Date().toISOString(),
              address: normalizedAddress,
              chain,
              limit,
              dataSource: 'onchain' as const
            }
          } satisfies DiscoverPositionsResponse,
          { status: 400 }
        );
      }

      log.debug({
        userId: user.userId,
        address: normalizedAddress,
        chain,
        limit
      }, 'Starting position discovery');

      // Get service factory and lookup service
      const apiFactory = ApiServiceFactory.getInstance();
      const positionLookupService = apiFactory.positionLookupService;

      // Discover positions for the address
      const lookupResult = await positionLookupService.findPositionsForAddress(
        normalizedAddress,
        chain as SupportedChainsType,
        user.userId,
        limit
      );

      log.debug({
        userId: user.userId,
        address: normalizedAddress,
        chain,
        totalNFTs: lookupResult.totalNFTs,
        existingPositions: lookupResult.existingPositions,
        newPositionsFound: lookupResult.newPositionsFound
      }, 'Position discovery completed');

      // Return successful response
      return NextResponse.json(
        {
          success: true,
          data: {
            address: lookupResult.address,
            chain: lookupResult.chain,
            totalNFTs: lookupResult.totalNFTs,
            existingPositions: lookupResult.existingPositions,
            newPositionsFound: lookupResult.newPositionsFound,
            positions: lookupResult.positions,
            summary: lookupResult.summary,
          },
          meta: {
            requestedAt: new Date().toISOString(),
            address: normalizedAddress,
            chain,
            limit,
            dataSource: 'onchain' as const
          }
        } satisfies DiscoverPositionsResponse,
        { status: 200 }
      );

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      log.error({
        userId: user.userId,
        error: errorMessage
      }, 'Position discovery failed');

      return NextResponse.json(
        {
          success: false,
          error: `Failed to discover positions: ${errorMessage}`,
          meta: {
            requestedAt: new Date().toISOString(),
            address: '',
            chain: '',
            limit: 10,
            dataSource: 'onchain' as const
          }
        } satisfies DiscoverPositionsResponse,
        { status: 500 }
      );
    }
  }
);
import { NextRequest, NextResponse } from 'next/server';
import { withAuthAndLogging } from '@/lib/api/withAuth';
import { logError } from '@/lib/api/withLogging';
import { ApiServiceFactory } from '@/lib/api/ApiServiceFactory';
import { SupportedChainsType, SUPPORTED_CHAINS } from '@/config/chains';

/**
 * GET /api/positions/uniswapv3/list - Get user's Uniswap V3 positions
 *
 * Query parameters:
 * - chain: Filter by specific chain (optional)
 * - status: Filter by position status (optional, default: active, values: active, closed, archived, all)
 * - limit: Number of results per page (optional, default: 50, max: 100)
 * - offset: Results offset for pagination (optional, default: 0)
 * - sortBy: Sort field (optional, default: createdAt)
 * - sortOrder: Sort direction (optional, default: desc)
 */
export const GET = withAuthAndLogging<{ success: boolean; positions?: any[]; total?: number; limit?: number; offset?: number; error?: string }>(
  async (request: NextRequest, { user, log }) => {
    try {

      // Parse query parameters
      const { searchParams } = new URL(request.url);
      const chain = searchParams.get('chain') as SupportedChainsType | null;
      const status = searchParams.get('status') || 'active';
      const limitParam = searchParams.get('limit');
      const offsetParam = searchParams.get('offset');
      const sortBy = searchParams.get('sortBy') as 'createdAt' | 'updatedAt' | 'liquidity' | null;
      const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' | null;

      // Validate and parse pagination parameters
      let limit = 50;
      let offset = 0;

      if (limitParam) {
        const parsedLimit = parseInt(limitParam, 10);
        if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
          return NextResponse.json(
            { success: false, error: 'Invalid limit parameter. Must be between 1 and 100.' },
            { status: 400 }
          );
        }
        limit = parsedLimit;
      }

      if (offsetParam) {
        const parsedOffset = parseInt(offsetParam, 10);
        if (isNaN(parsedOffset) || parsedOffset < 0) {
          return NextResponse.json(
            { success: false, error: 'Invalid offset parameter. Must be 0 or greater.' },
            { status: 400 }
          );
        }
        offset = parsedOffset;
      }

      // Validate chain parameter
      if (chain && !SUPPORTED_CHAINS.includes(chain)) {
        return NextResponse.json(
          { success: false, error: `Invalid chain parameter. Supported chains: ${SUPPORTED_CHAINS.join(', ')}` },
          { status: 400 }
        );
      }

      // Validate sort parameters
      const validSortFields = ['createdAt', 'updatedAt', 'liquidity'];
      const validSortOrders = ['asc', 'desc'];

      if (sortBy && !validSortFields.includes(sortBy)) {
        return NextResponse.json(
          { success: false, error: `Invalid sortBy parameter. Valid values: ${validSortFields.join(', ')}` },
          { status: 400 }
        );
      }

      if (sortOrder && !validSortOrders.includes(sortOrder)) {
        return NextResponse.json(
          { success: false, error: `Invalid sortOrder parameter. Valid values: ${validSortOrders.join(', ')}` },
          { status: 400 }
        );
      }

      // Get service instance
      const apiFactory = ApiServiceFactory.getInstance();
      const positionService = apiFactory.positionService;

      // Build query options
      const queryOptions = {
        userId: user.userId,
        chain: chain || undefined,
        status: status === 'all' ? undefined : status, // undefined for "all" means no status filter
        limit,
        offset,
        sortBy: sortBy || 'createdAt',
        sortOrder: sortOrder || 'desc',
      };

      log.debug({ queryOptions }, 'Fetching positions with options');

      // Fetch positions and total count
      const [positions, total] = await Promise.all([
        positionService.listPositions(queryOptions),
        positionService.countPositions({ userId: user.userId, chain: chain || undefined, status: status === 'all' ? undefined : status })
      ]);

      log.debug({ positionCount: positions.length, total }, 'Successfully fetched positions');

      return NextResponse.json({
        success: true,
        data: {
          positions,
          pagination: {
            total,
            limit,
            offset,
            hasMore: positions.length === limit && (offset + limit) < total,
            nextOffset: positions.length === limit && (offset + limit) < total ? offset + limit : null
          }
        },
        meta: {
          requestedAt: new Date().toISOString(),
          filters: {
            status: status,
            chain: chain || null,
            sortBy: sortBy || 'createdAt',
            sortOrder: sortOrder || 'desc'
          },
          dataQuality: {
            subgraphPositions: positions.length, // All positions for now, will be updated when PnL service is added
            snapshotPositions: 0,
            upgradedPositions: 0
          }
        }
      });
    } catch (error) {
      logError(log, error, { endpoint: 'positions/uniswapv3/list' });

      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      );
    }
  }
);
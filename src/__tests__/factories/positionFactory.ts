import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PoolFactory, createPoolFactory } from './poolFactory';

export interface TestPositionData {
  id?: string;
  nftId?: string;
  liquidity?: string;
  tickLower?: number;
  tickUpper?: number;
  status?: 'active' | 'closed' | 'archived';
  importType?: 'nft' | 'manual';
  poolId?: string;
  initialValue?: string;
  currentValue?: string;
  pnl?: string;
  pnlPercent?: number;
  initialSource?: string;
  confidence?: 'exact' | 'estimated';
  lastUpdated?: Date;
  dataUpdated?: boolean;
  rangeStatus?: string;
}

/**
 * Position factory for test data creation
 */
export class PositionFactory {
  private prisma: PrismaClient;
  private poolFactory: PoolFactory;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.poolFactory = createPoolFactory(prisma);
  }

  /**
   * Create test position with pool dependencies
   */
  async createPosition(userId: string, data: TestPositionData = {}) {
    const positionId = data.id || `position-${randomBytes(4).toString('hex')}`;
    
    // Create pool if not provided
    let poolId = data.poolId;
    if (!poolId) {
      const pool = await this.poolFactory.createWethUsdcPool(userId);
      poolId = pool.id;
    }

    return await this.prisma.position.create({
      data: {
        id: positionId,
        nftId: data.nftId || `${randomBytes(4).toString('hex')}`,
        liquidity: data.liquidity || '1000000000000000000',
        tickLower: data.tickLower || -887220,
        tickUpper: data.tickUpper || 887220,
        status: data.status || 'active',
        importType: data.importType || 'nft',
        userId,
        poolId,
        token0IsQuote: false, // WETH/USDC pool, USDC is quote
        createdAt: new Date(),
        updatedAt: new Date()
      },
      include: {
        pool: {
          include: {
            token0Ref: {
              include: {
                globalToken: true,
                userToken: true
              }
            },
            token1Ref: {
              include: {
                globalToken: true,
                userToken: true
              }
            }
          }
        }
      }
    });
  }

  /**
   * Create active WETH/USDC position (common test scenario)
   */
  async createActiveWethUsdcPosition(userId: string, chain: string = 'ethereum') {
    const pool = await this.poolFactory.createWethUsdcPool(userId, chain);
    
    return await this.createPosition(userId, {
      poolId: pool.id,
      status: 'active',
      nftId: '12345',
      liquidity: '1000000000000000000',
      tickLower: -276324,
      tickUpper: -276320,
      initialValue: '10000.00',
      currentValue: '10750.00',
      pnl: '750.00',
      pnlPercent: 7.5,
      rangeStatus: 'in-range'
    });
  }

  /**
   * Create position with custom pool
   */
  async createPositionWithPool(userId: string, poolData: any = {}, positionData: TestPositionData = {}) {
    const pool = await this.poolFactory.createPool(userId, poolData);
    
    return await this.createPosition(userId, {
      ...positionData,
      poolId: pool.id
    });
  }

  /**
   * Create multiple positions for a user
   */
  async createPositions(userId: string, count: number) {
    const positions = [];
    for (let i = 0; i < count; i++) {
      const position = await this.createPosition(userId, {
        nftId: `${12345 + i}`,
        initialValue: `${10000 + i * 1000}.00`,
        currentValue: `${10500 + i * 1100}.00`,
        pnl: `${500 + i * 100}.00`,
        pnlPercent: 5.0 + i
      });
      positions.push(position);
    }
    return positions;
  }

  /**
   * Create position with specific PnL scenario
   */
  async createPositionWithPnL(
    userId: string, 
    scenario: 'profit' | 'loss' | 'breakeven',
    amount: number = 10000
  ) {
    let pnlData;
    
    switch (scenario) {
      case 'profit':
        pnlData = {
          initialValue: `${amount}.00`,
          currentValue: `${amount * 1.1}.00`,
          pnl: `${amount * 0.1}.00`,
          pnlPercent: 10.0
        };
        break;
      case 'loss':
        pnlData = {
          initialValue: `${amount}.00`,
          currentValue: `${amount * 0.9}.00`,
          pnl: `${amount * -0.1}.00`,
          pnlPercent: -10.0
        };
        break;
      case 'breakeven':
      default:
        pnlData = {
          initialValue: `${amount}.00`,
          currentValue: `${amount}.00`,
          pnl: '0.00',
          pnlPercent: 0.0
        };
        break;
    }

    return await this.createPosition(userId, pnlData);
  }

  /**
   * Create positions across different chains
   */
  async createMultiChainPositions(userId: string) {
    const chains = ['ethereum', 'arbitrum', 'base'];
    const positions = [];

    for (const chain of chains) {
      const pool = await this.poolFactory.createWethUsdcPool(userId, chain);
      const position = await this.createPosition(userId, {
        poolId: pool.id,
        nftId: `${chain}-12345`,
        initialValue: '10000.00'
      });
      positions.push(position);
    }

    return positions;
  }
}

/**
 * Factory function
 */
export function createPositionFactory(prisma: PrismaClient): PositionFactory {
  return new PositionFactory(prisma);
}
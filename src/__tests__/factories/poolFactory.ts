import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';
import { TokenFactory, createTokenFactory } from './tokenFactory';

export interface TestPoolData {
  id?: string;
  chain?: string;
  poolAddress?: string;
  fee?: number;
  currentPrice?: string;
  currentTick?: number;
  token0Address?: string;
  token1Address?: string;
  token0Id?: string;
  token1Id?: string;
}

/**
 * Pool factory for test data creation
 */
export class PoolFactory {
  private prisma: PrismaClient;
  private tokenFactory: TokenFactory;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.tokenFactory = createTokenFactory(prisma);
  }

  /**
   * Create test pool with token dependencies
   */
  async createPool(userId: string, data: TestPoolData = {}) {
    const poolId = data.id || `pool-${randomBytes(4).toString('hex')}`;
    const chain = data.chain || 'ethereum';
    
    // Create tokens if not provided
    let token0Id = data.token0Id;
    let token1Id = data.token1Id;
    let token0Address = data.token0Address;
    let token1Address = data.token1Address;

    if (!token0Id) {
      const token0 = await this.tokenFactory.createToken({
        symbol: 'WETH',
        name: 'Wrapped Ether',
        decimals: 18,
        chain,
        address: token0Address || `0x${randomBytes(20).toString('hex')}`
      });
      token0Id = token0.id;
      token0Address = token0.address;
    }

    if (!token1Id) {
      const token1 = await this.tokenFactory.createToken({
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        chain,
        address: token1Address || `0x${randomBytes(20).toString('hex')}`
      });
      token1Id = token1.id;
      token1Address = token1.address;
    }

    return await this.prisma.pool.create({
      data: {
        id: poolId,
        chain,
        poolAddress: data.poolAddress || `0x${randomBytes(20).toString('hex')}`,
        fee: data.fee || 3000,
        currentPrice: data.currentPrice,
        currentTick: data.currentTick,
        token0Address: token0Address!,
        token1Address: token1Address!,
        token0Id: token0Id,
        token1Id: token1Id,
        userId,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      include: {
        token0: true,
        token1: true
      }
    });
  }

  /**
   * Create WETH/USDC pool (common test scenario)
   */
  async createWethUsdcPool(userId: string, chain: string = 'ethereum') {
    const commonTokens = await this.tokenFactory.createCommonTokens(chain);
    
    return await this.createPool(userId, {
      chain,
      fee: 3000,
      token0Id: commonTokens.WETH.id,
      token1Id: commonTokens.USDC.id,
      token0Address: commonTokens.WETH.address,
      token1Address: commonTokens.USDC.address,
      currentPrice: '2000.50',
      currentTick: 201000
    });
  }

  /**
   * Create multiple test pools for a user
   */
  async createPools(userId: string, count: number, chain: string = 'ethereum') {
    const pools = [];
    for (let i = 0; i < count; i++) {
      const pool = await this.createPool(userId, {
        chain,
        fee: 3000 + (i * 500), // Different fee tiers
        currentPrice: `${2000 + i * 100}.00`
      });
      pools.push(pool);
    }
    return pools;
  }

  /**
   * Create pool with existing tokens
   */
  async createPoolWithTokens(userId: string, token0Id: string, token1Id: string, data: Partial<TestPoolData> = {}) {
    const token0 = await this.prisma.token.findUniqueOrThrow({ where: { id: token0Id } });
    const token1 = await this.prisma.token.findUniqueOrThrow({ where: { id: token1Id } });

    return await this.createPool(userId, {
      ...data,
      token0Id,
      token1Id,
      token0Address: token0.address,
      token1Address: token1.address
    });
  }
}

/**
 * Factory function
 */
export function createPoolFactory(prisma: PrismaClient): PoolFactory {
  return new PoolFactory(prisma);
}